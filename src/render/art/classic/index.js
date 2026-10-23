// Bộ đồ hoạ "Classic" — phong cách ban đầu của bản thử nghiệm.
// Mọi bộ đồ hoạ phải export cùng một interface (xem render/art/index.js).
import { iso, isoRadius } from '../../iso.js';
import { ell, circ, poly, shade, glowColor } from '../../paint.js';
import { SETS, WINGS, JEWELS } from '../../../config/items.js';
import { CFG } from '../../../config/constants.js';
import { itemColor, itemFull } from '../../../systems/items.js';

const HEIGHT = { blob: 26, beast: 28, humanoid: 54, bug: 22, golem: 58, winged: 60, dragon: 58, gate: 60, serpent: 34, crab: 26, ghost: 48 };

function paintMap(g, map, M, rect) {
  const th = M.theme, w = map.w || CFG.MAP_W, h = map.h || CFG.MAP_H, R = rect || { i0: 0, j0: 0, i1: w, j1: h };
  for (let i = R.i0; i < R.i1; i++) for (let j = R.j0; j < R.j1; j++) {
    const inside = i >= 0 && j >= 0 && i < w && j < h, T = inside ? map.tiles[i][j] : { kind: 'edge', r: 0.5, r2: 0.5 };
    const col = T.kind === 'path' ? (th.path || th.town) : T.kind === 'lair' ? shade(th.g, -30) : th[T.kind] || th.g;
    g.fillStyle = shade(col, Math.round((T.r - 0.5) * 16));
    const p0 = iso(i, j), p1 = iso(i + 1, j), p2 = iso(i + 1, j + 1), p3 = iso(i, j + 1);
    poly(g, [p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y]);
    g.strokeStyle = T.kind === 'town' ? 'rgba(0,0,0,.25)' : 'rgba(0,0,0,.07)'; g.lineWidth = 1; g.stroke();
    if ((T.kind === 'g' || T.kind === 'g2') && T.r2 < 0.35) {
      const ct = iso(i + 0.5, j + 0.5); g.fillStyle = shade(col, T.r2 < 0.17 ? 18 : -18);
      for (let k = 0; k < 3; k++) g.fillRect(ct.x + (((T.r * 7 + k * 0.37) % 1) - 0.5) * 36, ct.y + (((T.r2 * 11 + k * 0.53) % 1) - 0.5) * 14, 2, 2);
    }
  }
}

