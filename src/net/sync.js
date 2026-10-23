// =====================================================================
//  ĐỒNG BỘ THẾ GIỚI máy chủ → máy người chơi (chế độ máy chủ)
// =====================================================================
// Máy chủ chạy game thật; máy người chơi chỉ VẼ. File này dùng chung cho cả hai:
//  - packRuntime / runtimeInit: máy chủ đóng gói G.R (quái, đồ rơi, đạn, hiệu ứng mới…) gửi 10 lần/giây
//  - buildRuntime / applySnapshot: máy người chơi dựng lại G.R để renderer/HUD dùng như bình thường
//  - stateDiff / applyState: bản lưu G.S gửi theo phần thay đổi (chỉ các khoá cấp 1 bị đổi)
import { G } from '../core/state.js';
import { MAPS } from '../config/maps.js';
import { EVENTS } from '../config/events.js';
import { generateMap } from '../systems/world.js';
import { generateArena } from '../systems/events.js';
import { towerArena, towerMeta } from '../systems/tower.js';
import { gbossArena, gbossMeta } from '../systems/gboss.js';
import { siegeArena, siegeMeta } from '../systems/siege.js';

// ---------------- MẪU QUÁI (tham chiếu → khoá) ----------------
const TPL = new Map(), TPL_BY_KEY = {};
const reg = (key, t) => { if (t && !TPL.has(t)) { TPL.set(t, key); TPL_BY_KEY[key] = t; } };
MAPS.forEach((M) => { M.mobs.forEach((t, i) => reg(M.id + '.' + i, t)); reg(M.id + '.boss', M.boss); });
Object.values(EVENTS).forEach((E) => { (E.mobs || []).forEach((t, i) => reg('ev_' + E.id + '.' + i, t)); reg('ev_' + E.id + '.boss', E.boss); reg('ev_' + E.id + '.gate', E.gate); });
const tplKey = (t) => TPL.get(t) || null;

// Chỉ gửi các trường cần để VẼ quái (không gửi trường AI nội bộ)
const MOB_FIELDS = ['x', 'y', 'hp', 'maxHp', 'lv', 'name', 'shape', 'size', 'c1', 'c2', 'boss', 'elite', 'kind', 'invuln', 'face', 'moving',
  'flash', 'hpShow', 'lunge', 'stun', 'slowT', 'cast', 'event', 'angry', 'pvp', 'team', 'pid', 'siegeGate'];
const SKIP_P = new Set(['target', 'path', 'pathGoal', 'pathT', 'prog', 'stuck']);
const r2 = (v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v);
const same = (a, b) => a === b || (a && b && typeof a === 'object' && JSON.stringify(a) === JSON.stringify(b));

/** Bộ nhớ đệm phía máy chủ cho từng người chơi: để chỉ gửi phần thay đổi */
export const newSyncCache = () => ({ sent: new WeakSet(), mobs: new Map(), p: {}, drops: '' });

function diffObj(cur, prev) {
  const o = {};
  let any = false;
  for (const k in cur) if (!same(cur[k], prev[k])) { o[k] = cur[k]; any = true; }
  return any ? o : null;
}
function packMob(m) {
  const o = { tk: tplKey(m.tpl) };
  for (const k of MOB_FIELDS) { const v = m[k]; if (v !== undefined && v !== null && v !== false && v !== 0) o[k] = typeof v === 'number' ? r2(v) : v; else if (k === 'hp' || k === 'x' || k === 'y') o[k] = v; }
  return o;
}
const refId = (o, R) => (o && typeof o === 'object' ? (o === R.p ? '@p' : o.id || null) : null);

/** Thông tin để máy người chơi dựng lại bản đồ đang đứng */
export function runtimeInit(R) {
  const E = R.event;
  return { key: R.mapIndex, M: R.M, bounds: R.bounds, spawn: R.spawnPoint, ev: E ? { id: E.id, tower: !!E.tower } : null };
}

/**
 * Ảnh chụp thế giới quanh người chơi — chỉ phần thay đổi so với lần trước (cache = newSyncCache()).
 * Quái: mỗi con trong tầm nhìn luôn có mặt trong danh sách (ít nhất là id); con mới gửi đủ trường.
 */
