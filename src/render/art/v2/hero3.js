// Nhân vật theo "Character Style Guide" (Claude Design, N0).
//  - Hình học vẽ ở hệ "đơn vị phác" 4× (cao 320 = 80px trong game), gốc (0,0) giữa 2 bàn chân, mặt hướng +x.
//  - Mỗi mảng: tô tông tối → mảng gốc lệch lên-trái → dải sáng mép trên-trái → viền sáng trắng → viền = màu gốc làm tối.
//  - 12 lớp theo thứ tự: shadow · wings · cape_back · arm_back · legs · body · head · hair · helmet · arm_front · weapon · aura.
//  - Trang bị đổi màu chất liệu theo bộ giáp; vũ khí / cánh / thời trang / trang trí bậc cao tái dùng đồ hoạ V2 (gear.js).
import { mix, glowColor } from '../../paint.js';
import { rgrad, pCirc, groundShadow, sparkle, hash } from './kit.js';
import { WEAPONS, MELEE, pauldron, chestEmblem, crest, drawWings, outfitBody, outfitSkirt, headwear, HEADWEAR_HIDES_HAIR, auraLayer, ORB } from './gear.js';
import { resolveLook } from './hero.js';

const S = 0.25; // đơn vị phác → px
const isStarter = (it) => !it || (it.tier === 0 && !(it.line > 0));

// ---------------- CHẤT LIỆU (viền · tối · gốc · sáng) ----------------
const T = {
  skin: { o: '#8a5434', d: '#d49a70', b: '#f2c9a0', l: '#ffe2c4' },
  hair: { o: '#22100a', d: '#3a1e10', b: '#5a3420', l: '#8a5636' },
  leather: { o: '#4a2c14', d: '#6b4c2e', b: '#8b6b47', l: '#b08c64' },
  boot: { o: '#1a0e06', d: '#2e1e12', b: '#4a3220', l: '#6b4c2e' },
  cape: { o: '#480a0c', d: '#7a1418', b: '#b8282a', l: '#e0604c' },
  metal: { o: '#353d4a', d: '#8a96a4', b: '#c8d2dc', l: '#ffffff' },
  gold: { o: '#4a3608', d: '#8a6a20', b: '#c9a24a', l: '#ffd54a' },
  robe: { o: '#1e1446', d: '#3a2a78', b: '#5a4aa8', l: '#8a7ad8' },
  green: { o: '#1e2e18', d: '#3a5430', b: '#5a7a4a', l: '#9ac07a' },
};
const MAT = {};
/** Bộ 4 tông từ 1 màu gốc (giữ đúng công thức của bảng tông màu) */
function tone(base) {
  if (T[base]) return T[base];
  return MAT[base] || (MAT[base] = { o: mix(base, '#0a0604', 0.58), d: mix(base, '#1a0e10', 0.26), b: base, l: mix(base, '#fff6e8', 0.3) });
}

const PATHS = new Map();
const P2 = (d) => { let p = PATHS.get(d); if (!p) { p = new Path2D(d); PATHS.set(d, p); } return p; };
const f1 = (n) => n.toFixed(1);
const cap = (x1, y1, x2, y2, r) => {
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, nx = -uy * r, ny = ux * r;
  return `M${f1(x1 + nx)} ${f1(y1 + ny)}L${f1(x2 + nx)} ${f1(y2 + ny)}A${r} ${r} 0 0 0 ${f1(x2 + ux * r)} ${f1(y2 + uy * r)}A${r} ${r} 0 0 0 ${f1(x2 - nx)} ${f1(y2 - ny)}L${f1(x1 - nx)} ${f1(y1 - ny)}A${r} ${r} 0 0 0 ${f1(x1 - ux * r)} ${f1(y1 - uy * r)}A${r} ${r} 0 0 0 ${f1(x1 + nx)} ${f1(y1 + ny)}Z`;
};
const circ = (cx, cy, r) => `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;
const ell = (cx, cy, rx, ry) => `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;

