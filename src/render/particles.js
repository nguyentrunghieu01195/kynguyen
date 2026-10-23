// Hạt hiệu ứng (chỉ để vẽ, không ảnh hưởng luật chơi): tia lửa khi đánh trúng, vòng xung kích khi chí mạng,
// linh hồn bay lên khi hạ quái, bụi khi chạy, vệt đạn, đài hoa lên cấp. Lắng nghe event bus như juice.js.
// Hạt sống trong toạ độ thế giới (ô) + độ cao z (px) nên tự đúng chiều sâu / camera.
import { G } from '../core/state.js';
import { on, EV } from '../core/events.js';
import { iso, isoRadius } from './iso.js';
import { FXP } from './juice.js';

const MAX = 420;
let P = [], lastR = null, dustT = 0;
const rnd = Math.random, TAU = Math.PI * 2;

function add(p) { if (P.length >= MAX) P.shift(); P.push(p); }
/** Một hạt: (x,y) ô thế giới · z px · vx,vy ô/giây · vz px/giây · g trọng lực px/giây² */
function part(kind, x, y, z, o) { add({ kind, x, y, z, vx: 0, vy: 0, vz: 0, g: 0, life: 0, max: 0.5, col: '#fff', size: 2, rot: 0, vr: 0, ...o }); }

function sparks(x, y, z, n, col, power = 1) {
  for (let i = 0; i < n; i++) {
    const a = rnd() * TAU, sp = (0.8 + rnd() * 1.6) * power;
    part('spark', x, y, z, { vx: Math.cos(a) * sp * 0.7, vy: Math.sin(a) * sp * 0.7, vz: 40 + rnd() * 90 * power, g: 320, max: 0.28 + rnd() * 0.22, col, size: 1.6 + rnd() * 1.4 });
  }
}
const ring = (x, y, z, col, size = 26, max = 0.35) => part('ring', x, y, z, { col, size, max });
function stars(x, y, z, n, col) { for (let i = 0; i < n; i++) { const a = rnd() * TAU; part('star', x, y, z, { vx: Math.cos(a) * (0.6 + rnd()), vy: Math.sin(a) * (0.6 + rnd()), vz: 50 + rnd() * 60, g: 120, max: 0.55 + rnd() * 0.3, col, size: 3 + rnd() * 2.5, rot: rnd() * TAU, vr: (rnd() - 0.5) * 8 }); } }
function wisps(x, y, z, n, col) { for (let i = 0; i < n; i++) part('wisp', x + (rnd() - 0.5) * 0.4, y + (rnd() - 0.5) * 0.4, z + rnd() * 10, { vx: (rnd() - 0.5) * 0.3, vy: (rnd() - 0.5) * 0.3, vz: 30 + rnd() * 50, max: 0.9 + rnd() * 0.5, col, size: 5 + rnd() * 5 }); }

let inited = false;
export function initParticles() {
  if (inited) return;
  inited = true;
  const on_ = (e, f) => on(e, (...a) => { if (FXP.particles !== false && G.R && !G.R.remoteSkip) { try { f(...a); } catch (er) { /* hạt chỉ để vẽ */ } } });
  on_(EV.HIT, (m, d, crit, sk) => {
    if (!m || m.x == null) return;
    const z = 20 * (m.size || 1), col = crit ? '#ffd54a' : sk ? '#ffb070' : '#ffffff';
    sparks(m.x, m.y, z, crit ? 14 : sk ? 9 : 5, col, crit ? 1.25 : 1);
    if (crit) { ring(m.x, m.y, z, '#ffe680', 30, 0.38); stars(m.x, m.y, z, 4, '#fff6c0'); }
    else if (sk) ring(m.x, m.y, z, '#ffb070', 20, 0.28);
  });
  on_(EV.KILL, (m) => {
    if (!m || m.x == null) return;
    const big = !!m.boss, z = 16 * (m.size || 1), col = m.c1 || '#cfe8ff';
    wisps(m.x, m.y, z, big ? 12 : 4, '#bfe0ff');
    sparks(m.x, m.y, z, big ? 30 : 10, col, big ? 1.6 : 1);
    if (big) { ring(m.x, m.y, 10, '#ffd060', 70, 0.7); ring(m.x, m.y, 10, '#ffffff', 46, 0.5); stars(m.x, m.y, z, 10, '#ffe27a'); }
  });
  on_(EV.PLAYER_HIT, (d) => { const p = G.R.p; sparks(p.x, p.y, 26, 7, '#ff5a4a', 0.9); });
  on_(EV.LEVEL_UP, () => { const p = G.R.p; ring(p.x, p.y, 4, '#ffe680', 40, 0.9); stars(p.x, p.y, 20, 18, '#fff0a0'); wisps(p.x, p.y, 8, 10, '#ffe680'); });
  on_(EV.PICKUP, () => { const p = G.R.p; stars(p.x, p.y, 28, 4, '#fff6c0'); });
  on_(EV.SHAKE, () => {});
}

