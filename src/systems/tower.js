// Tháp Vô Tận: leo tầng liên tiếp trong một lượt cho tới khi thua hoặc tự rời.
// Dùng chung hạ tầng khu vực riêng với sự kiện (R.event + handler).
import { G } from '../core/state.js';
import { mapTier } from './loot.js';
import { expRate, eventTestOn } from './character.js';
import { emit, EV, log, announce } from '../core/events.js';
import { rnd, seededRng } from '../core/utils.js';
import { CFG } from '../config/constants.js';
import { MAPS } from '../config/maps.js';
import { MONSTER } from '../config/balance.js';
import { TOWER } from '../config/tower.js';
import { makeRuntime, createMob, enterMap } from './world.js';
import { grantReward } from './rewards.js';
import { today } from './quests.js';

// ---------------- TRẠNG THÁI LƯU ----------------
export const defaultTowerState = () => ({ best: 0, date: null, used: 0, runs: 0 });
const T = () => {
  const t = G.S.tower;
  if (t.date !== today()) { t.date = today(); t.used = 0; }
  return t;
};
export const isTowerUnlocked = () => G.S.lv >= TOWER.unlock.level || G.S.resets >= TOWER.unlock.orResets;
export const attemptsLeft = () => Math.max(0, TOWER.attemptsPerDay - T().used);
export const startFloor = () => Math.floor(T().best / TOWER.checkpointEvery) * TOWER.checkpointEvery + 1;

export function towerBlock() {
  if (G.R && G.R.event) return 'Anh đang ở trong một khu vực khác.';
  if (!isTowerUnlocked()) return 'Mở khi đạt cấp ' + TOWER.unlock.level + ' hoặc đã Reset.';
  if (attemptsLeft() <= 0) return 'Hết lượt hôm nay, quay lại vào ngày mai.';
  return null;
}

// ---------------- DỮ LIỆU TẦNG ----------------
/** Vùng đất theo cấp quái của tầng (khớp bản đồ có cùng tầm cấp); vượt quá thì xoay vòng 3 vùng cuối mỗi 10 tầng */
export function bandOf(floor) {
  const lv = TOWER.mobLevel(floor), i = MAPS.findIndex((M) => lv >= M.lv[0] && lv <= M.lv[1]);
  return i >= 0 ? i : MAPS.length - 3 + (Math.floor((floor - 1) / 10) % 3);
}
export function modifierOf(floor) {
  if (floor % TOWER.modifierEvery !== 0) return null;
  const rng = seededRng(floor * 7919);
  return TOWER.modifiers[Math.floor(rng() * TOWER.modifiers.length)];
}

const L = { x0: 15, x1: 25, y0: 15, y1: 25, start: { x: 20, y: 20 } };
const arenaCache = {};
export function towerArena(band) {
  if (arenaCache[band]) return arenaCache[band];
  const rng = seededRng(band * 313 + 5), tiles = [];
  for (let i = 0; i < CFG.MAP_W; i++) {
    tiles[i] = [];
    for (let j = 0; j < CFG.MAP_H; j++) {
      const inside = i >= L.x0 && i < L.x1 && j >= L.y0 && j < L.y1, ring = inside && (i === L.x0 || j === L.y0 || i === L.x1 - 1 || j === L.y1 - 1);
      tiles[i][j] = { kind: !inside ? 'edge' : ring ? 'town' : (i + j) % 2 ? 'g2' : 'g', r: rng(), r2: rng() };
    }
  }
  const decos = [];
  for (let k = L.x0; k <= L.x1; k += 2.5) for (const [x, y] of [[k, L.y0 - 0.5], [k, L.y1 + 0.5], [L.x0 - 0.5, k], [L.x1 + 0.5, k]])
    decos.push({ x, y, kind: Math.round(k * 2) % 2 ? 'pillar' : 'torch', s: 1, col: '#8a8494', seed: rng() });
  return (arenaCache[band] = { w: CFG.MAP_W, h: CFG.MAP_H, tiles, decos, centers: [{ x: 17, y: 17 }, { x: 23, y: 17 }, { x: 17, y: 23 }, { x: 23, y: 23 }, { x: 20, y: 20 }], bossCi: 0, layout: L });
}

