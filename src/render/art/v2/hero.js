// Nhân vật V2 (bản vẽ lại). Gốc toạ độ = chân, hướng mặt sang phải (+x). Cao ~74px.
// Bố cục: tính "look" (màu, kiểu, vũ khí, thời trang) → tính "pose" (góc tay chân theo hoạt ảnh) → vẽ theo lớp.
import { ARMOR_SLOTS } from '../../../config/items.js';
import { ARMOR_SETS, WEAPON_TYPES } from '../../../config/gear.js';
import { FASHION_BY_ID } from '../../../config/fashion.js';
import { glowColor, mix } from '../../paint.js';
import { tones, pEll, pCirc, pPoly, pRR, fs, vgrad, rgrad, gloss, groundShadow, sparkle, hash } from './kit.js';
import { WEAPONS, MELEE, pauldron, chestEmblem, crest, drawWings, OUTFIT_COLORS, outfitBody, outfitSkirt, headwear, HEADWEAR_HIDES_HAIR, auraLayer } from './gear.js';

/** Viền của dòng giáp đầu mỗi bậc (giữ để tương thích icon/trang thiết kế) */
export const TRIM = ARMOR_SETS.map((l) => l[0].trim);
const SKIN = { b: '#f8d8b8', s: '#e8b48e', o: '#8a5238' };
const HAIR = { knight: '#3a2418', wizard: '#dcd8ec', archer: '#e8b850', lord: '#1a1224', gladiator: '#7a2a18' };
const EYES = { knight: '#2a4a8a', wizard: '#6a3aaa', archer: '#2a7a4a', lord: '#c030a0', gladiator: '#c05020' };
const PLAIN = { color: '#6a6a72', trim: '#4a4a52', style: 'cloth' };

// ---------------- NGOẠI HÌNH ----------------
/** Kiểu thời trang mới có `base` (kiểu 2D có sẵn gần nhất): bản 2D vẽ theo base, bản 3D giữ kiểu gốc ở s3 */
const asBase = (f) => (f && f.base ? { ...f, style: f.base, s3: f.style } : f);
function resolveLook(cls, eq, fa) {
  const set = (sl) => (eq[sl] ? ARMOR_SETS[eq[sl].tier][eq[sl].line || 0] || ARMOR_SETS[eq[sl].tier][0] : null);
  const armor = set('armor') || PLAIN, helm = set('helm'), pants = set('pants'), gloves = set('gloves'), boots = set('boots');
  const L = {
    cls, armor, helm,
    body: armor.color, trim: armor.trim, style: armor.style, sleeve: armor.color,
    legs: pants ? pants.color : '#4a4038', boots: boots ? boots.color : '#3a2a20', gloves: gloves ? gloves.color : SKIN.b,
    kneeStyle: pants ? pants.style : 'cloth',
    wings: eq.wings || null,
    outfit: fa && fa.outfit ? asBase(FASHION_BY_ID[fa.outfit]) : null,
    head: fa && fa.head ? asBase(FASHION_BY_ID[fa.head]) : null,
    aura: fa && fa.aura ? FASHION_BY_ID[fa.aura] : null,
  };
  if (L.outfit) Object.assign(L, OUTFIT_COLORS[L.outfit.style](L.outfit));
  // Vũ khí
  const w = eq.weapon, types = WEAPON_TYPES[cls], wt = w ? types[w.wt || 0] || types[0] : types[0];
  L.weapon = { type: wt.id, tier: w ? w.tier : 0, plus: w ? w.plus : 0, col: w ? (ARMOR_SETS[w.tier][0].color) : '#aaa', special: !!wt.special };
  // Đủ bộ 5 món → hào quang theo màu bộ
  const cnt = {};
  for (const sl of ARMOR_SLOTS) if (eq[sl]) { const k = eq[sl].tier + ':' + (eq[sl].line || 0); cnt[k] = (cnt[k] || 0) + 1; }
  const full = Object.entries(cnt).find(([, n]) => n >= 5);
  L.setGlow = full ? ARMOR_SETS[+full[0].split(':')[0]][+full[0].split(':')[1]].trim : null;
  L.minPlus = Math.min(...ARMOR_SLOTS.map((s) => (eq[s] ? eq[s].plus : 0)));
  return L;
}

