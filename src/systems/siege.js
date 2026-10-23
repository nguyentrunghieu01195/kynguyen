// Công Thành Chiến — luật chơi dùng chung (chạy trên máy chủ cho từng người chơi; máy người chơi chỉ vẽ).
// Cả trận dùng MỘT đấu trường. "Bộ não" trận nằm trên máy chủ (server/src/siegebrain.js): giữ máu Cổng Thành, Ngai Vàng, vị trí mọi người.
// Ở đây mỗi người chơi có thêm các "đại diện" (mob) của người địch và của Cổng Thành đặt đúng vị trí do máy chủ gửi —
// nên toàn bộ code đánh quái hiện có (chọn mục tiêu, kỹ năng, đạn, AUTO) dùng được để đánh người địch; sát thương được ghi vào E.out
// và máy chủ chuyển sang người bị đánh.
import { G, HOOKS } from '../core/state.js';
import { emit, EV, log, announce } from '../core/events.js';
import { fmt, seededRng } from '../core/utils.js';
import { CFG } from '../config/constants.js';
import { SIEGE, PVP_TPL, GATE_TPL } from '../config/siege.js';
import { makeRuntime, createMob, enterMap } from './world.js';
import { addText } from './combat.js';

// ---------------- ĐẤU TRƯỜNG ----------------
const idx = (h, i, j) => i * h + j;
let arena = null;
/** Bản đồ trận (sinh theo hạt giống cố định — máy chủ và máy người chơi dựng giống nhau). Cổng đóng; mở bằng setGateOpen */
export function siegeArena() {
  if (arena) return arena;
  const A = SIEGE.area, C = SIEGE.castle, w = CFG.MAP_W, h = CFG.MAP_H, rng = seededRng(4242), tiles = [], block = new Uint8Array(w * h);
  for (let i = 0; i < w; i++) {
    tiles[i] = [];
    for (let j = 0; j < h; j++) {
      const inside = i >= A.x0 && i < A.x1 && j >= A.y0 && j < A.y1;
      const room = i > C.x0 && i < C.x1 - 1 && j > C.y0 && j < C.y1 - 1;
      tiles[i][j] = { kind: !inside ? 'edge' : room ? 'town' : (i + j) % 2 ? 'g2' : 'g', r: rng(), r2: rng() };
      if (!inside) block[idx(h, i, j)] = 1;
    }
  }
  // tường thành
  for (let i = C.x0; i < C.x1; i++) for (let j = C.y0; j < C.y1; j++) {
    if (i === C.x0 || i === C.x1 - 1 || j === C.y0 || j === C.y1 - 1) { block[idx(h, i, j)] = 1; tiles[i][j].kind = 'edge'; }
  }
  const decos = [], mid = (A.x0 + A.x1) / 2;
  for (let k = C.x0; k < C.x1; k += 2) for (const y of [C.y0 - 0.2, C.y1 - 0.2]) decos.push({ x: k + 0.5, y, kind: k % 4 ? 'torch' : 'pillar', s: 1, col: '#c8a060', seed: rng() });
  for (let k = A.x0 + 2; k < A.x1; k += 4) for (const [x, y] of [[k, A.y0 + 0.5], [k, A.y1 - 0.5]]) decos.push({ x, y, kind: 'pillar', s: 1, col: '#8a7a6a', seed: rng() });
  arena = { w, h, tiles, block, decos, centers: [{ x: mid, y: A.y1 - 4, f: 0, type: 0 }], bossCi: 99, layout: { ...A, ...SIEGE.throne, castle: C }, town: null };
  setGateOpen(false);
  return arena;
}
/** Đóng / mở lối qua Cổng Thành (đổi ô chặn trong bản đồ dùng chung) */
export function setGateOpen(open) {
  const a = arena || siegeArena(), C = SIEGE.castle, j = C.y1 - 1;
  for (let i = SIEGE.gate.x0; i < SIEGE.gate.x1; i++) { a.block[idx(a.h, i, j)] = open ? 0 : 1; a.tiles[i][j].kind = open ? 'town' : 'edge'; }
}
export const siegeMeta = () => ({
  id: 'siege', name: SIEGE.name, mobs: [PVP_TPL], boss: PVP_TPL, lv: [1, 1],
  theme: { g: '#2a2a22', g2: '#33332a', edge: '#0c0a08', cliff: '#1c1812', town: '#5a4a3a', bg: '#0a0806', deco: ['pillar', 'torch'], dcol: '#c8a060', edgeKind: 'void' },
});

