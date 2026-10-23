// Phụ kiện nhân vật V2: vũ khí (10 loại), vai giáp & huy hiệu theo kiểu bộ, cánh,
// thời trang (trang phục, mũ, hào quang). Gốc toạ độ do hero.js đặt sẵn.
import { WINGS } from '../../../config/items.js';
import { mix } from '../../paint.js';
import { tones, pEll, pCirc, pPoly, pRR, fs, vgrad, rgrad, gloss, sparkle, hash } from './kit.js';

export const ORB = ['#7fb3ff', '#9fe8ff', '#c8ff9f', '#bff0ff', '#ff7a3a', '#fff2a0'];
const STEEL = [['#ffffff', '#9aa4b4'], ['#ffffff', '#a8b0bc'], ['#f5f0e0', '#b8ae94'], ['#f0fbff', '#7fc8f0'], ['#ffb060', '#ff4a10'], ['#ffffff', '#f0d878']];
const steelGrad = (c, tier, w, gl) => { if (gl) return gl; const g = c.createLinearGradient(-w, 0, w, 0), s = STEEL[tier]; g.addColorStop(0, s[0]); g.addColorStop(1, s[1]); return g; };
const glowOn = (c, gl, blur = 14) => { if (gl) { c.shadowColor = gl; c.shadowBlur = blur; } };
const glowOff = (c) => { c.shadowBlur = 0; };

// =====================================================================
//  VŨ KHÍ — vẽ trong khung bàn tay, hướng mũi/đầu vũ khí = -y
// =====================================================================
function grip(c, len, col = '#5a3420') { pRR(c, -1.8, -2, 3.6, len, 1.2); fs(c, vgrad(c, -2, len, mix(col, '#ffffff', 0.2), col), '#1a0a04', 0.9); }
function pommel(c, y, tier) { pCirc(c, 0, y, 2.2); fs(c, ORB[tier], '#1a0a04', 0.8); }