function drawDeco(c, d, t) {
  const s = iso(d.x, d.y); c.save(); c.translate(s.x, s.y); c.scale(d.s, d.s);
  c.fillStyle = 'rgba(0,0,0,.25)'; ell(c, 0, 0, 16, 7);
  const col = d.col;
  switch (d.kind) {
    case 'tree': c.fillStyle = '#5a3a1e'; c.fillRect(-3, -26, 6, 26); c.fillStyle = shade(col, -20); circ(c, -10, -32, 13); circ(c, 10, -32, 13); c.fillStyle = col; circ(c, 0, -44, 16); c.fillStyle = shade(col, 25); circ(c, -5, -49, 6); break;
    case 'pine': c.fillStyle = '#4a2e18'; c.fillRect(-3, -16, 6, 16); c.fillStyle = shade(col, -15); poly(c, [-18, -14, 18, -14, 0, -40]); c.fillStyle = col; poly(c, [-14, -30, 14, -30, 0, -56]); c.fillStyle = shade(col, 20); poly(c, [-10, -46, 10, -46, 0, -68]); break;
    case 'mushroom': c.fillStyle = '#e8e0cc'; c.fillRect(-4, -16, 8, 16); c.fillStyle = '#8a2be2'; c.beginPath(); c.ellipse(0, -17, 15, 10, 0, Math.PI, 0); c.fill(); break;
    case 'rock': c.fillStyle = '#6d5a4a'; poly(c, [-16, 0, -12, -14, 0, -20, 13, -12, 16, 0]); c.fillStyle = '#8a7562'; poly(c, [-12, -14, 0, -20, 6, -8, -6, -6]); break;
    case 'cactus': c.fillStyle = col; c.fillRect(-4, -36, 8, 36); c.fillRect(-14, -26, 6, 14); c.fillRect(-14, -16, 12, 5); c.fillRect(8, -30, 6, 12); c.fillRect(4, -22, 10, 5); break;
    case 'tomb': c.fillStyle = '#6e6a75'; c.fillRect(-10, -26, 20, 26); circ(c, 0, -26, 10); c.fillStyle = '#4a4652'; c.fillRect(-2, -30, 4, 16); c.fillRect(-7, -25, 14, 4); break;
    case 'pillar': c.fillStyle = shade(col, -30); c.fillRect(-9, -6, 18, 6); c.fillStyle = col; c.fillRect(-7, -52, 14, 46); c.fillStyle = shade(col, 20); c.fillRect(-7, -52, 4, 46); break;
    case 'ice': c.globalAlpha = 0.88; c.fillStyle = '#9fd8ff'; poly(c, [-12, 0, -8, -30, -2, 0]); c.fillStyle = '#d8f2ff'; poly(c, [-4, 0, 2, -44, 8, 0]); c.globalAlpha = 1; break;
    case 'crystal': c.shadowColor = col; c.shadowBlur = 12; c.fillStyle = col; poly(c, [-10, 0, -6, -34, 0, 0]); c.fillStyle = shade(col, 40); poly(c, [-3, 0, 3, -48, 9, 0]); c.shadowBlur = 0; break;
    case 'torch': { c.fillStyle = '#3a2a1a'; c.fillRect(-2, -34, 4, 34); const f = Math.sin(t * 15 + d.x) * 2; c.fillStyle = '#ff7a10'; c.shadowColor = '#ffa040'; c.shadowBlur = 16; ell(c, 0, -40, 6, 9 + f); c.shadowBlur = 0; break; }
    default: c.fillStyle = shade(col || '#6d5a4a', -10); poly(c, [-14, 0, -10, -12, 0, -18, 11, -10, 14, 0]); break;
  }
  c.restore();
}

function drawHero(c, cls, eq, t, o) {
  const col = (sl) => (eq[sl] ? SETS[eq[sl].tier].color : '#666');
  const ac = col('armor'), hc = col('helm'), pc = col('pants'), gc = col('gloves'), bc = col('boots');
  const bob = o.moving ? Math.abs(Math.sin(t * 11)) * 2.5 : Math.sin(t * 2.2) * 0.8, step = o.moving ? Math.sin(t * 11) * 4 : 0;
  c.save(); c.fillStyle = 'rgba(0,0,0,.32)'; ell(c, 0, 0, 15, 6); c.scale(o.face, 1);
  if (eq.wings) {
    const w = WINGS[eq.wings.tier], fl = Math.sin(t * 3) * 0.18;
    c.save(); c.translate(-2, -38 - bob); c.globalAlpha = 0.85; c.fillStyle = w.color;
    for (const sd of [-1, 1]) { c.save(); c.scale(sd, 1); c.rotate(sd * fl); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-30, -30, -40 - eq.wings.tier * 4, -12); c.quadraticCurveTo(-34, 0, -38, 10); c.quadraticCurveTo(-22, 6, -26, 20); c.quadraticCurveTo(-12, 10, 0, 6); c.fill(); c.restore(); }
    c.restore();
  }
  c.translate(0, -bob);
  c.fillStyle = bc; c.fillRect(-7 + step * 0.5, -5, 6, 5); c.fillRect(1 - step * 0.5, -5, 6, 5);
  c.fillStyle = pc; c.fillRect(-6 + step * 0.5, -17, 5, 13); c.fillRect(1 - step * 0.5, -17, 5, 13);
  if (cls === 'wizard') { c.fillStyle = ac; poly(c, [-9, -38, 9, -38, 12, -8, -12, -8]); }
  else { c.fillStyle = ac; c.fillRect(-9, -38, 18, 22); c.fillStyle = shade(ac, -40); c.fillRect(-9, -19, 18, 3); }
  c.fillStyle = '#f1c9a0'; circ(c, 0, -45, 7);
  c.fillStyle = hc; c.beginPath(); c.arc(0, -46, 7.5, Math.PI, 0); c.fill();
  if (cls === 'wizard') poly(c, [-9, -48, 9, -48, 2, -64]);
  c.fillStyle = '#222'; c.fillRect(2, -46, 2, 2);
  const gl = glowColor(eq.weapon ? eq.weapon.plus : 0, t);
  if (gl) { c.shadowColor = gl; c.shadowBlur = 14; }
  if (cls === 'knight') {
    const a = o.atk > 0 ? -1.9 + (1 - o.atk / 0.25) * 3.2 : -0.4;
    c.save(); c.translate(10, -26); c.rotate(a); c.fillStyle = gl || '#dfe6ee'; c.fillRect(-2, -30, 4, 28); c.fillStyle = '#8a6d2b'; c.fillRect(-6, -3, 12, 3); c.restore();
  } else if (cls === 'wizard') {
    c.fillStyle = '#6b4a2a'; c.fillRect(10, -56, 3, 50); c.fillStyle = gl || '#6af'; circ(c, 11.5, -59, 5);
  } else {
    c.strokeStyle = gl || '#8a5a2a'; c.lineWidth = 3; c.beginPath(); c.arc(8, -28, 15, -1.2, 1.2); c.stroke();
  }
  c.shadowBlur = 0; c.fillStyle = gc; circ(c, 10, -27, 3.5); c.restore();
}