export const towerMeta = (band) => ({ id: 'tower_' + band, name: TOWER.name, theme: themeFor(band), mobs: MAPS[band].mobs, boss: MAPS[band].boss, lv: [1, 1] });
function themeFor(band) {
  const M = MAPS[band];
  return { ...M.theme, town: '#5a5868', edge: '#0a0812', edgeKind: 'void', bg: '#05040a', deco: ['pillar', 'torch'] };
}

// ---------------- LUẬT CHƠI ----------------
const addTo = (acc, r) => { for (const k in r) if (k === 'item') acc.items = (acc.items || 0) + 1; else acc[k] = (acc[k] || 0) + r[k]; };

function spawnFloor(E) {
  const n = E.floor, band = bandOf(n), M = MAPS[band], mod = modifierOf(n), lv = TOWER.mobLevel(n);
  const hpMul = TOWER.hpMul(n) * (mod && mod.hp ? mod.hp : 1), boss = n % TOWER.bossEvery === 0;
  E.mod = mod; E.ft = 0; E.limit = TOWER.timeLimit(n); E.state = 'fight';
  const count = boss ? TOWER.bossAdds : Math.round(TOWER.mobCount(n) * (mod && mod.count ? mod.count : 1));
  const opt = { event: true, noRespawn: true, hpMul, dmgMul: mod && mod.dmg ? mod.dmg : 1, expMul: mod && mod.exp ? mod.exp : 1, aggro: 12, leash: 60 };
  for (let i = 0; i < count; i++) {
    const side = i % 4, t = rnd(L.x0 + 1, L.x1 - 1);
    const [x, y] = [[t, L.y0 + 1], [t, L.y1 - 1], [L.x0 + 1, t], [L.x1 - 1, t]][side];
    const m = createMob(M.mobs[i % 3], lv, x, y, opt);
    if (mod && mod.spd) m.spd *= mod.spd;
  }
  if (boss) {
    const b = createMob(M.boss, lv + 5, (L.x0 + L.x1) / 2, L.y0 + 2, { ...opt, boss: true, hpMul: hpMul * 0.6 });
    if (mod && mod.spd) b.spd *= mod.spd;
  }
  E.mobExp = MONSTER.exp(lv);
  announce(TOWER.icon + ' Tầng ' + n + (boss ? ' — BOSS ' + M.boss.name : '') + (mod ? ' · ' + mod.name : ''));
}

function clearFloor(E) {
  const S = G.S, n = E.floor, t = T(), first = n > t.best;
  // EXP thưởng tính theo cấp người chơi (không quá cấp quái) — tránh vượt hàng trăm cấp ngay sau Reset
  let r = TOWER.firstClear(n, Math.min(E.mobExp, MONSTER.exp(G.S.lv + 10)), expRate());
  if (!first) r = { zen: Math.round(r.zen * TOWER.repeatFactor.zen), exp: Math.round(r.exp * TOWER.repeatFactor.exp) };
  if (r.item && r.item.tier == null) r.item = { ...r.item, tier: mapTier() };
  grantReward(r);
  addTo(E.runReward, r);
  if (first) { t.best = n; E.newRecord = true; }
  E.cleared++;
  E.state = 'break'; E.bt = TOWER.breakSec;
  const p = G.R.p, P = G.P;
  p.hp = Math.min(P.maxHp, p.hp + P.maxHp * TOWER.healOnClear);
  p.mp = Math.min(P.maxMp, p.mp + P.maxMp * TOWER.healOnClear);
  for (const d of G.R.drops) { d.x = p.x; d.y = p.y; } // gom đồ rơi về chân nhân vật để tự nhặt
  announce('✔ Vượt tầng ' + n + (first ? ' (kỷ lục mới!)' : ''));
  emit(EV.TOWER_FLOOR, n, first);
}