export const WEAPONS = {
  sword(c, W) {
    const { tier, gl, col } = W, len = 26 + tier * 2.2, w = 2.6 + tier * 0.35, T = tones(col);
    grip(c, 9); pommel(c, 8, tier);
    glowOn(c, gl);
    c.beginPath();
    if (tier === 4) { c.moveTo(-w, -4); for (let i = 1; i <= 5; i++) c.lineTo(-w + (i % 2 ? -1.3 : 0.6), -4 - (len * i) / 5.5); c.lineTo(0, -10 - len); for (let i = 5; i >= 1; i--) c.lineTo(w + (i % 2 ? 1.3 : -0.6), -4 - (len * i) / 5.5); c.lineTo(w, -4); }
    else { c.moveTo(-w, -4); c.lineTo(-w * 0.9, -4 - len); c.lineTo(0, -10 - len); c.lineTo(w * 0.9, -4 - len); c.lineTo(w, -4); }
    c.closePath(); c.fillStyle = steelGrad(c, tier, w, gl); c.fill(); glowOff(c); c.strokeStyle = '#2a2030'; c.lineWidth = 1.1; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-0.5, -6); c.lineTo(-0.5, -2 - len); c.stroke();
    c.beginPath(); c.moveTo(-8 - tier * 0.6, -4); c.quadraticCurveTo(0, -1, 8 + tier * 0.6, -4); c.lineTo(8 + tier * 0.6, -1.3); c.quadraticCurveTo(0, 1.6, -8 - tier * 0.6, -1.3); c.closePath(); fs(c, vgrad(c, -4, 2, T.h, T.s), T.o, 1);
  },
  axe(c, W) {
    const { tier, gl, col } = W, T = tones(col), L = 30 + tier * 1.5;
    pRR(c, -1.8, -L, 3.6, L + 8, 1.4); fs(c, vgrad(c, -L, 8, '#9a6a3a', '#4a2a10'), '#1a0a04', 1);
    for (let i = 0; i < 3; i++) { pRR(c, -2.2, -6 + i * 3.2, 4.4, 1.6, 0.6); c.fillStyle = '#2a1408'; c.fill(); }
    glowOn(c, gl);
    // Lưỡi rìu hình trăng khuyết + chóp nhọn phía sau
    c.beginPath(); c.moveTo(1.5, -L + 2); c.quadraticCurveTo(14 + tier, -L - 6, 16 + tier * 1.2, -L + 6); c.quadraticCurveTo(10 + tier, -L + 10, 16 + tier * 1.2, -L + 18); c.quadraticCurveTo(10, -L + 16, 1.5, -L + 14); c.closePath();
    c.fillStyle = steelGrad(c, tier, 8, gl); c.fill(); glowOff(c); c.strokeStyle = '#2a2030'; c.lineWidth = 1.1; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1; c.beginPath(); c.moveTo(15 + tier, -L + 1); c.quadraticCurveTo(10 + tier, -L + 8, 15 + tier, -L + 16); c.stroke();
    pPoly(c, [-1.5, -L + 4, -8, -L + 8, -1.5, -L + 11]); fs(c, T.b, T.o, 1);
    pRR(c, -2.6, -L - 3, 5.2, 4, 1); fs(c, T.h, T.o, 0.8);
  },
  mace(c, W) {
    const { tier, gl, col } = W, T = tones(col), L = 24 + tier * 1.2, R = 6 + tier * 0.4;
    grip(c, 9); pommel(c, 8, tier);
    pRR(c, -1.6, -L, 3.2, L, 1); fs(c, vgrad(c, -L, 0, T.h, T.s), T.o, 0.9);
    glowOn(c, gl);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; c.save(); c.translate(0, -L - R * 0.4); c.rotate(a); pPoly(c, [-1.8, -R + 1, 0, -R - 4, 1.8, -R + 1]); fs(c, steelGrad(c, tier, 2, gl), '#2a2030', 0.8); c.restore(); }
    pCirc(c, 0, -L - R * 0.4, R); c.fillStyle = rgrad(c, -2, -L - R, 1, R + 2, STEEL[tier][0], STEEL[tier][1]); if (gl) c.fillStyle = gl; c.fill(); glowOff(c); c.strokeStyle = '#2a2030'; c.lineWidth = 1.1; c.stroke();
    gloss(c, -2, -L - R * 0.9, 2, 1.2, 0.7);
  },
  spear(c, W) {
    const { tier, gl, col } = W, T = tones(col), L = 44 + tier * 2;
    pRR(c, -1.5, -L, 3, L + 16, 1.2); fs(c, vgrad(c, -L, 16, '#a87040', '#4a2a10'), '#1a0a04', 0.9);
    glowOn(c, gl);
    c.beginPath(); c.moveTo(0, -L - 16 - tier); c.quadraticCurveTo(5 + tier * 0.4, -L - 6, 2, -L + 1); c.lineTo(-2, -L + 1); c.quadraticCurveTo(-5 - tier * 0.4, -L - 6, 0, -L - 16 - tier); c.closePath();
    c.fillStyle = steelGrad(c, tier, 4, gl); c.fill(); glowOff(c); c.strokeStyle = '#2a2030'; c.lineWidth = 1; c.stroke();
    pRR(c, -3, -L - 1, 6, 4, 1); fs(c, T.b, T.o, 0.8);
    // Tua rua
    c.strokeStyle = tier >= 4 ? '#ffd54a' : '#c0302a'; c.lineWidth = 1.6; c.lineCap = 'round';
    for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(0, -L + 3); c.quadraticCurveTo(i * 4 - 3, -L + 8, i * 3 - 5, -L + 13 + Math.abs(i)); c.stroke(); }
  },
  staff(c, W, t, cast) {
    const { tier, gl, col } = W, T = tones(col), top = -40, oc = gl || ORB[tier];
    pRR(c, -1.5, top + 6, 3, 42, 1.2); fs(c, vgrad(c, top, 22, tier >= 3 ? '#f0ecf8' : '#9a6a3a', tier >= 3 ? '#8a849a' : '#4a2a14'), '#1a0e08', 1);
    for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(0, top + 10); c.quadraticCurveTo(sd * 9, top + 4, sd * 5, top - 7); c.quadraticCurveTo(sd * 5, top + 2, 0, top + 6); fs(c, T.b, T.o, 1); }
    c.save(); c.shadowColor = oc; c.shadowBlur = 12 + (cast ? 16 : 0) + Math.sin(t * 4) * 3;
    pCirc(c, 0, top, 5 + tier * 0.25 + (cast ? 1.5 : 0)); c.fillStyle = rgrad(c, -1.5, top - 1.5, 0.5, 6, '#ffffff', oc); c.fill(); c.restore();
    if (cast) for (let i = 0; i < 4; i++) sparkle(c, Math.cos(t * 8 + i * 1.6) * 9, top + Math.sin(t * 8 + i * 1.6) * 9, 2.2, oc);
  },
  orb(c, W, t, cast) {
    const { tier, gl } = W, oc = gl || ORB[tier], y = -12 - Math.sin(t * 3) * 2 - (cast ? 6 : 0), r = 6 + tier * 0.4;
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5; c.fillStyle = rgrad(c, 0, y, 1, r * 2.4, oc, 'rgba(0,0,0,0)'); pCirc(c, 0, y, r * 2.4); c.fill(); c.restore();
    c.save(); c.shadowColor = oc; c.shadowBlur = 14 + (cast ? 12 : 0);
    pCirc(c, 0, y, r); c.fillStyle = rgrad(c, -2, y - 2, 0.5, r + 1, '#ffffff', oc); c.fill(); c.restore();
    c.strokeStyle = mix(oc.startsWith('#') ? oc : '#ffffff', '#ffffff', 0.4); c.lineWidth = 1.1;
    for (let i = 0; i < 2; i++) { c.beginPath(); c.ellipse(0, y, r + 4 + i * 2, 2.5, t * (1.5 + i) + i, 0, Math.PI * 2); c.stroke(); }
    gloss(c, -2, y - 2.5, 1.8, 1.1, 0.8);
  },
  tome(c, W, t, cast) {
    const { tier, gl, col } = W, T = tones(col), oc = gl || ORB[tier], open = cast ? 1 : 0.55;
    c.save(); c.translate(2, -6); c.rotate(-0.2);
    for (const sd of [-1, 1]) { c.save(); c.scale(sd, 1); c.rotate(-open * 0.5); pRR(c, 0, -9, 11, 15, 1.5); fs(c, vgrad(c, -9, 6, T.h, T.s), T.o, 1); pRR(c, 1, -8, 9, 13, 1); fs(c, '#f3ead0', '#8a7a5a', 0.6);
      c.strokeStyle = 'rgba(90,70,40,.6)'; c.lineWidth = 0.7; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(3, -5 + i * 3); c.lineTo(8, -5 + i * 3); c.stroke(); } c.restore(); }
    pRR(c, -1.2, -9, 2.4, 15, 1); fs(c, T.d, T.o, 0.6);
    c.restore();
    // Ký tự phép bay lên
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < (cast ? 6 : 3); i++) { const k = (t * 0.8 + hash(i + tier)) % 1; c.globalAlpha = 1 - k; sparkle(c, (hash(i * 3) - 0.5) * 16, -14 - k * 22, 2 + (cast ? 1 : 0), oc); }
    c.restore();
  },
  bow(c, W, t, pull) {
    const { tier, gl, col } = W, T = tones(col), H = 17 + tier * 0.8;
    glowOn(c, gl, 12);
    c.beginPath(); c.moveTo(-2, -H); c.quadraticCurveTo(12, -H * 0.55, 4, 0); c.quadraticCurveTo(12, H * 0.55, -2, H);
    c.lineTo(-3, H - 2); c.quadraticCurveTo(8, H * 0.5, 1, 0); c.quadraticCurveTo(8, -H * 0.5, -3, -H + 2); c.closePath();
    fs(c, gl || vgrad(c, -H, H, T.h, T.s), T.o, 1.2); glowOff(c);
    if (tier >= 3) { pCirc(c, 8, -H * 0.5, 1.8); fs(c, ORB[tier], '#000', 0.6); pCirc(c, 8, H * 0.5, 1.8); fs(c, ORB[tier], '#000', 0.6); }
    pRR(c, 1, -3, 5, 6, 1.5); fs(c, '#4a2a18', '#1a0a04', 0.8);
    c.strokeStyle = 'rgba(240,240,230,.9)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-2.5, -H + 1); c.lineTo(-2.5 - pull, 0); c.lineTo(-2.5, H - 1); c.stroke();
    if (pull > 0) { c.strokeStyle = '#d8c8a0'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-2.5 - pull, 0); c.lineTo(18, 0); c.stroke(); pPoly(c, [18, -2, 22, 0, 18, 2]); fs(c, '#ddd', '#333', 0.6); }
  },
  crossbow(c, W, t, pull) {
    const { tier, gl, col } = W, T = tones(col), rec = pull > 0 ? -3 : 0;
    c.save(); c.translate(rec, 0); c.rotate(Math.PI / 2); // nằm ngang, hướng sang phải
    pRR(c, -2.5, -20, 5, 26, 1.5); fs(c, vgrad(c, -20, 6, '#a87040', '#4a2a10'), '#1a0a04', 1);
    glowOn(c, gl, 12);
    c.beginPath(); c.moveTo(-15, -12); c.quadraticCurveTo(0, -20, 15, -12); c.lineTo(15, -10); c.quadraticCurveTo(0, -17, -15, -10); c.closePath(); fs(c, gl || vgrad(c, -20, -10, T.h, T.s), T.o, 1); glowOff(c);
    c.strokeStyle = '#ddd'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-15, -11); c.lineTo(0, pull > 0 ? -16 : -7); c.lineTo(15, -11); c.stroke();
    if (!(pull > 0)) { c.strokeStyle = '#8a6a3a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(0, -8); c.lineTo(0, -24); c.stroke(); pPoly(c, [-1.8, -24, 0, -28, 1.8, -24]); fs(c, '#eee', '#333', 0.6); }
    pRR(c, -3, -4, 6, 4, 1); fs(c, T.b, T.o, 0.8);
    if (tier >= 3) { pCirc(c, 0, -14, 2); fs(c, ORB[tier], '#000', 0.6); }
    c.restore();
  },
  twinbow(c, W, t, pull) { c.save(); c.scale(0.82, 0.82); WEAPONS.bow(c, W, t, pull); c.restore(); },
};
/** Các loại vũ khí cầm bằng tay trước & có chuyển động vung */
export const MELEE = { sword: 1, axe: 1, mace: 1 };