/** Vẽ 1 mảng theo quy chuẩn đổ bóng 3 tông + viền sáng. m: tên chất liệu hoặc mã màu; k: hệ số độ dày dải sáng */
function part(c, d, m, k = 1) {
  const p = P2(d), t = tone(m);
  c.save(); c.clip(p);
  c.fillStyle = t.d; c.fill(p);
  c.translate(-7 * k, -8 * k); c.fillStyle = t.b; c.fill(p);
  c.translate(13 * k, 15 * k); c.strokeStyle = t.l; c.lineWidth = 12 * k; c.stroke(p);
  c.translate(-4 * k, -5 * k); c.globalAlpha = 0.55; c.strokeStyle = '#fff'; c.lineWidth = 4 * k; c.stroke(p);
  c.restore();
  c.strokeStyle = t.o; c.lineWidth = 6; c.lineJoin = 'round'; c.stroke(p);
}

// ---------------- HÌNH HỌC CỐ ĐỊNH (từ style guide) ----------------
const HEAD = ell(6, -270, 58, 52);
const BANGS = 'M -54 -262 Q -62 -330 8 -330 Q 70 -328 66 -276 Q 56 -292 40 -290 Q 30 -276 18 -288 Q 4 -276 -6 -290 Q -16 -268 -26 -262 Q -40 -250 -54 -262 Z';
const G = {
  knight: {
    cape: 'M -34 -212 C -70 -180 -88 -110 -84 -44 Q -60 -30 -36 -40 Q -20 -36 -4 -46 L 20 -206 Z',
    shB: [-44, -200], handB: [-58, -140], shF: [46, -200], handF: [60, -146], armR: 15,
    hipB: [-20, -118], kneeB: [-22, -50], hipF: [18, -118], kneeF: [22, -50], legR: 15,
    bootB: 'M -40 -52 L -6 -52 L -4 -14 Q -4 0 -18 0 L -34 0 Q -44 0 -44 -12 Z',
    bootF: 'M 2 -52 L 36 -52 L 40 -26 Q 58 -22 58 -10 Q 58 0 46 0 L 8 0 Q 0 0 0 -10 Z',
    body: 'M -44 -206 Q -48 -214 -36 -220 Q 4 -232 44 -220 Q 56 -214 52 -204 L 54 -118 Q 50 -104 34 -102 L -30 -102 Q -48 -104 -48 -118 Z',
    belt: 'M -50 -134 L 56 -134 L 56 -114 L -50 -114 Z', buckle: 'M -2 -138 L 18 -138 L 18 -110 L -2 -110 Z',
    shoulder: 'M 20 -222 Q 50 -238 68 -210 Q 72 -192 58 -186 Q 40 -196 20 -200 Z',
    hairBack: 'M -54 -262 Q -60 -236 -46 -222 Q -40 -240 -34 -254 Z',
    helmet: 'M -58 -268 Q -62 -338 6 -340 Q 72 -338 70 -284 Q 52 -300 30 -302 Q -4 -302 -24 -286 L -30 -250 Q -48 -244 -58 -254 Z',
    band: 'M -24 -290 Q 20 -314 70 -292 L 70 -282 Q 24 -302 -24 -280 Z',
  },
  wizard: {
    cape: 'M -40 -210 Q -74 -120 -70 -12 L -30 -10 L 0 -200 Z',
    shB: [-36, -200], handB: [-52, -140], shF: [40, -200], handF: [74, -152], armR: 14,
    shoeB: 'M -40 -14 Q -42 0 -28 0 L -10 0 Q -6 -10 -12 -16 Z', shoeF: 'M 10 -16 Q 44 -22 54 -8 Q 54 0 42 0 L 10 0 Z',
    body: 'M -34 -214 Q 4 -228 40 -214 L 48 -150 Q 60 -80 66 -22 Q 60 -10 46 -10 L -50 -10 Q -62 -10 -60 -22 Q -50 -80 -42 -150 Z',
    sash: 'M -42 -142 L 48 -142 L 50 -124 L -44 -124 Z', stripe: 'M 10 -124 L 18 -12 L 30 -12 L 24 -124 Z',
    hairBack: 'M -54 -262 Q -70 -210 -56 -170 Q -40 -186 -34 -240 Z',
    hat: 'M -44 -296 Q -34 -356 0 -382 Q 22 -398 -10 -414 Q 50 -404 44 -364 Q 46 -330 60 -294 Z',
    brim: 'M -80 -292 Q 6 -330 90 -286 Q 76 -272 6 -282 Q -60 -276 -80 -292 Z',
    band: 'M -40 -302 Q 6 -320 58 -300 L 60 -292 Q 6 -312 -42 -294 Z',
  },
  archer: {
    fletch: ['M -60 -236 L -72 -262 L -52 -244 Z', 'M -50 -240 L -54 -266 L -42 -244 Z', 'M -40 -238 L -34 -262 L -32 -240 Z'],
    quiver: cap(-48, -228, -16, -120, 14),
    shB: [-30, -198], handB: [-36, -142], shF: [34, -196], handF: [94, -176], armR: 12,
    hipB: [-16, -114], kneeB: [-18, -50], hipF: [16, -114], kneeF: [20, -50], legR: 13,
    bootB: 'M -34 -54 L -4 -54 L -2 -12 Q -2 0 -14 0 L -30 0 Q -38 0 -38 -10 Z',
    bootF: 'M 4 -54 L 34 -54 L 36 -24 Q 52 -20 52 -9 Q 52 0 42 0 L 10 0 Q 2 0 2 -9 Z',
    body: 'M -32 -208 Q 2 -222 36 -208 L 40 -150 L 46 -98 Q 4 -88 -38 -98 L -36 -150 Z',
    belt: 'M -38 -130 L 42 -130 L 42 -114 L -38 -114 Z',
    tail: 'M -40 -300 Q -100 -306 -108 -246 Q -104 -214 -88 -200 Q -92 -240 -48 -266 Z',
    band: 'M -54 -282 Q 6 -316 66 -286 L 66 -274 Q 6 -304 -54 -270 Z',
    bow: 'M 86 -304 Q 150 -170 86 -36 L 80 -42 Q 132 -170 80 -298 Z',
  },
};