// ---------------- TƯ THẾ ----------------
/** Góc tay (vai a1, khuỷu a2), chân, thân theo trạng thái; k = tiến độ đòn đánh 0..1 (-1 = không đánh) */
function computePose(L, t, o) {
  const moving = !!o.moving, ph = t * 11, walk = moving ? Math.sin(ph) : 0;
  const skill = o.atk > 0.25, k = o.atk > 0 ? 1 - o.atk / (skill ? 0.3 : 0.25) : -1;
  const P = {
    walk, k, skill,
    bob: moving ? Math.abs(Math.sin(ph)) * 2 : Math.sin(t * 2.4) * 0.7,
    lean: moving ? 0.06 : 0,
    breathe: 1 + Math.sin(t * 2.4) * 0.012,
    legB: -walk * 0.5, legF: walk * 0.5,
    kneeB: moving ? Math.max(0, -Math.sin(ph + 0.6)) * 0.5 : 0, kneeF: moving ? Math.max(0, Math.sin(ph + 0.6)) * 0.5 : 0,
    back: [0.3 - walk * 0.45, -0.25], front: [-0.35 + walk * 0.4, -0.45],
    wAng: null, pull: 0, cast: false, thrust: 0,
  };
  const type = L.weapon.type, ease = (x) => 1 - Math.pow(1 - x, 3);
  if (L.cls === 'knight') {
    if (type === 'spear') {
      P.wAng = 0.1; P.front = [-0.5 + walk * 0.2, -0.9];
      if (k >= 0) { const e = Math.sin(k * Math.PI); P.front = [-1.45, -0.15 + e * 0.15]; P.wAng = Math.PI / 2; P.thrust = e * 9; P.lean = 0.12 * e; }
    } else {
      P.wAng = 2.3; P.front = [-0.45 + walk * 0.2, -0.35];
      if (k >= 0) {
        if (k < 0.3) { const e = k / 0.3; P.front = [-0.45 - e * 2.2, -0.35 - e * 0.4]; P.wAng = 2.3 - e * 3.3; }
        else { const e = ease((k - 0.3) / 0.7); P.front = [-2.65 + e * 2.6, -0.75 + e * 0.6]; P.wAng = -1.0 + e * 3.5; P.lean = 0.1 * Math.sin(e * Math.PI); }
      }
      if (skill && k >= 0) P.spin = k; // xoay người khi dùng Xoáy Kiếm
    }
  } else if (L.cls === 'wizard') {
    P.cast = k >= 0;
    if (type === 'staff') { P.wAng = 0; P.front = [-0.55 + walk * 0.15, -0.5]; if (k >= 0) { const e = Math.sin(k * Math.PI); P.front = [-0.55 - e * 0.9, -0.5 + e * 0.2]; P.wAng = e * 0.5; } }
    else { P.wAng = 0; P.front = [-0.9 + walk * 0.1, -0.9]; if (k >= 0) { const e = Math.sin(k * Math.PI); P.front = [-1.3 - e * 0.3, -0.5]; } if (skill && k >= 0) P.back = [-1.8, -0.3]; }
  } else {
    if (type === 'crossbow') { P.wAng = 0; P.front = [-1.35, -0.25]; P.back = [-1.0, -0.95]; P.pull = k >= 0 ? 1 : 0; }
    else {
      const e = k >= 0 ? Math.sin(k * Math.PI) : 0;
      P.wAng = 0; P.front = [-1.45, -0.05]; P.back = [-1.25 + e * 0.35, -1.2 - e * 0.5]; P.pull = 7 * e;
      if (type === 'twinbow') P.back = [-1.2, -0.2];
    }
  }
  return P;
}

// ---------------- BỘ PHẬN ----------------
function limb(c, len, w, col, back, round = true) { const T = tones(col); pRR(c, -w / 2, -1, w, len + 2, round ? w / 2 : 1.5); fs(c, back ? T.s : vgrad(c, 0, len, T.h, T.s), T.o, 1.1); }