export function packRuntime(R, cache, radius = 22) {
  const p = R.p, P = {};
  for (const k in p) if (!SKIP_P.has(k)) { const v = p[k]; P[k] = typeof v === 'number' ? r2(v) : v; }
  P.target = refId(p.target, R);
  const dp = diffObj(P, cache.p); cache.p = P;
  const near = (o) => Math.abs(o.x - p.x) + Math.abs(o.y - p.y) < radius;
  const mobs = [], keep = new Map();
  for (const m of R.mobs) {
    if (!(m.hp > 0) || !(m.boss || m.kind === 'gate' || near(m))) continue;
    const full = packMob(m), prev = cache.mobs.get(m.id);
    keep.set(m.id, full);
    if (!prev) { mobs.push({ id: m.id, ...full }); continue; }
    const d = {};
    for (const k in full) if (!same(full[k], prev[k])) d[k] = full[k];
    for (const k in prev) if (!(k in full)) d[k] = null; // trường bị xoá (vd. hết choáng)
    mobs.push({ id: m.id, ...d });
  }
  cache.mobs = keep;
  const fx = [], texts = [];
  for (const f of R.fx) if (!cache.sent.has(f)) { cache.sent.add(f); fx.push(f); }
  for (const t of R.texts) if (!cache.sent.has(t)) { cache.sent.add(t); texts.push(t); }
  const drops = R.drops.map((d) => ({ ...d, x: r2(d.x), y: r2(d.y) })), dsig = JSON.stringify(drops);
  const dropsOut = dsig !== cache.drops ? drops : undefined;
  cache.drops = dsig;
  const E = R.event;
  let ev = null;
  if (E) {
    ev = {};
    for (const k in E) if (k !== 'handler' && k !== 'def' && k !== 'gate') ev[k] = E[k];
    ev.gate = E.gate ? E.gate.id : null;
    if (E.handler && E.handler.hud) ev.hud = E.handler.hud();
  }
  const pk = (pr) => ({ x: r2(pr.x), y: r2(pr.y), k: pr.k, tx: pr.tgt ? r2(pr.tgt.x) : r2(pr.x), ty: pr.tgt ? r2(pr.tgt.y) : r2(pr.y) });
  return {
    t: r2(R.t), auto: R.auto, travel: !!R.travel, manualT: r2(R.manualT), boss: R.boss ? R.boss.id : null,
    p: dp, mobs, drops: dropsOut, projs: R.projs.concat(R.vprojs || []).map(pk), eprojs: R.eprojs.map(pk), fx, texts, ev,
  };
}

// ---------------- MÁY NGƯỜI CHƠI: DỰNG LẠI ----------------
function mapForKey(key) {
  if (typeof key === 'number') return generateMap(key);
  if (/^ev_/.test(key)) return generateArena(EVENTS[key.slice(3)]);
  if (key === 'gb') return gbossArena();
  if (key === 'sg') return siegeArena();
  if (/^tw_/.test(key)) return towerArena(+key.slice(3));
  return generateMap(0);
}

/** Tạo G.R rỗng theo thông tin máy chủ gửi (bản đồ dựng lại tại máy, giống hệt máy chủ vì sinh bằng hạt giống cố định) */
export function buildRuntime(init) {
  const prev = G.R, map = mapForKey(init.key);
  const M = init.M || (typeof init.key === 'number' ? MAPS[init.key] : init.key === 'gb' ? gbossMeta() : init.key === 'sg' ? siegeMeta() : towerMeta(+String(init.key).slice(3)));
  G.R = {
    mapIndex: init.key, map, M, remote: true,
    mobs: [], drops: [], projs: [], eprojs: [], fx: [], texts: [], respawn: [],
    t: 0, auto: prev ? prev.auto : false, boss: null, travel: false, manualT: 0,
    p: { x: init.spawn.x, y: init.spawn.y, sx: init.spawn.x, sy: init.spawn.y, face: 1, moving: false, atk: 0, dead: 0, hp: G.P ? G.P.maxHp : 1, mp: G.P ? G.P.maxMp : 1, cds: {}, buffs: {}, gcd: 0 },
    bounds: init.bounds, spawnPoint: init.spawn, event: null, panel: prev ? prev.panel : null, saveOk: true,
    _mobs: new Map(),
  };
  return G.R;
}