function face(c) {
  c.fillStyle = '#2a1610';
  c.beginPath(); c.ellipse(14, -262, 7, 11, 0, 0, 6.283); c.fill();
  c.beginPath(); c.ellipse(42, -262, 9, 13, 0, 0, 6.283); c.fill();
  c.fillStyle = '#fff';
  c.beginPath(); c.arc(16.5, -266, 3, 0, 6.283); c.fill();
  c.beginPath(); c.arc(45, -267, 3.5, 0, 6.283); c.fill();
  c.beginPath(); c.arc(40, -256, 1.6, 0, 6.283); c.fill();
  c.strokeStyle = '#8a5434'; c.lineWidth = 3.5; c.lineCap = 'round';
  c.beginPath(); c.moveTo(30, -236); c.quadraticCurveTo(37, -230, 44, -237); c.stroke();
  c.globalAlpha = 0.45; c.fillStyle = '#ff8a7a';
  c.beginPath(); c.ellipse(54, -244, 8, 4, 0, 0, 6.283); c.fill();
  c.beginPath(); c.ellipse(6, -244, 6, 3.5, 0, 0, 6.283); c.fill();
  c.globalAlpha = 1;
}

/** Xoay quanh điểm (x,y) theo góc a rồi chạy fn */
function around(c, x, y, a, fn, dx = 0, dy = 0) { c.save(); c.translate(x + dx, y + dy); c.rotate(a); c.translate(-x, -y); fn(); c.restore(); }
/** Chuyển về hệ px của V2 (để dùng lại đồ hoạ cũ) */
function px(c, fn) { c.save(); c.scale(1 / S, 1 / S); fn(); c.restore(); }
/** Ánh xạ đầu V2 (tâm (1,-52), r≈11) → đầu mới (tâm (1.5,-67.5), r≈14.5) trong hệ px */
const toHead = (c) => { c.translate(1.5, -67.5); c.scale(1.3, 1.3); c.translate(-1, 52); };
/** Ánh xạ thân V2 (y -42..-18) → thân mới (y -55..-25.5) trong hệ px */
const toTorso = (c) => { c.translate(1.25, -40.25); c.scale(1.22, 1.23); c.translate(0, 30); };