// =====================================================================
//  VAI GIÁP theo kiểu bộ (style)
// =====================================================================
export function pauldron(c, style, col, trim, x, y, front) {
  const T = tones(col), TR = tones(trim);
  c.save(); c.translate(x, y); if (!front) c.globalAlpha = 0.9;
  switch (style) {
    case 'leather': pRR(c, -4.5, -3, 9, 5.5, 2.5); fs(c, T.s, T.o); c.strokeStyle = TR.h; c.setLineDash([1.5, 1.5]); c.lineWidth = 0.7; c.beginPath(); c.moveTo(-3.5, 0); c.lineTo(3.5, 0); c.stroke(); c.setLineDash([]); break;
    case 'cloth': pEll(c, 0, 0, 5.5, 3.5); fs(c, vgrad(c, -4, 4, T.h, T.s), T.o, 1); break;
    case 'bronze': pEll(c, 0, 0, 7, 5.2); fs(c, vgrad(c, -5, 5, T.hh, T.s), T.o); pEll(c, 0, 2.5, 6, 2.5); fs(c, T.b, T.o, 0.8); pCirc(c, 0, -0.5, 1.2); c.fillStyle = TR.h; c.fill(); break;
    case 'fur': for (let i = 0; i < 5; i++) { pEll(c, -4 + i * 2, -1 + (i % 2), 3, 4); fs(c, i % 2 ? T.h : T.b, T.o, 0.8); } break;
    case 'bone': pEll(c, 0, 0, 6.5, 4.8); fs(c, T.b, T.o); for (const [a, b] of [[-4, -9], [0, -11.5], [4, -9]]) { pPoly(c, [a - 1.8, -2, a + 1.8, -2, a, b]); fs(c, T.hh, T.o, 0.9); } break;
    case 'shadow': pEll(c, 0, 0, 7, 5); fs(c, vgrad(c, -5, 5, T.h, T.d), T.o); c.save(); c.shadowColor = trim; c.shadowBlur = 8;
      for (const [a, b] of [[-3, -10], [2, -12]]) { pPoly(c, [a - 2, -2, a + 2, -2, a + 1, b]); fs(c, '#1a1424', trim, 0.9); } c.restore(); break;
    case 'ice': pEll(c, 0, 0, 6.5, 4.8); fs(c, vgrad(c, -5, 5, T.hh, T.s), T.o); pPoly(c, [-2, -2, 1, -13, 3, -2]); fs(c, '#e8f8ff', '#3d86c2', 1); pPoly(c, [2, -2, 6.5, -9, 6.5, 0]); fs(c, '#bfe8ff', '#3d86c2', 1); break;
    case 'leaf': for (let i = 0; i < 3; i++) { c.save(); c.rotate(-0.8 + i * 0.6); pEll(c, 0, -5, 3, 6.5); fs(c, i === 1 ? T.h : T.b, TR.o, 0.9); c.strokeStyle = TR.b; c.lineWidth = 0.6; c.beginPath(); c.moveTo(0, -10); c.lineTo(0, 0); c.stroke(); c.restore(); } break;
    case 'dragon': pEll(c, 0, 0, 7.5, 5.2); fs(c, vgrad(c, -5, 5, T.h, T.d), T.o);
      c.beginPath(); c.moveTo(-3, -3); c.quadraticCurveTo(-11, -10, -2, -15); c.quadraticCurveTo(-4, -8, 2, -4); c.closePath(); fs(c, '#2a0a04', '#000', 1);
      for (let i = 0; i < 3; i++) { pEll(c, -4 + i * 4, 2, 2.2, 1.6); c.fillStyle = T.s; c.fill(); } break;
    case 'magma': pPoly(c, [-7, 2, -5, -5, 2, -6, 7, -1, 5, 4, -3, 5]); fs(c, vgrad(c, -6, 5, '#6a3a2a', '#2a1410'), '#0a0404');
      c.save(); c.shadowColor = trim; c.shadowBlur = 8; c.strokeStyle = trim; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-4, -3); c.lineTo(0, 0); c.lineTo(4, -3); c.moveTo(0, 0); c.lineTo(1, 4); c.stroke(); c.restore(); break;
    case 'angel': pEll(c, 0, 1, 8, 5.2); fs(c, vgrad(c, -5, 5, '#fffbe8', T.b), TR.d); pEll(c, 0, -2, 6, 3.6); fs(c, vgrad(c, -5, 2, '#fff', '#f0d878'), TR.d, 1);
      c.beginPath(); c.moveTo(-2, -4); c.quadraticCurveTo(-10, -12, -3, -16); c.quadraticCurveTo(-1, -10, 2, -5); fs(c, '#fff', TR.d, 1); break;
    case 'demon': pEll(c, 0, 0, 7.5, 5); fs(c, vgrad(c, -5, 5, T.h, T.d), T.o); c.save(); c.shadowColor = trim; c.shadowBlur = 8;
      c.beginPath(); c.moveTo(-4, -3); c.quadraticCurveTo(-12, -6, -10, -15); c.quadraticCurveTo(-6, -8, 0, -4); fs(c, '#1a0a1a', trim, 1); c.restore(); break;
  }
  c.restore();
}

