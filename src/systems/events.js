// Sự kiện theo giờ: lịch mở cổng, đấu trường riêng, luật chơi Huyết Lâu & Quảng Trường Quỷ.
import { G } from '../core/state.js';
import { mapTier } from './loot.js';
import { expRate, eventTestOn } from './character.js';
import { on, emit, EV, log, announce, sysOn } from '../core/events.js';
import { rnd, pick, seededRng } from '../core/utils.js';
import { CFG } from '../config/constants.js';
import { EVENTS } from '../config/events.js';
import { makeRuntime, createMob, enterMap } from './world.js';
import { grantReward } from './rewards.js';

// ---------------- LỊCH ----------------
/** Trạng thái lịch: { open, secLeft } khi đang mở, { open:false, secUntil } khi đóng */
export function eventStatus(def, d = new Date()) {
  const m = d.getMinutes() + d.getSeconds() / 60, { starts, window } = def.schedule;
  for (const s of starts) if (m >= s && m < s + window) return { open: true, secLeft: Math.ceil((s + window - m) * 60) };
  let best = Infinity;
  for (const s of starts) { let diff = s - m; if (diff <= 0) diff += 60; best = Math.min(best, diff); }
  return { open: false, secUntil: Math.ceil(best * 60) };
}
export const isEventOpen = (def) => eventTestOn() || eventStatus(def).open;

/** Lý do không vào được (null = vào được) */
export function entryBlock(id) {
  const S = G.S, def = EVENTS[id];
  if (G.R && G.R.event) return 'Anh đang ở trong một sự kiện khác.';
  if (S.lv < def.minLevel) return 'Cần đạt cấp ' + def.minLevel + '.';
  if (!isEventOpen(def)) return 'Cổng chưa mở.';
  if ((S.tickets[def.ticket] || 0) <= 0) return 'Cần 1 vé vào cửa.';
  return null;
}

// ---------------- ĐẤU TRƯỜNG ----------------
const LAYOUT = {
  // Hành lang dài, Cổng Thành ở giữa, phòng boss phía sau
  bc: { x0: 2, x1: 31, y0: 17, y1: 23, gateX: 22.5, roomFrom: 23, start: { x: 3.5, y: 20 }, phase1X1: 21.6, waypoints: [5, 9, 13, 17, 20.5, 27].map((x) => ({ x, y: 20 })) },
  // Quảng trường vuông
  ds: { x0: 13, x1: 27, y0: 13, y1: 27, start: { x: 20, y: 20 }, waypoints: [[16, 16], [24, 16], [16, 24], [24, 24], [20, 20]].map(([x, y]) => ({ x, y })) },
};

export function generateArena(def) {
  const L = LAYOUT[def.id], rng = seededRng(def.id.charCodeAt(0) * 131), tiles = [];
  for (let i = 0; i < CFG.MAP_W; i++) {
    tiles[i] = [];
    for (let j = 0; j < CFG.MAP_H; j++) {
      const inside = i >= L.x0 && i < L.x1 && j >= L.y0 && j < L.y1;
      const room = L.roomFrom && i >= L.roomFrom;
      tiles[i][j] = { kind: !inside ? 'edge' : room ? 'town' : (i + j) % 2 ? 'g2' : 'g', r: rng(), r2: rng() };
    }
  }
  const decos = [], kinds = def.theme.deco;
  if (def.id === 'bc') {
    for (let x = L.x0 + 1; x < L.x1; x += 3) for (const y of [L.y0 - 0.4, L.y1 + 0.4]) decos.push({ x, y, kind: (x / 3) % 2 < 1 ? kinds[0] : kinds[1], s: 1, col: def.theme.dcol, seed: rng() });
  } else {
    for (let k = L.x0; k <= L.x1; k += 2.8) for (const [x, y] of [[k, L.y0 - 0.4], [k, L.y1 + 0.4], [L.x0 - 0.4, k], [L.x1 + 0.4, k]]) decos.push({ x, y, kind: rng() < 0.5 ? kinds[0] : kinds[1], s: 0.9, col: def.theme.dcol, seed: rng() });
  }
  return { w: CFG.MAP_W, h: CFG.MAP_H, tiles, decos, centers: L.waypoints, bossCi: 0, layout: L };
}

