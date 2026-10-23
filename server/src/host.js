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
import { on, EV, log } from '../../src/core/events.js';
import { update } from '../../src/systems/game.js';
import { calcStats } from '../../src/systems/stats.js';
import { enterMap } from '../../src/systems/world.js';
import { createCharacter } from '../../src/systems/character.js';
import { initQuests, ensureDaily } from '../../src/systems/quests.js';
import { initFashion, checkUnlocks } from '../../src/systems/fashion.js';
import { initSkills } from '../../src/systems/skills.js';
import { initEvents } from '../../src/systems/events.js';
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

export function createHost({ accounts, store, market, send, onPresence, announceAll }) {
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
  initQuests(); initSkills(); initFashion(); initEvents();

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

  // ---- vòng lặp ----
  let last = Date.now(), snapT = 0, stateT = 0, loopMs = 0;
  setInterval(() => {
    const t0 = process.hrtime.bigint();
    const now = Date.now(), dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    snapT += HOST.tickMs; stateT += HOST.tickMs;
    const doSnap = snapT >= HOST.snapMs, doState = stateT >= HOST.stateMs;
    if (doSnap) snapT = 0;
    if (doState) stateT = 0;
    for (const c of ctxs.values()) try {
      run(c, () => update(dt));
      const R = c.R, p = R.p;
      onPresence(c.s, { room: R.event ? null : 'm' + R.mapIndex, pos: { x: p.x, y: p.y, tx: p.tx, ty: p.ty, f: p.face, mv: p.moving } });
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
      S = createCharacter(cls, String(create.name || 'Hiệp Sĩ').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 12) || 'Hiệp Sĩ');
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
    if (c.acts.length >= HOST.actPerSec) return send(s, { t: 'ar', i: m.i, err: 'rate' });
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
    join, leave, action, withAcc, autoClaim,
    get: (accId) => ctxs.get(accId) || null,
    size: () => ctxs.size,
    load: () => ({ players: ctxs.size, tickMs: Math.round(loopMs * 100) / 100, budgetMs: HOST.tickMs }),
    flushAll() { for (const c of ctxs.values()) try { persist(c); } catch (e) { /* bỏ qua */ } },
  };
}