/** Huy hiệu ngực theo kiểu bộ */
export function chestEmblem(c, style, trim, x, y) {
  const TR = tones(trim);
  const gem = (col) => { c.save(); c.shadowColor = col; c.shadowBlur = 8; pPoly(c, [x, y - 4, x + 3, y, x, y + 4, x - 3, y]); fs(c, col, TR.o, 0.8); c.restore(); };
  switch (style) {
    case 'bronze': for (const [dx, dy] of [[-5, -6], [6, -6], [-5, 7], [6, 7]]) { pCirc(c, x + dx, y + dy, 0.9); c.fillStyle = TR.h; c.fill(); } break;
    case 'bone': pCirc(c, x, y, 3.2); fs(c, '#f5f0e0', '#4a4436', 0.8); c.fillStyle = '#2a2420'; pCirc(c, x - 1.2, y - 0.5, 0.8); c.fill(); pCirc(c, x + 1.2, y - 0.5, 0.8); c.fill(); break;
    case 'fur': c.fillStyle = TR.b; pPoly(c, [x - 3, y - 3, x, y + 3, x + 3, y - 3, x, y - 1]); c.fill(); break;
    case 'shadow': gem('#8a5cff'); break;
    case 'ice': gem('#bff0ff'); break;
    case 'leaf': c.save(); c.translate(x, y); pEll(c, 0, 0, 2.5, 4); fs(c, '#7ae0a0', TR.o, 0.7); c.restore(); break;
    case 'dragon': gem('#ff7a3a'); break;
    case 'magma': gem('#ffb040'); break;
    case 'angel': c.save(); c.shadowColor = '#fff2a0'; c.shadowBlur = 10; pCirc(c, x, y, 3.4); fs(c, '#fff8c0', '#a88a20', 0.8); c.restore(); for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283; c.strokeStyle = '#c9a227'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4); c.lineTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6); c.stroke(); } break;
    case 'demon': gem('#ff40c0'); break;
    default: break;
  }
}

