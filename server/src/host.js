// =====================================================================
//  MÁY CHỦ CHẠY GAME (chế độ máy chủ quyết định — chống gian lận)
// =====================================================================
// Mỗi người chơi đăng nhập có 1 "thế giới riêng" chạy trên máy chủ bằng đúng code luật chơi của game (src/systems).
// Máy người chơi chỉ gửi LỆNH (đi tới đâu, đánh con nào, ép món nào…) và nhận lại hình ảnh thế giới để vẽ.
// Zen, EXP, đồ rơi, kết quả ép đồ… đều do máy chủ tính → sửa dữ liệu trên máy người chơi không có tác dụng.
//
// Code luật chơi dùng biến toàn cục G (G.S / G.R / G.P). Node chạy 1 luồng nên mỗi lần xử lý 1 người chơi
// ta "đổi ngữ cảnh": gán G = dữ liệu của người đó → chạy → cất lại (enter/exit).
import { G } from '../../src/core/state.js';
import { audit } from './guard.js';
import { initPets } from '../../src/systems/pets.js';
import { on, EV, log } from '../../src/core/events.js';
import { update } from '../../src/systems/game.js';
import { calcStats } from '../../src/systems/stats.js';
import { enterMap } from '../../src/systems/world.js';
import { createCharacter } from '../../src/systems/character.js';
import { initQuests, ensureDaily } from '../../src/systems/quests.js';
import { initFashion, checkUnlocks } from '../../src/systems/fashion.js';
import { initSkills } from '../../src/systems/skills.js';
import { initEvents } from '../../src/systems/events.js';
import { initGBoss, syncBoss, gbossHurt, gbossTakeDelta, gbossSetBoard } from '../../src/systems/gboss.js';
import { gbossStatus } from '../../src/config/gboss.js';
import { SIEGE } from '../../src/config/siege.js';
import { setSiegeProvider, syncSiege, siegeTakeOut, siegeHurt, siegeFinish } from '../../src/systems/siege.js';
import { setGateOpen } from '../../src/systems/siege.js';
import { createArena } from './arena.js';
import { computeOffline } from '../../src/systems/offline.js';
import { itemFull } from '../../src/systems/items.js';
import { migrate, isValidSave } from '../../src/core/save.js';
import { PROGRESSION as PG } from '../../src/config/balance.js';
import { JEWELS } from '../../src/config/items.js';
import { runAction } from '../../src/net/actions.js';
import { packRuntime, runtimeInit, stateDiff, FORWARD_EVENTS, packArg, newSyncCache } from '../../src/net/sync.js';
import { lookOf, powerOf } from '../../src/net/look.js';

export const HOST = {
  tickMs: 50,          // mô phỏng 20 lần/giây
  snapMs: 100,         // gửi hình ảnh thế giới 10 lần/giây
  stateMs: 250,        // gửi phần bản lưu thay đổi 4 lần/giây
  persistMs: 30000,    // ghi bản lưu xuống đĩa mỗi 30 giây
  statsMs: 5000,       // cập nhật bảng xếp hạng / ngoại hình
  actPerSec: 30,       // giới hạn số lệnh mỗi giây
};

