// Boss Bang Hội: mỗi bang có MỘT đấu trường riêng, mọi thành viên bang vào chung đấu trường đó, cùng đánh một Boss duy nhất.
// Boss "thật" do máy chủ điều khiển (server/src/arena.js): vị trí, mục tiêu, đòn đánh, đập đất. Ở đây mỗi người chơi có một
// bản đại diện của Boss (shared) đặt đúng vị trí do máy chủ gửi; sát thương người chơi gây ra được cộng cho bang.
// Dùng chung hạ tầng khu vực riêng với sự kiện / Tháp (R.event + handler).
import { G } from '../core/state.js';
import { emit, EV, log, announce, sysOn } from '../core/events.js';
import { fmt } from '../core/utils.js';
import { CFG } from '../config/constants.js';
import { seededRng } from '../core/utils.js';
import { GBOSS, ARENA, BOSS_TPL, gbossStatus } from '../config/gboss.js';
import { makeRuntime, createMob, enterMap } from './world.js';
import { addText, playerDie } from './combat.js';

// ---------------- ĐẤU TRƯỜNG ----------------
let arenaCache = null;
export function gbossArena() {
  if (arenaCache) return arenaCache;
  const A = ARENA, rng = seededRng(771), tiles = [];
  for (let i = 0; i < CFG.MAP_W; i++) {
    tiles[i] = [];
    for (let j = 0; j < CFG.MAP_H; j++) {
      const inside = i >= A.x0 && i < A.x1 && j >= A.y0 && j < A.y1;
      tiles[i][j] = { kind: !inside ? 'edge' : (i + j) % 2 ? 'g2' : 'g', r: rng(), r2: rng() };
    }
  }
  const decos = [];
  for (let k = A.x0; k <= A.x1; k += 3) for (const [x, y] of [[k, A.y0 - 0.5], [k, A.y1 + 0.5], [A.x0 - 0.5, k], [A.x1 + 0.5, k]])
    decos.push({ x, y, kind: Math.round(k) % 2 ? 'pillar' : 'torch', s: 1, col: '#8a6aa8', seed: rng() });
  const mid = (A.x0 + A.x1) / 2;
  return (arenaCache = { w: CFG.MAP_W, h: CFG.MAP_H, tiles, decos, centers: [{ x: mid, y: A.y1 - 4, f: 0, type: 0 }], bossCi: 99, layout: A });
}
export const gbossMeta = () => ({
  id: 'gboss', name: GBOSS.name, mobs: [BOSS_TPL], boss: BOSS_TPL, lv: [1, 1],
  theme: { g: '#241a38', g2: '#2c2144', edge: '#0a0612', cliff: '#120a1c', town: '#5a5868', bg: '#07040e', deco: ['pillar', 'torch'], dcol: '#8a6aa8', edgeKind: 'void' },
});

export function gbossBlock() {
  const S = G.S, st = gbossStatus();
  if (G.R && G.R.event) return 'Anh đang ở trong một khu vực khác.';
  if (!S.guild) return 'Cần vào bang hội để đánh Boss bang.';
  if (S.lv < GBOSS.minLevel) return 'Cần đạt cấp ' + GBOSS.minLevel + '.';
  if (!st.open) return 'Cổng Boss bang chưa mở.';
  return null;
}

// ---------------- LUẬT CHƠI ----------------
const bossOf = () => G.R && G.R.mobs.find((m) => m.shared);

function end(E, reason) {
  if (E.over) return;
  E.over = true; E.endT = 2.5;
  const delta = Math.max(0, Math.floor(E.dmg - E.flushed));
  E.flushed = E.dmg;
  E.result = { key: E.key, dmg: Math.floor(E.dmg), delta, reason };
  announce(reason === 'timeout' ? 'Hết giờ! Sát thương của anh: ' + fmt(E.dmg) : 'Rời đấu trường. Sát thương của anh: ' + fmt(E.dmg));
  emit(EV.GBOSS_END, E.result);
}

const MEDAL = ['🥇', '🥈', '🥉'];
const mmss = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
function makeHandler(E) {
  return {
    update(dt) {
      if (E.over) { E.endT -= dt; if (E.endT <= 0) this.leave(); return; }
      E.t += dt;
      const st = gbossStatus();
      if (!st.open || st.key !== E.key) end(E, 'timeout');
    },
    onKill() { /* Boss không thể bị hạ */ },
    onDeath() { /* hồi sinh tại điểm xuất phát của đấu trường (updatePlayer) */ },
    leave() {
      if (!E.over) end(E, 'leave');
      enterMap(G.S.map);
      emit(EV.EVENT_END, null);
    },
    hud() {
      const st = gbossStatus(), B = E.board;
      const lines = ['Sát thương của anh: ' + fmt(E.dmg)];
      if (B && B.top.length) {
        lines.push(B.top.map((r, i) => MEDAL[i] + ' ' + r.name + ' ' + fmt(r.total)).join(' · '));
        lines.push('Bang anh: hạng ' + (B.rank || '—') + ' · ' + fmt(B.total));
        lines.push(B.sec >= B.minSec ? '✔ Đủ điều kiện nhận thưởng' : '⚠ Chiến đấu ' + mmss(B.sec) + ' / ' + mmss(B.minSec) + ' để nhận thưởng');
      }
      return { name: GBOSS.icon + ' ' + GBOSS.name, time: st.open ? st.secLeft : 0, info: E.over ? 'Đang tổng kết… ' + fmt(E.dmg) : lines.join('\n') };
    },
  };
}