/** Mào/đồ trang trí trên mũ theo kiểu bộ, gốc ở đỉnh đầu (0,0) */
export function crest(c, style, col, trim) {
  switch (style) {
    case 'bronze': c.beginPath(); c.moveTo(0, -2); c.quadraticCurveTo(-14, -12, -20, 4); c.quadraticCurveTo(-10, -4, -2, 2); fs(c, '#d63a2a', '#5a0e08', 1); break;
    case 'fur': for (const sd of [-1, 1]) { pPoly(c, [sd * 4, 2, sd * 9, -9, sd * 11, 3]); fs(c, col, tones(col).o, 1); pPoly(c, [sd * 6, 1, sd * 9, -5, sd * 9.5, 2]); fs(c, '#f0c0b0', '#6a4a40', 0.6); } break;
    case 'bone': for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 7, 3); c.quadraticCurveTo(sd * 17, 1, sd * 15, -11); c.quadraticCurveTo(sd * 11, -1, sd * 4, 0); fs(c, '#f3eedc', '#6a6250', 1); } break;
    case 'shadow': c.save(); c.shadowColor = trim; c.shadowBlur = 8; for (const [x, h] of [[-6, 7], [-2, 10], [2, 12], [6, 8]]) { pPoly(c, [x - 1.8, 2, x, 2 - h, x + 1.8, 2]); fs(c, '#1a1424', trim, 0.8); } c.restore(); break;
    case 'ice': for (const [x, h] of [[-5, 10], [0, 15], [5, 10]]) { pPoly(c, [x - 2.5, 2, x, 2 - h, x + 2.5, 2]); fs(c, '#e8f8ff', '#3d86c2', 1); } break;
    case 'leaf': for (let i = 0; i < 5; i++) { c.save(); c.translate(-8 + i * 4, 2 - Math.abs(i - 2)); c.rotate(-0.5 + i * 0.25); pEll(c, 0, -3, 2, 4); fs(c, i % 2 ? '#7ae0a0' : '#4aa078', '#1a4a30', 0.7); c.restore(); } break;
    case 'dragon': for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 6, 2); c.quadraticCurveTo(sd * 5, -13, sd * 13, -13); c.quadraticCurveTo(sd * 3, -7, sd * 1, 0); fs(c, '#2a0a04', '#000', 1); } break;
    case 'magma': c.save(); c.shadowColor = trim; c.shadowBlur = 10; pPoly(c, [-4, 2, 0, -13, 4, 2]); fs(c, '#3a1a10', trim, 1); c.restore(); break;
    case 'angel': for (const sd of [-1, 1]) { c.save(); c.translate(sd * 10, -2); c.scale(sd, 1); for (let i = 0; i < 3; i++) { pEll(c, 4 + i * 2, -4 - i * 3, 7 - i, 2.2, -0.7 - i * 0.25); fs(c, '#fffdf0', '#a88a20', 0.8); } c.restore(); }
      c.save(); c.shadowColor = '#fff2a0'; c.shadowBlur = 10; c.strokeStyle = '#ffe680'; c.lineWidth = 1.6; c.beginPath(); c.ellipse(0, -8, 8, 2.4, 0, 0, 6.283); c.stroke(); c.restore(); break;
    case 'demon': c.save(); c.shadowColor = trim; c.shadowBlur = 8; for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 5, 2); c.quadraticCurveTo(sd * 14, -2, sd * 10, -14); c.quadraticCurveTo(sd * 9, -4, sd * 1, 0); fs(c, '#1a0a1a', trim, 1); } c.restore(); break;
    default: break;
  }
}