// ---------------- VÀO TRẬN ----------------
/** Máy chủ gắn hàm tra cứu: (S) → { ok: true, team: { gid, name, slot, role }, key } | { err } */
let provider = null;
export const setSiegeProvider = (fn) => { provider = fn; };

export function siegeBlock() {
  if (G.R && G.R.event) return 'Anh đang ở trong một khu vực khác.';
  if (!G.S.guild) return 'Cần vào bang hội để tham gia công thành.';
  if (G.S.lv < SIEGE.minLevel) return 'Cần đạt cấp ' + SIEGE.minLevel + '.';
  if (!provider) return 'Công thành chỉ diễn ra trên máy chủ.';
  const r = provider(G.S);
  return r.err || null;
}

export function enterSiege() {
  const block = siegeBlock();
  if (block) { log(block, '#f88'); return false; }
  const S = G.S, info = provider(S), t = info.team, a = siegeArena(), sp = SIEGE.spawns[t.slot], A = SIEGE.area;
  makeRuntime('sg', a, siegeMeta(), sp, {
    bounds: { x0: A.x0 + 0.4, y0: A.y0 + 0.4, x1: A.x1 - 0.4, y1: A.y1 - 0.4 },
    event: { id: 'siege', room: 'sg', key: info.key, team: t, t: 0, over: false, endT: 0, out: { pvp: {}, gate: 0 }, dmgOut: 0, active: 0, prot: SIEGE.spawnProtSec, wasDead: false, board: null, gateInfo: null },
  });
  const E = G.R.event;
  E.handler = makeHandler(E);
  R_init();
  announce(SIEGE.icon + ' ' + SIEGE.name + ' — ' + (t.role === 'def' ? 'PHÒNG THỦ' : 'TẤN CÔNG'));
  log(SIEGE.icon + ' Vào trận <b>' + SIEGE.name + '</b> cùng bang <b>' + S.guild.name + '</b> (' + (t.role === 'def' ? 'phe thủ: giữ Ngai Vàng' : 'phe công: phá Cổng Thành rồi chiếm Ngai Vàng') + '). Đánh người chơi bang khác bằng cách chọn họ như quái.', '#ffb070');
  return true;
}
function R_init() { G.R._pv = new Map(); }