function drawMob(c, m, t) {
  const s = iso(m.x, m.y); c.save(); c.translate(s.x, s.y);
  if (m.boss) { c.globalAlpha = 0.35 + Math.sin(t * 4) * 0.15; c.fillStyle = m.c2; ell(c, 0, 0, 20 * m.size, 9 * m.size); c.globalAlpha = 1; }
  c.fillStyle = 'rgba(0,0,0,.3)'; ell(c, 0, 0, 14 * m.size, 6 * m.size);
  const lg = m.lunge > 0 ? Math.sin((m.lunge / 0.2) * Math.PI) * 6 : 0;
  c.scale(m.size * m.face, m.size); c.translate(lg, 0);
  const fl = m.flash > 0, c1 = fl ? '#fff' : m.c1, c2 = fl ? '#fff' : m.c2, mv = m.moving ? Math.sin(t * 10 + m.x) : 0, bob = Math.sin(t * 3 + m.y);
  switch (m.shape) {
    case 'blob': c.fillStyle = c1; ell(c, 0, -11, 14, 11); c.fillStyle = c2; ell(c, 0, -3, 13, 4); c.fillStyle = '#111'; circ(c, 3, -13, 2.2); circ(c, 9, -12, 2); break;
    case 'beast': c.fillStyle = c1; ell(c, 0, -14 + bob, 14, 8); circ(c, 13, -20 + bob, 7); c.strokeStyle = c2; c.lineWidth = 3; c.beginPath(); c.moveTo(-8, -10); c.lineTo(-8 - mv * 3, 0); c.moveTo(8, -10); c.lineTo(8 + mv * 3, 0); c.stroke(); break;
    case 'humanoid': c.fillStyle = c2; c.fillRect(-6 + mv * 3, -16, 5, 16); c.fillRect(1 - mv * 3, -16, 5, 16); c.fillStyle = c1; c.fillRect(-8, -38 + bob, 16, 23); c.fillStyle = c2; circ(c, 0, -45 + bob, 7); break;
    case 'bug': c.fillStyle = c1; ell(c, -3, -8, 11, 6); c.fillStyle = c2; circ(c, 9, -9, 5); break;
    case 'golem': c.fillStyle = c1; c.fillRect(-14, -44 + bob, 28, 28); c.fillRect(-11, -18, 8, 18); c.fillRect(3, -18, 8, 18); c.fillStyle = c2; c.fillRect(-7, -55 + bob, 14, 12); break;
    case 'winged': { const hv = -10 + Math.sin(t * 4 + m.x) * 3; c.fillStyle = c2; poly(c, [0, -34 + hv, -26, -48 + hv, -8, -28 + hv]); poly(c, [0, -34 + hv, 26, -48 + hv, 8, -28 + hv]); c.fillStyle = c1; ell(c, 0, -26 + hv, 8, 12); circ(c, 0, -42 + hv, 6); break; }
    case 'serpent': c.fillStyle = c1; for (let i = 0; i < 4; i++) ell(c, -12 + i * 6, -5 - Math.sin(t * 4 + i) * 2, 6, 5); circ(c, 12, -24 + bob, 7); c.fillStyle = c2; ell(c, 4, -14, 4, 10); break;
    case 'crab': c.fillStyle = c1; ell(c, 0, -12, 16, 9); circ(c, -16, -18, 6); circ(c, 16, -18, 6); c.fillStyle = c2; circ(c, -4, -22, 2); circ(c, 4, -22, 2); break;
    case 'ghost': { const hv = -12 + Math.sin(t * 3 + m.x) * 3; c.globalAlpha = 0.85; c.fillStyle = c1; circ(c, 0, -30 + hv, 12); poly(c, [-12, -30 + hv, 12, -30 + hv, 4, -6 + hv, -6, -10 + hv]); c.fillStyle = c2; circ(c, 4, -32 + hv, 2.5); c.globalAlpha = 1; break; }
    case 'gate': c.fillStyle = c1; c.fillRect(-18, -50, 36, 50); c.fillStyle = '#3a2418'; c.fillRect(-11, -36, 22, 36); c.fillStyle = c2; c.fillRect(-2, -44, 4, 6); break;
    case 'dragon': c.fillStyle = c2; poly(c, [-4, -34, -40, -60, -24, -22]); c.fillStyle = c1; ell(c, 0, -22 + bob, 20, 12); ell(c, 24, -46 + bob, 10, 7); poly(c, [10, -28, 18, -44, 26, -42, 16, -24]); break;
  }
  c.restore();
}