/** Tay 2 khúc. held(c) được gọi tại bàn tay với hệ trục đã xoay về góc tuyệt đối wAng */
function arm(c, x, y, a1, a2, sleeve, glove, back, wide, held, wAng) {
  c.save(); c.translate(x, y); c.rotate(a1);
  limb(c, 9, wide ? 7 : 5.6, sleeve, back);
  c.translate(0, 9); c.rotate(a2);
  if (wide) { const T = tones(sleeve); c.beginPath(); c.moveTo(-3.5, -1); c.lineTo(3.5, -1); c.lineTo(5.5, 7); c.lineTo(-5.5, 7); c.closePath(); fs(c, back ? T.s : vgrad(c, -1, 7, T.h, T.s), T.o, 1); }
  else limb(c, 7, 5, sleeve, back);
  c.translate(0, 8.5);
  if (held) { c.save(); c.rotate((wAng ?? 0) - a1 - a2); held(c); c.restore(); }
  const G = tones(glove); pCirc(c, 0, 0, 3.2); fs(c, back ? G.s : vgrad(c, -3, 3, G.h, G.s), G.o, 1);
  c.restore();
}

function leg(c, x, a, knee, pants, boots, back, style) {
  const P = tones(pants), B = tones(boots);
  c.save(); c.translate(x, -19); c.rotate(a);
  pRR(c, -3.3, 0, 6.6, 10, 3); fs(c, back ? P.s : vgrad(c, 0, 10, P.h, P.b), P.o, 1.1);
  if (!back && (style === 'bronze' || style === 'dragon' || style === 'angel' || style === 'ice' || style === 'magma' || style === 'demon')) { pEll(c, 0.5, 9.5, 3.6, 2.6); fs(c, P.hh, P.o, 0.9); }
  c.translate(0, 9.5); c.rotate(-knee * 0.4 + knee * 0.9);
  pRR(c, -3, 0, 6, 6, 2.5); fs(c, back ? P.s : P.b, P.o, 1);
  // Ủng có cổ
  c.beginPath(); c.moveTo(-3.6, 3); c.lineTo(3.6, 3); c.lineTo(3.8, 7.5); c.quadraticCurveTo(8, 8, 8, 10.5); c.lineTo(-3.8, 10.5); c.closePath();
  fs(c, back ? B.s : vgrad(c, 3, 10.5, B.h, B.s), B.o, 1.1);
  if (!back) { pRR(c, -4, 2.2, 8, 2.2, 1); fs(c, B.hh, B.o, 0.7); }
  c.restore();
}

function torso(c, L, P) {
  const T = tones(L.body), TR = tones(L.trim);
  if (L.cls === 'wizard') {
    // Áo choàng phù thuỷ dài, có vạt trước & đai
    c.beginPath(); c.moveTo(-9, -42); c.quadraticCurveTo(-12, -24, -15 - P.walk, -4); c.quadraticCurveTo(0, 0, 15 + P.walk, -4); c.quadraticCurveTo(11, -24, 9, -42); c.closePath();
    fs(c, vgrad(c, -42, -4, T.h, T.s), T.o);
    c.beginPath(); c.moveTo(2, -42); c.lineTo(5, -4); c.lineTo(8.5, -4.5); c.lineTo(5.5, -42); c.closePath(); c.fillStyle = TR.b; c.fill();
    c.strokeStyle = TR.h; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-14, -6); c.quadraticCurveTo(0, -2, 14, -6); c.stroke();
    pRR(c, -10, -27, 20, 3.6, 1.6); fs(c, TR.b, TR.o, 1); pCirc(c, 2, -25.2, 2.2); fs(c, '#ffd54a', '#6a4a00', 0.7);
    // Cổ áo cao
    c.beginPath(); c.moveTo(-8, -42); c.quadraticCurveTo(0, -47, 8, -42); c.lineTo(6, -40); c.quadraticCurveTo(0, -43, -6, -40); c.closePath(); fs(c, T.h, T.o, 0.9);
  } else {
    c.beginPath(); c.moveTo(-10, -42); c.lineTo(10, -42); c.quadraticCurveTo(11, -30, 8.5, -18); c.lineTo(-8.5, -18); c.quadraticCurveTo(-11, -30, -10, -42); c.closePath();
    fs(c, vgrad(c, -42, -18, T.h, T.s), T.o);
    if (L.cls === 'knight') {
      // Giáp ngực chia mảng + vạt giáp hông
      c.strokeStyle = T.o; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-8, -30); c.quadraticCurveTo(0, -26, 8, -30); c.moveTo(-7.5, -24); c.quadraticCurveTo(0, -21, 7.5, -24); c.stroke();
      gloss(c, -4, -37, 3.5, 2, 0.35);
      for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 1, -19); c.lineTo(sx * 9, -19); c.lineTo(sx * 10 + (sx > 0 ? P.walk : -P.walk), -11); c.lineTo(sx * 2, -12); c.closePath(); fs(c, vgrad(c, -19, -11, T.b, T.s), T.o, 1); }
    } else {
      // Thợ săn: áo khoác da + áo choàng ngắn ở vai
      c.beginPath(); c.moveTo(-10, -42); c.lineTo(10, -42); c.lineTo(4, -31); c.lineTo(-11, -33); c.closePath(); fs(c, mix(L.body, '#2e6b30', 0.45), T.o, 1);
      c.strokeStyle = T.o; c.lineWidth = 0.8; c.beginPath(); c.moveTo(2, -31); c.lineTo(3, -19); c.stroke();
      pRR(c, 6, -23, 5, 5, 1.5); fs(c, '#6a4524', '#2a1808', 0.8);
    }
    chestEmblem(c, L.style, L.trim, 2, -32);
    pRR(c, -9.5, -21, 19, 4, 1.6); fs(c, '#4a2e1a', '#1a0e06', 1); pRR(c, -0.5, -21.6, 5, 5.2, 1.2); fs(c, TR.h, TR.o, 0.8);
  }
}