// ---------------- MỖI KHUNG HÌNH ----------------
const TRAIL = { fire: '#ff9a3a', arrow: '#e8f0ff', arrow2: '#e8f0ff', ice: '#9fe4ff', phoenix: '#ff7a2a' };
function ambient(dt) {
  const R = G.R, p = R.p;
  if (R !== lastR) { lastR = R; P = []; dustT = 0; }
  // bụi dưới chân khi chạy
  if (p.moving && p.dead <= 0 && (dustT -= dt) <= 0) {
    dustT = 0.16;
    const th = R.M && R.M.theme, base = th ? th.g : '#cdbb9a';
    part('puff', p.x + (rnd() - 0.5) * 0.2, p.y + (rnd() - 0.5) * 0.2, 2, { vx: (rnd() - 0.5) * 0.25, vy: (rnd() - 0.5) * 0.25, vz: 12 + rnd() * 10, max: 0.45, col: base, size: 3.5 + rnd() * 2 });
  }
  // vệt đạn
  for (const pr of R.projs) part('dot', pr.x, pr.y, 22, { max: 0.24, col: TRAIL[pr.k] || '#ffe8b0', size: pr.k === 'fire' || pr.k === 'phoenix' ? 5 : 3, vz: 6 });
  for (const pr of R.eprojs || []) part('dot', pr.x, pr.y, 22, { max: 0.22, col: '#ff6a4a', size: 3.5, vz: 4 });
}
export function drawParticles(c, t, dt) {
  if (FXP.particles === false || !G.R) return;
  ambient(dt);
  if (!P.length) return;
  c.save();
  const live = [];
  for (const p of P) {
    p.life += dt;
    if (p.life >= p.max) continue;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= p.g * dt; p.rot += p.vr * dt;
    if (p.z < 0 && p.g) { p.z = 0; p.vz *= -0.3; }
    live.push(p);
    const k = p.life / p.max, s = iso(p.x, p.y), y = s.y - p.z, a = 1 - k;
    if (p.kind === 'spark') {
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = a; c.strokeStyle = p.col; c.lineWidth = p.size * (1 - k * 0.5); c.lineCap = 'round';
      const sx = p.vx * 16, sy = -p.vz * 0.09 + p.vy * 8;
      c.beginPath(); c.moveTo(s.x, y); c.lineTo(s.x - sx, y - sy); c.stroke();
    } else if (p.kind === 'dot') {
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = a * 0.8; c.fillStyle = p.col; c.beginPath(); c.arc(s.x, y, p.size * (1 - k * 0.6), 0, TAU); c.fill();
    } else if (p.kind === 'ring') {
      const r = isoRadius(0.001 + (p.size / 32) * (0.25 + k * 0.9));
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = a; c.strokeStyle = p.col; c.lineWidth = 3 * (1 - k) + 0.8;
      c.beginPath(); c.ellipse(s.x, y, p.size * (0.3 + k * 0.9), p.size * (0.3 + k * 0.9) * 0.5, 0, 0, TAU); c.stroke(); void r;
    } else if (p.kind === 'star') {
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = a; c.fillStyle = p.col; c.save(); c.translate(s.x, y); c.rotate(p.rot);
      const r = p.size * (1 - k * 0.4); c.beginPath(); for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.28 : r, an = (i / 8) * TAU; c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); } c.closePath(); c.fill(); c.restore();
    } else if (p.kind === 'wisp') {
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.sin(k * Math.PI) * 0.75; const g = c.createRadialGradient(s.x, y, 0, s.x, y, p.size);
      g.addColorStop(0, p.col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(s.x - p.size, y - p.size, p.size * 2, p.size * 2);
    } else if (p.kind === 'puff') {
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = a * 0.35; c.fillStyle = p.col; c.beginPath(); c.ellipse(s.x, y, p.size * (0.8 + k * 1.4), p.size * (0.8 + k * 1.4) * 0.6, 0, 0, TAU); c.fill();
    }
  }
  P = live;
  c.restore();
}
