// Thế giới: sinh dữ liệu bản đồ (thuần dữ liệu, không vẽ), vào bản đồ, sinh quái.
import { G, inSafe } from '../core/state.js';
import { log, emit, EV } from '../core/events.js';
import { uid, rnd, clamp, seededRng } from '../core/utils.js';
import { CFG, SPAWN, SAFE_RADIUS } from '../config/constants.js';
import { MAPS } from '../config/maps.js';
import { MONSTER } from '../config/balance.js';
import { calcStats } from './stats.js';
import { blockedAt } from './nav.js';

const cache = {};
const TOWN_R = 5.2;   // bán kính thị trấn (vùng an toàn)
const ZONES = 4;      // số vùng quái (mỗi vùng 1 loại quái, càng xa thị trấn càng mạnh)

/** Nhiễu giá trị (value noise) có seed, mượt theo ô lưới cỡ `cell` */
function makeNoise(rng, cell) {
  const G = new Map(), at = (i, j) => { const k = i * 4096 + j; let v = G.get(k); if (v == null) { v = rng(); G.set(k, v); } return v; };
  const sm = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = x / cell, fy = y / cell, i = Math.floor(fx), j = Math.floor(fy), u = sm(fx - i), v = sm(fy - j);
    const a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

/**
 * Sinh bản đồ rộng theo seed (luôn giống nhau cho cùng bản đồ):
 *  thị trấn ở giữa · hồ/dung nham/vách đá chặn đường · đường mòn nối thị trấn tới các bãi quái ·
 *  4 vùng quái theo khoảng cách · hang boss ở xa nhất · cây cối mọc thành cụm.
 * tiles[i][j] = { kind: 'edge'|'town'|'path'|'lair'|'g'|'g2', r, r2 } · block[i*h+j] = 1 nếu không đi được
 */
export function generateMap(mi) {
  if (cache[mi]) return cache[mi];
  const M = MAPS[mi], th = M.theme, rng = seededRng(mi * 9973 + 7), w = M.size || 80, h = w;
  const town = { x: w / 2 + 0.5, y: h / 2 + 0.5 };
  const nLake = makeNoise(rng, 9), nDet = makeNoise(rng, 3.5), nGrass = makeNoise(rng, 6), nTree = makeNoise(rng, 7);
  const tiles = [], block = new Uint8Array(w * h), idx = (i, j) => i * h + j;
  for (let i = 0; i < w; i++) {
    tiles[i] = [];
    for (let j = 0; j < h; j++) {
      const dt = Math.hypot(i + 0.5 - town.x, j + 0.5 - town.y), border = Math.min(i, j, w - 1 - i, h - 1 - j);
      const lake = nLake(i, j) * 0.75 + nDet(i, j) * 0.25;
      let kind = nGrass(i, j) + rng() * 0.25 > 0.62 ? 'g2' : 'g';
      if (border < 1.5 + nDet(i * 1.7, j * 1.7) * 3.5 || (lake > 0.66 && dt > TOWN_R + 4)) kind = 'edge';
      if (dt < TOWN_R) kind = 'town';
      tiles[i][j] = { kind, r: rng(), r2: rng() };
      if (kind === 'edge') block[idx(i, j)] = 1;
    }
  }
  const carve = (x, y, r, kind) => {
    for (let i = Math.floor(x - r); i <= x + r; i++) for (let j = Math.floor(y - r); j <= y + r; j++) {
      if (i < 2 || j < 2 || i >= w - 2 || j >= h - 2 || Math.hypot(i + 0.5 - x, j + 0.5 - y) > r) continue;
      const T = tiles[i][j];
      if (T.kind === 'town') continue;
      if (kind || T.kind === 'edge') T.kind = kind || 'g';
      block[idx(i, j)] = 0;
    }
  };

  // Bãi quái: rải đều, cách thị trấn & cách nhau, ưu tiên chỗ trống
  const want = Math.round((w * h) / 230), centers = [];
  for (let tries = 0; centers.length < want && tries < 4000; tries++) {
    const x = 4 + rng() * (w - 8), y = 4 + rng() * (h - 8);
    if (Math.hypot(x - town.x, y - town.y) < TOWN_R + 6) continue;
    if (block[idx(Math.floor(x), Math.floor(y))]) continue;
    if (centers.some((c) => Math.hypot(c.x - x, c.y - y) < 6.5)) continue;
    centers.push({ x, y });
  }
  for (const c of centers) carve(c.x, c.y, 3);

  // Đường mòn: từ thị trấn tới từng bãi (đường cong nhẹ), rộng ~1.5 ô
  const road = (x0, y0, x1, y1, kind, r) => {
    const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 0.5), bend = (rng() - 0.5) * d * 0.35, nx = -(y1 - y0) / (d || 1), ny = (x1 - x0) / (d || 1);
    for (let k = 0; k <= n; k++) { const t = k / n, b = Math.sin(t * Math.PI) * bend; carve(x0 + (x1 - x0) * t + nx * b, y0 + (y1 - y0) * t + ny * b, r, kind); }
  };
  centers.sort((p, q) => Math.hypot(p.x - town.x, p.y - town.y) - Math.hypot(q.x - town.x, q.y - town.y));
  // Mỗi bãi nối tới bãi gần nhất phía trong (gần thị trấn hơn) → mạng đường dạng cây
  centers.forEach((c, k) => {
    let best = town, bd = Math.hypot(c.x - town.x, c.y - town.y);
    for (let q = 0; q < k; q++) { const o = centers[q], d = Math.hypot(c.x - o.x, c.y - o.y); if (d < bd) { bd = d; best = o; } }
    road(best.x, best.y, c.x, c.y, k < 10 || rng() < 0.5 ? 'path' : null, k < 10 ? 1.3 : 1);
  });
  // 4 cổng ra khỏi thị trấn
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) road(town.x + dx * (TOWN_R - 1), town.y + dy * (TOWN_R - 1), town.x + dx * (TOWN_R + 5), town.y + dy * (TOWN_R + 5), 'path', 1.3);

  // Dọn vùng không tới được từ thị trấn
  const seen = new Uint8Array(w * h), q = [idx(Math.floor(town.x), Math.floor(town.y))]; seen[q[0]] = 1;
  while (q.length) { const cur = q.pop(), ci = (cur / h) | 0, cj = cur % h; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= w || nj >= h) continue; const nb = idx(ni, nj); if (seen[nb] || block[nb]) continue; seen[nb] = 1; q.push(nb); } }
  for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) if (!seen[idx(i, j)] && !block[idx(i, j)]) { block[idx(i, j)] = 1; tiles[i][j].kind = 'edge'; }

  // Vùng quái theo khoảng cách + cấp quái tăng dần
  const dists = centers.map((c) => Math.hypot(c.x - town.x, c.y - town.y)), d0 = Math.min(...dists), d1 = Math.max(...dists);
  centers.forEach((c, k) => { const f = (dists[k] - d0) / Math.max(1, d1 - d0); c.f = f; c.type = Math.min(ZONES - 1, Math.floor(f * ZONES)); });
  const bossCi = centers.length - 1;
  const lair = centers[bossCi];
  for (let i = Math.floor(lair.x - 4); i <= lair.x + 4; i++) for (let j = Math.floor(lair.y - 4); j <= lair.y + 4; j++)
    if (tiles[i] && tiles[i][j] && !block[idx(i, j)] && Math.hypot(i + 0.5 - lair.x, j + 0.5 - lair.y) < 3.6) tiles[i][j].kind = 'lair';

  // Nhãn vùng cho bản đồ con: tâm trung bình của các bãi cùng loại
  const [lo, hi] = M.lv, zones = [];
  for (let z = 0; z < ZONES; z++) {
    const cs = centers.filter((c, k) => c.type === z && k !== bossCi);
    if (!cs.length) continue;
    const fs = cs.map((c) => c.f);
    zones.push({ type: z, x: cs.reduce((a, c) => a + c.x, 0) / cs.length, y: cs.reduce((a, c) => a + c.y, 0) / cs.length,
      name: M.mobs[z].name, lv: [Math.round(lo + (hi - lo) * Math.min(...fs)), Math.round(lo + (hi - lo) * Math.max(...fs))] });
  }

  // Trang trí: mọc thành cụm, tránh thị trấn / đường / bãi quái
  const decos = [];
  for (let i = 1; i < w - 1; i++) for (let j = 1; j < h - 1; j++) {
    const T = tiles[i][j];
    if (T.kind !== 'g' && T.kind !== 'g2') continue;
    const dens = nTree(i, j) > 0.6 ? 0.22 : 0.025;
    if (rng() > dens) continue;
    const x = i + 0.2 + rng() * 0.6, y = j + 0.2 + rng() * 0.6;
    if (centers.some((c) => Math.hypot(c.x - x, c.y - y) < 2.6)) continue;
    decos.push({ x, y, kind: th.deco[Math.floor(rng() * th.deco.length)], s: 0.8 + rng() * 0.5, col: th.dcol, seed: rng() });
  }
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) decos.push({ x: town.x + dx * (TOWN_R - 1.2), y: town.y + dy * (TOWN_R - 1.2), kind: 'torch', s: 1, col: '#fff', seed: 0 });
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) decos.push({ x: town.x + dx * 2.2 - dy * 2.2, y: town.y + dy * 2.2 + dx * 2.2, kind: 'torch', s: 0.8, col: '#fff', seed: 0 });

  return (cache[mi] = { index: mi, w, h, tiles, block, decos, centers, bossCi, town, townR: TOWN_R - 0.4, zones });
}