// ---------------- HANDLER ----------------
const mmss = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
function makeHandler(E) {
  return {
    update(dt) {
      const p = G.R.p;
      E.t += dt;
      if (E.over) { E.endT -= dt; if (E.endT <= 0) this.leave(); return; }
      // bất tử vài giây sau khi hồi sinh
      if (E.prot > 0) E.prot -= dt;
      if (p.dead > 0) E.wasDead = true; else if (E.wasDead) { E.wasDead = false; E.prot = SIEGE.spawnProtSec; p.hp = G.P.maxHp; p.mp = G.P.maxMp; }
      if (p.dead <= 0 && (p.moving || p.atk > 0)) E.active += dt; // thời gian chiến đấu (dùng cho điều kiện nhận thưởng)
    },
    onKill() {},
    onDeath() { /* hồi sinh tại điểm xuất phát của bang sau SIEGE.respawnSec (updatePlayer) */ },
    leave() {
      if (!E.over) { E.over = true; E.reason = 'leave'; emit(EV.SIEGE_END, { key: E.key, reason: 'leave' }); }
      enterMap(G.S.map);
      emit(EV.EVENT_END, null);
    },
    hud() {
      const B = E.board, g = E.gateInfo;
      const lines = [];
      if (g) lines.push(g.open ? '🚪 Cổng Thành: ĐÃ VỠ' : '🚪 Cổng Thành: ' + Math.max(0, Math.ceil((g.hp / g.max) * 100)) + '%');
      if (B) {
        for (const t of B.teams) lines.push((t.holder ? '👑' : '•') + ' ' + t.name + (t.role === 'def' ? ' 🛡' : '') + ' · giữ ' + mmss(t.hold) + ' · hạ ' + t.kills);
        if (B.cap) lines.push('⏳ ' + B.cap.name + ' đang chiếm ngai ' + Math.ceil(B.cap.left) + 's');
      }
      return { name: SIEGE.icon + ' ' + SIEGE.name, time: B ? B.left : 0, info: E.over ? 'Trận đã kết thúc… ' : lines.join('\n') };
    },
  };
}

// ---------------- ĐẠI DIỆN NGƯỜI ĐỊCH / CỔNG (máy chủ gọi mỗi tick) ----------------
/** view: { enemies: [{ id, name, lv, x, y, hp, maxHp, def, face, moving, team, prot }], gate: { hp, max, open, def }, board } */
export function syncSiege(view) {
  const R = G.R, E = R && R.event;
  if (!E || E.id !== 'siege') return;
  const pv = R._pv || (R._pv = new Map());
  const seen = new Set();
  for (const e of view.enemies) {
    seen.add(e.id);
    let m = pv.get(e.id);
    if (!m) {
      m = createMob(PVP_TPL, e.lv, e.x, e.y, { event: true, noRespawn: true, static: true, hpMul: 1, dmgMul: 0, aggro: 40, leash: 99 });
      m.pvp = true; m.pid = e.id; m.angry = true; m.name = e.name; pv.set(e.id, m);
    }
    m.x = e.x; m.y = e.y; m.face = e.face; m.moving = e.moving; m.maxHp = e.maxHp; m.hp = Math.max(1, e.hp); m.def = e.def; m.lv = e.lv; m.team = e.team; m.invuln = !!e.prot;
    m.angry = true; m.name = e.name;
  }
  for (const [id, m] of pv) if (!seen.has(id)) { const i = R.mobs.indexOf(m); if (i >= 0) R.mobs.splice(i, 1); if (R.p.target === m) R.p.target = null; pv.delete(id); }
  // Cổng Thành
  const g = view.gate;
  let gm = R.mobs.find((m) => m.siegeGate);
  if (g && !g.open) {
    if (!gm) { gm = createMob(GATE_TPL, 1, SIEGE.gate.x, SIEGE.gate.y, { event: true, noRespawn: true, static: true, kind: 'gate', hpMul: 1, dmgMul: 0 }); gm.siegeGate = true; gm.angry = true; gm.name = GATE_TPL.name; }
    gm.maxHp = g.max; gm.hp = Math.max(1, g.hp); gm.invuln = E.team.role === 'def'; // phe thủ không đánh cổng nhà
  } else if (gm) { const i = R.mobs.indexOf(gm); if (i >= 0) R.mobs.splice(i, 1); if (R.p.target === gm) R.p.target = null; }
  E.gateInfo = g ? { hp: g.hp, max: g.max, open: g.open } : null;
  E.board = view.board;
}

/** Lấy sát thương PvP / cổng đã gây ra chưa báo (máy chủ gọi mỗi tick) */
export function siegeTakeOut() {
  const E = G.R && G.R.event;
  if (!E || E.id !== 'siege' || E.over) return null;
  const out = E.out;
  if (!Object.keys(out.pvp).length && !out.gate) return null;
  E.out = { pvp: {}, gate: 0 };
  return out;
}