function dropColor(d) {
  if (d.kind === 'zen') return '#ffd54a';
  if (d.kind === 'jewel') return JEWELS[d.val].color;
  if (d.kind === 'pot') return d.val.t === 'hp' ? '#ff4d4d' : '#4d8dff';
  if (d.kind === 'ticket') return d.val === 'bc' ? '#ff4050' : '#c060ff';
  return itemColor(d.val);
}
function drawDrop(c, d, t) {
  const s = iso(d.x, d.y), col = dropColor(d), b = Math.sin(t * 4 + d.x * 3) * 2;
  c.save(); c.translate(s.x, s.y - 6 + b); c.rotate(t * 2); c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 10; c.fillRect(-4, -4, 8, 8); c.restore();
  if (d.kind === 'jewel' || d.kind === 'item') {
    c.font = '10px sans-serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = '#000';
    const tx = d.kind === 'jewel' ? JEWELS[d.val].name : (d.val.exc ? '★' : '') + itemFull(d.val);
    c.strokeText(tx, s.x, s.y - 14); c.fillStyle = col; c.fillText(tx, s.x, s.y - 14);
  }
}

function drawFx(c, f) {
  const s = iso(f.x, f.y), k = f.t / f.d;
  c.save();
  switch (f.k) {
    case 'whirl': { const r = isoRadius(f.r); c.globalAlpha = 1 - k; c.strokeStyle = '#cfe8ff'; c.lineWidth = 6; c.beginPath(); c.ellipse(s.x, s.y - 10, r.rx * (0.4 + k * 0.6), r.ry * (0.4 + k * 0.6), 0, 0, 6.283); c.stroke(); break; }
    case 'slash': c.globalAlpha = 1 - k; c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(s.x, s.y - 22, 16, -2.2 + k * 1.5, -0.6 + k * 1.5); c.stroke(); break;
    case 'meteor':
      if (f.t < 0.35) { const q = f.t / 0.35; c.fillStyle = '#ff8a20'; circ(c, s.x + 120 * (1 - q), s.y - 260 * (1 - q), 12); }
      else { const q = (f.t - 0.35) / (f.d - 0.35), r = isoRadius(f.r); c.globalAlpha = 1 - q; c.fillStyle = 'rgba(255,110,20,.55)'; ell(c, s.x, s.y, r.rx * (0.3 + q * 0.7), r.ry * (0.3 + q * 0.7)); }
      break;
    case 'boom': c.globalAlpha = 1 - k; c.fillStyle = '#ff9a30'; circ(c, s.x, s.y - 20, 6 + k * 12); break;
    case 'die': c.globalAlpha = 1 - k; c.fillStyle = f.col; for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283; circ(c, s.x + Math.cos(a) * k * 26 * f.size, s.y - 14 + Math.sin(a) * k * 13 * f.size, 3 * (1 - k) + 1); } break;
    case 'lvl': c.globalAlpha = (1 - k) * 0.7; c.fillStyle = '#ffe680'; c.fillRect(s.x - 18, s.y - 160, 36, 160); break;
    case 'dash': case 'beam': { const b = f.k === 'dash' ? iso(f.x0, f.y0) : iso(f.x1, f.y1); c.globalAlpha = 1 - k; c.strokeStyle = f.col || '#ffe08a'; c.lineWidth = 6; c.beginPath(); c.moveTo(s.x, s.y - 22); c.lineTo(b.x, b.y - 22); c.stroke(); break; }
    case 'claw': c.globalAlpha = 1 - k; c.strokeStyle = '#f44'; c.lineWidth = 2; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(s.x - 8 + i * 5, s.y - 50); c.lineTo(s.x + 8 + i * 5, s.y - 32); c.stroke(); } break;
    case 'tierup': c.globalAlpha = (1 - k) * 0.7; c.fillStyle = f.tier === 3 ? '#ffd54a' : '#9fd8ff'; c.fillRect(s.x - 26, s.y - 260, 52, 260); break;
    case 'bolt': { c.globalAlpha = 1 - k; c.strokeStyle = '#bfe0ff'; c.lineWidth = 3; c.beginPath(); f.pts.forEach((q, i) => { const P = iso(q.x, q.y); i ? c.lineTo(P.x, P.y - 28) : c.moveTo(P.x, P.y - 28); }); c.stroke(); break; }
    case 'nova': case 'frost': case 'vortex': case 'skyblade': case 'buff': {
      const r = isoRadius(f.r || 1.2), col = f.col || { frost: '#9fe4ff', vortex: '#9a4aff', skyblade: '#fff2a0' }[f.k];
      if (f.k === 'skyblade' && f.t < f.hitAt) { c.fillStyle = '#e8f4ff'; c.fillRect(s.x - 5, s.y - 300 * (1 - f.t / f.hitAt) - 90, 10, 90); }
      c.globalAlpha = (1 - k) * 0.6; c.fillStyle = col; ell(c, s.x, s.y, r.rx * (0.4 + k * 0.6), r.ry * (0.4 + k * 0.6)); break;
    }
    case 'click': c.globalAlpha = 1 - k; c.strokeStyle = '#8f8'; c.lineWidth = 2; c.beginPath(); c.ellipse(s.x, s.y, 14, 7, 0, 0, 6.283); c.stroke(); break;
  }
  c.restore();
}