// =====================================================================
//  CÁNH
// =====================================================================
export function drawWings(c, w, t) {
  const W = WINGS[w.tier], T = tones(W.color), fl = Math.sin(t * 3) * 0.16, glow = w.plus >= 7;
  c.save(); c.translate(-3, -40);
  if (glow) { c.shadowColor = W.color; c.shadowBlur = 16; }
  for (const sd of [-1, 1]) {
    c.save(); c.scale(sd, 1); c.rotate(-0.15 - sd * fl);
    if (w.tier === 2) {
      c.beginPath(); c.moveTo(0, 0); c.lineTo(-14, -26); c.lineTo(-44, -30);
      c.quadraticCurveTo(-38, -16, -46, -6); c.quadraticCurveTo(-34, -6, -36, 6); c.quadraticCurveTo(-24, 0, -24, 14); c.quadraticCurveTo(-12, 4, 0, 6); c.closePath();
      c.fillStyle = vgrad(c, -30, 14, T.h, T.d); c.fill(); c.strokeStyle = T.o; c.lineWidth = 1.5; c.stroke();
      c.strokeStyle = T.hh; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-14, -26); c.lineTo(-46, -6); c.moveTo(-14, -26); c.lineTo(-36, 6); c.moveTo(-14, -26); c.lineTo(-24, 14); c.stroke();
    } else {
      const n = w.tier === 3 ? 7 : 5, L = w.tier === 3 ? 46 : 36;
      for (let i = n - 1; i >= 0; i--) {
        const a = -0.9 + i * (1.5 / n), len = L * (1 - i * 0.07);
        c.save(); c.rotate(a); pEll(c, -len / 2, 0, len / 2, 5.5); c.fillStyle = vgrad(c, -6, 6, i % 2 ? T.hh : T.h, T.b); c.fill(); c.strokeStyle = T.o; c.lineWidth = 1; c.stroke(); c.restore();
      }
      if (w.tier === 3) for (let i = 0; i < 3; i++) sparkle(c, -20 - i * 9, -18 + Math.sin(t * 3 + i) * 4, 2.5, '#fff8c0', 0.6 + 0.4 * Math.sin(t * 5 + i));
    }
    c.restore();
  }
  c.restore();
}

// =====================================================================
//  THỜI TRANG
// =====================================================================
/** Màu cơ thể bị trang phục thay thế */
export const OUTFIT_COLORS = {
  cloak: (f) => ({ body: f.colors[0], legs: '#3a3a44', boots: '#3a2a20', gloves: '#5a4a3a', sleeve: f.colors[0] }),
  aodai: (f) => ({ body: f.colors[0], legs: '#f8f0e0', boots: '#2a1a14', gloves: '#f6d2b0', sleeve: f.colors[0] }),
  royal: (f) => ({ body: f.colors[0], legs: '#d8dce8', boots: '#c8ccd8', gloves: '#e8ecf4', sleeve: f.colors[0] }),
  ninja: (f) => ({ body: f.colors[0], legs: f.colors[0], boots: '#101018', gloves: '#101018', sleeve: f.colors[0] }),
  winter: (f) => ({ body: f.colors[0], legs: '#8a1a1a', boots: '#1a1a1a', gloves: '#ffffff', sleeve: f.colors[0] }),
  jade: (f) => ({ body: f.colors[0], legs: '#0e2a1e', boots: '#0e2a1e', gloves: '#16382a', sleeve: f.colors[0] }),
};