function hairBack(c, cls, t, P) {
  const H = tones(HAIR[cls]), sw = Math.sin(t * 2.2) * 1.2 + P.walk * 1.5;
  if (cls === 'wizard') { c.beginPath(); c.moveTo(-9, -58); c.quadraticCurveTo(-16 - sw, -46, -13 - sw, -34); c.quadraticCurveTo(-6, -38, -2, -42); c.closePath(); fs(c, vgrad(c, -58, -34, H.h, H.s), H.o, 1); }
  if (cls === 'archer') { c.save(); c.translate(-9, -56); c.rotate(0.5 + sw * 0.08); pEll(c, -4, 6, 4, 8); fs(c, vgrad(c, -2, 14, H.h, H.s), H.o, 1); pCirc(c, 0, 0, 2.2); fs(c, '#2e6b30', '#0a2a0a', 0.8); c.restore(); }
}

function face(c, cls) {
  pEll(c, 1, -52, 11, 11.5); fs(c, vgrad(c, -63, -41, '#ffe8d4', SKIN.s), SKIN.o);
  // Má, mắt, lông mày, miệng
  c.fillStyle = 'rgba(255,120,120,.32)'; pEll(c, 7.5, -47, 2.4, 1.3); c.fill(); pEll(c, -2.5, -47, 1.8, 1.1); c.fill();
  const iris = EYES[cls];
  for (const [x, r] of [[6.2, 2.9], [-0.6, 2.4]]) {
    pEll(c, x, -51.5, r * 0.82, r * 1.05); fs(c, '#fff', '#3a2028', 0.7);
    pEll(c, x + 0.5, -51.2, r * 0.58, r * 0.78); c.fillStyle = iris; c.fill();
    pCirc(c, x + 0.6, -51, r * 0.32); c.fillStyle = '#0a0a14'; c.fill();
    pCirc(c, x - 0.2, -52.4, r * 0.25); c.fillStyle = '#fff'; c.fill();
    c.strokeStyle = '#2a1814'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(x - r * 0.9, -54.2); c.quadraticCurveTo(x, -55.4, x + r * 0.95, -54.4); c.stroke();
  }
  c.strokeStyle = mix(HAIR[cls], '#000000', 0.35); c.lineWidth = 1.2; c.lineCap = 'round';
  c.beginPath(); c.moveTo(4.5, -57.2); c.lineTo(8.2, -57.6); c.moveTo(-2.2, -57); c.lineTo(0.6, -57.4); c.stroke();
  c.strokeStyle = SKIN.o; c.lineWidth = 0.9; c.beginPath(); c.moveTo(4.5, -45.2); c.quadraticCurveTo(5.8, -44.2, 7.2, -45.2); c.stroke();
}