// ---------------- TƯ THẾ ----------------
function pose(L, t, o) {
  const moving = !!o.moving, ph = t * 11, walk = moving ? Math.sin(ph) : 0;
  const skill = o.atk > 0.25, k = o.atk > 0 ? 1 - o.atk / (skill ? 0.3 : 0.25) : -1;
  const P = { walk, k, skill, bob: moving ? Math.abs(Math.sin(ph)) * 8 : Math.sin(t * 2.4) * 3, lean: moving ? 0.05 : 0,
    legB: -walk * 0.32, legF: walk * 0.32, armB: walk * 0.35, armF: -walk * 0.2, wAng: 0.45, push: 0, raiseB: 0, pull: 0, cast: false, spin: null };
  const type = L.weapon.type, ease = (x) => 1 - Math.pow(1 - x, 3);
  if (L.cls === 'knight') {
    if (type === 'spear') { P.wAng = 0.15; if (k >= 0) { const e = Math.sin(k * Math.PI); P.armF = -1.25; P.wAng = Math.PI / 2 + 1.25; P.push = e * 40; P.lean = 0.1 * e; } }
    else if (k >= 0) {
      if (k < 0.3) { const e = k / 0.3; P.armF = -e * 2.5; }
      else { const e = ease((k - 0.3) / 0.7); P.armF = -2.5 + e * 2.3; P.lean = 0.08 * Math.sin(e * Math.PI); }
      if (skill) P.spin = k;
    }
  } else if (L.cls === 'wizard') {
    P.cast = k >= 0; P.wAng = 0.03;
    if (k >= 0) { const e = Math.sin(k * Math.PI); P.armF = -0.7 * e; P.raiseB = -1.6 * e; }
  } else {
    P.armF = 0; P.wAng = 0;
    const e = k >= 0 ? Math.sin(k * Math.PI) : 0;
    P.raiseB = k >= 0 ? (type === 'twinbow' ? -1.2 : -1.25 - e * 0.15) : type === 'twinbow' ? -1.2 : 0; P.pull = e;
  }
  return P;
}

