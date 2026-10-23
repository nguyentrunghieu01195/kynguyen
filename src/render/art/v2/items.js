// Icon vật phẩm V2 (vẽ bằng code, cache thành ảnh) + vật phẩm rơi trên đất.
import { SETS, WINGS, JEWELS } from '../../../config/items.js';
import { tones, pEll, pCirc, pPoly, pRR, fs, vgrad, rgrad, gloss, sparkle } from './kit.js';
import { TRIM } from './hero.js';
import { drawHero } from './heroDraw.js';
import { FASHION_BY_ID } from '../../../config/fashion.js';
import { ARMOR_SETS, WEAPON_TYPES } from '../../../config/gear.js';
import { WEAPONS, crest } from './gear.js';

/** Tham số icon giáp: số bậc hoặc 'bậc_dòng' */
function parseSet(arg) {
  const [t, l] = String(arg).split('_').map(Number), tier = t || 0, line = l || 0;
  return { tier, line, set: ARMOR_SETS[tier][line] || ARMOR_SETS[tier][0] };
}

const ORB = ['#7fb3ff', '#9fe8ff', '#c8ff9f', '#bff0ff', '#ff7a3a', '#fff2a0'];
const SIZE = 64;

// Mỗi hàm vẽ trong khung 64x64, tâm (32,32)
const ICON = {
  sword(c, tier) {
    const T = tones(SETS[tier].color);
    c.translate(32, 32); c.rotate(Math.PI / 4);
    const len = 30 + tier * 1.5, w = 4 + tier * 0.4;
    pPoly(c, [-w, 6, -w * 0.9, 6 - len, 0, -len - 2, w * 0.9, 6 - len, w, 6]);
    const g = c.createLinearGradient(-w, 0, w, 0);
    const st = tier === 4 ? ['#ffb060', '#ff4a10'] : tier === 3 ? ['#f0fbff', '#7fc8f0'] : tier === 5 ? ['#ffffff', '#f0d878'] : tier === 2 ? ['#f5f0e0', '#b8ae94'] : ['#ffffff', '#9aa4b4'];
    g.addColorStop(0, st[0]); g.addColorStop(1, st[1]); fs(c, g, '#2a2030', 1.6);
    c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-1, 4); c.lineTo(-1, 8 - len); c.stroke();
    pRR(c, -11 - tier, 6, 22 + tier * 2, 5, 2.5); fs(c, vgrad(c, 6, 11, T.h, T.s), T.o, 1.4);
    pRR(c, -2.5, 11, 5, 12, 1.5); fs(c, '#5a3420', '#1a0a04', 1.2);
    pCirc(c, 0, 25, 3.5); fs(c, ORB[tier], '#1a0a04', 1.2);
  },
  /** Vũ khí Vương Giả (chỉ có từ công thành): vũ khí thường bọc hào quang vàng + lấp lánh. arg = 'loại:bậc' */
  special(c, arg) {
    const [kind, tier] = arg.split(':');
    c.save(); c.fillStyle = rgrad(c, 32, 32, 4, 31, 'rgba(255,214,74,.85)', 'rgba(255,214,74,0)'); pCirc(c, 32, 32, 31); c.fill(); c.restore();
    c.save(); c.shadowColor = '#ffd34a'; c.shadowBlur = 8; ICON[kind](c, +tier); c.restore();
    sparkle(c, 12, 14, 4, '#fff6c0'); sparkle(c, 52, 44, 3, '#ffe27a'); sparkle(c, 50, 12, 2.5, '#ffffff');
  },
  staff(c, tier) {
    const T = tones(SETS[tier].color);
    c.translate(32, 32); c.rotate(Math.PI / 4);
    pRR(c, -2.5, -16, 5, 44, 2); fs(c, vgrad(c, -16, 28, tier >= 3 ? '#f0ecf8' : '#a87040', tier >= 3 ? '#8a849a' : '#4a2a10'), '#1a0e08', 1.3);
    for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(0, -12); c.quadraticCurveTo(sd * 13, -20, sd * 7, -32); c.quadraticCurveTo(sd * 7, -22, 0, -18); fs(c, T.b, T.o, 1.2); }
    c.save(); c.shadowColor = ORB[tier]; c.shadowBlur = 12; pCirc(c, 0, -24, 7.5); c.fillStyle = rgrad(c, -2, -26, 1, 8, '#fff', ORB[tier]); c.fill(); c.restore();
    sparkle(c, -4, -28, 3, '#fff');
  },
  bow(c, tier) {
    const T = tones(SETS[tier].color);
    c.translate(32, 32); c.rotate(Math.PI / 4);
    c.beginPath(); c.moveTo(-4, -26); c.quadraticCurveTo(16, -14, 6, 0); c.quadraticCurveTo(16, 14, -4, 26); c.lineTo(-6, 23); c.quadraticCurveTo(10, 12, 2, 0); c.quadraticCurveTo(10, -12, -6, -23); c.closePath();
    fs(c, vgrad(c, -26, 26, T.h, T.s), T.o, 1.5);
    c.strokeStyle = '#eee'; c.lineWidth = 1; c.beginPath(); c.moveTo(-5, -24); c.lineTo(-5, 24); c.stroke();
    pRR(c, 2, -5, 7, 10, 2); fs(c, '#5a3420', '#1a0a04', 1);
    if (tier >= 3) { pCirc(c, 9, -14, 2.5); fs(c, ORB[tier], '#000', 0.8); pCirc(c, 9, 14, 2.5); fs(c, ORB[tier], '#000', 0.8); }
  },
  ...Object.fromEntries(['axe', 'mace', 'spear', 'orb', 'tome', 'crossbow', 'twinbow'].map((id) => [id, (c, tier) => {
    tier = +tier || 0;
    const W = { tier, gl: null, col: ARMOR_SETS[tier][0].color };
    const fit = { axe: [32, 50, 0.95, 0.6], mace: [30, 50, 1.05, 0.6], spear: [30, 54, 0.78, 0.7], orb: [32, 50, 1.6, 0], tome: [32, 44, 1.7, 0], crossbow: [20, 34, 1.15, -0.3], twinbow: [30, 32, 1.4, 0.6] }[id];
    c.translate(fit[0], fit[1]); c.rotate(fit[3]); c.scale(fit[2], fit[2]);
    WEAPONS[id](c, W, 0.5, id === 'tome' ? true : 0);
  }])),
  fashion(c, id) {
    const f = FASHION_BY_ID[id];
    c.save(); c.beginPath(); c.arc(32, 32, 30, 0, Math.PI * 2); c.clip();
    c.fillStyle = rgrad(c, 32, 26, 4, 34, '#3a2e48', '#120e18'); c.fillRect(0, 0, 64, 64);
    const zoom = f.slot === 'head' ? 1.25 : 0.82;
    c.translate(32, f.slot === 'head' ? 112 : 64); c.scale(zoom, zoom);
    drawHero(c, f.slot === 'outfit' ? 'knight' : 'archer', {}, 0.6, { face: 1, moving: false, atk: 0, fa: { [f.slot]: id } });
    c.restore();
  },
  helm(c, arg) {
    const { tier, line, set } = parseSet(arg);
    const T = tones(set.color), TR = tones(set.trim);
    c.translate(32, 36);
    c.beginPath(); c.arc(0, 0, 18, Math.PI, 0); c.lineTo(18, 10); c.lineTo(9, 14); c.lineTo(9, 4); c.lineTo(-9, 4); c.lineTo(-9, 14); c.lineTo(-18, 10); c.closePath();
    fs(c, vgrad(c, -18, 14, T.h, T.s), T.o, 1.6); gloss(c, -6, -10, 6, 3, 0.4);
    pRR(c, -18, -2, 36, 4, 2); fs(c, TR.b, TR.o, 1.2);
    c.save(); c.translate(0, -18); c.scale(1.5, 1.5); crest(c, set.style, set.color, set.trim); c.restore();
  },
  armor(c, arg) {
    const { tier, line, set } = parseSet(arg);
    const T = tones(set.color), TR = tones(set.trim);
    c.translate(32, 32);
    c.beginPath(); c.moveTo(-14, -18); c.lineTo(-6, -20); c.quadraticCurveTo(0, -14, 6, -20); c.lineTo(14, -18); c.lineTo(20, -6); c.lineTo(14, -2); c.lineTo(14, 20); c.lineTo(-14, 20); c.lineTo(-14, -2); c.lineTo(-20, -6); c.closePath();
    fs(c, vgrad(c, -20, 20, T.h, T.s), T.o, 1.6);
    pRR(c, -14, 10, 28, 5, 2); fs(c, '#4a2e1a', '#1a0e06', 1.2); pRR(c, -3, 9.5, 6, 6, 1.5); fs(c, TR.h, TR.o, 1);
    if (!['leather', 'cloth', 'bronze', 'fur'].includes(set.style)) { const gc = tier >= 2 && line === 0 ? ORB[tier] : set.trim; c.save(); c.shadowColor = gc; c.shadowBlur = 8; pPoly(c, [0, -10, 5, -3, 0, 4, -5, -3]); fs(c, gc, TR.o, 1); c.restore(); }
    if (set.style === 'fur') { for (let i = 0; i < 6; i++) { pEll(c, -13 + i * 5.2, -18, 3.2, 4); fs(c, i % 2 ? T.h : T.b, T.o, 0.8); } }
    else { c.strokeStyle = T.o; c.lineWidth = 1; c.setLineDash([2, 2]); c.beginPath(); c.moveTo(0, -14); c.lineTo(0, 8); c.stroke(); c.setLineDash([]); }
    gloss(c, -7, -10, 4, 2, 0.35);
  },
  pants(c, arg) {
    const { tier, line, set } = parseSet(arg);
    const T = tones(set.color);
    c.translate(32, 32);
    c.beginPath(); c.moveTo(-14, -18); c.lineTo(14, -18); c.lineTo(16, 22); c.lineTo(4, 22); c.lineTo(0, -2); c.lineTo(-4, 22); c.lineTo(-16, 22); c.closePath();
    fs(c, vgrad(c, -18, 22, T.h, T.s), T.o, 1.6);
    pRR(c, -15, -20, 30, 6, 2); fs(c, tones(set.trim).b, tones(set.trim).o, 1.2);
    if (tier >= 3) { pEll(c, -9, 8, 4, 3); fs(c, T.hh, T.o, 1); pEll(c, 9, 8, 4, 3); fs(c, T.hh, T.o, 1); }
  },
  gloves(c, arg) {
    const { tier, line, set } = parseSet(arg);
    const T = tones(set.color);
    c.translate(32, 34);
    pRR(c, -12, -4, 24, 22, 6); fs(c, vgrad(c, -4, 18, T.h, T.s), T.o, 1.6);
    for (let i = 0; i < 4; i++) { pRR(c, -11 + i * 6, -18, 5.5, 16, 2.7); fs(c, vgrad(c, -18, -2, T.h, T.b), T.o, 1.2); }
    pRR(c, 10, -4, 8, 12, 4); fs(c, T.b, T.o, 1.2);
    pRR(c, -13, 12, 26, 6, 2); fs(c, tones(set.trim).b, tones(set.trim).o, 1.2);
  },
  boots(c, arg) {
    const { tier, line, set } = parseSet(arg);
    const T = tones(set.color);
    c.translate(32, 32);
    c.beginPath(); c.moveTo(-10, -22); c.lineTo(6, -22); c.lineTo(6, 6); c.quadraticCurveTo(20, 8, 20, 18); c.lineTo(-12, 18); c.closePath();
    fs(c, vgrad(c, -22, 18, T.h, T.s), T.o, 1.6);
    pRR(c, -12, 14, 33, 5, 2); fs(c, '#3a2418', '#1a0a04', 1.2);
    pRR(c, -11, -24, 18, 6, 2); fs(c, tones(set.trim).b, tones(set.trim).o, 1.2);
    if (tier >= 4) { pPoly(c, [6, -14, 14, -18, 6, -8]); fs(c, T.hh, T.o, 1); }
  },
  wings(c, tier) {
    const W = tones(WINGS[tier].color);
    c.translate(32, 36);
    for (const sd of [-1, 1]) {
      c.save(); c.scale(sd, 1);
      if (tier === 2) { c.beginPath(); c.moveTo(0, 0); c.lineTo(6, -18); c.lineTo(28, -22); c.quadraticCurveTo(24, -12, 28, -4); c.quadraticCurveTo(20, -4, 20, 6); c.quadraticCurveTo(10, 0, 0, 6); c.closePath(); fs(c, vgrad(c, -22, 6, W.h, W.d), W.o, 1.4); }
      else for (let i = 4; i >= 0; i--) { c.save(); c.rotate(-0.9 + i * 0.32); pEll(c, 12 + i * 0.5, 0, 13 - i, 3.8); fs(c, vgrad(c, -4, 4, i % 2 ? W.hh : W.h, W.b), W.o, 1); c.restore(); }
      c.restore();
    }
    if (tier === 3) { sparkle(c, 0, -14, 5, '#fff8c0'); }
  },
  jewel(c, key) {
    const J = tones(JEWELS[key].color);
    c.translate(32, 32);
    c.save(); c.shadowColor = JEWELS[key].color; c.shadowBlur = 14;
    if (key === 'bless') pPoly(c, [0, -20, 16, -6, 10, 18, -10, 18, -16, -6]);
    else if (key === 'soul') pPoly(c, [0, -22, 14, 0, 0, 22, -14, 0]);
    else pPoly(c, [-8, -18, 8, -18, 18, -4, 0, 20, -18, -4]);
    fs(c, rgrad(c, -4, -6, 2, 22, J.hh, J.s), J.o, 1.6); c.restore();
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, -18); c.lineTo(0, 16); c.moveTo(-14, -4); c.lineTo(14, -4); c.stroke();
    sparkle(c, -7, -9, 4, '#fff');
  },
  potion(c, type) {
    const col = type === 'hp' ? '#e82a3a' : '#2a6ae8', L = tones(col);
    c.translate(32, 34);
    pRR(c, -5, -24, 10, 9, 2); fs(c, '#a07040', '#3a2010', 1.2);
    c.beginPath(); c.moveTo(-5, -16); c.lineTo(-5, -8); c.quadraticCurveTo(-17, -2, -16, 8); c.quadraticCurveTo(-14, 20, 0, 20); c.quadraticCurveTo(14, 20, 16, 8); c.quadraticCurveTo(17, -2, 5, -8); c.lineTo(5, -16); c.closePath();
    fs(c, 'rgba(220,240,255,.35)', '#2a3040', 1.6);
    c.beginPath(); c.moveTo(-15, 4); c.quadraticCurveTo(0, 0, 15, 4); c.quadraticCurveTo(14, 19, 0, 19); c.quadraticCurveTo(-14, 19, -15, 4); c.closePath(); c.fillStyle = rgrad(c, -3, 6, 1, 16, L.hh, L.b); c.fill();
    gloss(c, -8, -2, 3, 5, 0.6);
  },
  charm(c) {
    c.translate(32, 32);
    c.beginPath(); c.moveTo(0, -22); c.lineTo(18, -14); c.quadraticCurveTo(18, 10, 0, 22); c.quadraticCurveTo(-18, 10, -18, -14); c.closePath();
    fs(c, vgrad(c, -22, 22, '#fff3a0', '#c08a10'), '#5a3a00', 1.8);
    c.beginPath(); c.moveTo(0, -14); c.lineTo(11, -9); c.quadraticCurveTo(11, 6, 0, 14); c.quadraticCurveTo(-11, 6, -11, -9); c.closePath(); fs(c, vgrad(c, -14, 14, '#6ac0ff', '#1a4aa0'), '#0a1a40', 1.2);
    sparkle(c, 0, -1, 6, '#fff');
  },
  zen(c) {
    c.translate(32, 36);
    for (const [x, y] of [[-10, 6], [10, 6], [0, 8], [-5, -2], [5, -2], [0, -10]]) { pEll(c, x, y, 10, 6); fs(c, vgrad(c, y - 6, y + 6, '#fff0a0', '#c89010'), '#6a4800', 1.3); c.strokeStyle = 'rgba(120,80,0,.6)'; c.lineWidth = 1; pEll(c, x, y, 5, 3); c.stroke(); }
    sparkle(c, 6, -12, 4, '#fff');
  },
};