/** Quái sự kiện đánh nhẹ hơn quái thường (bị vây đông, chết là thua) */
const EVENT_DMG_MUL = 0.6;
const eventMob = (tpl, x, y, extra = {}) => createMob(tpl, G.R.event.lv, x, y, { event: true, noRespawn: true, hpMul: 0.8, dmgMul: EVENT_DMG_MUL, expMul: 1.5, aggro: 9, leash: 60, ...extra });

export function enterEvent(id) {
  const block = entryBlock(id);
  if (block) { log(block, '#f88'); return false; }
  const S = G.S, def = EVENTS[id], arena = generateArena(def), L = arena.layout;
  S.tickets[def.ticket]--;
  const M = { id: 'arena_' + id, name: def.name, theme: def.theme, mobs: def.mobs, boss: def.boss, lv: [S.lv, S.lv] };
  makeRuntime('ev_' + id, arena, M, L.start, {
    bounds: { x0: L.x0 + 0.4, y0: L.y0 + 0.4, x1: (L.phase1X1 || L.x1 - 0.4), y1: L.y1 - 0.4 },
    event: { id, def, lv: Math.max(1, S.lv + def.levelOffset), t: 0, kills: 0, score: 0, phase: 'clear', over: false, endT: 0, spawnT: 0, wave: -1, waveT: 0, toSpawn: 0, bossKilled: false },
  });
  const E = G.R.event;
  if (id === 'bc') {
    E.gate = eventMob(def.gate, L.gateX, (L.y0 + L.y1) / 2, { static: true, invuln: true, hpMul: def.gateHpMul, kind: 'gate', expMul: 3 });
  } else nextWave();
  announce(def.icon + ' ' + def.name + ' bắt đầu!');
  log(def.icon + ' <b>' + def.name + '</b>: ' + def.desc, '#ffb070');
  return true;
}

// ---------------- LUẬT CHƠI ----------------
function spawnBc() {
  const R = G.R, E = R.event, L = R.map.layout, def = E.def;
  const alive = R.mobs.filter((m) => !m.static).length;
  if (alive >= def.maxAlive) return;
  const xMin = Math.min(L.phase1X1 - 1, Math.max(L.x0 + 2, R.p.x + 4)), x = rnd(xMin, L.phase1X1), y = rnd(L.y0 + 0.8, L.y1 - 0.8);
  eventMob(pick(def.mobs), x, y);
}

function nextWave() {
  const E = G.R.event, def = E.def;
  E.wave++;
  if (E.wave >= def.waves.length) { finish(true); return; }
  const W = def.waves[E.wave];
  E.waveT = 0; E.toSpawn = W.count; E.spawnT = 0;
  announce('Đợt ' + (E.wave + 1) + ' / ' + def.waves.length);
  if (W.boss) { const L = G.R.map.layout; eventMob(def.boss, (L.x0 + L.x1) / 2, L.y0 + 1.5, { boss: true, hpMul: 0.8 * def.bossHpMul }); announce('⚠ ' + def.boss.name + ' xuất hiện!'); }
}

function spawnDs() {
  const R = G.R, E = R.event, L = R.map.layout, W = E.def.waves[E.wave];
  for (let k = 0; k < E.def.batch && E.toSpawn > 0; k++) {
    // Sinh ở mép quảng trường, cách người chơi một khoảng
    let x, y, tries = 0;
    do {
      const side = Math.floor(Math.random() * 4), t = rnd(L.x0 + 1, L.x1 - 1);
      [x, y] = [[t, L.y0 + 1], [t, L.y1 - 1], [L.x0 + 1, t], [L.x1 - 1, t]][side];
    } while (Math.hypot(x - R.p.x, y - R.p.y) < 4 && ++tries < 8);
    eventMob(E.def.mobs[pick(W.mobs)], x, y);
    E.toSpawn--;
  }
}