// ---------------- VẼ ----------------
/** @param o { face: 1|-1, moving, atk, fa } — cùng giao diện với drawHero cũ */
export function drawHero(c, cls, eq, t, o) {
  // Lượng tử hoá thời gian / đòn đánh để dùng lại khung hình đã vẽ (cache), mắt người không thấy khác biệt
  const moving = !!o.moving, FR = 8;
  const tq = moving ? ((Math.floor(((t * 11) / 6.2832) * FR) + 0.5) / FR) * (6.2832 / 11) : ((Math.floor(((t * 2.4) / 6.2832) * FR) % FR) + 0.5) / FR * (6.2832 / 2.4);
  const atkQ = o.atk > 0 ? Math.max(0.001, Math.round((o.atk / 0.3) * 12) / 12 * 0.3) : 0;
  const L = resolveLook(cls, eq, o.fa), P = pose(L, tq, { moving, atk: atkQ }), g = G[cls] || G.knight;
  const glT = Math.round(t * 4) / 4;
  // Vũ khí Vương Giả: luôn toả sáng vàng và ánh vàng (hào quang dưới chân vẽ ở phần mặt đất, ngoài cache)
  const W = { ...L.weapon, gl: L.weapon.special ? '#ffcf3a' : glowColor(L.weapon.plus, glT), ...(L.weapon.special ? { col: '#ffd34a' } : {}) }, wtype = W.type, drawW = WEAPONS[wtype];
  const starter = !eq.armor || (eq.armor.tier === 0 && !(eq.armor.line > 0));
  const outfit = L.outfit;
  // Chất liệu theo trang bị
  const M = {
    body: outfit ? L.body : starter ? (cls === 'knight' ? 'leather' : cls === 'wizard' ? 'robe' : 'green') : L.body,
    sleeve: outfit ? L.sleeve : starter ? (cls === 'knight' ? 'leather' : cls === 'wizard' ? 'robe' : 'green') : L.body,
    legs: outfit ? L.legs : eq.pants && !(eq.pants.tier === 0 && !(eq.pants.line > 0)) ? L.legs : 'leather',
    boots: outfit ? L.boots : eq.boots && !(eq.boots.tier === 0 && !(eq.boots.line > 0)) ? L.boots : 'boot',
    hand: eq.gloves && !outfit ? (eq.gloves.tier === 0 && !(eq.gloves.line > 0) ? 'skin' : L.gloves) : 'skin',
    helm: eq.helm ? (isStarter(eq.helm) ? (cls === 'wizard' ? 'robe' : 'leather') : L.helm.color) : null,
    trim: starter ? 'gold' : L.trim,
    helmTrim: eq.helm && !isStarter(eq.helm) ? L.helm.trim : 'gold',
    cape: L.style === 'dragon' || L.style === 'demon' ? '#7a1010' : L.style === 'angel' ? '#f0f0ff' : starter ? 'cape' : mix(L.body, '#8a1418', 0.55),
  };

  // --- Mặt đất (hệ px): hào quang đủ bộ, +9, thời trang
  if (L.weapon.special) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.3 + Math.sin(t * 3.2) * 0.1; c.fillStyle = rgrad(c, 0, 0, 2, 24, '#ffd34a', 'rgba(0,0,0,0)'); c.scale(1, 0.42); pCirc(c, 0, 0, 24); c.fill(); c.restore(); }
  if (L.setGlow) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.28 + Math.sin(t * 2.5) * 0.08; c.fillStyle = rgrad(c, 0, 0, 2, 26, L.setGlow, 'rgba(0,0,0,0)'); c.scale(1, 0.42); pCirc(c, 0, 0, 26); c.fill(); c.restore(); }
  if (L.minPlus >= 9) {
    const ac = glowColor(L.minPlus, t) || '#ffd700';
    c.save(); c.globalAlpha = 0.35 + Math.sin(t * 3) * 0.1; c.fillStyle = rgrad(c, 0, 0, 2, 30, ac, 'rgba(0,0,0,0)'); c.scale(1, 0.45); pCirc(c, 0, 0, 30); c.fill(); c.restore();
    for (let i = 0; i < 5; i++) { const q = (t * 0.6 + hash(i)) % 1; sparkle(c, (hash(i + 9) - 0.5) * 32, -q * 76, 2, ac, 1 - q); }
  }
  if (L.aura) { c.save(); c.scale(1.15, 1.15); auraLayer(c, L.aura, t, false); c.restore(); }
  // 00 shadow
  groundShadow(c, 16, 4.5, 0.45);

  c.save(); c.scale(o.face, 1);
  if (P.spin != null) c.scale(Math.cos(P.spin * Math.PI * 2) >= 0 ? 1 : -1, 1);
  const key = cls + '|' + sig(eq) + '|' + (o.fa ? (o.fa.outfit || '') + (o.fa.head || '') : '') + '|' + (moving ? 'w' : 'i') + tq.toFixed(3) + '|' + atkQ.toFixed(3) + '|' + (W.gl || '');
  cachedBody(c, key, (c) => {
    c.rotate(P.lean); c.scale(S, S); c.translate(0, -P.bob);

  // 01 wings
  if (L.wings) px(c, () => { c.save(); c.translate(-1, -10); c.scale(1.15, 1.15); drawWings(c, L.wings, tq); c.restore(); });

  // 02 cape_back (áo choàng / vạt áo sau / ống tên)
  const sway = Math.sin(tq * 4) * 0.05 + P.walk * 0.06;
  if (cls === 'knight' && !outfit) around(c, -10, -210, -sway, () => part(c, g.cape, M.cape));
  if (cls === 'wizard') around(c, -20, -205, -sway * 0.6, () => part(c, g.cape, M.body));
  if (cls === 'archer' && wtype !== 'crossbow') { for (const f of g.fletch) part(c, f, M.cape === 'cape' ? 'cape' : M.cape, 0.3); part(c, g.quiver, 'leather'); }
  const hidesHair = L.head && HEADWEAR_HIDES_HAIR[L.head.style];
  if (cls === 'archer' && !hidesHair) around(c, -48, -266, Math.sin(tq * 2.2) * 0.08 + P.walk * 0.1, () => part(c, g.tail, 'hair', 0.6));
  if (cls === 'wizard' && !hidesHair) part(c, g.hairBack, 'hair', 0.5);
  if (!outfit && L.style !== 'leather') px(c, () => { c.save(); c.translate(-10, -52); c.scale(1.2, 1.2); pauldron(c, L.style, L.body, L.trim, 0, 0, false); c.restore(); });

  // 03 arm_back
  const [sbx, sby] = g.shB, [hbx, hby] = g.handB;
  const backHeld = cls === 'archer' && wtype === 'twinbow';
  around(c, sbx, sby, P.armB + P.raiseB, () => {
    part(c, cap(sbx, sby, hbx, hby, g.armR), M.sleeve);
    if (backHeld) { c.save(); c.translate(hbx, hby + 10); c.rotate(-(P.armB + P.raiseB)); px(c, () => drawW(c, W, tq, 0)); c.restore(); }
    part(c, circ(hbx - 2, hby + 12, g.armR - 2), M.hand, 0.5);
  }, cls === 'archer' && P.pull ? -P.pull * 18 : 0, 0);

  // 04 legs
  if (cls === 'wizard') { part(c, g.shoeB, M.boots, 0.4); part(c, g.shoeF, M.boots, 0.4); }
  else {
    around(c, g.hipB[0], g.hipB[1], P.legB, () => { part(c, cap(g.hipB[0], g.hipB[1], g.kneeB[0], g.kneeB[1], g.legR), M.legs); part(c, g.bootB, M.boots, 0.6); });
    around(c, g.hipF[0], g.hipF[1], P.legF, () => { part(c, cap(g.hipF[0], g.hipF[1], g.kneeF[0], g.kneeF[1], g.legR + (cls === 'knight' ? 1 : 0)), M.legs); part(c, g.bootF, M.boots, 0.6); });
  }

  // 05 body
  if (cls === 'knight') { part(c, g.body, M.body); part(c, g.belt, 'boot', 0.4); part(c, g.buckle, M.trim, 0.4); if (!outfit) part(c, g.shoulder, M.body, 0.6); }
  else if (cls === 'wizard') { part(c, g.body, M.body); part(c, g.sash, M.trim, 0.4); part(c, g.stripe, M.trim, 0.3); }
  else { part(c, g.body, M.body); part(c, g.belt, 'leather', 0.4); }
  if (outfit) px(c, () => { c.save(); toTorso(c); outfitSkirt(c, outfit, tq, P.walk); outfitBody(c, outfit, cls, tq, P.walk); c.restore(); });
  else if (L.style !== 'leather' && L.style !== 'cloth') px(c, () => { c.save(); toTorso(c); chestEmblem(c, L.style, L.trim, 2, -32); c.restore(); });

  // vai giáp trước thuộc lớp thân (vẽ trước đầu để không che mặt)
  if (!outfit && L.style !== 'leather') px(c, () => { c.save(); c.translate(13, -50); c.scale(1.25, 1.25); pauldron(c, L.style, L.body, L.trim, 0, 0, true); c.restore(); });

  // 06 head · 07 hair · 08 helmet
  part(c, HEAD, 'skin'); face(c);
  const hooded = !L.head && outfit && (outfit.style === 'cloak' || outfit.style === 'ninja');
  if (!hidesHair && !hooded) {
    part(c, BANGS, 'hair');
    if (cls === 'knight') part(c, g.hairBack, 'hair', 0.5);
  }
  if (L.head) px(c, () => { c.save(); toHead(c); c.translate(1, -58); headwear(c, L.head, tq); c.restore(); });
  else if (hooded) px(c, () => { c.save(); toHead(c); hoodV2(c, outfit); c.restore(); });
  else if (M.helm && (!outfit || outfit.style === 'royal')) {
    if (cls === 'knight') { part(c, g.helmet, M.helm); part(c, g.band, M.helmTrim, 0.4); px(c, () => { c.save(); c.translate(1.5, -84); c.scale(1.2, 1.2); crest(c, L.helm.style, L.helm.color, L.helm.trim); c.restore(); }); }
    else if (cls === 'wizard') { part(c, g.hat, M.helm); part(c, g.brim, M.helm, 0.6); part(c, g.band, M.helmTrim, 0.3); if (L.helm.style !== 'leather' && L.helm.style !== 'cloth') px(c, () => { c.save(); c.translate(1.5, -76); c.scale(0.8, 0.8); crest(c, L.helm.style, L.helm.color, L.helm.trim); c.restore(); }); }
    else { part(c, g.band, M.helmTrim, 0.4); if (L.helm.style !== 'leather' && L.helm.style !== 'cloth') px(c, () => { c.save(); c.translate(1.5, -80); crest(c, L.helm.style, L.helm.color, L.helm.trim); c.restore(); }); }
  }


  // 09 arm_front · 10 weapon
  const [sfx, sfy] = g.shF, [hfx, hfy] = g.handF;
  around(c, sfx, sfy, P.armF, () => {
    part(c, cap(sfx, sfy, hfx, hfy, g.armR + 1), M.sleeve);
    part(c, circ(hfx + 2, hfy + 8, g.armR - 1), M.hand, 0.5);
    // vũ khí gắn ở bàn tay (góc tương đối với cánh tay)
    c.save(); c.translate(hfx + 2, hfy + 6);
    c.rotate(P.wAng);
    if (cls === 'wizard' && wtype === 'staff') staff(c, W, tq, P.cast);
    else if (cls === 'archer' && wtype === 'bow') bow(c, W, tq, P.pull);
    else px(c, () => drawW(c, W, tq, cls === 'archer' ? P.pull * 7 : P.cast));
    c.restore();
  }, P.push, 0);

  });
  c.restore();
  if (cls === 'knight' && MELEE[wtype] && P.k >= 0) swoosh(c, P.k, W.gl, o.face);
  // 11 aura (lớp trước)
  if (L.aura) { c.save(); c.scale(1.15, 1.15); auraLayer(c, L.aura, t, true); c.restore(); }
}