// ---- Icon giao diện (thay emoji ở menu, nút kỹ năng) ----
Object.assign(ICON, {
  ticket(c, kind) {
    const col = kind === 'bc' ? '#c0203a' : '#7a2ac0', T = tones(col);
    c.translate(32, 32); c.rotate(-0.2);
    pRR(c, -20, -14, 40, 28, 4); fs(c, vgrad(c, -14, 14, '#f3e2b0', '#c8a868'), '#4a3a1a', 1.6);
    pRR(c, -20, -14, 10, 28, 3); fs(c, vgrad(c, -14, 14, T.h, T.s), T.o, 1.2);
    c.save(); c.shadowColor = col; c.shadowBlur = 8;
    if (kind === 'bc') { pPoly(c, [2, 8, 2, -4, 6, -8, 10, -4, 10, 8]); fs(c, T.b, T.o, 1); pPoly(c, [-2, -2, 2, -6, 2, 8, -2, 8]); fs(c, T.s, T.o, 1); pPoly(c, [10, -6, 14, -2, 14, 8, 10, 8]); fs(c, T.s, T.o, 1); }
    else { c.beginPath(); c.moveTo(0, 6); c.quadraticCurveTo(6, -10, 12, 6); c.closePath(); fs(c, T.b, T.o, 1); pPoly(c, [1, -2, -2, -10, 4, -4]); fs(c, T.h, T.o, 0.8); pPoly(c, [11, -2, 14, -10, 8, -4]); fs(c, T.h, T.o, 0.8); }
    c.restore();
  },
  ui_quest(c) {
    c.translate(32, 32);
    pRR(c, -16, -18, 32, 36, 3); fs(c, vgrad(c, -18, 18, '#f3e2b0', '#c8a868'), '#4a3a1a', 1.6);
    for (const y of [-18, 18]) { pRR(c, -20, y - 4, 40, 8, 4); fs(c, vgrad(c, y - 4, y + 4, '#a87040', '#5a3418'), '#2a1408', 1.4); }
    c.strokeStyle = '#7a6040'; c.lineWidth = 1.6; for (const y of [-8, -2, 4, 10]) { c.beginPath(); c.moveTo(-10, y); c.lineTo(10 - (y === 10 ? 8 : 0), y); c.stroke(); }
    pCirc(c, 11, 11, 5); fs(c, '#c0201a', '#5a0808', 1.2);
  },
  ui_event(c) {
    c.translate(32, 32);
    c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = rgrad(c, 0, 4, 2, 24, 'rgba(255,120,40,.8)', 'rgba(255,60,0,0)'); pCirc(c, 0, 4, 24); c.fill(); c.restore();
    for (const sd of [-1, 1]) { c.save(); c.scale(sd, 1); c.rotate(-0.75); pPoly(c, [-3, 14, -3, -20, 0, -26, 3, -20, 3, 14]); fs(c, vgrad(c, -26, 14, '#ffffff', '#9aa4b4'), '#2a2030', 1.3); pRR(c, -9, 12, 18, 4, 2); fs(c, '#e8c26a', '#5a3a00', 1); pRR(c, -2, 16, 4, 8, 1); fs(c, '#5a3420', '#1a0a04', 1); c.restore(); }
  },
  ui_char(c) { ICON.helm(c, 1); },
  ui_bag(c) {
    c.translate(32, 34);
    c.beginPath(); c.moveTo(-16, -6); c.quadraticCurveTo(-20, 22, 0, 22); c.quadraticCurveTo(20, 22, 16, -6); c.quadraticCurveTo(0, -12, -16, -6); fs(c, vgrad(c, -10, 22, '#c08a50', '#6a4020'), '#2a1808', 1.6);
    pRR(c, -10, -18, 20, 10, 5); fs(c, '#8a5a30', '#2a1808', 1.4); pRR(c, -4, -2, 8, 7, 2); fs(c, '#e8c26a', '#5a3a00', 1.2);
  },
  ui_anvil(c) {
    c.translate(32, 36);
    c.beginPath(); c.moveTo(-22, -10); c.lineTo(18, -10); c.quadraticCurveTo(24, -10, 24, -4); c.lineTo(10, -2); c.lineTo(8, 6); c.lineTo(-8, 6); c.lineTo(-10, -2); c.lineTo(-22, -4); c.closePath(); fs(c, vgrad(c, -10, 6, '#b8c0d0', '#4a5060'), '#1a1c24', 1.6);
    pRR(c, -14, 6, 28, 8, 2); fs(c, '#5a6070', '#1a1c24', 1.4);
    c.save(); c.rotate(-0.6); pRR(c, -2, -34, 4, 22, 1); fs(c, '#7a5030', '#2a1408', 1); pRR(c, -8, -38, 16, 8, 2); fs(c, '#9aa4b4', '#2a2030', 1.2); c.restore();
    sparkle(c, 14, -16, 4, '#ffd060');
  },
  ui_map(c) {
    c.translate(32, 32);
    c.beginPath(); c.moveTo(-20, -14); c.lineTo(-7, -18); c.lineTo(7, -14); c.lineTo(20, -18); c.lineTo(20, 16); c.lineTo(7, 20); c.lineTo(-7, 16); c.lineTo(-20, 20); c.closePath(); fs(c, vgrad(c, -18, 20, '#f3e2b0', '#b89a60'), '#4a3a1a', 1.6);
    c.strokeStyle = '#a0302a'; c.lineWidth = 1.6; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(-14, 10); c.quadraticCurveTo(-4, -8, 10, 2); c.stroke(); c.setLineDash([]);
    c.strokeStyle = '#c0201a'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(8, -2); c.lineTo(14, 4); c.moveTo(14, -2); c.lineTo(8, 4); c.stroke();
  },
  ui_shop(c) { ICON.zen(c); },
  ui_reset(c) {
    c.translate(32, 32);
    for (const sd of [0, Math.PI]) { c.save(); c.rotate(sd); c.beginPath(); c.arc(0, 0, 16, 0.3, Math.PI - 0.3); c.strokeStyle = '#2a1808'; c.lineWidth = 8; c.stroke(); c.strokeStyle = '#e8c26a'; c.lineWidth = 5; c.stroke();
      pPoly(c, [-17, 2, -24, 10, -10, 10]); fs(c, '#e8c26a', '#2a1808', 1.4); c.restore(); }
    sparkle(c, 0, 0, 6, '#fff8c0');
  },
  ui_gear(c) {
    c.translate(32, 32); c.beginPath();
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, r = i % 2 ? 15 : 20; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    c.closePath(); fs(c, vgrad(c, -20, 20, '#d8dee8', '#6a7080'), '#1a1c24', 1.6); pCirc(c, 0, 0, 6); fs(c, '#2a2a34', '#1a1c24', 1.2);
  },
  sk_whirl(c) {
    c.save(); c.translate(32, 32); c.scale(0.75, 0.75); c.translate(-32, -32); ICON.sword(c, 5); c.restore();
    c.translate(32, 32); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) { c.strokeStyle = ['#ffffff', '#9fdcff', '#4a9aff'][i]; c.lineWidth = 5 - i; c.beginPath(); c.arc(0, 0, 12 + i * 7, i * 2, i * 2 + 4); c.stroke(); }
  },
  sk_meteor(c) {
    c.translate(32, 32); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) { c.globalAlpha = 0.7 - i * 0.1; pCirc(c, 8 - i * 5, -8 + i * 5, 11 - i); c.fillStyle = '#ff6a1a'; c.fill(); }
    c.globalAlpha = 1; c.fillStyle = rgrad(c, 8, -8, 1, 13, '#fff6c0', 'rgba(255,90,10,0)'); pCirc(c, 8, -8, 13); c.fill();
  },
  // ---- Kỹ năng Kiếm Sĩ ----
  sk_slam(c) {
    c.translate(32, 32);
    c.strokeStyle = '#3a1c06'; c.lineWidth = 3; for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.3; c.beginPath(); c.moveTo(0, 14); c.lineTo(Math.cos(a) * 12, 14 + Math.sin(a) * 4); c.lineTo(Math.cos(a) * 24, 14 + Math.sin(a) * 8); c.stroke(); }
    c.globalCompositeOperation = 'lighter'; c.fillStyle = rgrad(c, 0, 12, 1, 26, 'rgba(255,220,140,.95)', 'rgba(255,120,20,0)'); pEll(c, 0, 12, 26, 12); c.fill();
    c.globalCompositeOperation = 'source-over';
    c.save(); c.rotate(Math.PI); c.translate(0, 2); pPoly(c, [-4, -6, -3.5, -26, 0, -29, 3.5, -26, 4, -6]); fs(c, vgrad(c, -29, -6, '#ffffff', '#9aa4b4'), '#2a2030', 1.4); pRR(c, -11, -6, 22, 5, 2.5); fs(c, '#e8c26a', '#4a3010', 1.2); pRR(c, -2.5, -1, 5, 10, 1.5); fs(c, '#5a3420', '#1a0a04', 1); c.restore();
    for (let i = 0; i < 5; i++) { pPoly(c, [-20 + i * 10, 18, -17 + i * 10, 8 - (i % 2) * 6, -14 + i * 10, 18]); fs(c, '#8a6a4a', '#2a1808', 1); }
  },
  sk_iron(c) {
    c.translate(32, 32);
    c.beginPath(); c.moveTo(0, -24); c.lineTo(20, -16); c.quadraticCurveTo(20, 12, 0, 25); c.quadraticCurveTo(-20, 12, -20, -16); c.closePath(); fs(c, vgrad(c, -24, 25, '#dfe6f0', '#5a6478'), '#1a1c28', 2);
    c.beginPath(); c.moveTo(0, -17); c.lineTo(13, -12); c.quadraticCurveTo(13, 7, 0, 17); c.quadraticCurveTo(-13, 7, -13, -12); c.closePath(); fs(c, vgrad(c, -17, 17, '#c03a3a', '#5a0c10'), '#2a0408', 1.2);
    pPoly(c, [0, -10, 3, -2, 11, -2, 4.5, 3, 7, 11, 0, 6, -7, 11, -4.5, 3, -11, -2, -3, -2]); fs(c, '#ffd54a', '#5a3a00', 1);
    sparkle(c, -11, -14, 4, '#fff');
  },
  sk_warcry(c) {
    c.translate(32, 32);
    c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3; i++) { c.strokeStyle = ['#ffd06a', '#ff8a3a', '#ff4a1a'][i]; c.lineWidth = 3; c.beginPath(); c.arc(6, -2, 10 + i * 7, -0.9, 0.9); c.stroke(); }
    c.globalCompositeOperation = 'source-over';
    c.beginPath(); c.moveTo(-22, 6); c.quadraticCurveTo(-16, -4, 2, -12); c.lineTo(8, 6); c.quadraticCurveTo(-10, 6, -18, 14); c.closePath(); fs(c, vgrad(c, -12, 14, '#f3e2b0', '#a87a3a'), '#3a2008', 1.6);
    pEll(c, 5, -3, 4, 10, -0.3); fs(c, '#6a4010', '#2a1404', 1.2);
    pRR(c, -14, 2, 4, 6, 1); fs(c, '#e8c26a', '#3a2008', 1); pRR(c, -6, -1, 4, 6, 1); fs(c, '#e8c26a', '#3a2008', 1);
  },
  sk_charge(c) {
    c.translate(32, 32); c.rotate(-0.4);
    c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 4; i++) { c.strokeStyle = ['#fff', '#ffe08a', '#ffb040', '#ff6a1a'][i]; c.lineWidth = 5 - i; c.beginPath(); c.moveTo(-26, -8 + i * 5); c.lineTo(-4, -8 + i * 5); c.stroke(); }
    c.globalCompositeOperation = 'source-over';
    c.rotate(Math.PI / 2); pPoly(c, [-4, 4, -4, -22, 0, -28, 4, -22, 4, 4]); fs(c, vgrad(c, -28, 4, '#ffffff', '#a0b0c4'), '#2a2030', 1.4); pRR(c, -11, 4, 22, 5, 2.5); fs(c, '#e8c26a', '#4a3010', 1.2); pRR(c, -2.5, 9, 5, 10, 1.5); fs(c, '#5a3420', '#1a0a04', 1);
    c.rotate(-Math.PI / 2); c.globalCompositeOperation = 'lighter'; pPoly(c, [14, -12, 6, 0, 12, 0, 4, 14, 20, -2, 13, -2, 20, -12]); c.fillStyle = '#ffe680'; c.fill();
  },
  sk_skyblade(c) {
    c.translate(32, 32);
    c.globalCompositeOperation = 'lighter'; c.fillStyle = rgrad(c, 0, 20, 1, 28, 'rgba(255,245,190,.95)', 'rgba(255,200,60,0)'); pEll(c, 0, 20, 28, 10); c.fill();
    const g = c.createLinearGradient(0, -32, 0, 20); g.addColorStop(0, 'rgba(255,240,160,0)'); g.addColorStop(1, 'rgba(255,240,170,.8)'); c.fillStyle = g; c.fillRect(-12, -32, 24, 52);
    c.globalCompositeOperation = 'source-over';
    pPoly(c, [-6, -18, 0, -24, 6, -18, 5, 14, 0, 22, -5, 14]); fs(c, vgrad(c, -24, 22, '#ffffff', '#8acaff'), '#1a2a5a', 1.5);
    pRR(c, -15, -20, 30, 5, 2); fs(c, '#f0c040', '#5a3a00', 1.2); pRR(c, -2.5, -30, 5, 11, 1.5); fs(c, '#6a3a1a', '#2a1404', 1); pCirc(c, 0, -30, 3.5); fs(c, '#ff5a5a', '#5a0a0a', 1);
    sparkle(c, 10, -6, 5, '#fff'); sparkle(c, -12, 6, 3, '#fff');
  },
  // ---- Kỹ năng Pháp Sư ----
  sk_frost(c) {
    c.translate(32, 32);
    c.fillStyle = rgrad(c, 0, 0, 2, 28, 'rgba(220,250,255,.9)', 'rgba(60,140,255,0)'); pCirc(c, 0, 0, 28); c.fill();
    c.strokeStyle = '#ffffff'; c.lineCap = 'round';
    for (let i = 0; i < 6; i++) { c.save(); c.rotate(i * Math.PI / 3); c.lineWidth = 4; c.strokeStyle = '#2a6aa0'; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -22); c.moveTo(0, -12); c.lineTo(-6, -17); c.moveTo(0, -12); c.lineTo(6, -17); c.stroke(); c.lineWidth = 2; c.strokeStyle = '#ffffff'; c.stroke(); c.restore(); }
    pCirc(c, 0, 0, 4); fs(c, '#fff', '#2a6aa0', 1.2);
  },
  sk_arcane(c) {
    c.translate(32, 32);
    c.globalCompositeOperation = 'lighter'; c.fillStyle = rgrad(c, 0, -8, 1, 22, 'rgba(180,140,255,.9)', 'rgba(80,40,200,0)'); pCirc(c, 0, -8, 22); c.fill(); c.globalCompositeOperation = 'source-over';
    c.beginPath(); c.moveTo(-22, -6); c.quadraticCurveTo(-11, -11, 0, -6); c.quadraticCurveTo(11, -11, 22, -6); c.lineTo(22, 18); c.quadraticCurveTo(11, 13, 0, 18); c.quadraticCurveTo(-11, 13, -22, 18); c.closePath(); fs(c, vgrad(c, -10, 18, '#4a6ad0', '#1a2a6a'), '#0a1030', 1.6);
    c.beginPath(); c.moveTo(-19, -3); c.quadraticCurveTo(-10, -7, -1, -3); c.lineTo(-1, 14); c.quadraticCurveTo(-10, 10, -19, 14); c.closePath(); fs(c, '#f3ead0', '#6a5a3a', 1);
    c.beginPath(); c.moveTo(19, -3); c.quadraticCurveTo(10, -7, 1, -3); c.lineTo(1, 14); c.quadraticCurveTo(10, 10, 19, 14); c.closePath(); fs(c, '#f3ead0', '#6a5a3a', 1);
    c.strokeStyle = '#8a6ad0'; c.lineWidth = 1; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-16, 2 + i * 4); c.lineTo(-4, 1 + i * 4); c.moveTo(4, 1 + i * 4); c.lineTo(16, 2 + i * 4); c.stroke(); }
    sparkle(c, 0, -20, 6, '#fff'); sparkle(c, -12, -16, 3, '#e8d0ff'); sparkle(c, 12, -16, 3, '#e8d0ff');
  },
  sk_manashield(c) {
    c.translate(32, 32);
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = rgrad(c, 0, 0, 4, 26, 'rgba(160,210,255,.2)', 'rgba(90,160,255,.75)'); pCirc(c, 0, 0, 25); c.fill();
    c.strokeStyle = '#cfe8ff'; c.lineWidth = 2.5; pCirc(c, 0, 0, 25); c.stroke();
    c.strokeStyle = 'rgba(200,230,255,.7)'; c.lineWidth = 1.2; for (let i = 0; i < 6; i++) { const a = i * 1.047; c.beginPath(); c.moveTo(Math.cos(a) * 25, Math.sin(a) * 25); c.lineTo(Math.cos(a + 1.047) * 25, Math.sin(a + 1.047) * 25); c.lineTo(0, 0); c.stroke(); }
    c.globalCompositeOperation = 'source-over'; pPoly(c, [0, -11, 9, 0, 0, 11, -9, 0]); fs(c, vgrad(c, -11, 11, '#ffffff', '#5aa0ff'), '#1a3a7a', 1.4);
    sparkle(c, -12, -12, 4, '#fff');
  },
  sk_chain(c) {
    c.translate(32, 32);
    pEll(c, -4, -18, 20, 9); fs(c, vgrad(c, -27, -9, '#8a90a8', '#3a3e54'), '#1a1c2a', 1.5); pEll(c, 10, -20, 12, 7); fs(c, '#6a7090', '#1a1c2a', 1.2);
    c.globalCompositeOperation = 'lighter'; c.lineJoin = 'round';
    for (const [col, lw] of [['#6a9aff', 8], ['#cfe6ff', 3.5], ['#ffffff', 1.5]]) { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(-2, -10); c.lineTo(-10, 2); c.lineTo(-2, 2); c.lineTo(-12, 22); c.moveTo(-6, 6); c.lineTo(8, 10); c.lineTo(4, 14); c.lineTo(18, 22); c.stroke(); }
  },
  sk_blackhole(c) {
    c.translate(32, 32);
    c.fillStyle = rgrad(c, 0, 0, 2, 28, '#000000', 'rgba(80,20,140,0)'); pCirc(c, 0, 0, 28); c.fill();
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) { c.strokeStyle = i % 2 ? '#c070ff' : '#7a3aff'; c.lineWidth = 3; c.beginPath(); for (let q = 0; q <= 1; q += 0.05) { const a = i * 1.57 + q * 3.6, r = 25 * (1 - q * 0.8); c.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.75); } c.stroke(); }
    c.fillStyle = rgrad(c, 0, 0, 1, 9, '#ffffff', 'rgba(200,120,255,0)'); pCirc(c, 0, 0, 9); c.fill();
    c.globalCompositeOperation = 'source-over'; pCirc(c, 0, 0, 4); c.fillStyle = '#000'; c.fill();
  },
  // ---- Kỹ năng Xạ Thủ ----
  sk_pierce(c) {
    c.translate(32, 32); c.rotate(-Math.PI / 4);
    c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(120,255,255,.6)'; c.lineWidth = 10; c.beginPath(); c.moveTo(-30, 0); c.lineTo(28, 0); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.stroke();
    c.globalCompositeOperation = 'source-over';
    for (const x of [-8, 8]) { c.save(); c.translate(x, 0); pCirc(c, 0, 0, 6); c.lineWidth = 2; c.strokeStyle = '#c03030'; c.stroke(); c.restore(); }
    pPoly(c, [18, -5, 28, 0, 18, 5]); fs(c, '#e8eef8', '#2a3040', 1.2); pPoly(c, [-24, 0, -30, -6, -18, 0]); fs(c, '#9ff', '#1a4a4a', 1); pPoly(c, [-24, 0, -30, 6, -18, 0]); fs(c, '#9ff', '#1a4a4a', 1);
  },
  sk_eagle(c) {
    c.translate(32, 32);
    for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(0, -2); c.quadraticCurveTo(sd * 14, -20, sd * 28, -14); c.lineTo(sd * 22, -8); c.lineTo(sd * 26, -4); c.lineTo(sd * 18, 0); c.lineTo(sd * 20, 4); c.quadraticCurveTo(sd * 8, 4, 0, 8); fs(c, vgrad(c, -20, 8, '#c8945a', '#5a3414'), '#2a1404', 1.4); }
    pEll(c, 0, 6, 7, 12); fs(c, vgrad(c, -6, 18, '#a87040', '#4a2a10'), '#2a1404', 1.4);
    pCirc(c, 0, -8, 7); fs(c, '#f3f0e8', '#4a4030', 1.4); pPoly(c, [3, -9, 10, -6, 3, -4]); fs(c, '#ffc030', '#5a3a00', 1); pCirc(c, 1, -10, 1.6); c.fillStyle = '#000'; c.fill();
    c.strokeStyle = '#ff3a3a'; c.lineWidth = 1.5; pCirc(c, 0, 0, 29); c.globalAlpha = 0.6; c.stroke();
  },
  sk_focus(c) {
    c.translate(32, 32);
    c.globalCompositeOperation = 'lighter'; c.fillStyle = rgrad(c, 0, 0, 2, 28, 'rgba(140,255,160,.6)', 'rgba(40,160,60,0)'); pCirc(c, 0, 0, 28); c.fill(); c.globalCompositeOperation = 'source-over';
    c.beginPath(); c.moveTo(-24, 0); c.quadraticCurveTo(0, -20, 24, 0); c.quadraticCurveTo(0, 20, -24, 0); fs(c, '#f8fff0', '#1a3a1a', 2);
    pCirc(c, 0, 0, 9); fs(c, rgrad(c, -2, -2, 1, 9, '#bfffb0', '#2a8a3a'), '#0a2a10', 1.4); pCirc(c, 0, 0, 4); c.fillStyle = '#000'; c.fill(); pCirc(c, -2.5, -2.5, 1.8); c.fillStyle = '#fff'; c.fill();
    c.strokeStyle = '#7fff9a'; c.lineWidth = 1.5; for (const a of [0, 1.57, 3.14, 4.71]) { c.beginPath(); c.moveTo(Math.cos(a) * 20, Math.sin(a) * 20); c.lineTo(Math.cos(a) * 27, Math.sin(a) * 27); c.stroke(); }
  },
  sk_icearrow(c) {
    c.translate(32, 32);
    for (let i = 0; i < 3; i++) { c.save(); c.translate(-12 + i * 10, 6 - i * 8); c.rotate(-Math.PI / 4);
      c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(150,220,255,.6)'; c.lineWidth = 6; c.beginPath(); c.moveTo(-16, 0); c.lineTo(4, 0); c.stroke(); c.globalCompositeOperation = 'source-over';
      pPoly(c, [-10, 0, -2, -4, 12, 0, -2, 4]); fs(c, vgrad(c, -4, 4, '#ffffff', '#6ac8ff'), '#2a6aa0', 1.2); c.restore(); }
    sparkle(c, 14, -16, 5, '#e8fbff'); sparkle(c, -16, 14, 3, '#e8fbff');
  },
  sk_phoenix(c) {
    c.translate(32, 34);
    c.globalCompositeOperation = 'lighter'; c.fillStyle = rgrad(c, 0, -2, 2, 30, 'rgba(255,200,80,.85)', 'rgba(255,60,0,0)'); pCirc(c, 0, -2, 30); c.fill(); c.globalCompositeOperation = 'source-over';
    for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(0, -4); c.quadraticCurveTo(sd * 12, -26, sd * 28, -22); c.quadraticCurveTo(sd * 20, -16, sd * 24, -10); c.quadraticCurveTo(sd * 14, -10, sd * 18, -2); c.quadraticCurveTo(sd * 8, -4, 0, 4); fs(c, vgrad(c, -26, 4, '#fff0a0', '#ff4a10'), '#6a1400', 1.3); }
    c.beginPath(); c.moveTo(-4, 2); c.quadraticCurveTo(-10, 16, -4, 24); c.quadraticCurveTo(0, 16, 4, 24); c.quadraticCurveTo(10, 16, 4, 2); fs(c, vgrad(c, 2, 24, '#ffb040', '#c02a00'), '#6a1400', 1.2);
    pCirc(c, 0, -8, 5); fs(c, '#fff6c0', '#8a3a00', 1.2); pPoly(c, [0, -14, 3, -22, 5, -13]); fs(c, '#ffd040', '#8a3a00', 1);
  },
  ui_skill(c) {
    c.translate(32, 32);
    c.beginPath(); c.moveTo(-22, -14); c.quadraticCurveTo(-11, -19, 0, -14); c.quadraticCurveTo(11, -19, 22, -14); c.lineTo(22, 16); c.quadraticCurveTo(11, 11, 0, 16); c.quadraticCurveTo(-11, 11, -22, 16); c.closePath(); fs(c, vgrad(c, -18, 16, '#c0302a', '#5a0c10'), '#2a0408', 1.6);
    c.beginPath(); c.moveTo(-19, -11); c.quadraticCurveTo(-10, -15, -1, -11); c.lineTo(-1, 12); c.quadraticCurveTo(-10, 8, -19, 12); c.closePath(); fs(c, '#f3ead0', '#6a5a3a', 1);
    c.beginPath(); c.moveTo(19, -11); c.quadraticCurveTo(10, -15, 1, -11); c.lineTo(1, 12); c.quadraticCurveTo(10, 8, 19, 12); c.closePath(); fs(c, '#f3ead0', '#6a5a3a', 1);
    c.globalCompositeOperation = 'lighter'; c.fillStyle = rgrad(c, 0, -4, 1, 14, 'rgba(255,230,120,.95)', 'rgba(255,160,0,0)'); pCirc(c, 0, -4, 14); c.fill();
    sparkle(c, 0, -4, 8, '#fff'); sparkle(c, -10, -8, 3, '#fff8c0'); sparkle(c, 10, 2, 3, '#fff8c0');
  },
  sk_arrowrain(c) {
    c.translate(32, 32);
    for (let i = 0; i < 4; i++) { c.save(); c.translate(-14 + i * 9, -10 + (i % 2) * 8); c.rotate(Math.PI / 2.6);
      c.strokeStyle = '#7a5030'; c.lineWidth = 2; c.beginPath(); c.moveTo(-14, 0); c.lineTo(8, 0); c.stroke(); pPoly(c, [8, -3, 14, 0, 8, 3]); fs(c, '#e8eef8', '#2a3040', 1); pPoly(c, [-14, 0, -18, -4, -10, 0]); fs(c, '#9ff', '#1a4a4a', 0.8); c.restore(); }
  },
});

