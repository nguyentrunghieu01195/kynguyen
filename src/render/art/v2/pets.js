// Hình vẽ thú cưng (Canvas 2D, đơn vị px game, gốc = dưới chân, quay mặt +x). Mỗi họ hình dáng + bảng màu riêng.
import { gfx3d } from '../v3d/flag.js';
import { mobFrame, FRAME as F3 } from '../v3d/hero3d.js';
import { tones, pEll, pCirc, pPoly, fs, vgrad, sparkle, groundShadow, gloss } from './kit.js';
import { PET_BY_ID, RARITY } from '../../../config/pets.js';
import { mix } from '../../paint.js';

const body = (c, x, y, rx, ry, col, T) => { pEll(c, x, y, rx, ry); fs(c, vgrad(c, y - ry, y + ry, T.h, T.s), T.o, 1.3); };
const dot = (c, x, y, r) => { pCirc(c, x, y, r); c.fillStyle = '#1a1020'; c.fill(); pCirc(c, x - r * 0.3, y - r * 0.3, r * 0.35); c.fillStyle = '#fff'; c.fill(); };

const DRAW = {
  blob(c, T, t, o) { const sq = Math.sin(t * 5) * 0.8; pEll(c, 0, -7 + sq * 0.4, 10 + sq, 8 - sq); fs(c, vgrad(c, -15, 1, T.hh, T.s), T.o, 1.3); gloss(c, -3, -11, 3.6, 2, 0.6); dot(c, 3, -8, 1.5); dot(c, 8, -8, 1.5); sparkle(c, -9, -16, 1.6, '#ffe070', 0.7 + 0.3 * Math.sin(t * 4)); },
  beast(c, T, t, o) { const w = o.moving ? Math.sin(t * 12) * 2 : 0; for (const x of [-7, -2, 4, 8]) { pEll(c, x, -2 + (x % 2 ? w : -w) * 0.4, 2, 3); fs(c, T.s, T.o, 1); } body(c, -2, -9, 10, 6, 0, T); pPoly(c, [-12, -10, -18, -16 + w, -11, -6]); fs(c, T.b, T.o, 1); body(c, 8, -12, 6, 5.5, 0, T); pPoly(c, [6, -16, 8, -22, 11, -16]); fs(c, T.s, T.o, 1); pPoly(c, [10, -15, 13, -20, 14, -14]); fs(c, T.b, T.o, 1); dot(c, 10, -13, 1.3); pCirc(c, 14, -11, 1.3); c.fillStyle = '#1a1020'; c.fill(); },
  cat(c, T, t, o) { const w = o.moving ? Math.sin(t * 12) : 0; body(c, -1, -8, 8, 6, 0, T); body(c, 7, -13, 6, 5.5, 0, T); pPoly(c, [3, -16, 5, -23, 8, -17]); fs(c, T.b, T.o, 1); pPoly(c, [8, -17, 11, -23, 13, -16]); fs(c, T.b, T.o, 1); c.strokeStyle = T.o; c.lineWidth = 2; c.beginPath(); c.moveTo(-8, -8); c.quadraticCurveTo(-18, -10 + w * 3, -14, -20 - Math.sin(t * 3) * 2); c.stroke(); dot(c, 6, -13, 1.3); dot(c, 10, -13, 1.3); pCirc(c, 14, -3, 3.6); c.fillStyle = '#ffd34a'; c.fill(); c.strokeStyle = '#8a6414'; c.lineWidth = 0.8; c.stroke(); },
  fox(c, T, t, o) { const w = Math.sin(t * 4) * 2; body(c, -2, -9, 9, 5.5, 0, T); c.save(); c.translate(-9, -9); c.rotate(-0.5 + w * 0.05); pEll(c, -7, 0, 9, 4.5); fs(c, vgrad(c, -5, 5, T.h, T.s), T.o, 1.2); pEll(c, -13, 0, 3.5, 3.5); c.fillStyle = '#fff'; c.fill(); c.restore(); body(c, 7, -13, 6, 5.5, 0, T); pPoly(c, [4, -16, 6, -24, 9, -17]); fs(c, T.b, T.o, 1); pPoly(c, [9, -17, 12, -24, 13, -16]); fs(c, T.b, T.o, 1); pEll(c, 11, -10, 3.5, 2.5); c.fillStyle = '#fff5e8'; c.fill(); dot(c, 8, -13, 1.2); dot(c, 12, -13, 1.2); for (const x of [-6, 4]) { pEll(c, x, -2, 2, 3); fs(c, T.s, T.o, 1); } },
  bird(c, T, t, o) { const f = Math.sin(t * 14) * 0.7, hy = -14 + Math.sin(t * 3) * 2; c.save(); c.translate(0, hy); c.save(); c.rotate(-0.6 + f); pEll(c, -8, -2, 9, 3.6); fs(c, vgrad(c, -6, 4, T.hh, T.s), T.o, 1); c.restore(); body(c, 0, 0, 8, 7, 0, T); body(c, 7, -5, 5, 4.6, 0, T); pPoly(c, [11, -5, 17, -3, 11, -2]); fs(c, '#ffb030', T.o, 0.9); dot(c, 8, -6, 1.2); pPoly(c, [-8, 2, -17, 5, -9, 5]); fs(c, T.b, T.o, 1); c.restore(); },
  dragon(c, T, t, o) { const f = Math.sin(t * 9) * 0.5; c.save(); c.translate(-2, -12); c.rotate(-0.8 + f); pPoly(c, [0, 0, -4, -14, -10, -8, -14, -12, -12, 0]); fs(c, '#b8f0a0', T.o, 1); c.restore(); body(c, -1, -8, 9, 6.5, 0, T); c.strokeStyle = T.o; c.lineWidth = 3; c.beginPath(); c.moveTo(-9, -7); c.quadraticCurveTo(-18, -4, -16, -12); c.stroke(); body(c, 8, -13, 6.5, 5.5, 0, T); pPoly(c, [6, -17, 7, -23, 10, -17]); fs(c, '#ffe070', T.o, 0.9); pPoly(c, [10, -17, 12, -22, 14, -16]); fs(c, '#ffe070', T.o, 0.9); dot(c, 10, -14, 1.3); for (const x of [-4, 4]) { pEll(c, x, -2, 2.4, 3); fs(c, T.s, T.o, 1); } if (o.atk > 0) { c.save(); c.globalCompositeOperation = 'lighter'; pEll(c, 19 + o.atk * 20, -12, 7 + o.atk * 8, 4); c.fillStyle = '#ff8a20'; c.fill(); c.restore(); } },
  golem(c, T, t, o) { const w = o.moving ? Math.sin(t * 8) : 0; for (const x of [-5, 5]) { pRR2(c, x - 3.5, -6 + (x > 0 ? w : -w), 7, 6, T); } pRR2(c, -10, -22, 20, 17, T); pRR2(c, -6, -29, 12, 9, T); for (const [x, y, s] of [[-8, -21, 3], [6, -18, 2.5], [-3, -10, 2.2]]) { pPoly(c, [x - s, y + s, x, y - s, x + s, y + s]); fs(c, T.d, T.o, 0.8); } c.save(); c.shadowColor = '#ffd060'; c.shadowBlur = 6; pCirc(c, -2.5, -25, 1.6); pCirc(c, 3.5, -25, 1.6); c.fillStyle = '#ffd060'; c.fill(); c.restore(); },
  ghost(c, T, t, o) { const y = -16 + Math.sin(t * 3) * 3; c.save(); c.translate(0, y); c.globalAlpha = 0.9; c.beginPath(); c.moveTo(-9, 4); c.quadraticCurveTo(-12, -12, 0, -13); c.quadraticCurveTo(12, -12, 9, 4); for (let i = 0; i < 3; i++) c.quadraticCurveTo(7 - i * 6, 8 + Math.sin(t * 6 + i) * 2, 3 - i * 6, 4); c.closePath(); fs(c, vgrad(c, -13, 8, T.hh, T.b), T.o, 1.2); c.globalAlpha = 1; c.save(); c.shadowColor = '#c8b8ff'; c.shadowBlur = 5; pCirc(c, -3, -5, 1.7); pCirc(c, 4, -5, 1.7); c.fillStyle = '#3a2a6a'; c.fill(); c.restore(); pEll(c, 0, 0, 2, 1.4); c.fillStyle = '#3a2a6a'; c.fill(); c.restore(); sparkle(c, 10, -26, 1.8, '#e8e0ff', 0.6 + 0.4 * Math.sin(t * 5)); },
  phoenix(c, T, t, o) { const f = Math.sin(t * 10) * 0.7, hy = -16 + Math.sin(t * 3) * 2; c.save(); c.translate(0, hy); for (let i = 0; i < 4; i++) { c.save(); c.rotate(0.15 * i - 0.25); pEll(c, -14 - i * 2, 4 + i * 2, 10, 2.4); fs(c, i % 2 ? '#ffd060' : '#ff7a20', T.o, 0.8); c.restore(); } c.save(); c.rotate(-0.6 + f); pEll(c, -8, -3, 10, 3.8); fs(c, vgrad(c, -7, 4, '#ffd060', '#d8400a'), T.o, 1); c.restore(); body(c, 0, 0, 8, 6.5, 0, T); body(c, 7, -5, 5, 4.6, 0, T); pPoly(c, [11, -5, 17, -3, 11, -2]); fs(c, '#ffe070', T.o, 0.9); dot(c, 8, -6, 1.2); pPoly(c, [6, -9, 8, -15, 10, -9]); fs(c, '#ff5020', T.o, 0.8); c.restore(); for (let i = 0; i < 4; i++) { const q = (t * 1.2 + i / 4) % 1; sparkle(c, -12 - q * 6 + Math.sin(i) * 3, hy + 4 + q * 12, 1.8, '#ffb040', 1 - q); } },
  unicorn(c, T, t, o) { const w = o.moving ? Math.sin(t * 12) * 2 : 0; for (const x of [-9, -4, 3, 8]) { pEll(c, x, -3 + (x % 2 ? w : -w) * 0.4, 1.8, 4.5); fs(c, T.b, T.o, 0.9); } body(c, -2, -12, 11, 6.5, 0, T); c.save(); c.translate(-12, -13); c.rotate(-0.3); pEll(c, -2, 4, 3, 7); c.fillStyle = '#e88ac8'; c.fill(); c.strokeStyle = T.o; c.lineWidth = 0.8; c.stroke(); c.restore(); body(c, 9, -19, 5.5, 5, 0, T); pPoly(c, [9, -23, 11, -33, 13, -23]); fs(c, '#ffd34a', '#8a6414', 0.9); pPoly(c, [5, -23, 5, -27, 8, -23]); fs(c, T.b, T.o, 0.9); dot(c, 11, -19, 1.2); pEll(c, 4, -22, 4, 6, -0.3); c.fillStyle = '#e88ac8'; c.fill(); sparkle(c, 12, -34, 2.2, '#fff8c0', 0.6 + 0.4 * Math.sin(t * 5)); },
  lion(c, T, t, o) { const w = o.moving ? Math.sin(t * 12) * 2 : 0; for (const x of [-7, -2, 4, 8]) { pEll(c, x, -2 + (x % 2 ? w : -w) * 0.4, 2.2, 3.4); fs(c, T.s, T.o, 1); } body(c, -2, -10, 11, 7, 0, T); c.strokeStyle = T.o; c.lineWidth = 2; c.beginPath(); c.moveTo(-12, -9); c.quadraticCurveTo(-20, -6, -17, -16); c.stroke(); pCirc(c, -17, -17, 2.4); c.fillStyle = '#a06a10'; c.fill(); pCirc(c, 8, -15, 9); fs(c, vgrad(c, -24, -6, '#c88a20', '#6a4408'), T.o, 1.2); body(c, 9, -14, 5.5, 5, 0, T); pCirc(c, 5, -20, 2); fs(c, T.b, T.o, 0.8); pCirc(c, 12, -20, 2); fs(c, T.b, T.o, 0.8); dot(c, 8, -15, 1.2); dot(c, 12, -15, 1.2); pEll(c, 12, -11, 2.4, 1.6); c.fillStyle = '#e8b0a0'; c.fill(); pPoly(c, [3, -26, 5, -31, 7, -27, 9, -32, 11, -27, 13, -31, 14, -26]); fs(c, '#ffd34a', '#8a6414', 0.9); sparkle(c, -4, -24, 1.8, '#fff0a0', 0.6 + 0.4 * Math.sin(t * 4)); },
};
function pRR2(c, x, y, w, h, T) { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, 3) : c.rect(x, y, w, h); fs(c, vgrad(c, y, y + h, T.h, T.s), T.o, 1.2); }