/** Tạo trạng thái runtime mới cho một khu vực (bản đồ thường hoặc đấu trường sự kiện) */
export function makeRuntime(mapIndex, map, M, spawn, extra = {}) {
  calcStats();
  const prev = G.R;
  G.R = {
    mapIndex, map, M,
    mobs: [], drops: [], projs: [], eprojs: [], fx: [], texts: [], respawn: [],
    t: 0, auto: prev ? prev.auto : false, bossT: MONSTER.boss.firstSpawnSec, boss: null,
    p: { x: spawn.x, y: spawn.y, tx: null, ty: null, target: null, atkT: 0, gcd: 0, cds: prev ? prev.p.cds : {}, buffs: prev ? prev.p.buffs : {}, potT: 0, face: 1, moving: false, atk: 0, dead: 0, hp: G.P.maxHp, mp: G.P.maxMp },
    saveT: CFG.AUTOSAVE_SEC, manualT: 0, panel: null, saveOk: prev ? prev.saveOk : true,
    /** Vùng được phép đi lại */
    bounds: { x0: 1.2, y0: 1.2, x1: (map.w || CFG.MAP_W) - 1.2, y1: (map.h || CFG.MAP_H) - 1.2 },
    spawnPoint: spawn,
    event: null,
    ...extra,
  };
  return G.R;
}

