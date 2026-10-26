// AI quái vật, hồi sinh quái, xuất hiện boss.
import { G, inSafe } from '../core/state.js';
import { NIGHTMARE } from '../config/nightmare.js';
import { log, announce, emit, EV } from '../core/events.js';
import { dist, rnd, clamp, moveToward } from '../core/utils.js';
import { CFG } from '../config/constants.js';
import { MONSTER } from '../config/balance.js';
import { mobAttack, addText, playerDie } from './combat.js';
import { mitigate } from '../config/balance.js';
import { spawnMob, spawnNightmare } from './world.js';
import { moveCollide, blockedAt, nearestFree } from './nav.js';

function updateMob(m, dt, p, pSafe) {
  m.flash -= dt; m.atkT -= dt; m.hpShow -= dt;
  m.lunge = Math.max(0, m.lunge - dt);
  if (m.static) return;
  if (m.kbT > 0) { m.kbT -= dt; const ox = m.x, oy = m.y; m.x += m.kbx * dt; m.y += m.kby * dt; if (inSafe(m) || blockedAt(G.R.map, m.x, m.y)) { m.x = ox; m.y = oy; } }
  if (m.slowT > 0) m.slowT -= dt;
  if (m.cast) { updateBossCast(m, dt, p); return; }
  if (m.stun > 0) { m.stun -= dt; m.moving = false; return; } // bị choáng // vật thể đứng yên (vd. cổng thành)
  const d = dist(m, p), home = Math.hypot(m.x - m.hx, m.y - m.hy);

  // Bị kéo quá xa → quay về và hồi đầy máu
  if (home > m.leash || m.stuck > 2.5) { m.angry = false; m.ret = true; m.stuck = 0; if (p.target === m) p.target = null; }
  if (m.ret) {
    m.moving = true;
    m.retT = (m.retT || 0) + dt;
    if (moveCollide(m, m.hx, m.hy, m.spd * 1.6, dt) || m.retT > 6) { m.ret = false; m.retT = 0; m.x = m.hx; m.y = m.hy; m.hp = m.maxHp; }
    return;
  }
  if (pSafe) m.angry = false;

  if (m.boss && !pSafe && m.angry && !(m.stun > 0)) {
    m.slamT = (m.slamT == null ? rnd(...BS.every) : m.slamT) - dt;
    if (m.slamT <= 0 && d < BS.triggerRange + (m.size - 1)) {
      m.slamT = rnd(...BS.every);
      m.cast = { t: 0, d: BS.warn, x: m.x, y: m.y, r: BS.radius * Math.max(1, m.size * 0.6) };
      emit(EV.BOSS_CAST, m);
      return;
    }
  }
  if (!pSafe && (d < m.aggro || m.angry)) {
    const reach = m.ranged ? m.ranged.r : m.range + (m.size - 1) * 0.3;
    if (d > reach) {
      const ox = m.x, oy = m.y;
      moveCollide(m, p.x, p.y, m.spd * (m.slowT > 0 ? 0.5 : 1), dt);
      if (inSafe(m)) { m.x = ox; m.y = oy; } // không vào thị trấn
      m.moving = true;
    } else if (m.ranged) {
      // Quái đánh xa: lùi lại nếu bị áp sát, bắn đạn theo nhịp
      m.face = p.x - m.x - (p.y - m.y) > 0 ? 1 : -1;
      if (d < 2 && !inSafe(m)) { const ax = m.x + (m.x - p.x), ay = m.y + (m.y - p.y); moveCollide(m, ax, ay, m.spd * 0.6, dt); m.moving = true; } else m.moving = false;
      if (m.atkT <= 0) { m.atkT = m.atkCd * 1.25 * (m.slowT > 0 ? 1.5 : 1); m.lunge = 0.2; shoot(m, p); }
    } else {
      m.moving = false;
      m.face = p.x - m.x - (p.y - m.y) > 0 ? 1 : -1;
      if (m.atkT <= 0) { m.atkT = m.atkCd * (m.slowT > 0 ? 1.5 : 1); mobAttack(m); if (p.hp > 0) G.R.fx.push({ k: 'claw', x: p.x, y: p.y, t: 0, d: 0.25, f: m.face, boss: m.boss }); }
    }
  } else {
    // Đi lang thang quanh bãi
    m.wt -= dt;
    if (m.wt <= 0) {
      m.wt = rnd(2, 5);
      const mp = G.R.map, W = mp.w || CFG.MAP_W, H = mp.h || CFG.MAP_H;
      m.wx = clamp(m.hx + rnd(-2, 2), 1.5, W - 1.5);
      m.wy = clamp(m.hy + rnd(-2, 2), 1.5, H - 1.5);
      if (blockedAt(mp, m.wx, m.wy)) { m.wx = m.hx; m.wy = m.hy; }
    }
    m.moving = !moveCollide(m, m.wx, m.wy, m.spd * 0.4, dt);
  }
}

const BS = MONSTER.bossSlam;
/** Boss đang gồng chiêu: đứng yên, hết thời gian thì đập xuống vùng đã báo trước */
function updateBossCast(m, dt, p) {
  const c = m.cast;
  c.t += dt; m.moving = false; m.lunge = 0.2 * (c.t / c.d);
  if (c.t < c.d) return;
  m.cast = null;
  const hit = p.dead <= 0 && Math.hypot(p.x - c.x, p.y - c.y) <= c.r;
  G.R.fx.push({ k: 'nova', x: c.x, y: c.y, t: 0, d: 0.6, r: c.r, col: '#ff5a3a', crack: true });
  if (hit) {
    const P = G.P, dmg = Math.max(1, Math.round(mitigate(m.dmg * BS.dmgMul, P.def) * (1 - P.abs / 100) * (1 - P.guard / 100)));
    p.hp -= dmg; p.hurtT = 1.2;
    addText(p.x, p.y, '-' + dmg, '#ff3030', 'hurt');
    emit(EV.PLAYER_HIT, dmg, m);
    if (p.hp <= 0) playerDie();
  }
  emit(EV.BOSS_SLAM, m, hit);
  emit(EV.SHAKE, hit ? 10 : 6);
}

