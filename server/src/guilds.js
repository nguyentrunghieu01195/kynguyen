// Bang hội — dữ liệu bang nằm trên máy chủ (guilds.json), mọi thao tác do máy chủ kiểm tra.
// Zen / ngọc quyên góp được trừ trực tiếp trên nhân vật đang chạy ở máy chủ (host.withAcc), không nhận dữ liệu từ máy người chơi.
//
// Mỗi tài khoản thuộc tối đa 1 bang. Chức vụ: leader (bang chủ) > officer (phó bang) > member (thành viên).
import fs from 'node:fs';
import { own } from './guard.js';
import path from 'node:path';
import crypto from 'node:crypto';
import { GUILD, guildLevelOf, guildCap } from '../../src/config/guild.js';
import { TradeError } from './market.js';
import { cleanText } from './protocol.js';

const JEWELS = ['bless', 'soul', 'chaos'];
const ROLE_RANK = { leader: 3, officer: 2, member: 1 };
const int = (v) => (Number.isFinite(+v) ? Math.floor(+v) : NaN);
const bad = (msg, status = 400) => new TradeError(msg, status);

export function createGuilds(dir, { store }) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'guilds.json');
  let data = { guilds: {} };
  try { data = Object.assign(data, JSON.parse(fs.readFileSync(file, 'utf8'))); } catch (e) { /* file mới */ }
  let dirty = false, timer = null, notify = () => {}, isOnline = () => false, isCastle = () => false;
  const chats = new Map(); // guildId -> [tin nhắn] (chỉ giữ trong bộ nhớ)

  const flush = () => { if (!dirty) return; dirty = false; const tmp = file + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(data)); fs.renameSync(tmp, file); };
  const touch = () => { dirty = true; if (!timer) timer = setTimeout(() => { timer = null; flush(); }, 1000); };

  // tài khoản → bang (dựng lại từ dữ liệu)
  const byAcc = new Map();
  const reindex = () => { byAcc.clear(); for (const g of Object.values(data.guilds)) for (const a of Object.keys(g.members)) byAcc.set(a, g.id); };
  reindex();

  const guildOf = (accId) => own(data.guilds, byAcc.get(accId)) || null;
  const need = (accId) => { const g = guildOf(accId); if (!g) throw bad('Anh chưa vào bang hội nào.'); return g; };
  const roleOf = (g, accId) => (g.members[accId] ? g.members[accId].role : null);
  const atLeast = (g, accId, role) => (ROLE_RANK[roleOf(g, accId)] || 0) >= ROLE_RANK[role];
  const profile = (accId) => store.findByAccount(accId) || {};
  const nameOf = (accId) => profile(accId).name || '???';
  const lvOf = (g) => guildLevelOf(g.exp);
  /** Báo máy chủ chạy game cập nhật S.guild của các tài khoản này (hoãn sang lượt sau để tránh chạy chồng ngữ cảnh) */
  const sync = (...accIds) => { for (const a of accIds) setTimeout(() => notify(a), 0); };
  const syncAll = (g) => sync(...Object.keys(g.members));

  /** Tóm tắt gắn vào nhân vật (S.guild) — dùng để tính buff và hiển thị tên bang */
  const brief = (accId) => {
    const g = guildOf(accId);
    return g ? { id: g.id, name: g.name, lv: lvOf(g), role: roleOf(g, accId), castle: isCastle(g.id) } : null;
  };

  function cleanName(s) {
    const name = cleanText(s, GUILD.nameMax);
    if (name.length < GUILD.nameMin) throw bad('Tên bang cần ' + GUILD.nameMin + '–' + GUILD.nameMax + ' ký tự.');
    if (Object.values(data.guilds).some((g) => g.name.toLowerCase() === name.toLowerCase())) throw bad('Tên bang đã có người dùng.');
    return name;
  }

  function memberRow(g, accId, online, me) {
    const m = g.members[accId], p = profile(accId);
    return { acc: accId, name: p.name || '???', cls: p.cls || 'knight', lv: p.lv || 1, resets: p.resets || 0, role: m.role, contrib: m.contrib, joined: m.joined, online: online.has(accId), me: accId === me };
  }
  function detail(accId) {
    const g = guildOf(accId);
    if (!g) return null;
    const online = new Set(Object.keys(g.members).filter(isOnline));
    const lv = lvOf(g), me = roleOf(g, accId), isMgr = atLeast(g, accId, 'officer');
    return {
      id: g.id, name: g.name, castle: isCastle(g.id), fund: g.fund || 0, lv, exp: g.exp, next: lv < GUILD.levels.length ? GUILD.levels[lv] : null, cur: GUILD.levels[lv - 1],
      notice: g.notice || '', cap: guildCap(lv), role: me, created: g.created, leader: nameOf(g.leader),
      members: Object.keys(g.members).map((a) => memberRow(g, a, online, accId)).sort((a, b) => (ROLE_RANK[b.role] - ROLE_RANK[a.role]) || (b.contrib - a.contrib)),
      apps: isMgr ? Object.entries(g.apps).map(([a, ap]) => ({ acc: a, name: nameOf(a), cls: ap.cls, lv: ap.lv, at: ap.at })) : [],
      chat: (chats.get(g.id) || []).slice(-GUILD.chatKeep),
    };
  }
  function list(accId, { page = 0, q = '' } = {}) {
    q = cleanText(q, GUILD.nameMax).toLowerCase();
    const all = Object.values(data.guilds).filter((g) => !q || g.name.toLowerCase().includes(q)).sort((a, b) => b.exp - a.exp || a.created - b.created);
    const per = 10, pg = Math.max(0, Math.min(int(page) || 0, Math.max(0, Math.ceil(all.length / per) - 1)));
    return {
      total: all.length, page: pg, per,
      rows: all.slice(pg * per, pg * per + per).map((g, i) => ({ id: g.id, rank: pg * per + i + 1, name: g.name, lv: lvOf(g), exp: g.exp, n: Object.keys(g.members).length, cap: guildCap(lvOf(g)), leader: nameOf(g.leader), applied: !!g.apps[accId] })),
    };
  }

  function addMember(g, accId, role = 'member') {
    g.members[accId] = { role, contrib: 0, joined: Date.now() };
    byAcc.set(accId, g.id);
    for (const o of Object.values(data.guilds)) delete o.apps[accId]; // vào bang rồi → huỷ mọi đơn đang chờ
  }
  function removeMember(g, accId) { delete g.members[accId]; byAcc.delete(accId); }
  const log = (g, text) => { (g.log ||= []).push({ at: Date.now(), text }); if (g.log.length > 30) g.log.shift(); };

  return {
    setNotify: (fn) => { notify = fn; },
    setOnline: (fn) => { isOnline = fn; },
    setCastle: (fn) => { isCastle = fn; },
    /** Báo máy chủ game cập nhật S.guild của mọi thành viên bang (vd. đổi chủ thành) */
    refresh: (gid) => { const g = own(data.guilds, gid); if (g) syncAll(g); },
    addFund: (gid, n) => { const g = own(data.guilds, gid); if (g && n > 0) { g.fund = (g.fund || 0) + Math.floor(n); touch(); } },
    /** Bang chủ rút toàn bộ quỹ để chia cho thành viên (trả { ids, amount } — nơi gọi gửi thư) */
    takeFund(accId) {
      const g = need(accId);
      if (roleOf(g, accId) !== 'leader') throw bad('Chỉ bang chủ được phát quỹ.', 403);
      if (!(g.fund > 0)) throw bad('Quỹ bang đang trống.');
      const amount = g.fund, ids = Object.keys(g.members);
      g.fund = 0; touch();
      return { ids, amount, gid: g.id };
    },
    idByName: (name) => (Object.values(data.guilds).find((g) => g.name === name) || {}).id || null,
    flush, dump: () => data, brief, detail, list,
    guildIdOf: (accId) => byAcc.get(accId) || null,
    nameOf: (gid) => (own(data.guilds, gid) ? own(data.guilds, gid).name : null),
    memberIds: (gid) => (own(data.guilds, gid) ? Object.keys(own(data.guilds, gid).members) : []),
    count: () => Object.keys(data.guilds).length,

    /** Lập bang: trừ Zen trên nhân vật S */
    create(accId, S, rawName) {
      if (guildOf(accId)) throw bad('Anh đã ở trong một bang.');
      if (S.lv < GUILD.createMinLv) throw bad('Cần đạt cấp ' + GUILD.createMinLv + ' để lập bang.');
      if ((S.zen || 0) < GUILD.createCost) throw bad('Cần ' + GUILD.createCost.toLocaleString('vi-VN') + ' Zen để lập bang.');
      const name = cleanName(rawName);
      S.zen -= GUILD.createCost;
      const g = { id: crypto.randomBytes(5).toString('hex'), name, leader: accId, created: Date.now(), exp: 0, notice: '', members: {}, apps: {}, log: [] };
      data.guilds[g.id] = g;
      addMember(g, accId, 'leader');
      log(g, nameOf(accId) + ' lập bang.');
      touch();
      S.guild = brief(accId);
      return { guild: detail(accId) };
    },

    apply(accId, gid) {
      if (guildOf(accId)) throw bad('Anh đã ở trong một bang.');
      const g = own(data.guilds, gid);
      if (!g) throw bad('Bang không tồn tại.', 404);
      if (g.apps[accId]) throw bad('Anh đã gửi đơn vào bang này rồi.');
      if (Object.keys(g.apps).length >= GUILD.maxApps) throw bad('Bang này đang có quá nhiều đơn chờ duyệt.');
      const p = profile(accId);
      g.apps[accId] = { at: Date.now(), cls: p.cls || 'knight', lv: p.lv || 1 };
      touch();
    },
    cancelApp(accId, gid) { const g = own(data.guilds, gid); if (g && g.apps[accId]) { delete g.apps[accId]; touch(); } },

    accept(accId, target) {
      const g = need(accId);
      if (!atLeast(g, accId, 'officer')) throw bad('Chỉ bang chủ và phó bang được duyệt đơn.', 403);
      if (!g.apps[target]) throw bad('Không có đơn này (có thể đã bị rút).');
      if (guildOf(target)) { delete g.apps[target]; touch(); throw bad('Người này đã vào bang khác.'); }
      if (Object.keys(g.members).length >= guildCap(lvOf(g))) throw bad('Bang đã đầy, cần nâng cấp bang để mở rộng.');
      addMember(g, target);
      log(g, nameOf(target) + ' gia nhập bang.');
      touch(); sync(target);
    },
    reject(accId, target) {
      const g = need(accId);
      if (!atLeast(g, accId, 'officer')) throw bad('Chỉ bang chủ và phó bang được duyệt đơn.', 403);
      delete g.apps[target]; touch();
    },
    kick(accId, target) {
      const g = need(accId);
      if (target === accId) throw bad('Không thể tự đuổi mình, hãy chọn Rời bang.');
      if (!g.members[target]) throw bad('Người này không còn trong bang.');
      if (ROLE_RANK[roleOf(g, accId)] <= ROLE_RANK[roleOf(g, target)] || !atLeast(g, accId, 'officer')) throw bad('Anh không đủ quyền đuổi người này.', 403);
      removeMember(g, target);
      log(g, nameOf(target) + ' bị mời khỏi bang.');
      touch(); sync(target);
    },
    setRole(accId, target, role) {
      const g = need(accId);
      if (roleOf(g, accId) !== 'leader') throw bad('Chỉ bang chủ được đổi chức vụ.', 403);
      if (target === accId || !g.members[target]) throw bad('Người này không hợp lệ.');
      if (role === 'officer' && Object.values(g.members).filter((m) => m.role === 'officer').length >= GUILD.maxOfficers && g.members[target].role !== 'officer') throw bad('Tối đa ' + GUILD.maxOfficers + ' phó bang.');
      if (role !== 'officer' && role !== 'member') throw bad('Chức vụ không hợp lệ.');
      g.members[target].role = role;
      log(g, nameOf(target) + (role === 'officer' ? ' được phong phó bang.' : ' trở lại thành viên.'));
      touch(); sync(target);
    },
    transfer(accId, target) {
      const g = need(accId);
      if (roleOf(g, accId) !== 'leader') throw bad('Chỉ bang chủ được nhượng quyền.', 403);
      if (target === accId || !g.members[target]) throw bad('Người này không hợp lệ.');
      g.members[target].role = 'leader'; g.members[accId].role = 'officer'; g.leader = target;
      log(g, nameOf(accId) + ' nhượng chức bang chủ cho ' + nameOf(target) + '.');
      touch(); sync(accId, target);
    },
    leave(accId) {
      const g = need(accId);
      if (roleOf(g, accId) === 'leader') throw bad(Object.keys(g.members).length > 1 ? 'Bang chủ cần nhượng chức cho người khác trước khi rời bang.' : 'Bang chỉ còn mình anh — hãy chọn Giải tán.');
      removeMember(g, accId);
      log(g, nameOf(accId) + ' rời bang.');
      touch(); sync(accId);
    },
    disband(accId) {
      const g = need(accId);
      if (roleOf(g, accId) !== 'leader') throw bad('Chỉ bang chủ được giải tán bang.', 403);
      const ids = Object.keys(g.members);
      delete data.guilds[g.id]; chats.delete(g.id); reindex();
      touch(); sync(...ids);
    },
    setNotice(accId, text) {
      const g = need(accId);
      if (!atLeast(g, accId, 'officer')) throw bad('Chỉ bang chủ và phó bang được sửa thông báo.', 403);
      g.notice = cleanText(text, 120); touch();
    },

    /** Quyên Zen / ngọc: trừ trên nhân vật S, cộng điểm cống hiến cho bang */
    donate(accId, S, { zen, jewels } = {}) {
      const g = need(accId);
      let pts = 0, z = int(zen) || 0;
      if (z < 0 || z > 2e9) throw bad('Số Zen không hợp lệ.');
      if (z > (S.zen || 0)) throw bad('Không đủ Zen.');
      const take = {};
      for (const k of JEWELS) { const n = int(jewels && jewels[k]) || 0; if (n < 0) throw bad('Số ngọc không hợp lệ.'); if (n > 0) { if (n > ((S.jewels && S.jewels[k]) || 0)) throw bad('Không đủ ngọc.'); take[k] = n; } }
      pts += Math.floor(z / GUILD.zenPerPt);
      z = Math.floor(z / GUILD.zenPerPt) * GUILD.zenPerPt; // chỉ trừ phần đổi được thành điểm
      for (const k in take) pts += take[k] * GUILD.jewelPts[k];
      if (pts <= 0) throw bad('Cần quyên ít nhất ' + GUILD.zenPerPt.toLocaleString('vi-VN') + ' Zen hoặc 1 viên ngọc.');
      S.zen -= z;
      for (const k in take) S.jewels[k] -= take[k];
      const before = lvOf(g);
      g.exp += pts; g.members[accId].contrib += pts;
      const after = lvOf(g);
      if (after > before) { log(g, 'Bang lên cấp ' + after + '!'); syncAll(g); }
      touch();
      S.guild = brief(accId);
      return { pts, levelUp: after > before ? after : 0, guild: detail(accId) };
    },

    /** Cộng điểm cống hiến từ nhiệm vụ bang (S: nhân vật đang chơi) */
    addPts(accId, S, pts) {
      const g = need(accId);
      const before = lvOf(g);
      g.exp += pts; g.members[accId].contrib += pts;
      const after = lvOf(g);
      if (after > before) { log(g, 'Bang lên cấp ' + after + '!'); syncAll(g); }
      touch();
      S.guild = brief(accId);
      return { pts, levelUp: after > before ? after : 0, guild: detail(accId) };
    },

    // ---- chat bang ----
    chatPush(gid, msg) { const a = chats.get(gid) || []; a.push(msg); if (a.length > GUILD.chatKeep) a.shift(); chats.set(gid, a); },
    stats: () => ({ guilds: Object.keys(data.guilds).length, members: byAcc.size }),
  };
}