function hairFront(c, cls) {
  const H = tones(HAIR[cls]);
  c.beginPath();
  if (cls === 'knight') { c.moveTo(-10, -54); c.quadraticCurveTo(-8, -66, 2, -64.5); c.quadraticCurveTo(12, -64, 12.5, -55); c.lineTo(10, -57); c.lineTo(8, -54.5); c.lineTo(5.5, -57.5); c.lineTo(2.5, -55); c.lineTo(0, -58); c.lineTo(-3, -55); c.lineTo(-6, -57); c.closePath(); }
  else if (cls === 'wizard') { c.moveTo(-10.5, -50); c.quadraticCurveTo(-11, -64, 2, -64.5); c.quadraticCurveTo(12.5, -64, 12.5, -54); c.quadraticCurveTo(8, -60, 3, -57); c.quadraticCurveTo(-2, -60, -6, -55); c.quadraticCurveTo(-8, -52, -10.5, -50); c.closePath(); }
  else { c.moveTo(-10.5, -51); c.quadraticCurveTo(-10, -65, 2, -64.5); c.quadraticCurveTo(13, -64, 12.5, -53); c.quadraticCurveTo(10, -58, 7.5, -55.5); c.quadraticCurveTo(5, -60, 1, -56); c.quadraticCurveTo(-3, -59, -6, -55); c.closePath(); }
  fs(c, vgrad(c, -65, -50, H.h, H.b), H.o, 1);
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.2; c.beginPath(); c.arc(1, -56, 8, -2.4, -1.5); c.stroke();
}

function helmet(c, L, t) {
  const H = L.helm; if (!H) return false;
  const T = tones(H.color), TR = tones(H.trim);
  if (L.cls === 'knight') {
    // Mũ trụ hở mặt: vòm + bảo vệ gáy + thanh che mũi
    c.beginPath(); c.moveTo(-11.8, -54); c.lineTo(-12.2, -46); c.quadraticCurveTo(-8.5, -41.5, -3.5, -43.5); c.lineTo(-2.5, -54); c.closePath(); fs(c, vgrad(c, -54, -42, T.b, T.s), T.o, 1.1);
    c.beginPath(); c.arc(1, -54, 12.8, Math.PI, 0); c.closePath(); fs(c, vgrad(c, -67, -54, T.hh, T.s), T.o); gloss(c, -3, -61, 4.5, 2.2, 0.45);
    pRR(c, -12, -56, 26.5, 3.4, 1.5); fs(c, TR.b, TR.o, 1);
    pRR(c, 8.6, -55, 2.4, 7.5, 1); fs(c, T.h, T.o, 0.8);
    c.save(); c.translate(1, -65); crest(c, H.style, H.color, H.trim); c.restore();
  } else if (L.cls === 'wizard') {
    pEll(c, 1, -57, 17.5, 4.6); fs(c, vgrad(c, -62, -52, T.h, T.s), T.o);
    c.beginPath(); c.moveTo(-9.5, -58); c.quadraticCurveTo(-4, -74, -11, -88); c.quadraticCurveTo(4, -78, 11.5, -58); c.closePath(); fs(c, vgrad(c, -88, -58, T.h, T.s), T.o);
    c.beginPath(); c.moveTo(-9, -60); c.quadraticCurveTo(1, -63, 11, -60); c.lineTo(11.3, -57.8); c.quadraticCurveTo(1, -61, -9.3, -57.8); c.closePath(); fs(c, TR.b, TR.o, 1);
    c.save(); c.translate(1, -61); c.scale(0.6, 0.6); crest(c, H.style, H.color, H.trim); c.restore();
  } else {
    c.beginPath(); c.arc(1, -53, 12.8, Math.PI * 0.85, Math.PI * 1.95); c.quadraticCurveTo(14.5, -46, 9.5, -43.5); c.quadraticCurveTo(6.5, -56, -2, -57.5); c.quadraticCurveTo(-8.5, -52, -6.5, -41.5); c.quadraticCurveTo(-13.5, -44, -12.5, -50); c.closePath();
    fs(c, vgrad(c, -66, -41, T.h, T.s), T.o);
    c.beginPath(); c.moveTo(-6, -62); c.quadraticCurveTo(-18, -72, -23, -61); c.quadraticCurveTo(-14, -63, -8, -59.5); fs(c, '#e8e0c0', '#3a2a1a', 1);
    c.save(); c.translate(1, -65); c.scale(0.8, 0.8); crest(c, H.style, H.color, H.trim); c.restore();
  }
  return true;
}