/** Quái bắn đạn về phía người chơi (đạn đuổi theo, trúng khi chạm) */
function shoot(m, p) {
  G.R.eprojs.push({ x: m.x, y: m.y, tgt: p, spd: MONSTER.rangedProjSpd, k: m.ranged.proj, src: m, life: 3 });
}
/** Cập nhật đạn của quái (gọi từ updateMonsters) */
function updateEnemyProjectiles(dt) {
  const R = G.R, p = R.p;
  for (let i = R.eprojs.length - 1; i >= 0; i--) {
    const e = R.eprojs[i];
    e.life -= dt;
    if (e.life <= 0 || p.dead > 0 || inSafe(p)) { R.eprojs.splice(i, 1); continue; }
    if (moveToward(e, p.x, p.y, e.spd, dt)) {
      R.eprojs.splice(i, 1);
      const m = e.src;
      if (m && m.hp > 0) { const dm = m.dmg; m.dmg = dm * MONSTER.rangedDmg; mobAttack(m); m.dmg = dm; m.lunge = 0; }
      R.fx.push({ k: 'boom', x: p.x, y: p.y, t: 0, d: 0.22 });
    }
  }
}

/** Đẩy các quái chồng lên nhau ra xa */
function separate(ms) {
  const map = G.R.map;
  const push = (o, mx, my) => { if (!blockedAt(map, o.x + mx, o.y + my)) { o.x += mx; o.y += my; } };
  for (let i = 0; i < ms.length; i++)
    for (let j = i + 1; j < ms.length; j++) {
      const a = ms[i], b = ms[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), mn = 0.3 * (a.size + b.size);
      if (d < mn && d > 0.001) { const k = ((mn - d) / d) * 0.5; push(a, -dx * k, -dy * k); push(b, dx * k, dy * k); }
    }
}

export function updateMonsters(dt) {
  const R = G.R, p = R.p, pSafe = inSafe(p) || p.dead > 0, AR = MONSTER.activeRadius;
  if (!R.eprojs) R.eprojs = [];
  const active = [];
  for (const m of R.mobs.slice()) {
    if (m.hp <= 0) continue;
    // Quái ở xa (ngoài tầm nhìn) đứng yên để tiết kiệm CPU, trừ khi đang đuổi / quay về
    if (!m.angry && !m.ret && Math.abs(m.x - p.x) + Math.abs(m.y - p.y) > AR) { m.moving = false; continue; }
    updateMob(m, dt, p, pSafe); active.push(m);
    if (blockedAt(R.map, m.x, m.y)) { const f = nearestFree(R.map, m.x, m.y); m.x = f.x; m.y = f.y; } // lỡ bị đẩy vào vật cản
    const b = R.bounds; if (m.x < b.x0) m.x = b.x0; else if (m.x > b.x1) m.x = b.x1; if (m.y < b.y0) m.y = b.y0; else if (m.y > b.y1) m.y = b.y1;
  }
  separate(active.filter((m) => !m.static)); // vật đứng yên (cổng, đại diện người chơi) không bị đẩy
  updateEnemyProjectiles(dt);

  for (let i = R.respawn.length - 1; i >= 0; i--) {
    const r = R.respawn[i];
    r.t -= dt;
    if (r.t > 0) continue;
    const C = R.map.centers[r.ci];
    if (Math.hypot(C.x - p.x, C.y - p.y) < 4) { r.t = 1; continue; } // không sinh ngay cạnh người chơi
    spawnMob(r.ci, false);
    R.respawn.splice(i, 1);
  }

  // Hỗn Mang Chi Vương (đủ Reset + bản đồ cuối): biến mất nếu không hạ được sau lifeSec
  if (R.nm) { R.nm.life -= dt; if (R.nm.life <= 0 || R.nm.hp <= 0) { const i = R.mobs.indexOf(R.nm); if (i >= 0) R.mobs.splice(i, 1); R.nm = null; R.nmT = NIGHTMARE.respawnSec; log('🌀 Hỗn Mang Chi Vương đã rút lui vào hư không.', '#c080ff'); } }
  else if (!R.event && G.S.resets >= NIGHTMARE.minResets && (R.M.tier || 0) >= NIGHTMARE.minMapTier) {
    R.nmT = (R.nmT == null ? NIGHTMARE.firstSec : R.nmT) - dt;
    if (R.nmT <= 0) { R.nm = spawnNightmare(); announce('🌀 HỖN MANG CHI VƯƠNG xuất hiện!'); log('🌀 <b>Hỗn Mang Chi Vương</b> đã xuất hiện — sức mạnh của nó thích nghi theo bạn! Hạ nó để nhận Mảnh Thần, ngọc và đồ +9 trở lên.', '#d070ff'); }
  }
  if (!R.boss && !R.event) {
    R.bossT -= dt;
    if (R.bossT <= 0) {
      R.boss = spawnMob(R.map.bossCi, true);
      announce('⚠ BOSS ' + R.boss.name + ' xuất hiện!');
      log('⚠ BOSS <b>' + R.boss.name + '</b> (cấp ' + R.boss.lv + ') đã xuất hiện ở góc xa bản đồ!', '#ff9a3a');
    }
  }
}