export function enterGBoss() {
  const block = gbossBlock();
  if (block) { log(block, '#f88'); return false; }
  const S = G.S, st = gbossStatus(), arena = gbossArena(), A = ARENA;
  makeRuntime('gb', arena, gbossMeta(), A.start, {
    bounds: { x0: A.x0 + 0.4, y0: A.y0 + 0.4, x1: A.x1 - 0.4, y1: A.y1 - 0.4 },
    event: { id: 'gboss', key: st.key, room: A.room + '_' + S.guild.id, t: 0, dmg: 0, flushed: 0, over: false, endT: 0, board: null },
  });
  const E = G.R.event;
  E.handler = makeHandler(E);
  const m = createMob(BOSS_TPL, S.lv, A.bossStart.x, A.bossStart.y, { event: true, noRespawn: true, boss: true, static: true, hpMul: A.hpMul, dmgMul: 0, aggro: 40, leash: 99 });
  m.shared = true; m.angry = true;
  announce(GBOSS.icon + ' ' + GBOSS.name);
  log(GBOSS.icon + ' Vào đấu trường <b>' + GBOSS.name + '</b> cùng cả bang <b>' + S.guild.name + '</b>. Boss khó hạ — hết giờ sẽ tính tổng sát thương xếp hạng các bang!', '#8fd0ff');
  return true;
}

/** Máy chủ: đặt Boss đại diện đúng vị trí / hành động của Boss chủ */
export function syncBoss(st) {
  const m = bossOf();
  if (!m) return;
  m.x = st.x; m.y = st.y; m.face = st.face; m.moving = st.moving; m.angry = true;
  m.lunge = st.lunge > 0 ? 0.2 : 0;
  m.cast = st.cast ? { t: st.cast.t, d: st.cast.d, x: st.cast.x, y: st.cast.y, r: st.cast.r } : null;
}

/** Máy chủ: Boss chủ đánh người chơi này. kind 'hit' (một mục tiêu) | 'slam' (đập đất, báo cho mọi người trong đấu trường) */
export function gbossHurt(kind, o) {
  const R = G.R, p = R.p, P = G.P, m = bossOf();
  if (!R.event || R.event.id !== 'gboss') return;
  if (kind === 'slam') {
    R.fx.push({ k: 'nova', x: o.x, y: o.y, t: 0, d: 0.6, r: o.r, col: '#c060ff', crack: true, noRelay: true });
    emit(EV.BOSS_SLAM, m, !!o.hit);
    emit(EV.SHAKE, o.hit ? 10 : 6);
    if (!o.hit) return;
  }
  if (p.dead > 0) return;
  const dmg = Math.max(1, Math.round(P.maxHp * o.frac * (1 - P.abs / 100) * (1 - P.guard / 100)));
  p.hp -= dmg; p.hurtT = 1.2;
  addText(p.x, p.y, '-' + fmt(dmg), '#ff3030', 'hurt');
  emit(EV.PLAYER_HIT, dmg, m);
  if (kind === 'hit') R.fx.push({ k: 'claw', x: p.x, y: p.y, t: 0, d: 0.25, f: m ? m.face : 1, boss: true });
  if (p.hp <= 0) playerDie();
}

/** Máy chủ: lấy phần sát thương chưa báo cho bang (đánh dấu đã báo) */
export function gbossTakeDelta() {
  const E = G.R && G.R.event;
  if (!E || E.id !== 'gboss' || E.over) return 0;
  const d = Math.floor(E.dmg - E.flushed);
  if (d > 0) E.flushed += d;
  return Math.max(0, d);
}
/** Máy chủ: bảng xếp hạng bang hiện lên HUD của người chơi */
export function gbossSetBoard(board) { const E = G.R && G.R.event; if (E && E.id === 'gboss') E.board = board; }

let inited = false;
export function initGBoss() {
  if (inited) return;
  inited = true;
  sysOn(EV.HIT, (m, d) => {
    const E = G.R && G.R.event;
    if (E && E.id === 'gboss' && !E.over && m.shared && Number.isFinite(d) && d > 0) E.dmg += d;
  });
}
