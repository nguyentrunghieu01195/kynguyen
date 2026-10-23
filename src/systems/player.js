// Cập nhật người chơi mỗi khung hình + chế độ tự động cày (AUTO).
import { G, HOOKS } from '../core/state.js';
import { log, emit, EV } from '../core/events.js';
import { dist, clamp, rint, moveToward } from '../core/utils.js';
import { CFG, SPAWN } from '../config/constants.js';
import { CLASSES } from '../config/classes.js';
import { PLAYER, POTION } from '../config/balance.js';
import { basicAttack, usePotion, nearestMob } from './combat.js';
import { autoCast, updateSkillTimers } from './skills.js';
import { canPick } from './loot.js';
import { isAlive, clampToBounds } from './world.js';
import { navStep, nearestFree } from './nav.js';

const AUTO = { lootRadius: 6, quickLoot: 4.5, searchRadius: 16, switchMargin: 2 };

function autoThink() {
  const R = G.R, p = R.p;
  // Né chiêu boss: đang đứng trong vùng cảnh báo → chạy ra mép ngoài
  for (const m of R.mobs) {
    const c = m.cast;
    if (!c) continue;
    const dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy);
    if (d <= c.r + 0.4) {
      const k = (c.r + 1) / (d || 1), ux = d ? dx : 1, uy = d ? dy : 0;
      p.target = null; p.tx = c.x + ux * k; p.ty = c.y + uy * k;
      return;
    }
  }
  if (HOOKS.auto && HOOKS.auto()) return; // chế độ riêng (công thành: ưu tiên địch / cổng / ngai)
  if (R.manualT > 0 || R.travel) return;
  // Nhặt đồ rơi gần khi không bị đánh (class đánh xa hay bỏ sót đồ vì đứng xa chỗ quái chết)
  if (!(p.hurtT > 0)) {
    let near = null, nd = AUTO.quickLoot;
    for (const d of R.drops) { if (!canPick(d)) continue; const dd = dist(d, p); if (dd < nd) { nd = dd; near = d; } }
    if (near) { p.target = null; p.tx = near.x; p.ty = near.y; return; }
  }
  if (p.target && p.target.hp > 0) {
    // Chống kẹt: đuổi mãi không tới gần / không gây được sát thương → bỏ qua quái này một lúc
    const t = p.target, dd = dist(t, p);
    if (t !== p.prog.m || dd < p.prog.d - 0.5 || t.hp < p.prog.hp) p.prog = { m: t, d: dd, hp: t.hp, t: 0 };
    else if ((p.prog.t += R.dtLast || 0) > 4) { t.ignoreT = R.time + 25; p.target = null; p.prog = { m: null }; return; }
    // Có quái gần hơn hẳn → đổi mục tiêu
    const dt = dist(p.target, p);
    if (dt > 2.5) { const n = nearestMob(p, dt - AUTO.switchMargin, true); if (n) p.target = n; }
    return;
  }
  let best = null, bd = AUTO.lootRadius;
  for (const d of R.drops) { if (!canPick(d)) continue; const dd = dist(d, p); if (dd < bd) { bd = dd; best = d; } }
  if (best) { p.tx = best.x; p.ty = best.y; return; }
  const m = nearestMob(p, AUTO.searchRadius, true);
  if (m) { p.target = m; p.tx = null; return; }
  if (p.tx == null) { const C = pickCamp(R, p); p.tx = C.x; p.ty = C.y; }
}

/** AUTO: chọn bãi quái hợp cấp (không cao hơn cấp mình quá 3), ưu tiên bãi mạnh nhất vừa sức rồi gần nhất */
function pickCamp(R, p) {
  const M = R.M, cs = R.map.centers, [lo, hi] = M.lv, lv = G.S.lv;
  const lvOf = (c) => (c.f != null ? lo + (hi - lo) * c.f : lo);
  const ok = cs.filter((c, i) => i !== R.map.bossCi && lvOf(c) <= lv + 3);
  const pool = ok.length ? ok : cs.slice().sort((a, b) => lvOf(a) - lvOf(b)).slice(0, 3);
  const top = Math.max(...pool.map(lvOf));
  const good = pool.filter((c) => lvOf(c) >= top - 8);
  good.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
  return good[rint(0, Math.min(2, good.length - 1))];
}

export function updatePlayer(dt) {
  const R = G.R, P = G.P, S = G.S, p = R.p;
  if (p.dead > 0) {
    p.dead -= dt;
    if (p.dead <= 0) {
      Object.assign(p, { x: R.spawnPoint.x, y: R.spawnPoint.y, hp: P.maxHp, mp: P.maxMp, target: null, tx: null });
      log('Bạn đã hồi sinh tại thị trấn.');
    }
    return;
  }
  p.atkT -= dt; p.potT -= dt; p.hurtT = (p.hurtT || 0) - dt; updateSkillTimers(dt); R.manualT -= dt;
  p.atk = Math.max(0, p.atk - dt);
  p.hp = Math.min(P.maxHp, p.hp + P.maxHp * PLAYER.hpRegenPerSec * dt);
  p.mp = Math.min(P.maxMp, p.mp + P.maxMp * PLAYER.mpRegenPerSec * dt);

  if (p.potT <= 0) {
    if (p.hp < P.maxHp * POTION.autoHpBelow && S.pot.hp > 0) usePotion('hp');
    else if (p.mp < P.maxMp * POTION.autoMpBelow && S.pot.mp > 0) usePotion('mp');
  }
  R.dtLast = dt; R.time = (R.time || 0) + dt;
  if (!p.prog) p.prog = { m: null };
  if (R.auto) autoThink();

  p.moving = false;
  if (p.target && !isAlive(p.target)) p.target = null;
  if (p.target) {
    const m = p.target, d = dist(p, m), rg = G.P.range + (m.size - 1) * 0.5;
    if (d > rg) { navStep(p, m.x, m.y, PLAYER.moveSpeed, dt); p.moving = true; }
    else {
      p.face = m.x - p.x - (m.y - p.y) > 0 ? 1 : -1;
      if (R.auto) autoCast();
      if (p.target && p.atkT <= 0) basicAttack(m);
    }
  } else if (p.tx != null) {
    if (navStep(p, p.tx, p.ty, PLAYER.moveSpeed, dt) || p.stuck > 1.5) { p.tx = null; p.path = null; p.stuck = 0; R.travel = false; }
    else p.moving = true;
  }
  clampToBounds(p);
}

/** Lệnh từ người chơi (chạm/click) */
export function commandAttack(m) { const p = G.R.p; p.target = m; p.tx = null; G.R.manualT = 2.5; }
/** Đi tới (x,y). travel = đi xa theo bản đồ con (AUTO tạm dừng tới khi đến nơi) */
export function commandMove(x, y, travel = false) {
  const p = G.R.p;
  G.R.travel = travel;
  p.target = null;
  const b = G.R.bounds;
  const f = nearestFree(G.R.map, clamp(x, b.x0, b.x1), clamp(y, b.y0, b.y1));
  p.tx = f.x; p.ty = f.y; p.path = null;
  G.R.fx.push({ k: 'click', x: p.tx, y: p.ty, t: 0, d: 0.4 });
  G.R.manualT = 2.5;
}
export function toggleAuto() {
  const R = G.R;
  R.auto = !R.auto;
  R.manualT = 0;
  if (!R.auto) R.p.tx = null;
  emit(EV.AUTO, R.auto);
  log(R.auto ? 'Đã BẬT tự động cày' : 'Đã TẮT tự động cày', R.auto ? '#8f8' : '#aaa');
}