function endRun(reason) {
  const E = G.R.event;
  if (E.over) return;
  E.over = true; E.endT = 2.5; E.reason = reason;
  G.R.mobs = [];
  E.result = { from: E.startFloor, reached: E.floor, cleared: E.cleared, best: T().best, newRecord: E.newRecord, reason, reward: E.runReward };
  announce(reason === 'leave' ? 'Rời tháp' : reason === 'timeout' ? 'Hết giờ!' : 'Thất bại ở tầng ' + E.floor);
}

function makeHandler(E) {
  return {
    update(dt) {
      if (E.over) { E.endT -= dt; if (E.endT <= 0) this.leave(); return; }
      if (E.state === 'break') { E.bt -= dt; if (E.bt <= 0) { E.floor++; syncTowerBand(); spawnFloor(E); } return; }
      E.ft += dt; E.t += dt;
      if (E.ft >= E.limit) { endRun('timeout'); return; }
      if (G.R.mobs.length === 0) clearFloor(E);
    },
    onKill() { /* tiến độ tính bằng số quái còn lại */ },
    onDeath() { endRun('death'); },
    leave() {
      if (!E.over) endRun('leave');
      const res = E.result;
      enterMap(G.S.map);
      emit(EV.TOWER_END, res);
    },
    /** Thông tin cho HUD */
    hud() {
      const left = Math.max(0, E.limit - E.ft);
      return {
        name: TOWER.icon + ' Tầng ' + E.floor,
        time: E.state === 'break' ? 'Nghỉ ' + Math.ceil(E.bt) + 's' : left,
        info: E.over ? 'Đang tổng kết…' : E.state === 'break' ? 'Chuẩn bị lên tầng ' + (E.floor + 1) + '…'
          : 'Quái còn lại: ' + G.R.mobs.length + (E.mod ? ' · ' + E.mod.name : '') + ' · Đã vượt ' + E.cleared + ' tầng',
      };
    },
  };
}

export function enterTower() {
  const block = towerBlock();
  if (block) { log(block, '#f88'); return false; }
  const t = T();
  t.used++; t.runs++;
  const floor = startFloor(), band = bandOf(floor), arena = towerArena(band);
  const M = { id: 'tower_' + band, name: TOWER.name, theme: themeFor(band), mobs: MAPS[band].mobs, boss: MAPS[band].boss, lv: [1, 1] };
  makeRuntime('tw_' + band, arena, M, L.start, {
    bounds: { x0: L.x0 + 0.4, y0: L.y0 + 0.4, x1: L.x1 - 0.4, y1: L.y1 - 0.4 },
    event: { id: 'tower', tower: true, floor, startFloor: floor, cleared: 0, t: 0, ft: 0, limit: 90, state: 'fight', over: false, endT: 0, runReward: {}, newRecord: false },
  });
  const E = G.R.event;
  E.handler = makeHandler(E);
  spawnFloor(E);
  log(TOWER.icon + ' Bắt đầu leo <b>' + TOWER.name + '</b> từ tầng ' + floor + '. Còn ' + attemptsLeft() + ' lượt hôm nay.', '#8fd0ff');
  return true;
}

/** Đổi vùng đất khi lên tầng mới thuộc nhóm 10 tầng khác: khởi tạo lại sàn đấu nhưng giữ lượt leo */
export function syncTowerBand() {
  const R = G.R, E = R && R.event;
  if (!E || !E.tower) return;
  const band = bandOf(E.floor), key = 'tw_' + band;
  if (R.mapIndex === key) return;
  R.mapIndex = key;
  R.map = towerArena(band);
  R.M = { id: 'tower_' + band, name: TOWER.name, theme: themeFor(band), mobs: MAPS[band].mobs, boss: MAPS[band].boss, lv: [1, 1] };
}