// ---------------- CACHE KHUNG HÌNH ----------------
// Thân nhân vật (trừ hiệu ứng mặt đất & hào quang) được vẽ 1 lần ra canvas phụ theo (ngoại hình, khung hoạt ảnh, độ phóng).
const CACHE = new Map(), CACHE_MAX = 360, BOX = { x: -78, y: -132, w: 170, h: 152 };
const sig = (eq) => { let s = ''; for (const k in eq) { const it = eq[k]; if (it) s += k[0] + k[1] + it.tier + '.' + (it.plus || 0) + '.' + (it.wt || it.line || 0); } return s; };
function cachedBody(c, key, draw) {
  const m = c.getTransform(), sc = Math.hypot(m.a, m.b);
  if (!(sc > 0.2) || sc > 9 || typeof document === 'undefined') { draw(c); return; }
  const q = Math.max(0.5, Math.round(sc * 4) / 4), k = key + '@' + q;
  let cv = CACHE.get(k);
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = Math.ceil(BOX.w * q); cv.height = Math.ceil(BOX.h * q);
    const g = cv.getContext('2d'); g.scale(q, q); g.translate(-BOX.x, -BOX.y); draw(g);
    if (CACHE.size >= CACHE_MAX) CACHE.delete(CACHE.keys().next().value);
    CACHE.set(k, cv);
  } else { CACHE.delete(k); CACHE.set(k, cv); }
  c.drawImage(cv, BOX.x, BOX.y, BOX.w, BOX.h);
}