/** Mũ trùm của trang phục (áo choàng, ninja) */
function outfitHood(c, f) {
  const A = tones(f.colors[0]);
  if (f.style === 'cloak') { c.beginPath(); c.arc(1, -53, 13.2, Math.PI * 0.8, Math.PI * 1.95); c.quadraticCurveTo(15, -45, 10, -42); c.quadraticCurveTo(7, -57, -1, -58); c.quadraticCurveTo(-9, -52, -7, -41); c.quadraticCurveTo(-14, -44, -13, -50); c.closePath(); fs(c, vgrad(c, -66, -41, A.h, A.s), A.o); return true; }
  if (f.style === 'ninja') { pRR(c, -1, -50, 14, 7, 3); fs(c, A.b, A.o, 1); c.beginPath(); c.arc(1, -54, 12, Math.PI, 0); c.closePath(); fs(c, A.s, A.o, 1); pRR(c, -11, -58, 24, 3, 1.4); fs(c, f.colors[1], tones(f.colors[1]).o, 0.8); return true; }
  return false;
}

/** Vệt chém sáng khi vung vũ khí cận chiến */
function swoosh(c, k, col) {
  if (k < 0.3 || k > 0.95) return;
  const e = (k - 0.3) / 0.65;
  c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = (1 - e) * 0.85;
  c.translate(6, -38);
  const a0 = -2.4 + e * 0.6, a1 = -2.4 + e * 3.4;
  c.beginPath(); c.arc(0, 0, 32, a0, a1); c.arc(0, 0, 24, a1, a0, true); c.closePath();
  c.fillStyle = col || 'rgba(220,240,255,.9)'; c.fill();
  c.restore();
}

// ---------------- VẼ NHÂN VẬT ----------------
/**
 * @param o { face: 1|-1, moving, atk, fa: {outfit, head, aura} }
 */
