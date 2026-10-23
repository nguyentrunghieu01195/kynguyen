// Công Thành Chiến — quản lý theo tuần: đăng ký, lịch, bắt đầu / kết thúc trận, chủ thành, lịch sử (siege.json).
// Trận đánh cụ thể do siegebrain.js điều khiển, host.js (stepSiege) nối với từng người chơi.
//
// Vòng đời một tuần (giờ VN, xem src/config/siege.js):
//   mở đăng ký (ngay sau trận trước) → đóng đăng ký 19:30 CN → 20:00 trận đấu 30 phút → kết quả → chủ thành mới (nếu đổi)
// Bang thủ = chủ thành hiện tại (tự động tham gia). Tối đa 3 bang công đăng ký (ai đăng ký trước được trước), đóng phí đăng ký.
import fs from 'node:fs';
import path from 'node:path';
import { SIEGE, CASTLE, siegeStatus, siegeRewardSpecs } from '../../src/config/siege.js';
import { withStart } from '../../src/config/gboss.js';
import { setGateOpen } from '../../src/systems/siege.js';
import { createBrain } from './siegebrain.js';
import { TradeError } from './market.js';

const MIN_ACTIVE = +process.env.SIEGE_MIN_ACTIVE_SEC || SIEGE.minActiveSec; // biến môi trường chỉ dùng để thử nghiệm
const bad = (msg, status = 400) => new TradeError(msg, status);
const fmtZ = (n) => n.toLocaleString('vi-VN');