/** Lớp áo trang phục vẽ đè lên thân (gốc: chân nhân vật) */
export function outfitBody(c, f, cls, t, walk) {
  const [a, b] = f.colors, A = tones(a), B = tones(b);
  switch (f.style) {
    case 'cloak': {
      const sw = Math.sin(t * 3) * 1.5 + walk * 2;
      c.beginPath(); c.moveTo(-10, -42); c.quadraticCurveTo(-15 - sw, -18, -13 - sw, -2); c.quadraticCurveTo(0, 1, 12, -3); c.quadraticCurveTo(12, -20, 10, -42); c.closePath();
      fs(c, vgrad(c, -42, 0, A.h, A.d), A.o);
      c.strokeStyle = B.b; c.lineWidth = 1.4; c.beginPath(); c.moveTo(4, -40); c.quadraticCurveTo(6, -20, 9, -3); c.stroke();
      pCirc(c, 4, -38, 2); fs(c, B.b, B.o, 0.8);
      break;
    }
    case 'aodai': {
      // Áo dài: thân ôm, 2 tà dài bay theo gió
      const sw = Math.sin(t * 2.5) * 2 + walk * 3;
      c.beginPath(); c.moveTo(-8, -42); c.lineTo(8, -42); c.quadraticCurveTo(10, -30, 8, -20); c.lineTo(-8, -20); c.quadraticCurveTo(-10, -30, -8, -42); c.closePath(); fs(c, vgrad(c, -42, -20, A.h, A.s), A.o);
      c.beginPath(); c.moveTo(-8, -21); c.quadraticCurveTo(-12 - sw, -10, -10 - sw * 1.4, -2); c.lineTo(-3, -3); c.lineTo(-1, -21); c.closePath(); fs(c, vgrad(c, -21, -2, A.b, A.d), A.o, 1);
      c.beginPath(); c.moveTo(1, -21); c.lineTo(4, -2); c.lineTo(11 - sw * 0.6, -3); c.quadraticCurveTo(11, -12, 8, -21); c.closePath(); fs(c, vgrad(c, -21, -2, A.h, A.s), A.o, 1);
      // Hoa văn vàng
      c.strokeStyle = B.b; c.lineWidth = 1; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(-1 + i * 3, -34 + i * 4, 2.2, 0, Math.PI * 1.5); c.stroke(); }
      pRR(c, -5, -43, 10, 3, 1.4); fs(c, B.b, B.o, 0.8);
      break;
    }
    case 'royal': {
      c.beginPath(); c.moveTo(-10, -42); c.lineTo(10, -42); c.quadraticCurveTo(11, -28, 9, -16); c.lineTo(-9, -16); c.quadraticCurveTo(-11, -28, -10, -42); c.closePath(); fs(c, vgrad(c, -42, -16, '#ffffff', A.s), A.o);
      c.beginPath(); c.moveTo(-4, -40); c.lineTo(5, -40); c.lineTo(6, -6); c.lineTo(-3, -6); c.closePath(); fs(c, vgrad(c, -40, -6, B.h, B.d), B.o, 1);
      c.save(); c.translate(1, -30); pPoly(c, [0, -4, 1.2, -1.2, 4, 0, 1.2, 1.2, 0, 4, -1.2, 1.2, -4, 0, -1.2, -1.2]); fs(c, '#ffd54a', '#6a4a00', 0.8); c.restore();
      pRR(c, -10, -19, 20, 3.5, 1.5); fs(c, '#c9a227', '#5a4000', 0.8);
      break;
    }
    case 'ninja': {
      c.beginPath(); c.moveTo(-9, -42); c.lineTo(9, -42); c.quadraticCurveTo(10, -28, 8, -18); c.lineTo(-8, -18); c.quadraticCurveTo(-10, -28, -9, -42); c.closePath(); fs(c, vgrad(c, -42, -18, A.h, A.d), A.o);
      c.strokeStyle = A.hh; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-6, -41); c.lineTo(4, -24); c.moveTo(6, -41); c.lineTo(-3, -30); c.stroke();
      pRR(c, -9, -22, 18, 4, 1.5); fs(c, B.b, B.o, 0.8);
      // Khăn quàng đỏ bay
      const sw = Math.sin(t * 6) * 3 + walk * 3;
      c.beginPath(); c.moveTo(-4, -44); c.quadraticCurveTo(-14, -42 + sw * 0.3, -22 - sw, -36 + sw); c.lineTo(-20 - sw, -33 + sw); c.quadraticCurveTo(-12, -39, -3, -41); c.closePath(); fs(c, vgrad(c, -44, -33, B.h, B.d), B.o, 1);
      break;
    }
    case 'winter': {
      c.beginPath(); c.moveTo(-10, -42); c.lineTo(10, -42); c.quadraticCurveTo(12, -24, 12, -10); c.lineTo(-12, -10); c.quadraticCurveTo(-12, -24, -10, -42); c.closePath(); fs(c, vgrad(c, -42, -10, A.h, A.s), A.o);
      for (const [x0, y0, x1, y1] of [[-12, -12, 12, -12], [0, -42, 0, -12]]) { c.strokeStyle = '#fff'; c.lineWidth = 3.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
      for (let i = 0; i < 3; i++) { pCirc(c, 3, -36 + i * 7, 1.3); fs(c, '#ffd54a', '#6a4a00', 0.6); }
      pEll(c, 0, -42, 10, 3.5); fs(c, '#ffffff', '#c8c8d0', 0.8);
      break;
    }
    case 'jade': {
      c.beginPath(); c.moveTo(-10, -42); c.lineTo(10, -42); c.quadraticCurveTo(11, -28, 9, -16); c.lineTo(-9, -16); c.quadraticCurveTo(-11, -28, -10, -42); c.closePath(); fs(c, vgrad(c, -42, -16, A.h, A.d), A.o);
      for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) { pEll(c, -6 + k * 4 + (r % 2) * 2, -37 + r * 5, 2.2, 1.6); c.fillStyle = A.b; c.fill(); }
      c.save(); c.shadowColor = b; c.shadowBlur = 10; c.strokeStyle = b; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-8, -40); c.quadraticCurveTo(1, -30, -2, -18); c.moveTo(8, -40); c.quadraticCurveTo(2, -28, 5, -18); c.stroke();
      pCirc(c, 1, -32, 2.6); fs(c, b, '#003a20', 0.8); c.restore();
      break;
    }
  }
}

/** Chỗ ráp quần/váy của trang phục (vẽ sau chân) */
export function outfitSkirt(c, f, t, walk) {
  if (f.style !== 'royal' && f.style !== 'jade' && f.style !== 'winter') return;
  const A = tones(f.style === 'royal' ? f.colors[1] : f.colors[0]);
  c.beginPath(); c.moveTo(-9, -18); c.lineTo(9, -18); c.lineTo(10 + walk, -9); c.lineTo(-10 - walk, -9); c.closePath(); fs(c, vgrad(c, -18, -9, A.h, A.s), A.o, 1);
}