/** Bảng màu theo biến thể: 0 gốc · 1 sáng · 2 đổi màu chính ↔ phụ · 3 "ánh kim" vàng */
function palette(d, v) {
  const [a, b] = d.c;
  return v === 1 ? [mix(a, '#ffffff', 0.3), mix(b, '#ffffff', 0.15)] : v === 2 ? [mix(b, a, 0.25), a] : v === 3 ? [mix(a, '#ffd34a', 0.5), mix(b, '#ffb020', 0.4)] : [a, b];
}
const rcol = (d) => RARITY[d.rarity].color;
/** Tiến hoá theo cấp: bậc 2 (lv4) bùa lơ lửng · bậc 3 (lv7) vòng sáng dưới chân · bậc 4 (lv10) hào quang + hạt theo độ hiếm */
function evolution(c, d, t, o, back) {
  const band = o.band || 1, col = rcol(d);
  if (back) {
    if (band >= 3) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.35 + 0.15 * Math.sin(t * 3); c.strokeStyle = col; c.lineWidth = 2; c.scale(1, 0.4); pCirc(c, 0, 0, 15 + (band >= 4 ? 3 : 0)); c.stroke(); if (band >= 4) { c.globalAlpha = 0.18; c.fillStyle = col; c.fill(); } c.restore(); }
    return;
  }
  if (band >= 2) { const y = -35 + Math.sin(t * 2.5) * 2; c.save(); c.translate(0, y); c.rotate(t); c.globalCompositeOperation = 'lighter'; pPoly(c, [0, -4, 1.4, -1.4, 4, 0, 1.4, 1.4, 0, 4, -1.4, 1.4, -4, 0, -1.4, -1.4]); c.fillStyle = col; c.globalAlpha = 0.9; c.fill(); c.restore(); }
  if (band >= 4) for (let i = 0; i < 4; i++) { const q = (t * 0.7 + i / 4) % 1; sparkle(c, Math.sin(i * 2 + t) * 11, -4 - q * 30, 1.8, col, 1 - q); }
}
/** Hành vi chờ: nhịp thở theo độ hiếm; ngủ khi chủ đứng yên lâu (Zzz); thỉnh thoảng thả tim */
function idleExtras(c, d, t, o) {
  if (o.moving) return;
  if ((o.idle || 0) > 9) { for (let i = 0; i < 3; i++) { const q = (t * 0.4 + i / 3) % 1; c.save(); c.globalAlpha = 1 - q; c.fillStyle = '#e8f0ff'; c.font = 'bold ' + (6 + q * 4) + 'px sans-serif'; c.fillText('z', 8 + q * 8, -30 - q * 16); c.restore(); } return; }
  const k = (t * 0.17 + (o.seed || 0)) % 1;
  if (k < 0.12) { const q = k / 0.12; c.save(); c.globalAlpha = 1 - q; c.fillStyle = '#ff6a8a'; const x = 5, y = -34 - q * 12; c.beginPath(); c.moveTo(x, y + 2); c.bezierCurveTo(x - 5, y - 3, x - 2, y - 6, x, y - 3); c.bezierCurveTo(x + 2, y - 6, x + 5, y - 3, x, y + 2); c.fill(); c.restore(); }
}