const cache = {};
/** Trả về canvas icon (cache) theo khoá */
export function iconCanvas(kind, arg) {
  const key = kind + ':' + arg;
  if (cache[key]) return cache[key];
  const cv = document.createElement('canvas'); cv.width = cv.height = SIZE * 1.5;
  const c = cv.getContext('2d'); c.scale(1.5, 1.5);
  ICON[kind](c, arg);
  return (cache[key] = cv);
}

const urlCache = {};
export function iconURL(kind, arg) { const k = kind + ':' + arg; return urlCache[k] || (urlCache[k] = iconCanvas(kind, arg).toDataURL()); }

export function itemIconKind(it) {
  if (it.slot === 'weapon') { const L = WEAPON_TYPES[it.cls || 'knight'], W = L[it.wt || 0] || L[0]; return W.special ? ['special', W.id + ':' + it.tier] : [W.id, it.tier]; }
  if (it.slot === 'wings') return ['wings', it.tier];
  return [it.slot, it.tier + '_' + (it.line || 0)];
}
export function itemIconHTML(it) {
  const [k, a] = itemIconKind(it);
  return '<img src="' + iconURL(k, a) + '" alt="" style="width:82%;height:82%;pointer-events:none">';
}

// ---------------- VẬT RƠI TRÊN ĐẤT ----------------
const RARITY_BEAM = { excellent: '#5dff7a', high: '#ffd54a', good: '#9fd0ff', royal: '#ffd34a' };
export function makeDrawDrop(iso, rarityOf, labelOf) {
  return function drawDrop(c, d, t) {
    const s = iso(d.x, d.y), b = Math.sin(t * 4 + d.x * 3) * 2;
    let img, beam = null, size = 22, label = null, lcol = '#fff';
    if (d.kind === 'zen') { img = iconCanvas('zen'); size = 18; }
    else if (d.kind === 'jewel') { img = iconCanvas('jewel', d.val); beam = JEWELS[d.val].color; label = JEWELS[d.val].name; lcol = beam; }
    else if (d.kind === 'pot') { img = iconCanvas('potion', d.val.t); size = 18; }
    else if (d.kind === 'ticket') { img = iconCanvas('ticket', d.val); beam = d.val === 'bc' ? '#ff4050' : '#c060ff'; label = d.val === 'bc' ? 'Vé Huyết Lâu' : 'Thư Mời Quỷ'; lcol = beam; }
    else { const [k, a] = itemIconKind(d.val); img = iconCanvas(k, a); const r = rarityOf(d.val); beam = RARITY_BEAM[r] || null; label = labelOf(d.val); lcol = beam || '#fff'; }
    c.save(); c.translate(s.x, s.y);
    c.fillStyle = 'rgba(0,0,0,.3)'; pEll(c, 0, 0, 8, 3.5); c.fill();
    if (beam) {
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.45 + Math.sin(t * 5) * 0.15;
      const g = c.createLinearGradient(0, -70, 0, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, beam); c.fillStyle = g; c.fillRect(-3, -70, 6, 70);
      c.fillStyle = rgrad(c, 0, 0, 1, 14, beam, 'rgba(0,0,0,0)'); pEll(c, 0, 0, 14, 6); c.fill(); c.restore();
    }
    c.drawImage(img, -size / 2, -size - 4 + b, size, size);
    c.restore();
    if (label) { c.font = '700 10px "Be Vietnam Pro", sans-serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = '#000'; c.strokeText(label, s.x, s.y - size - 10); c.fillStyle = lcol; c.fillText(label, s.x, s.y - size - 10); }
  };
}