export function drawHero(c, cls, eq, t, o) {
  const L = resolveLook(cls, eq, o.fa), P = computePose(L, t, o);
  const W = { ...L.weapon, gl: glowColor(L.weapon.plus, t) }, wtype = W.type, draw = WEAPONS[wtype];
  const wide = cls === 'wizard' && !L.outfit;

  // --- Mặt đất: hào quang đủ bộ, +9, hào quang thời trang (lớp sau)
  if (L.setGlow) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.28 + Math.sin(t * 2.5) * 0.08; c.fillStyle = rgrad(c, 0, 0, 2, 24, L.setGlow, 'rgba(0,0,0,0)'); c.scale(1, 0.42); pCirc(c, 0, 0, 24); c.fill(); c.restore(); }
  if (L.minPlus >= 9) {
    const ac = glowColor(L.minPlus, t) || '#ffd700';
    c.save(); c.globalAlpha = 0.35 + Math.sin(t * 3) * 0.1; c.fillStyle = rgrad(c, 0, 0, 2, 28, ac, 'rgba(0,0,0,0)'); c.scale(1, 0.45); pCirc(c, 0, 0, 28); c.fill(); c.restore();
    for (let i = 0; i < 5; i++) { const k = (t * 0.6 + hash(i)) % 1; sparkle(c, (hash(i + 9) - 0.5) * 30, -k * 64, 2, ac, 1 - k); }
  }
  if (L.aura) auraLayer(c, L.aura, t, false);
  groundShadow(c, 16, 6);

  c.save(); c.scale(o.face, 1);
  if (P.spin != null) c.scale(Math.cos(P.spin * Math.PI * 2) >= 0 ? 1 : -1, 1);
  c.translate(0, -P.bob); c.rotate(P.lean);

  // --- Lớp sau: cánh, áo choàng, ống tên, tóc sau
  if (L.wings) drawWings(c, L.wings, t);
  if (cls === 'knight' && !L.outfit) {
    const cp = tones(L.style === 'dragon' || L.style === 'demon' ? '#7a1010' : L.style === 'angel' ? '#f0f0ff' : mix(L.body, '#5a1a1a', 0.5)), fl = Math.sin(t * 4) * 2 + P.walk * 2.5;
    c.beginPath(); c.moveTo(-7, -42); c.quadraticCurveTo(-15 - fl, -24, -16 - fl, -6); c.quadraticCurveTo(-10, -3, -4, -7); c.lineTo(3, -40); c.closePath(); fs(c, vgrad(c, -42, -6, cp.h, cp.d), cp.o);
  }
  if (L.outfit && L.outfit.style === 'royal') { const cp = tones(L.outfit.colors[1]), fl = Math.sin(t * 4) * 2 + P.walk * 2.5; c.beginPath(); c.moveTo(-7, -42); c.quadraticCurveTo(-16 - fl, -22, -17 - fl, -3); c.quadraticCurveTo(-10, -1, -3, -5); c.lineTo(3, -40); c.closePath(); fs(c, vgrad(c, -42, -3, cp.h, cp.d), cp.o); }
  if (cls === 'archer' && wtype !== 'crossbow') { c.save(); c.translate(-8, -40); c.rotate(-0.5); pRR(c, -3, -4, 6, 18, 2); fs(c, '#6b4524', '#2a1808', 1); for (let i = 0; i < 3; i++) { pPoly(c, [-2 + i * 2, -4, -1 + i * 2, -9, i * 2, -4]); fs(c, '#e8e0c0', '#6a5a3a', 0.6); } c.restore(); }
  const hasHeadwear = !!L.head, hidesHair = hasHeadwear && HEADWEAR_HIDES_HAIR[L.head.style];
  if (!hidesHair) hairBack(c, cls, t, P);

  // --- Tay sau, chân
  if (!L.outfit) pauldron(c, L.style, L.body, L.trim, -8, -40, false);
  const backHeld = cls === 'archer' && wtype === 'twinbow' ? (cc) => draw(cc, W, t, 0) : null;
  arm(c, -7, -37, P.back[0], P.back[1], L.sleeve, L.gloves, true, wide, backHeld, 0);
  leg(c, -2.6, P.legB, P.kneeB, L.legs, L.boots, true, L.kneeStyle);
  leg(c, 2.6, P.legF, P.kneeF, L.legs, L.boots, false, L.kneeStyle);

  // --- Thân
  c.save(); c.translate(0, -30); c.scale(1, P.breathe); c.translate(0, 30);
  if (L.outfit) { outfitSkirt(c, L.outfit, t, P.walk); outfitBody(c, L.outfit, cls, t, P.walk); } else torso(c, L, P);
  c.restore();

  if (!L.outfit) pauldron(c, L.style, L.body, L.trim, 8, -39, true);

  // --- Đầu (vẽ đè lên vai cho đúng tỉ lệ chibi)
  c.save(); c.translate(0, Math.sin(t * 2.4 + 1) * 0.3);
  face(c, cls);
  const hooded = !hasHeadwear && L.outfit && outfitHood(c, L.outfit);
  if (!hooded) {
    if (!hidesHair) hairFront(c, cls);
    if (hasHeadwear) { c.save(); c.translate(1, -58); headwear(c, L.head, t); c.restore(); }
    else if (!L.outfit) helmet(c, L, t);
    else if (L.outfit.style === 'royal' && L.helm) helmet(c, L, t);
  }
  c.restore();

  // --- Tay trước + vũ khí
  const held = (cc) => { if (P.thrust) cc.translate(0, -P.thrust); draw(cc, W, t, cls === 'archer' ? P.pull : P.cast); };
  if (cls === 'archer' && wtype !== 'crossbow') {
    // Cung đặt ở tay trước, dây kéo về tay sau
    arm(c, 7, -37, P.front[0], P.front[1], L.sleeve, L.gloves, false, false, held, 0);
  } else if (cls === 'archer') {
    arm(c, 7, -37, P.front[0], P.front[1], L.sleeve, L.gloves, false, false, held, Math.PI / 2 - Math.PI / 2);
  } else {
    arm(c, 7, -37, P.front[0], P.front[1], L.sleeve, L.gloves, false, wide, held, P.wAng);
  }
  if (cls === 'knight' && MELEE[wtype] && P.k >= 0) swoosh(c, P.k, W.gl);

  c.restore();
  if (L.aura) auraLayer(c, L.aura, t, true);
}

export { resolveLook };