function drawProjectile(c, pr) {
  const s = iso(pr.x, pr.y);
  c.save(); c.translate(s.x, s.y - 26);
  if (pr.k === 'fire') { c.fillStyle = '#ff7a20'; c.shadowColor = '#f60'; c.shadowBlur = 14; circ(c, 0, 0, 6); }
  else { const ts = iso(pr.tgt.x, pr.tgt.y); c.rotate(Math.atan2(ts.y - s.y, ts.x - s.x)); c.strokeStyle = pr.k === 'arrow2' ? '#9ff' : '#eee'; c.lineWidth = 2; c.beginPath(); c.moveTo(-12, 0); c.lineTo(4, 0); c.stroke(); }
  c.restore();
}

function itemIcon(it) {
  if (it.slot === 'weapon') return { knight: '🗡️', wizard: '🪄', archer: '🏹' }[it.cls];
  return { helm: '⛑️', armor: '🥋', pants: '👖', gloves: '🧤', boots: '👢', wings: '🪽' }[it.slot];
}

export default {
  id: 'classic', name: 'Classic',
  paintMap, drawDeco, drawHero, drawMob, drawDrop, drawFx, drawProjectile,
  itemIconHTML: itemIcon,
  mobHeight: (m) => (HEIGHT[m.shape] || 40) * m.size,
  heroHeight: 74,
};