export function createSiege(dir, { guilds, store, market, gboss, notify = () => {}, announce = () => {}, onResult = () => {}, refresh = () => {} }) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'siege.json');
  let data = { owner: null, reg: { key: null, attackers: [] }, history: [], lastKey: null };
  try { data = Object.assign(data, JSON.parse(fs.readFileSync(file, 'utf8'))); } catch (e) { /* file mới */ }
  let dirty = false, timer = null;
  const flush = () => { if (!dirty) return; dirty = false; const tmp = file + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(data)); fs.renameSync(tmp, file); };
  const touch = () => { dirty = true; if (!timer) timer = setTimeout(() => { timer = null; flush(); }, 1000); };
  const brain = createBrain();
  let pending = null, processed = true, debug = false, forced = null; // forced: trận do quản trị ép bắt đầu ({ endAt })
  const act = new Map(); // accId -> { gid, active, lv } (thời gian chiến đấu thực sự mỗi người, do host báo mỗi giây)

  const ownerGid = () => (data.owner ? data.owner.gid : null);

  /** Hoàn phí đăng ký của các bang công qua hộp thư */
  function refundFees(fees, why) {
    for (const f of fees || []) {
      if (!f.payer || !(f.fee > 0) || !market || !market.mail) continue;
      market.mail(f.payer, SIEGE.icon + ' Hoàn phí đăng ký công thành (' + why + '): ' + fmtZ(f.fee) + ' Zen.', { items: [], jewels: {}, zen: f.fee });
    }
  }
  // Máy chủ khởi động lại giữa lúc đang diễn ra trận → trận bị huỷ: hoàn phí đăng ký, đặt lại danh sách đăng ký
  if (data.battle) {
    refundFees(data.battle.fees, 'máy chủ khởi động lại giữa trận');
    console.log('[siege] trận ' + data.battle.key + ' bị huỷ do khởi động lại; đã hoàn phí ' + (data.battle.fees || []).length + ' bang');
    data.battle = null; data.reg = { key: null, attackers: [] };
    dirty = true; flush();
  }

  // ---------------- BẮT ĐẦU / KẾT THÚC TRẬN ----------------
  function startBattle(st, teams, battleSec, gateHp) {
    brain.start(teams, battleSec, gateHp);
    data.battle = { key: data.lastKey, at: Date.now(), fees: data.reg.attackers.map((a) => ({ payer: a.payer, fee: a.fee, name: a.name })) }; touch();
    setGateOpen(false);
    processed = false;
    const names = teams.map((t) => t.name).join(' · ');
    announce(SIEGE.icon + ' CÔNG THÀNH CHIẾN bắt đầu! ' + names + (teams.some((t) => t.role === 'def') ? '' : ' (thành chưa có chủ)') + ' — vào 🏰 Bang hội → Công thành.');
    for (const t of teams) notify(guilds.memberIds(t.gid), SIEGE.icon + ' Công thành chiến đã bắt đầu! Vào 🏰 Bang hội → 🏯 Công thành để vào trận.');
  }

  function finalize() {
    if (processed) return;
    processed = true;
    const r = brain.result() || brain.finish();
    if (!r) return;
    const prev = data.owner;
    data.battle = null; forced = null;
    if (r.winnerGid && (!prev || prev.gid !== r.winnerGid)) data.owner = { gid: r.winnerGid, name: r.winner, since: Date.now() };
    data.history.unshift({ key: data.lastKey, at: Date.now(), winner: r.winnerGid ? { gid: r.winnerGid, name: r.winner } : null, gateBroken: r.gateBroken, teams: r.teams.map((t) => ({ name: t.name, role: t.role, hold: t.hold, kills: t.kills })) });
    data.history.length = Math.min(data.history.length, 12);
    data.reg = { key: null, attackers: [] };
    touch();
    pending = { ...r, key: data.lastKey, changed: !prev || prev.gid !== r.winnerGid };
    try { reward(r); } catch (e) { console.error('[siege] reward', e); }
    act.clear();
    announce(SIEGE.icon + ' Công thành kết thúc! ' + (r.winner ? (pending.changed ? r.winner + ' chiếm thành!' : r.winner + ' giữ vững thành!') : 'Thành chưa có chủ.'));
    try { onResult(pending); } catch (e) { console.error('[siege] onResult', e); }
  }

  /** Thưởng: ai chiến đấu đủ lâu mới được nhận; bang thắng còn có vũ khí đặc biệt vào đấu giá bang */
  function reward(r) {
    const qual = (gid) => [...act.entries()].filter(([, v]) => v.gid === gid && v.active >= MIN_ACTIVE).sort((a, b) => b[1].active - a[1].active);
    for (const t of r.teams) {
      const win = t.gid === r.winnerGid, list = qual(t.gid), mul = win ? CASTLE.winnerMul : 1;
      for (const [accId, v] of list) {
        const p = CASTLE.participation(v.lv || 1);
        market.mail(accId, SIEGE.icon + ' Thưởng công thành (' + (win ? 'bang thắng' : 'tham gia') + ').', { items: [], jewels: { bless: (p.bless || 0) * mul, soul: (p.soul || 0) * mul }, zen: Math.round(p.zen * mul) });
      }
      if (win && list.length) {
        const accs = list.map(([a]) => a);
        gboss.addLots({ gid: t.gid, gname: t.name, rank: 1, specs: siegeRewardSpecs(withStart), accs, mvp: accs[0] });
        notify(accs, SIEGE.icon + ' Bang anh chiếm thành! ' + siegeRewardSpecs(withStart).length + ' Vương Giả Vũ Khí đang đấu giá — mở 🔨 Đấu giá (15 phút trong bang).');
      }
    }
  }

  function tick() {
    const now = Date.now(), st = siegeStatus(now);
    try {
      if (data.owner && !guilds.nameOf(data.owner.gid)) { data.owner = null; touch(); } // bang chủ thành đã giải tán
      if (debug) { if (brain.exists() && !brain.active()) finalize(); return; }
      if (forced) { if (brain.active() && now >= forced.endAt) brain.finish(); if (brain.exists() && !brain.active()) finalize(); return; }
      // sang tuần mới: đặt lại danh sách đăng ký
      if (!brain.active() && data.reg.key !== st.key) { data.reg = { key: st.key, attackers: [] }; touch(); }
      if (brain.active() && st.phase !== 'battle') { brain.finish(); finalize(); return; }
      if (brain.exists() && !brain.active()) finalize();
      if (st.phase === 'battle' && !brain.active() && data.lastKey !== st.key) {
        data.lastKey = st.key; touch();
        const attackers = data.reg.attackers.filter((a) => guilds.nameOf(a.gid));
        if (!attackers.length) { announce(SIEGE.icon + ' Tuần này không có bang nào đăng ký công thành.'); return; }
        const teams = attackers.map((a) => ({ gid: a.gid, name: guilds.nameOf(a.gid), role: 'att' }));
        if (data.owner) teams.unshift({ gid: data.owner.gid, name: guilds.nameOf(data.owner.gid), role: 'def' });
        startBattle(st, teams, st.secLeft);
      }
    } catch (e) { console.error('[siege] tick', e); }
  }
  setTimeout(tick, 1500);
  setInterval(tick, 2000).unref();

  return {
    flush, dump: () => data, brain, tick,
    ownerGid, owner: () => data.owner,
    /** Host gọi mỗi tick sau brain.step: nếu trận hết giờ thì chốt kết quả */
    pollEnd() { if (brain.exists() && !brain.active()) finalize(); },
    /** Host báo mỗi giây: thời gian chiến đấu thực sự của người chơi đang trong trận */
    report(accId, gid, active, lv) { act.set(accId, { gid, active, lv }); },
    /** Kết quả trận vừa xong (trả về 1 lần) để host báo cho người đang trong trận */
    takeResult() { const r = pending; pending = null; return r; },

    /** Đăng ký công thành (bang chủ / phó bang; phí trừ trên nhân vật S) */
    register(accId, S) {
      const st = siegeStatus(), gid = guilds.guildIdOf(accId);
      if (!gid) throw bad('Anh chưa vào bang hội nào.');
      if (st.phase !== 'reg') throw bad(st.phase === 'battle' ? 'Trận đang diễn ra.' : 'Đã đóng đăng ký — chờ tuần sau.');
      const role = (guilds.detail(accId) || {}).role;
      if (role !== 'leader' && role !== 'officer') throw bad('Chỉ bang chủ và phó bang được đăng ký công thành.', 403);
      if (gid === ownerGid()) throw bad('Bang anh đang giữ thành — tự động tham gia phòng thủ.');
      if (data.reg.attackers.some((a) => a.gid === gid)) throw bad('Bang anh đã đăng ký rồi.');
      if (data.reg.attackers.length >= SIEGE.maxAttackers) throw bad('Đã đủ ' + SIEGE.maxAttackers + ' bang công. Tuần sau hãy đăng ký sớm hơn.');
      if ((guilds.detail(accId) || {}).lv < SIEGE.minGuildLv) throw bad('Bang cần đạt cấp ' + SIEGE.minGuildLv + ' để đăng ký.');
      if ((S.zen || 0) < SIEGE.regFee) throw bad('Cần ' + fmtZ(SIEGE.regFee) + ' Zen phí đăng ký.');
      S.zen -= SIEGE.regFee;
      data.reg.key = data.reg.key || st.key;
      data.reg.attackers.push({ gid, name: guilds.nameOf(gid), at: Date.now(), payer: accId, fee: SIEGE.regFee });
      touch();
      notify(guilds.memberIds(gid), SIEGE.icon + ' Bang đã đăng ký công thành! Trận diễn ra Chủ nhật 20:00 (giờ VN).');
      return { status: this.status(accId) };
    },

    /** Tra cứu cho người chơi muốn vào trận (systems/siege.js gọi qua host) */
    entryFor(S, countIn) {
      const gid = S.guild && S.guild.id;
      if (!brain.active()) return { err: 'Chưa đến giờ công thành.' };
      const t = brain.teamOf(gid);
      if (!t) return { err: 'Bang anh không tham gia trận công thành này.' };
      if (countIn(gid) >= SIEGE.maxPerGuild) return { err: 'Bang đã đủ ' + SIEGE.maxPerGuild + ' người trong trận.' };
      return { ok: true, team: { gid, name: t.name, slot: t.slot, role: t.role }, key: data.lastKey };
    },

    status(accId) {
      const st = siegeStatus(), gid = guilds.guildIdOf(accId), det = gid ? guilds.detail(accId) : null, role = det && det.role;
      const reg = data.reg.attackers.map((a) => ({ name: guilds.nameOf(a.gid) || a.name, mine: a.gid === gid }));
      return {
        st: { phase: st.phase, startAt: st.startAt, endAt: st.endAt, regCloseAt: st.regCloseAt, secUntil: st.secUntil, secLeft: st.secLeft, now: Date.now() },
        owner: data.owner ? { name: guilds.nameOf(data.owner.gid) || data.owner.name, since: data.owner.since, mine: data.owner.gid === gid } : null,
        reg, regMax: SIEGE.maxAttackers, regFee: SIEGE.regFee,
        mine: { inGuild: !!gid, isOwner: !!gid && gid === ownerGid(), registered: reg.some((r) => r.mine), canRegister: st.phase === 'reg' && (role === 'leader' || role === 'officer') && gid !== ownerGid() },
        battle: brain.active() ? { board: brain.board(), gate: brain.gate(), mine: !!gid && !!brain.teamOf(gid) } : null,
        history: data.history.slice(0, 5),
      };
    },

    // ---- quản trị ----
    adminView() {
      const st = siegeStatus();
      return {
        st: { phase: st.phase, startAt: st.startAt, endAt: st.endAt, regCloseAt: st.regCloseAt, secLeft: st.secLeft, secUntil: st.secUntil, forced: !!forced },
        owner: data.owner ? { gid: data.owner.gid, name: guilds.nameOf(data.owner.gid) || data.owner.name, since: data.owner.since } : null,
        reg: data.reg.attackers.map((a) => ({ gid: a.gid, name: guilds.nameOf(a.gid) || a.name, at: a.at, fee: a.fee || 0, payer: a.payer ? (store.findByAccount && (store.findByAccount(a.payer) || {}).name) || a.payer : null })),
        battle: brain.active() ? { board: brain.board(), gate: brain.gate() } : null,
        history: data.history,
      };
    },
    /** Huỷ đăng ký của 1 bang công (hoàn phí qua hộp thư) */
    adminCancelReg(gid) {
      if (brain.active()) throw bad('Trận đang diễn ra, dùng Huỷ trận.');
      const i = data.reg.attackers.findIndex((a) => a.gid === gid);
      if (i < 0) throw bad('Bang này chưa đăng ký.', 404);
      const [a] = data.reg.attackers.splice(i, 1);
      refundFees([a], 'quản trị huỷ đăng ký'); touch();
      notify(guilds.memberIds(gid), SIEGE.icon + ' Quản trị đã huỷ đăng ký công thành của bang; phí đã hoàn qua hộp thư.');
    },
    /** Ép bắt đầu trận ngay (bỏ qua lịch): cần ≥ 1 bang công đã đăng ký; trận kéo dài như thường */
    adminForceStart() {
      if (brain.active()) throw bad('Trận đang diễn ra.');
      const attackers = data.reg.attackers.filter((a) => guilds.nameOf(a.gid));
      if (!attackers.length) throw bad('Chưa có bang công nào đăng ký.');
      const teams = attackers.map((a) => ({ gid: a.gid, name: guilds.nameOf(a.gid), role: 'att' }));
      if (data.owner && guilds.nameOf(data.owner.gid)) teams.unshift({ gid: data.owner.gid, name: guilds.nameOf(data.owner.gid), role: 'def' });
      forced = { endAt: Date.now() + SIEGE.battleMin * 60000 };
      data.lastKey = 'sgforce' + Date.now();
      startBattle(null, teams, SIEGE.battleMin * 60);
    },
    /** Huỷ trận đang diễn ra: không đổi chủ thành, hoàn phí đăng ký, đẩy mọi người ra khỏi trận */
    adminCancelBattle() {
      if (!brain.active()) throw bad('Không có trận nào đang diễn ra.');
      refundFees(data.battle && data.battle.fees, 'quản trị huỷ trận');
      brain.clear(); processed = true; forced = null; data.battle = null; data.reg = { key: null, attackers: [] }; act.clear(); touch();
      pending = { cancelled: true, winner: null, winnerGid: null, gateBroken: false, teams: [], key: data.lastKey, changed: false };
      announce(SIEGE.icon + ' Quản trị đã huỷ trận công thành. Phí đăng ký được hoàn lại.');
    },
    /** Đặt / gỡ chủ thành (gid = null để gỡ) */
    adminSetOwner(gid) {
      if (gid && !guilds.nameOf(gid)) throw bad('Không tìm thấy bang.', 404);
      const prev = data.owner && data.owner.gid;
      data.owner = gid ? { gid, name: guilds.nameOf(gid), since: Date.now() } : null; touch();
      for (const g of [prev, gid]) if (g) refresh(g);
    },
    stats: () => ({ owner: data.owner ? data.owner.name : null, registered: data.reg.attackers.length, battles: data.history.length }),

    // ---- chỉ dùng để thử nghiệm (bật bằng SIEGE_TEST=1): bắt đầu trận ngay, bỏ qua lịch ----
    debugStart(defGid, attGids, sec, gateHp) {
      debug = true;
      const teams = attGids.map((g) => ({ gid: g, name: guilds.nameOf(g), role: 'att' }));
      if (defGid) teams.unshift({ gid: defGid, name: guilds.nameOf(defGid), role: 'def' });
      data.lastKey = 'sgdebug' + Date.now();
      startBattle(null, teams, sec || SIEGE.battleMin * 60, gateHp || undefined);
    },
  };
}