/** Trượng phép dài theo style guide, ngọc đổi màu theo bậc */
function staff(c, W, t, cast) {
  // gốc toạ độ = bàn tay; trục trượng dọc theo -y
  const tint = tone(W.tier >= 3 ? mix(W.col, '#f0ecf8', 0.4) : '#8b6b47'), shaft = cap(-4, 140, 4, -144, 6);
  part(c, shaft, tint.b, 0.3);
  part(c, 'M -14 -144 Q -18 -164 -8 -178 Q -10 -160 -2 -148 Z', W.tier >= 4 ? 'gold' : W.col, 0.3);
  part(c, 'M 14 -144 Q 18 -164 8 -178 Q 10 -160 2 -148 Z', W.tier >= 4 ? 'gold' : W.col, 0.3);
  const oc = ORB[W.tier] || '#a58bff';
  c.save(); if (W.gl || cast) { c.shadowColor = W.gl || oc; c.shadowBlur = cast ? 60 : 36; }
  part(c, circ(0, -160, 18 + (cast ? 3 : 0)), oc, 0.6); c.restore();
  c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5 + Math.sin(t * 5) * 0.2; c.fillStyle = rgrad(c, 0, -160, 2, 40, oc, 'rgba(0,0,0,0)'); c.beginPath(); c.arc(0, -160, 40, 0, 6.283); c.fill(); c.restore();
}