/** Áp dụng ảnh chụp: giữ đối tượng quái cũ (để nội suy mượt), thêm hiệu ứng mới */
export function applySnapshot(R, s) {
  R.auto = s.auto; R.travel = s.travel; R.manualT = s.manualT;
  // người chơi: vị trí đích để nội suy
  const p = R.p;
  if (s.p) {
    const { x, y, ...rest } = s.p;
    Object.assign(p, rest);
    if (x != null) { if (Math.abs(x - p.x) > 4) p.x = x; p.sx = x; }
    if (y != null) { if (Math.abs(y - p.y) > 4) p.y = y; p.sy = y; }
    if ('target' in s.p) p._tid = s.p.target;
  }
  // quái
  const seen = new Set(), list = [];
  for (const o of s.mobs) {
    seen.add(o.id);
    let m = R._mobs.get(o.id);
    const { x: mx, y: my, tk, ...mr } = o;
    if (!m) { m = { x: mx, y: my, sx: mx, sy: my }; R._mobs.set(o.id, m); }
    for (const k in mr) { if (mr[k] === null) delete m[k]; else m[k] = mr[k]; }
    if (tk !== undefined) m.tpl = TPL_BY_KEY[tk] || { name: m.name, shape: m.shape, c1: m.c1, c2: m.c2 };
    if (mx != null) { if (Math.abs(mx - m.x) > 4) m.x = mx; m.sx = mx; }
    if (my != null) { if (Math.abs(my - m.y) > 4) m.y = my; m.sy = my; }
    list.push(m);
  }
  for (const k of R._mobs.keys()) if (!seen.has(k)) R._mobs.delete(k);
  R.mobs = list;
  R.boss = s.boss ? R._mobs.get(s.boss) || null : null;
  p.target = p._tid ? R._mobs.get(p._tid) || null : null;
  if (s.drops) R.drops = s.drops;
  const withTgt = (pr) => { pr.tgt = { x: pr.tx, y: pr.ty }; return pr; };
  R.projs = s.projs.map(withTgt); R.eprojs = s.eprojs.map(withTgt);
  for (const f of s.fx) R.fx.push(f);
  for (const t of s.texts) R.texts.push(t);
  if (s.ev) {
    const E = s.ev;
    E.def = EVENTS[E.id] || null;
    E.gate = E.gate ? R._mobs.get(E.gate) || null : null;
    const hud = E.hud;
    E.handler = hud ? { hud: () => hud } : null;
    R.event = E;
  } else R.event = null;
}

/** Mỗi khung hình (máy người chơi): nội suy vị trí, chạy thời gian hiệu ứng — không tính luật chơi */
export function viewTick(R, dt) {
  R.t += dt;
  const k = Math.min(1, dt * 12);
  const p = R.p;
  if (p.sx != null) { p.x += (p.sx - p.x) * k; p.y += (p.sy - p.y) * k; }
  for (const m of R.mobs) if (m.sx != null) { m.x += (m.sx - m.x) * k; m.y += (m.sy - m.y) * k; }
  const kp = Math.min(1, dt * 14);
  for (const pr of R.projs) { pr.x += (pr.tx - pr.x) * kp; pr.y += (pr.ty - pr.y) * kp; }
  for (const pr of R.eprojs) { pr.x += (pr.tx - pr.x) * kp; pr.y += (pr.ty - pr.y) * kp; }
  for (let i = R.fx.length - 1; i >= 0; i--) { const f = R.fx[i]; f.t += dt; if (f.follow) { f.x = p.x; f.y = p.y; } if (f.t >= f.d) R.fx.splice(i, 1); }
  for (let i = R.texts.length - 1; i >= 0; i--) { R.texts[i].t += dt; if (R.texts[i].t > 1) R.texts.splice(i, 1); }
}

// ---------------- BẢN LƯU (G.S) ----------------
/** Các khoá cấp 1 của S đã đổi so với lần gửi trước. last: Map khoá → chuỗi JSON đã gửi */
export function stateDiff(S, last) {
  const out = {};
  let any = false;
  for (const k of Object.keys(S)) {
    const j = JSON.stringify(S[k]);
    if (last.get(k) !== j) { last.set(k, j); out[k] = S[k] === undefined ? null : JSON.parse(j); any = true; }
  }
  return any ? out : null;
}
export function applyState(S, patch) { for (const k in patch) S[k] = patch[k]; }

// ---------------- SỰ KIỆN ----------------
/** Sự kiện game máy chủ chuyển cho máy người chơi (để hiện chữ, rung màn hình, phát âm thanh, mở bảng kết quả…) */
export const FORWARD_EVENTS = ['log', 'announce', 'levelUp', 'kill', 'playerDie', 'mapEnter', 'upgrade', 'craft', 'auto', 'points', 'pickup', 'skill', 'hit', 'basic',
  'playerHit', 'bossCast', 'bossSlam', 'shake', 'skillLearn', 'potion', 'buy', 'reset', 'tierUp', 'quest', 'event', 'eventEnd', 'towerFloor', 'towerEnd', 'gbossEnd', 'siegeEnd', 'siegeGate', 'siegeThrone', 'inventory'];
/** Tham số sự kiện → dữ liệu gửi được (quái → tóm tắt có id) */
export function packArg(a) {
  if (!a || typeof a !== 'object') return a;
  if (a.tpl && a.hp != null) return { $m: a.id, id: a.id, x: r2(a.x), y: r2(a.y), boss: a.boss, name: a.name, size: a.size, c1: a.c1, lv: a.lv, elite: !!a.elite, event: !!a.event };
  try { return JSON.parse(JSON.stringify(a)); } catch (e) { return null; }
}
export const unpackArg = (R, a) => (a && a.$m ? (R && R._mobs.get(a.$m)) || a : a);