// Pet → mô hình 3D (Quaternius, CC0); nhuộm nhẹ theo màu pet
const PET_MODEL = { slime: 'Blob_GreenBlob', wolf: 'Blob_Dog', cat: 'Blob_Cat', fox: 'Blob_Dog', owl: 'Blob_Birb', bird: 'Blob_Pigeon', dragon: 'Flying_Dragon', golem: 'Flying_Goleling_Evolved', ghost: 'Flying_Ghost', phoenix: 'Flying_Pigeon', unicorn: 'Big_Bunny', lion: 'Big_Monkroose' };

/** Vẽ pet. o: { moving, atk (0..1), face, v (biến thể), band (bậc tiến hoá 1..4), idle (giây chủ đứng yên), seed } — gốc: dưới chân pet */
export function drawPet(c, kind, t, o = {}) {
  const d = PET_BY_ID[kind]; if (!d) return;
  const pal = palette(d, o.v || 0), T = tones(pal[0]); T.d2 = tones(pal[1]);
  c.save(); c.scale(o.face || 1, 1);
  groundShadow(c, d.shape === 'bird' || d.shape === 'ghost' || d.shape === 'phoenix' ? 7 : 11, 3.4, 0.3);
  evolution(c, d, t, o, true);
  const bob = o.moving && !['bird', 'ghost', 'phoenix'].includes(d.shape) ? Math.abs(Math.sin(t * 10)) * 2 : 0, sleep = !o.moving && (o.idle || 0) > 9;
  c.translate(0, -bob); c.scale(1.3, sleep ? 1.3 * 0.86 : 1.3);
  const mdl = PET_MODEL[kind], f3 = mdl && gfx3d() ? mobFrame({ model: mdl, pose: o.atk > 0 ? 'attack' : o.moving ? 'walk' : 'idle', f: o.atk > 0 ? 1 - Math.min(1, o.atk) : (t * (o.moving ? 1.8 : 0.6) + (o.seed || 0) * 3) % 1, tint: /^#[0-9a-f]{6}$/i.test(pal[0]) ? pal[0] : '#ffffff', amt: 0.65 }) : null;
  if (f3) { const hh = 40 * (1 + 0.08 * ((o.band || 1) - 1)), ww = hh * F3.w / F3.h, fly = /^Flying_/.test(mdl); c.translate(0, fly ? -8 : 0); c.drawImage(f3, -ww / 2, fly ? -hh * 0.55 : -hh * 0.86, ww, hh); }
  else (DRAW[d.shape] || DRAW.blob)(c, T, t, o);
  if ((o.v || 0) === 3) sparkle(c, -6, -22, 1.8, '#fff0a0', 0.5 + 0.5 * Math.sin(t * 5 + 1));
  c.restore();
  c.save(); c.scale(o.face || 1, 1); c.scale(1.3, 1.3); evolution(c, d, t, o, false); idleExtras(c, d, t, o); c.restore();
}