/** Đồ đội đầu thời trang, gốc = tâm đầu */
export function headwear(c, f, t) {
  const [a, b] = f.colors, A = tones(a), B = tones(b);
  switch (f.style) {
    case 'nonla':
      c.beginPath(); c.moveTo(-20, 2); c.quadraticCurveTo(0, -24, 22, 2); c.quadraticCurveTo(1, 6, -20, 2); c.closePath(); fs(c, vgrad(c, -20, 4, A.hh, A.s), A.o, 1.3);
      c.strokeStyle = B.b; c.lineWidth = 0.7; for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(1, -16); c.lineTo(-20 + i * 8.4, 2.5); c.stroke(); }
      c.strokeStyle = B.d; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-7, 3); c.quadraticCurveTo(2, 18, 9, 3); c.stroke();
      break;
    case 'crown':
      c.beginPath(); c.moveTo(-9, -6); c.lineTo(-10, -18); c.lineTo(-5, -12); c.lineTo(1, -21); c.lineTo(6, -12); c.lineTo(11, -18); c.lineTo(10, -6); c.closePath();
      c.save(); c.shadowColor = '#ffe680'; c.shadowBlur = 8; fs(c, vgrad(c, -21, -6, '#fff6b0', '#d0a010'), '#6a4a00', 1.2); c.restore();
      for (const [x, y, col] of [[1, -11, b], [-5, -9, '#5ab0ff'], [6, -9, '#5aff8a']]) { pCirc(c, x, y, 1.8); fs(c, col, '#300', 0.6); }
      break;
    case 'pumpkin':
      for (const [x, w] of [[-8, 6], [8, 6], [0, 8]]) { pEll(c, x, -8, w, 9.5); fs(c, vgrad(c, -18, 2, A.h, A.s), A.o, 1.1); }
      pRR(c, -1.5, -21, 3, 5, 1); fs(c, B.b, B.o, 0.8);
      c.save(); c.shadowColor = '#ffd060'; c.shadowBlur = 8; c.fillStyle = '#ffe070';
      pPoly(c, [-6, -10, -2, -10, -4, -13]); c.fill(); pPoly(c, [3, -10, 7, -10, 5, -13]); c.fill(); pPoly(c, [-6, -5, 7, -5, 5, -2, 2, -4, -1, -2, -4, -4]); c.fill(); c.restore();
      break;
    case 'horns':
      c.save(); c.shadowColor = b; c.shadowBlur = 8;
      for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 5, -7); c.quadraticCurveTo(sd * 17, -10, sd * 13, -24); c.quadraticCurveTo(sd * 10, -12, sd * 1, -9); fs(c, vgrad(c, -24, -7, '#4a1a1a', '#0a0000'), b, 1.1); }
      c.restore();
      break;
  }
}
/** Mũ thời trang che tóc hoàn toàn? */
export const HEADWEAR_HIDES_HAIR = { nonla: false, crown: false, pumpkin: true, horns: false };

/** Hào quang thời trang: lớp sau (back) và lớp trước (front) */
export function auraLayer(c, f, t, front) {
  const [a, b] = f.colors;
  c.save(); c.globalCompositeOperation = 'lighter';
  switch (f.style) {
    case 'fire':
      if (!front) { c.globalAlpha = 0.6; c.fillStyle = rgrad(c, 0, -2, 2, 30, a, 'rgba(0,0,0,0)'); c.save(); c.scale(1, 0.45); pCirc(c, 0, 0, 30); c.fill(); c.restore();
        c.globalAlpha = 0.18 + Math.sin(t * 6) * 0.05; c.fillStyle = rgrad(c, 0, -30, 4, 34, a, 'rgba(0,0,0,0)'); pEll(c, 0, -30, 24, 38); c.fill(); }
      for (let i = 0; i < 16; i++) { const k = (t * 1.4 + hash(i)) % 1, x = (hash(i + 4) - 0.5) * 30 * (1 - k * 0.4), back = hash(i + 9) < 0.5; if (back === front) continue;
        const w = 5 * (1 - k) + 1, y = -k * 60;
        c.globalAlpha = (1 - k); c.beginPath(); c.moveTo(x - w, y); c.quadraticCurveTo(x, y - 16 * (1 - k) - 5, x + w, y); c.quadraticCurveTo(x, y + w, x - w, y); c.fillStyle = k < 0.35 ? b : a; c.fill(); }
      break;
    case 'frost':
      for (let i = 0; i < 10; i++) { const ang = t * 1.2 + (i / 10) * 6.283, x = Math.cos(ang) * 22, y = -26 + Math.sin(ang) * 7 + Math.sin(t * 2 + i) * 8, isFront = Math.sin(ang) > 0; if (isFront !== front) continue;
        c.globalAlpha = 0.9; c.save(); c.translate(x, y); c.rotate(t * 2 + i); pPoly(c, [0, -6, 2.6, 0, 0, 6, -2.6, 0]); c.fillStyle = i % 2 ? a : b; c.fill(); c.restore(); }
      if (!front) { c.globalAlpha = 0.3; c.strokeStyle = a; c.lineWidth = 2; c.beginPath(); c.ellipse(0, 0, 18, 7, 0, 0, 6.283); c.stroke(); }
      break;
    case 'fireflies':
      for (let i = 0; i < 12; i++) { const x = Math.sin(t * (0.7 + hash(i)) + i * 2) * 24, y = -30 + Math.cos(t * (0.9 + hash(i + 2)) + i) * 26, isFront = hash(i + 7) < 0.5; if (isFront !== front) continue;
        c.globalAlpha = 0.55 + 0.45 * Math.sin(t * 5 + i * 3); c.fillStyle = rgrad(c, x, y, 0.5, 7, a, 'rgba(0,0,0,0)'); pCirc(c, x, y, 7); c.fill(); pCirc(c, x, y, 1.6); c.fillStyle = '#ffffe0'; c.fill(); }
      break;
    case 'sakura':
      c.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 16; i++) { const k = (t * 0.35 + hash(i)) % 1, x = (hash(i + 3) - 0.5) * 48 + Math.sin(t * 2 + i) * 5, y = -64 + k * 66, isFront = hash(i + 5) < 0.5; if (isFront !== front) continue;
        c.globalAlpha = Math.min(1, (1 - k) * 2); c.save(); c.translate(x, y); c.rotate(t * 2 + i); pEll(c, 0, 0, 3.6, 2); c.fillStyle = i % 2 ? a : b; c.fill(); c.restore(); }
      break;
  }
  c.restore();
}