export function createHost({ accounts, store, market, guilds, gboss, siege, send, onPresence, announceAll }) {
  const ctxs = new Map(); // accId -> ctx
  let CUR = null;

  // ---- đổi ngữ cảnh ----
  function enter(c) { CUR = c; G.S = c.S; G.R = c.R; G.P = c.P; G.online = true; G.pendingOffline = c.pendingOffline; }
  function exit(c) { c.S = G.S; c.R = G.R; c.P = G.P; c.pendingOffline = G.pendingOffline; CUR = null; G.S = G.R = G.P = null; G.pendingOffline = null; }
  function run(c, fn) {
    enter(c);
    try { return fn(); }
    catch (e) { console.error('[host] lỗi khi chạy cho ' + c.acc.user, e); return undefined; }
    finally { fairness(c); exit(c); }
  }
  /** Luật chơi trực tuyến: EXP tối đa xN, không chế độ thử sự kiện */
  function fairness() { if (G.S) { if (!(G.S.expRate <= PG.onlineMaxExpRate)) G.S.expRate = PG.onlineMaxExpRate; G.S.eventTest = false; } }

  // ---- bắt sự kiện game để gửi cho máy người chơi + thông báo toàn server ----
  for (const ev of FORWARD_EVENTS) on(ev, (...a) => { if (CUR) CUR.out.push([ev, ...a.map(packArg)]); });
  const ann = (kind, data) => { if (CUR) announceAll(kind, data, CUR.S.name); };
  on(EV.UPGRADE, (outcome, it) => { if (outcome === 'success' && it.plus >= 9) ann('upgrade', { item: itemFull(it) }); });
  on(EV.CRAFT, (ok, tier) => { if (ok && tier >= 2 && CUR) ann('wings', { name: CUR.S.equip.wings ? itemFull(CUR.S.equip.wings) : '' }); });
  on(EV.TOWER_FLOOR, (n, first) => { if (first && n % 5 === 0) ann('tower', { floor: n }); });
  on(EV.KILL, (m) => { if (m.boss && !m.event) ann('boss', { boss: m.name }); });
  on(EV.RESET, (n) => ann('reset', { n }));
  on(EV.EVENT, (id, ok) => { if (ok) ann('event', { id }); });
  on(EV.GBOSS_END, (res) => { if (CUR && res.delta > 0) gboss.addDamage(CUR.acc.id, res.key, res.delta); }); // phần sát thương cuối → tính cho bang
  initQuests(); initSkills(); initFashion(); initPets(); initEvents(); initGBoss();

  // ---- gửi dữ liệu ----
  function flushEvents(c) { const ev = c.out; c.out = []; return ev; }
  function pushState(c, force) {
    const patch = stateDiff(c.S, c.last);
    if (patch || force) send(c.s, { t: 'st', s: patch || {} });
  }
  function checkRuntime(c) {
    if (c.R !== c.lastR || c.R.mapIndex !== c.lastKey) {
      c.lastR = c.R; c.lastKey = c.R.mapIndex; c.sync = newSyncCache();
      send(c.s, { t: 'rt', rt: runtimeInit(c.R) });
    }
  }
  function snapshot(c) {
    checkRuntime(c);
    const snap = run(c, () => packRuntime(G.R, c.sync)); // trong ngữ cảnh người chơi (hud() của sự kiện đọc G.R)
    if (snap) send(c.s, { t: 'snap', s: snap, ev: flushEvents(c) });
  }
  function persist(c) {
    c.S.lastSeen = Date.now();
    accounts.putSave(c.acc, c.S, c.acc.rev, true);
  }
  function stats(c) {
    const P = c.P, S = c.S;
    store.update(c.s.p, { lv: S.lv, resets: S.resets, tower: (S.tower && S.tower.best) || 0, power: powerOf(P), cls: S.cls });
    const look = lookOf(S), sig = JSON.stringify(look);
    if (sig !== c.lookSig) { c.lookSig = sig; onPresence(c.s, { look }); }
  }

  // ---- Thấy chiêu thức của đồng đội: sao chép phần HÌNH ẢNH (hiệu ứng, đạn) sang màn hình các thành viên khác cùng đấu trường ----
  const relayed = new WeakSet();
  const RELAY_FX = new Set(['whirl', 'nova', 'dash', 'skyblade', 'meteor', 'frost', 'bolt', 'vortex', 'beam', 'boom', 'slash']);
  const FX_KEEP = ['k', 'x', 'y', 'x0', 'y0', 'x1', 'y1', 'pts', 't', 'd', 'r', 'col', 'f', 'fire', 'crack', 'hitAt', 'size'];
  const RELAY_CAP = 14; // tối đa mỗi tick cho mỗi người nhận (tránh gửi quá nhiều khi đông người)
  function relayEffects(list) {
    if (list.length < 2) return;
    const outFx = list.map(() => []), outPj = list.map(() => []);
    list.forEach((o, i) => {
      const R = o.ref.R;
      for (const f of R.fx) {
        if (relayed.has(f) || f.foreign || f.follow || f.noRelay || !RELAY_FX.has(f.k)) continue;
        relayed.add(f);
        const v = { foreign: true }; for (const k of FX_KEEP) if (f[k] !== undefined) v[k] = f[k];
        for (let j = 0; j < list.length; j++) if (j !== i) outFx[j].push(v);
      }
      for (const pr of R.projs) {
        if (relayed.has(pr) || !pr.tgt) continue;
        relayed.add(pr);
        const v = { x: pr.x, y: pr.y, k: pr.k, spd: pr.spd || 10, tgt: { x: pr.tgt.x, y: pr.tgt.y } };
        for (let j = 0; j < list.length; j++) if (j !== i) outPj[j].push(v);
      }
    });
    list.forEach((o, j) => {
      const R = o.ref.R;
      for (const v of outFx[j].slice(0, RELAY_CAP)) { const c = { ...v }; relayed.add(c); R.fx.push(c); }
      if (outPj[j].length) { R.vprojs = R.vprojs || []; for (const v of outPj[j].slice(0, RELAY_CAP)) R.vprojs.push({ ...v, tgt: { ...v.tgt } }); }
    });
  }

  // ---- Boss Bang Hội: mỗi bang một đấu trường, một Boss duy nhất do máy chủ điều khiển ----
  const arena = createArena();
  let boardT = 0;
  function stepArena(dt, now) {
    const groups = new Map();
    if (gbossStatus(now).open) {
      for (const c of ctxs.values()) {
        const E = c.R && c.R.event, gid = c.S && c.S.guild && c.S.guild.id;
        if (!E || E.id !== 'gboss' || E.over || !gid) continue;
        if (!groups.has(gid)) groups.set(gid, []);
        groups.get(gid).push({ ref: c, x: c.R.p.x, y: c.R.p.y, dead: c.R.p.dead > 0 });
      }
    }
    for (const list of groups.values()) relayEffects(list);
    arena.update(dt, groups, (c, kind, o) => run(c, () => gbossHurt(kind, o)));
    boardT += HOST.tickMs;
    const doBoard = boardT >= 1000;
    if (doBoard) boardT = 0;
    for (const [gid, list] of groups) {
      const st = arena.state(gid);
      for (const o of list) {
        const c = o.ref;
        run(c, () => syncBoss(st));
        if (doBoard) { const d = run(c, () => gbossTakeDelta()); if (d > 0) gboss.addDamage(c.acc.id, c.R.event.key, d, 1); }
      }
      if (doBoard) for (const o of list) { const board = gboss.board(gid, o.ref.acc.id); run(o.ref, () => gbossSetBoard(board)); }
    }
  }

  // ---- Công Thành Chiến: một đấu trường chung cho cả trận, bộ não (server/src/siege*.js) điều khiển ----
  const siegeList = () => { const out = []; for (const c of ctxs.values()) { const E = c.R && c.R.event; if (E && E.id === 'siege' && !E.over && c.S.guild) out.push(c); } return out; };
  setSiegeProvider((S) => siege.entryFor(S, (gid) => siegeList().filter((c) => c.S.guild.id === gid).length));
  let siegeRepT = 0;
  function stepSiege(dt) {
    const res = siege.takeResult();
    if (res) { for (const c of ctxs.values()) { const E = c.R && c.R.event; if (E && E.id === 'siege' && !E.over) run(c, () => siegeFinish({ winner: res.winner, gateBroken: res.gateBroken, teams: res.teams })); } return; }
    const brain = siege.brain;
    if (!brain.active()) return;
    const list = siegeList();
    if (!list.length) { brain.step(dt, []); siege.pollEnd(); return; }
    siegeRepT += dt;
    const doReport = siegeRepT >= 1;
    if (doReport) siegeRepT = 0;
    const byId = new Map(), players = list.map((c) => {
      const p = c.R.p, o = { ref: c, id: c.acc.id, gid: c.S.guild.id, name: c.S.name, x: p.x, y: p.y, dead: p.dead > 0 };
      byId.set(o.id, o); return o;
    });
    // 1) gom sát thương PvP / cổng mà mỗi người vừa gây ra
    for (const o of players) {
      const out = run(o.ref, () => siegeTakeOut());
      if (!out) continue;
      for (const [pid, dmg] of Object.entries(out.pvp)) {
        const t = byId.get(pid);
        if (!t || t.gid === o.gid || t.dead || o.dead) continue;
        if (Math.hypot(t.x - o.x, t.y - o.y) > SIEGE.maxHitRange) continue; // quá xa: bỏ
        const d = Math.max(1, Math.min(Math.floor(dmg), Math.floor(t.ref.P.maxHp)));
        const r = run(t.ref, () => siegeHurt(d, o.name));
        if (r && r.died) { t.dead = true; brain.kill(o.gid, t.gid); }
      }
      if (out.gate > 0 && brain.gateHit(o.gid, out.gate)) { setGateOpen(true); announceAll('siege', { text: SIEGE.icon + ' Cổng Thành đã bị phá vỡ! Mau chiếm Ngai Vàng!' }); }
    }
    // 2) bộ não: ngai vàng, giờ giữ, hết giờ
    for (const e of brain.step(dt, players.map((o) => ({ gid: o.gid, x: o.x, y: o.y, dead: o.ref.R.p.dead > 0 })))) {
      if (e.type === 'throne') announceAll('siege', { text: SIEGE.icon + ' ' + brain.teamOf(e.gid).name + ' đã chiếm Ngai Vàng!' });
    }
    if (doReport) for (const o of players) siege.report(o.id, o.gid, Math.floor(o.ref.R.event.active || 0), o.ref.S.lv);
    siege.pollEnd();
    // 3) mỗi người thấy người địch quanh mình + cổng + bảng điểm
    const board = brain.board(), gate = brain.gate();
    const live = players.filter((o) => o.ref.R.p.dead <= 0);
    for (const o of players) {
      const near = [];
      for (const e of live) {
        if (e.gid === o.gid) continue;
        const dd = Math.hypot(e.ref.R.p.x - o.x, e.ref.R.p.y - o.y);
        if (dd <= SIEGE.viewRadius) near.push([dd, e]);
      }
      if (near.length > SIEGE.maxProxies) near.sort((a, b) => a[0] - b[0]).length = SIEGE.maxProxies;
      const enemies = [];
      for (const [, e] of near) {
        const p = e.ref.R.p;
        enemies.push({ id: e.id, name: e.name, lv: e.ref.S.lv, x: p.x, y: p.y, hp: p.hp, maxHp: e.ref.P.maxHp, def: e.ref.P.def, face: p.face, moving: p.moving, team: brain.teamOf(e.gid).slot, prot: e.ref.R.event.prot > 0 });
      }
      run(o.ref, () => syncSiege({ enemies, gate, board }));
    }
    relayEffects(list.map((c) => ({ ref: c })));
  }

  // ---- vòng lặp ----
  let last = Date.now(), snapT = 0, stateT = 0, loopMs = 0;
  setInterval(() => {
    const t0 = process.hrtime.bigint();
    const now = Date.now(), dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    snapT += HOST.tickMs; stateT += HOST.tickMs;
    const doSnap = snapT >= HOST.snapMs, doState = stateT >= HOST.stateMs;
    if (doSnap) snapT = 0;
    try { stepArena(dt, now); } catch (e) { console.error('[host] lỗi đấu trường bang', e); }
    try { stepSiege(dt); } catch (e) { console.error('[host] lỗi công thành', e); }
    if (doState) stateT = 0;
    for (const c of ctxs.values()) try {
      run(c, () => update(dt));
      const R = c.R, p = R.p;
      onPresence(c.s, { room: R.event ? R.event.room || null : 'm' + R.mapIndex, pos: { x: p.x, y: p.y, tx: p.tx, ty: p.ty, f: p.face, mv: p.moving } });
      if (doSnap) snapshot(c);
      if (doState) pushState(c);
      if (now - c.persistAt > HOST.persistMs) { c.persistAt = now; persist(c); }
      if (now - c.statsAt > HOST.statsMs) { c.statsAt = now; stats(c); }
    } catch (e) { console.error('[host] lỗi vòng lặp (' + c.acc.user + ')', e); }
    loopMs = loopMs * 0.95 + (Number(process.hrtime.bigint() - t0) / 1e6) * 0.05; // trung bình trượt
  }, HOST.tickMs);

  // ---- vào / rời game ----
  /**
   * Bắt đầu chơi bằng tài khoản. create = { cls, name } khi tạo nhân vật mới.
   * Trả về ctx hoặc ném lỗi { message }.
   */
  function join(s, acc, create) {
    let S = null;
    const old = ctxs.get(acc.id);
    if (old) { // đang chơi ở thiết bị khác → chuyển sang thiết bị này
      S = old.S;
      send(old.s, { t: 'kicked', reason: 'other', message: 'Tài khoản vừa vào game ở thiết bị khác.' });
      leave(old.s, true);
      try { old.s.ws.close(4004, 'other device'); } catch (e) { /* bỏ qua */ }
    }
    if (create) {
      const cls = ['knight', 'wizard', 'archer'].includes(create.cls) ? create.cls : 'knight';
      S = createCharacter(cls, String(create.name || 'Hiệp Sĩ').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 12) || 'Hiệp Sĩ', create.gender === 'f' ? 'f' : 'm');
      S.tut = 0;
    } else if (!S) {
      const sv = accounts.getSave(acc);
      if (!sv || !isValidSave(sv.data)) throw { code: 'no_char', message: 'Tài khoản chưa có nhân vật.' };
      S = sv.data;
    }
    if (s.p && s.p.name) S.name = s.p.name; // tên hiển thị trên máy chủ (đã xử lý trùng tên)
    const c = { s, acc, S: null, R: null, P: null, out: [], last: new Map(), sync: newSyncCache(), lastR: null, lastKey: null, persistAt: Date.now(), statsAt: 0, lookSig: '', acts: [], pendingOffline: null };
    enter(c);
    try {
      G.S = migrate(S);
      G.S.guild = guilds.brief(acc.id); // bang hội do máy chủ quyết định, không tin bản lưu
      fairness();
      calcStats();
      ensureDaily();
      checkUnlocks(true);
      G.pendingOffline = old ? null : computeOffline(Date.now() - (G.S.lastSeen || Date.now()));
      G.R = null;
      enterMap(G.S.map || 0);
    } finally { exit(c); }
    ctxs.set(acc.id, c);
    s.ctx = c;
    persist(c);
    send(s, { t: 'state', s: c.S, offline: c.pendingOffline });
    c.last = new Map(); stateDiff(c.S, c.last); // đánh dấu đã gửi toàn bộ
    checkRuntime(c);
    snapshot(c);
    stats(c);
    autoClaim(c);
    return c;
  }
  function leave(s, silent) {
    const c = s.ctx;
    if (!c) return;
    s.ctx = null;
    if (ctxs.get(c.acc.id) === c) ctxs.delete(c.acc.id);
    try { persist(c); } catch (e) { console.error('[host] lưu lỗi', e); }
    if (!silent) console.log('[host] ' + c.acc.user + ' rời game');
  }

  // ---- lệnh từ người chơi ----
  function action(s, m) {
    const c = s.ctx;
    if (!c) return send(s, { t: 'ar', i: m.i, err: 'not_playing' });
    const now = Date.now();
    c.acts = c.acts.filter((t) => now - t < 1000);
    if (c.acts.length >= HOST.actPerSec) { audit('act_rate', (s.p && s.p.name) || '?', String(m.a || '').slice(0, 20)); return send(s, { t: 'ar', i: m.i, err: 'rate' }); }
    c.acts.push(now);
    const res = run(c, () => runAction(String(m.a || ''), m.args));
    checkRuntime(c);
    const patch = stateDiff(c.S, c.last);
    send(s, { t: 'ar', i: m.i, r: res && !res.error ? res.r : null, err: res && res.error, s: patch, ev: flushEvents(c) });
  }

  // ---- dùng cho chợ / giao dịch: chạy hàm trên nhân vật đang online ----
  function withAcc(accId, fn) {
    const c = ctxs.get(accId);
    if (!c) return { offline: true };
    const res = run(c, () => { try { const out = fn(G.S); calcStats(); return { ok: out }; } catch (e) { return { err: e }; } });
    if (res && res.err) throw res.err; // lỗi nghiệp vụ (không đủ Zen…) → chưa có gì thay đổi
    const patch = stateDiff(c.S, c.last);
    send(c.s, { t: 'ar', i: 0, s: patch, ev: flushEvents(c) });
    return { r: res && res.ok, patch };
  }
  /** Cập nhật bang hội (tên, cấp, chức vụ → buff) của người đang chơi khi bang thay đổi */
  function refreshGuild(accId) {
    if (!ctxs.has(accId)) return;
    try { withAcc(accId, (S) => { S.guild = guilds.brief(accId); }); } catch (e) { console.error('[host] refreshGuild', e); }
  }
  /** Tự nhận hộp thư khi đang chơi */
  function autoClaim(c) {
    if (!(c.acc.mail && c.acc.mail.length)) return;
    withAcc(c.acc.id, (S) => {
      const j = market.claim(c.acc, S), dl = j.delta, parts = [];
      if (dl.zen) parts.push(dl.zen.toLocaleString('vi-VN') + ' Zen');
      for (const [k, n] of Object.entries(dl.jewels)) if (n) parts.push(n + ' ' + JEWELS[k].name);
      if (dl.add.length) parts.push(dl.add.length + ' món đồ');
      if (parts.length) log('📬 Nhận từ hộp thư: ' + parts.join(', ') + '.', '#8fd0ff');
      if (j.left) log('📬 Túi đồ đầy — còn ' + j.left + ' thư chưa nhận, dọn túi rồi mở Chợ → Hộp thư.', '#ffb070');
      return j;
    });
  }

  return {
    join, leave, action, withAcc, autoClaim, refreshGuild,
    get: (accId) => ctxs.get(accId) || null,
    size: () => ctxs.size,
    load: () => ({ players: ctxs.size, tickMs: Math.round(loopMs * 100) / 100, budgetMs: HOST.tickMs }),
    flushAll() { for (const c of ctxs.values()) try { persist(c); } catch (e) { /* bỏ qua */ } },
  };
}