export function enterMap(mi) {
  G.S.map = mi;
  const map = generateMap(mi);
  makeRuntime(mi, map, MAPS[mi], map.town);
  G.R.map.centers.forEach((c, ci) => { for (let k = 0; k < MONSTER.packSize; k++) spawnMob(ci, false); });
  log('Đã đến <b>' + MAPS[mi].name + '</b>', '#f3d58a');
  emit(EV.MAP_ENTER, mi);
}

/**
 * Tạo 1 quái với template, cấp và vị trí cho trước.
 * opts: { boss, hpMul, dmgMul, expMul, sizeMul, static, invuln, noRespawn, ci, kind }
 */
export function createMob(tp, lv, x, y, opts = {}) {
  const B = MONSTER.boss, boss = !!opts.boss, k = (key) => (boss ? B[key] : 1);
  const rs = G.S && !G.R.event && !opts.event ? G.S.resets || 0 : 0, RS = MONSTER.resetScale; // độ khó theo Reset
  const m = {
    id: uid(), tpl: tp, name: tp.name, shape: tp.shape, c1: tp.c1, c2: tp.c2,
    size: (tp.size || 1) * (boss ? B.size : 1) * (opts.sizeMul || 1), lv, boss, ci: opts.ci, x, y, hx: x, hy: y,
    maxHp: Math.round(MONSTER.hp(lv) * k('hp') * (opts.hpMul || 1) * (1 + RS.hp * rs)), dmg: MONSTER.dmg(lv) * k('dmg') * (opts.dmgMul || 1) * (1 + RS.dmg * rs),
    def: MONSTER.def(lv) * k('def'), exp: MONSTER.exp(lv) * k('exp') * (opts.expMul || 1) * (1 + RS.exp * rs),
    spd: (tp.spd || MONSTER.speed) * (boss ? B.speed : 1),
    range: boss ? B.range : MONSTER.range, aggro: opts.aggro || (boss ? B.aggroRange : MONSTER.aggroRange),
    atkCd: boss ? B.attackCd : MONSTER.attackCd, leash: opts.leash || (boss ? B.leash : MONSTER.leash),
    atkT: rnd(0, 1), flash: 0, face: 1, wx: x, wy: y, wt: rnd(1, 4), angry: false, hpShow: 0, moving: false, ret: false, lunge: 0,
    ranged: tp.ranged || null,
    static: !!opts.static, invuln: !!opts.invuln, noRespawn: !!opts.noRespawn, kind: opts.kind || null, event: !!opts.event,
  };
  m.hp = m.maxHp;
  G.R.mobs.push(m);
  return m;
}

export function spawnMob(ci, boss) {
  const R = G.R, map = R.map, C = map.centers[ci], M = R.M, tp = boss ? M.boss : M.mobs[Math.min(C.type, M.mobs.length - 1)], B = MONSTER.boss;
  const [lo, hi] = M.lv;
  // Bãi có hệ số khoảng cách f → cấp quái; bãi cũ (đấu trường) dùng công thức theo loại
  const base = C.f != null ? lo + (hi - lo) * C.f : lo + ((hi - lo) / 3) * C.type;
  const lv = boss ? hi + B.levelBonus : Math.max(1, Math.round(base + rnd(-1.5, 1.5)));
  let x = clamp(C.x + rnd(-2.2, 2.2), 1.5, (map.w || CFG.MAP_W) - 1.5), y = clamp(C.y + rnd(-2.2, 2.2), 1.5, (map.h || CFG.MAP_H) - 1.5);
  if (blockedAt(map, x, y)) { x = C.x; y = C.y; }
  // Quái tinh anh: hiếm, mạnh và rơi đồ tốt hơn
  const elite = !boss && !R.event && Math.random() < MONSTER.elite.chance;
  const m = createMob(tp, lv, x, y, { boss, ci, ...(elite ? { hpMul: MONSTER.elite.hp, dmgMul: MONSTER.elite.dmg, expMul: MONSTER.elite.exp, sizeMul: MONSTER.elite.size } : {}) });
  if (elite) { m.elite = true; m.name = 'Tinh Anh ' + m.name; }
  return m;
}

export const isAlive = (m) => m && m.hp > 0 && G.R.mobs.indexOf(m) >= 0;
export const clampToBounds = (o) => { const b = G.R.bounds; o.x = clamp(o.x, b.x0, b.x1); o.y = clamp(o.y, b.y0, b.y1); };
export { inSafe };