/** Cung dài theo style guide; dây kéo về khi bắn */
function bow(c, W, t, pull) {
  // gốc = bàn tay (giữa thân cung)
  c.save(); c.translate(-18, 0);
  const d = 'M 4 -128 Q 68 6 4 140 L -2 134 Q 50 6 -2 -122 Z';
  c.save(); if (W.gl) { c.shadowColor = W.gl; c.shadowBlur = 30; }
  part(c, d, W.tier >= 3 ? W.col : 'leather', 0.3); c.restore();
  const sx = -2 - pull * 34;
  c.strokeStyle = '#e8dcc0'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, -124); c.lineTo(sx, 4); c.lineTo(0, 136); c.stroke();
  if (pull > 0.1) { c.strokeStyle = '#7a5030'; c.lineWidth = 5; c.beginPath(); c.moveTo(sx, 4); c.lineTo(sx + 110, 4); c.stroke(); c.fillStyle = '#dde'; c.beginPath(); c.moveTo(sx + 110, -6); c.lineTo(sx + 130, 4); c.lineTo(sx + 110, 14); c.fill(); }
  c.restore();
}

/** Mũ trùm của trang phục (cloak / ninja) — tái dùng hình V2 ở hệ đầu */
function hoodV2(c, f) {
  const A = tone(f.colors[0]);
  c.lineWidth = 1.5; c.strokeStyle = A.o;
  if (f.style === 'cloak') { c.beginPath(); c.arc(1, -53, 13.2, Math.PI * 0.8, Math.PI * 1.95); c.quadraticCurveTo(15, -45, 10, -42); c.quadraticCurveTo(7, -57, -1, -58); c.quadraticCurveTo(-9, -52, -7, -41); c.quadraticCurveTo(-14, -44, -13, -50); c.closePath(); c.fillStyle = A.b; c.fill(); c.stroke(); }
  else { c.beginPath(); c.arc(1, -54, 12, Math.PI, 0); c.closePath(); c.fillStyle = A.d; c.fill(); c.stroke(); c.beginPath(); c.roundRect(-1, -50, 14, 7, 3); c.fillStyle = A.b; c.fill(); c.stroke(); c.fillStyle = f.colors[1]; c.fillRect(-11, -58, 24, 3); }
}

/** Vệt chém sáng khi vung vũ khí cận chiến (hệ px) */
function swoosh(c, k, col, face) {
  if (k < 0.3 || k > 0.95) return;
  const e = (k - 0.3) / 0.65;
  c.save(); c.scale(face, 1); c.globalCompositeOperation = 'lighter'; c.globalAlpha = (1 - e) * 0.85;
  c.translate(10, -50);
  const a0 = -2.6 + e * 0.6, a1 = -2.6 + e * 3.4;
  c.beginPath(); c.arc(0, 0, 40, a0, a1); c.arc(0, 0, 30, a1, a0, true); c.closePath();
  c.fillStyle = col || 'rgba(220,240,255,.9)'; c.fill();
  c.restore();
}

/** Chiều cao để đặt tên / hào quang bậc (px) */
export const HERO_HEIGHT = 100;