/** Người chơi này bị đánh (sát thương đã giảm theo phòng thủ ở phía người đánh) */
export function siegeHurt(dmg, srcName) {
  const R = G.R, E = R.event, p = R.p;
  if (!E || E.id !== 'siege' || E.over || p.dead > 0 || E.prot > 0) return { hit: false };
  p.hp -= dmg; p.hurtT = 1.2; E.active += 0.5;
  addText(p.x, p.y, '-' + fmt(dmg), '#ff3030', 'hurt');
  emit(EV.PLAYER_HIT, dmg, null);
  if (p.hp <= 0) {
    p.hp = 0; p.dead = SIEGE.respawnSec; p.target = null; p.tx = null;
    announce('Anh bị ' + srcName + ' hạ gục!');
    emit(EV.PLAYER_DIE);
    return { hit: true, died: true };
  }
  return { hit: true, died: false };
}

/** Máy chủ: kết thúc trận cho người này (kết quả chung) */
export function siegeFinish(result) {
  const E = G.R && G.R.event;
  if (!E || E.id !== 'siege' || E.over) return;
  E.over = true; E.endT = 4; E.result = result;
  announce(result.winner ? '🏆 ' + result.winner + ' chiếm thành!' : 'Trận kết thúc');
  emit(EV.SIEGE_END, { key: E.key, reason: 'end', ...result, active: Math.floor(E.active) });
}

// ---------------- AUTO TRONG TRẬN ----------------
const FIGHT_NEAR = 6.5;   // có người địch trong tầm này → dừng việc khác để đánh
const THRONE_GUARD = 12;  // đang đứng trên ngai: chỉ rời đi đánh địch trong tầm này
const nearestFoe = (p, maxD) => {
  let best = null, bd = maxD;
  for (const m of G.R.mobs) { if (!m.pvp || m.invuln || m.hp <= 0) continue; const d = Math.hypot(m.x - p.x, m.y - p.y); if (d < bd) { bd = d; best = m; } }
  return best;
};
/**
 * AUTO khi đang trong trận công thành (gắn vào HOOKS.auto): 1) địch ở gần → đánh;
 * 2) phe công, cổng chưa vỡ → đánh cổng; 3) cổng đã vỡ (hoặc phe thủ) → đứng giữ Ngai Vàng, chỉ rời đi đánh địch ở gần.
 * Trả true nếu đã quyết định (người chơi vừa ra lệnh tay thì để yên 2.5 giây).
 */
export function siegeAuto() {
  const R = G.R, E = R && R.event;
  if (!E || E.id !== 'siege' || E.over) return false;
  const p = R.p;
  if (R.manualT > 0) return true;
  const th = SIEGE.throne, gate = E.gateInfo, onThrone = Math.hypot(p.x - th.x, p.y - th.y) <= th.r * 0.8;
  const foe = nearestFoe(p, onThrone ? THRONE_GUARD : FIGHT_NEAR);
  if (foe) { if (p.target !== foe) p.target = foe; p.tx = null; return true; }
  if (E.team.role === 'att' && gate && !gate.open) {
    const gm = R.mobs.find((m) => m.siegeGate);
    if (gm) { p.target = gm; p.tx = null; return true; }
    return false; // chưa có cổng → AUTO thường
  }
  if (gate && (gate.open || E.team.role === 'def')) {
    p.target = null;
    if (!onThrone) { if (p.tx == null) { p.tx = th.x + (Math.random() - 0.5) * th.r; p.ty = th.y + (Math.random() - 0.5) * th.r; } } else p.tx = null; // đứng giữ ngai
    return true;
  }
  return false;
}
HOOKS.auto = siegeAuto;

export const siegeActive = () => { const E = G.R && G.R.event; return E && E.id === 'siege' ? Math.floor(E.active) : 0; };
export const inSiege = () => !!(G.R && G.R.event && G.R.event.id === 'siege' && !G.R.event.over);