export function updateEvent(dt) {
  const R = G.R, E = R.event;
  if (!E) return;
  if (E.handler) { E.handler.update(dt); return; } // khu vực có luật riêng (vd. Tháp Vô Tận)
  if (E.over) { E.endT -= dt; if (E.endT <= 0) leaveEvent(); return; }
  E.t += dt;
  if (E.t >= E.def.timeLimit) { announce('Hết giờ!'); finish(E.id === 'ds'); return; }
  E.spawnT -= dt;
  if (E.id === 'bc') {
    if (E.phase === 'clear' && E.spawnT <= 0) { E.spawnT = 0.6; spawnBc(); }
  } else {
    E.waveT += dt;
    const W = E.def.waves[E.wave], alive = R.mobs.length;
    if (E.toSpawn > 0 && E.spawnT <= 0 && alive < 10) { E.spawnT = 2.5; spawnDs(); }
    if ((E.toSpawn <= 0 && alive === 0) || E.waveT >= W.time) nextWave();
  }
}

function onKill(m) {
  const R = G.R, E = R && R.event;
  if (!E || E.over || !m.event) return;
  if (E.handler) { E.handler.onKill(m); return; }
  if (E.id === 'bc') {
    if (m.kind === 'gate') {
      E.phase = 'boss';
      R.bounds.x1 = R.map.layout.x1 - 0.4;
      const L = R.map.layout;
      eventMob(E.def.boss, L.x1 - 3, (L.y0 + L.y1) / 2, { boss: true, hpMul: E.def.bossHpMul });
      announce('Cổng Thành sụp đổ! ' + E.def.boss.name + ' xuất hiện!');
    } else if (m.boss) { E.bossKilled = true; finish(true); }
    else if (E.phase === 'clear') {
      E.kills++;
      if (E.kills >= E.def.killQuota) { E.phase = 'gate'; E.gate.invuln = false; announce('Phép bảo hộ đã vỡ — phá Cổng Thành!'); }
    }
  } else {
    E.kills++;
    E.score += m.boss ? E.def.points.boss : E.def.points.normal;
    if (m.boss) E.bossKilled = true;
  }
}

function finish(success) {
  const R = G.R, E = R.event, S = G.S;
  if (!E || E.over) return;
  E.over = true;
  E.endT = 2.5;
  const secLeft = Math.max(0, Math.round(E.def.timeLimit - E.t));
  let reward;
  if (E.id === 'bc') reward = success ? E.def.reward(E.lv, expRate(), secLeft) : E.def.failReward(E.lv);
  else reward = E.def.reward(E.lv, expRate(), E.score, E.bossKilled);
  if (reward.item && reward.item.tier == null) reward.item = { ...reward.item, tier: mapTier() };
  if (!reward.item) delete reward.item;
  grantReward(reward);
  E.result = { id: E.id, success, secLeft, time: Math.round(E.t), kills: E.kills, score: E.score, wave: E.wave + 1, bossKilled: E.bossKilled, reward };
  announce(success ? '🏆 ' + E.def.name + ' — HOÀN THÀNH!' : E.def.name + ' — Thất bại');
  R.mobs.forEach((m) => (m.angry = false));
  R.mobs = R.mobs.filter((m) => m.static);
  emit(EV.EVENT, E.id, success);
}

export function leaveEvent() {
  const E = G.R && G.R.event;
  if (!E) return;
  if (E.handler) { E.handler.leave(); return; }
  if (!E.over) finish(false);
  const result = E.result;
  enterMap(G.S.map);
  emit(EV.EVENT_END, result);
}

let inited = false;
export function initEvents() {
  if (inited) return;
  inited = true;
  sysOn(EV.KILL, onKill);
  sysOn(EV.PLAYER_DIE, () => { const E = G.R && G.R.event; if (E && !E.over) { announce('Anh đã gục ngã!'); if (E.handler) E.handler.onDeath(); else finish(false); } });
}

export { EVENTS, eventMob as _eventMob };
