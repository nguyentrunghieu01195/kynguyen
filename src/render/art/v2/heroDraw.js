// Cầu nối giữa chibi.js (renderer nhân vật) và giao diện drawHero(c, cls, eq, t, o) của game.
// Dựng sẵn từng khung vào canvas nháp (cache) rồi chỉ drawImage; các phần nhấp nháy theo thời gian (hào quang, ánh sáng nền) vẽ ngoài cache.
import { DIVINE } from '../../../config/divine.js';
import { drawChibi } from './chibi.js';
import { resolveLook } from './hero.js';
import { drawWings, outfitBody, outfitSkirt, headwear, HEADWEAR_HIDES_HAIR, auraLayer } from './gear.js';
import { ARMOR_SETS } from '../../../config/gear.js';
import { glowColor } from '../../paint.js';
import { gfx3d } from '../v3d/flag.js';
import { ring as ring3, gem as gem3 } from '../v3d/fx3d.js';
import { frame as frame3d, FRAME as F3, tint3d } from '../v3d/hero3d.js';

export const HERO_HEIGHT = 100;
const SC = 0.3, RES = 2, W = 150, H = 150, OX = 60, OY = 130; // 1 đơn vị phác = 0.3px game; canvas nháp RES× cho nét
const cache = new Map();
const latest = new Map();           // khung gần nhất đã dựng cho cùng một bộ trang bị / tư thế (dự phòng khi hết ngân sách dựng)
let pending = false, builds = 0;          // mỗi khung hình chỉ dựng tối đa 2 khung mới (~12ms/khung) để đông người không bị giật

/** Bậc giáp trong game (0..5+) → 3 bộ mẫu: 0 Bộ Da / vải, 2 Bộ Xương, 5 Bộ Thiên Thần */
const tierOf = (eq) => { const t = eq && eq.armor ? eq.armor.tier || 0 : 0; return t <= 1 ? 0 : t <= 4 ? 2 : 5; };
const fashionKey = (eq, fa) => [eq.wings ? eq.wings.tier + ':' + (eq.wings.plus >= 7 ? 1 : 0) : '', fa ? (fa.outfit || '') + '/' + (fa.head || '') : ''].join('|');

/** Bộ giáp cụ thể của game → thông số đổi màu / điểm nhấn. Ba bộ mẫu tự vẽ tay (Da, Xương, Thiên Thần dòng 0) giữ nguyên chất liệu. */
const METAL = { bronze: 1, ice: 1, dragon: 1, magma: 1, angel: 1, demon: 1 };
/** Phụ kiện 3D: kiểu giáp theo bộ (ARMOR_SETS) + trang phục / đồ đầu thời trang */
function gearSpec(eq, tier, L) {
  const a = eq && eq.armor, row = ARMOR_SETS[tier] || ARMOR_SETS[0], ar = row[(a && a.line) || 0] || row[0];
  const gc = DIVINE.slots.filter((sl) => eq && eq[sl] && eq[sl].god > 0).length, divine = (a && a.god > 0) || gc >= 3;
  return { style: divine ? 'divine' : ar.style, tier, e: divine ? '#fff0b0' : ar.color, d: divine ? '#ff7aff' : ar.trim, outfit: L.outfit ? { style: L.outfit.s3 || L.outfit.style, colors: L.outfit.colors } : null, head: L.head ? { style: L.head.s3 || L.head.style, colors: L.head.colors } : L.cls === 'lord' ? { style: 'crown', colors: ['#7a30c8', '#ff50e0'] } : null }; // Chúa Tể luôn đội vương miện tím
}
/** Bản vẽ 2D dự phòng của class mới dùng lại khung nhân vật có sẵn (3D mới là bản chính) */
const CHIBI_OF = { lord: 'wizard', gladiator: 'knight' };
const CHIBI_WT = { greatsword: 'sword', dagger: 'sword', twinblade: 'sword', wand: 'staff', crystal: 'staff', scepter: 'staff', warhammer: 'staff', longbow: 'bow', repeater: 'crossbow' };
const chibiWt = (cls, t) => (cls === 'lord' && !['staff', 'orb', 'tome'].includes(CHIBI_WT[t] || t) ? 'staff' : CHIBI_WT[t] || t);
function setOf(eq) {
  const a = eq && eq.armor; if (!a) return null;
  const line = a.line || 0, ar = ARMOR_SETS[a.tier] && (ARMOR_SETS[a.tier][line] || ARMOR_SETS[a.tier][0]); if (!ar) return null;
  if (line === 0 && (a.tier === 0 || a.tier === 2 || a.tier === 5)) return null;
  return { id: ar.id, e: ar.color, d: ar.trim, style: ar.style, kind: METAL[ar.style] ? 'metal' : ar.style === 'bone' || ar.style === 'shadow' ? 'bone' : 'matte' };
}

/** Cấp cộng → mức hiển thị: 0 thường · 1 bóng (+3) · 2 viền vàng (+5) · 3 sáng xanh (+7) · 4 vàng (+9) · 5 đỏ (+11) · 6 cầu vồng (+13) · 7 tối đa (+15) */
const lvOf = (p) => (p >= 15 ? 7 : p >= 13 ? 6 : p >= 11 ? 5 : p >= 9 ? 4 : p >= 7 ? 3 : p >= 5 ? 2 : p >= 3 ? 1 : 0);
const plusOf = (it, t) => { const p = it ? it.plus || 0 : 0; return { lv: lvOf(p), col: glowColor(p, t) || (p >= 5 ? '#ffd34a' : null) }; };
/** Dùng cho trang xem nhân vật: cùng cấp cộng cho mọi món */
export const plusAll = (p, t) => { const g = plusOf({ plus: p }, Math.round(t * 4) / 4); return { armor: g, helm: g, gloves: g, boots: g, pants: g, weapon: g }; };
const plKey = (pl) => Object.values(pl).map((g) => g.lv + (g.lv >= 3 ? g.col : '')).join(',');

/** Ánh sáng nền (bộ trang bị đủ, +9, vũ khí đặc biệt) */
function groundGlows(c, L, t) {
  const disc = (col, r, a) => { if (gfx3d()) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, a * 1.8); const ok = ring3(c, r * 1.15, col, 0.04); c.globalAlpha = Math.min(1, a * 0.9); ring3(c, r * 0.7, col, 0.035); c.restore(); if (ok) return; } c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = a; c.scale(1, 0.42); const g = c.createRadialGradient(0, 0, 2, 0, 0, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, 6.283); c.fill(); c.restore(); };
  if (L.weapon.special) disc('#ffd34a', 24, 0.3 + Math.sin(t * 3.2) * 0.1);
  if (L.setGlow) disc(L.setGlow, 26, 0.28 + Math.sin(t * 2.5) * 0.08);
  if (L.minPlus >= 9) disc(glowColor(L.minPlus, t) || '#ffd700', 30 + (L.minPlus >= 13 ? 6 : 0), 0.35 + Math.sin(t * 3) * 0.1 + (L.minPlus >= 11 ? 0.12 : 0));
  if (L.minPlus >= 15 && gfx3d()) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.85; const gc = glowColor(15, t); for (let i = 0; i < 12; i++) { const a = i * 0.5236 + t * 0.6, r = 31; gem3(c, Math.cos(a) * r * 1.15, Math.sin(a) * r * 0.5, 7, gc, a); } c.restore(); }
  else if (L.minPlus >= 15) { c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = glowColor(15, t); c.globalAlpha = 0.5; c.lineWidth = 1.6; c.scale(1, 0.42); for (let i = 0; i < 12; i++) { const a = i * 0.5236 + t * 0.6; c.beginPath(); c.moveTo(Math.cos(a) * 22, Math.sin(a) * 22); c.lineTo(Math.cos(a) * 40, Math.sin(a) * 40); c.stroke(); } c.restore(); }
}
/** Hạt sáng bay quanh người khi cả bộ cộng cao (+9 trở lên) — vẽ ngoài cache để chuyển động mượt */
function sparks(c, L, t) {
  const n = L.minPlus >= 15 ? 11 : L.minPlus >= 13 ? 8 : L.minPlus >= 11 ? 6 : L.minPlus >= 9 ? 4 : 0; if (!n) return;
  const col = glowColor(L.minPlus, t) || '#ffd700';
  c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = col;
  for (let i = 0; i < n; i++) { const q = (t * 0.55 + i / n) % 1, x = Math.sin(i * 2.4 + t) * 22, y = -4 - q * 78, r = 1.3 + (1 - q) * 1.4; c.globalAlpha = (1 - q) * 0.9; if (gem3(c, x, y, r * 4.4, col, t * 2 + i)) continue; c.beginPath(); c.moveTo(x, y - r * 2); c.lineTo(x + r, y); c.lineTo(x, y + r * 2); c.lineTo(x - r, y); c.closePath(); c.fill(); }
  c.restore();
}

/** @param o { face: 1|-1, moving, atk, dead, hurt, gd, fa } */
export function drawHero(c, cls, eq, t, o) {
  const L = resolveLook(cls, eq, o.fa), fa = o.fa || null;
  const dead = !!o.dead, hurt = !dead && !!o.hurt, moving = !!o.moving && !dead;
  let pose = 'idle', k, tq;
  if (dead) { pose = 'death'; k = 1; tq = 0; }
  else if (hurt) { pose = 'hit'; tq = 0; }
  else if (o.atk > 0) { const skill = o.atk > 0.25; pose = skill ? 'skill' : 'attack'; k = Math.round((1 - o.atk / (skill ? 0.3 : 0.25)) * 16) / 16; tq = 0; }
  else if (moving) { pose = 'walk'; tq = Math.floor(((t * 9.5) / 6.2832) * 12) / 12 * (6.2832 / 9.5); }
  else { pose = 'idle'; tq = Math.floor((t * 2.4 / 6.2832) * 8) / 8 * (6.2832 / 2.4); }
  const tier = tierOf(eq), gender = o.gd === 'f' ? 'f' : 'm';
  const wingT = Math.floor(t * 3 / 6.2832 * 12) / 12 * (6.2832 / 3);            // cánh vỗ mượt hơn thân
  const t4 = Math.round(t * 4) / 4; // màu cầu vồng đổi theo bước 0.25s để cache không bị tràn
  const pl = { armor: plusOf(eq.armor, t4), helm: plusOf(eq.helm, t4), gloves: plusOf(eq.gloves, t4), boots: plusOf(eq.boots, t4), pants: plusOf(eq.pants, t4), weapon: plusOf(eq.weapon, t4) };
  const set = setOf(eq);
  const wglow = eq.weapon && eq.weapon.god > 0 ? '#ff7aff' : L.weapon.special ? '#ffcf3a' : glowColor(L.weapon.plus, Math.round(t * 4) / 4) || null;
  const key = cls + L.weapon.type + (L.weapon.special ? 'S' : '') + (wglow || '') + plKey(pl) + (set ? set.id : '') + tier + gender + pose + (k == null ? '' : k) + tq.toFixed(3) + '|' + fashionKey(eq, fa) + (L.wings ? wingT.toFixed(2) : '');

  groundGlows(c, L, t);
  if (L.aura) { c.save(); c.scale(1.15, 1.15); auraLayer(c, L.aura, t, false); c.restore(); }
  if (gfx3d()) {
    const tierTint = ['#c8c8d0', '#b9a98a', '#8fb4d8', '#d8c070', '#c070e0', '#ff9a50', '#70e0ff'][tier] || '#ffffff';
    const gs = gearSpec(eq, tier, L), accent = { lord: '#7a30c0', gladiator: '#c84030' }[cls], f3 = frame3d({ cls, pose, f: pose === 'walk' || pose === 'idle' ? (tq / (pose === 'walk' ? 0.6618 : 2.618)) % 1 : (k == null ? 0 : k), weapon: L.weapon.type, tint: tint3d(L.outfit ? L.outfit.colors[0] : gs.e, 0.65), capeTint: tint3d(L.outfit ? L.outfit.colors[1] : accent || gs.d, 0.8), helm: !!eq.helm && !L.head && cls !== 'lord', gear: gs, wing: L.wings ? { tier: L.wings.tier, ph: Math.floor(t * 3 / 6.2832 * 6) % 6, glow: L.wings.plus >= 7 } : null, shield: cls === 'knight' && (tier >= 2) ? 'Knight_Shield' : '' });
    if (f3) {
      c.save(); c.scale(o.face || 1, 1); const hh = 78, ww = hh * F3.w / F3.h; c.drawImage(f3, -ww / 2, -hh * 0.86, ww, hh); c.restore();
      sparks(c, L, t);
      if (L.aura) { c.save(); c.scale(1.15, 1.15); auraLayer(c, L.aura, t, true); c.restore(); }
      return;
    }
  }
  let cv = cache.get(key);
  const base = key.replace(/-?\d+\.\d+/g, '');
  if (!cv) {
    if (!pending) { pending = true; requestAnimationFrame(() => { builds = 0; pending = false; }); } // ngân sách dựng tính theo từng khung hình
    if (builds >= 2 && latest.has(base)) cv = latest.get(base);
    else if (builds >= 2) cv = null;
  }
  if (!cv && builds >= 2) { /* chưa có khung nào: bỏ qua lượt này, khung sau sẽ dựng */ }
  else if (!cv) {
    builds++;
    if (cache.size > 150) cache.clear();
    cv = document.createElement('canvas'); cv.width = W * RES; cv.height = H * RES;
    const g = cv.getContext('2d');
    const toPx = () => { g.setTransform(RES, 0, 0, RES, OX * RES, OY * RES); };           // hệ px game, gốc = giữa hai bàn chân
    const inject = {};
    if (L.wings) inject.pre = () => { g.save(); toPx(); g.translate(-1, -10); g.scale(1.15, 1.15); drawWings(g, L.wings, wingT, cls); g.restore(); };
    if (L.outfit) inject.armor_chest = (_c, B) => {
      const [tx, ty] = B.TR(4, -44); g.save(); toPx(); g.translate(tx * SC, ty * SC); g.rotate(B.P.lean); g.scale(1.22, 1.23); g.translate(0, 30);
      outfitSkirt(g, L.outfit, tq, 0); outfitBody(g, L.outfit, cls, tq, 0); g.restore();
    };
    if (L.head) inject.helmet = (_c, B) => { const [hx, hy] = B.joints.head; g.save(); toPx(); g.translate(hx * SC, hy * SC); g.rotate(B.P.lean + B.P.tilt); g.scale(1.56, 1.56); g.translate(0, -6); headwear(g, L.head, tq); g.restore(); };
    g.scale(RES, RES); g.translate(OX, OY); g.scale(SC, SC);
    drawChibi(g, { pl, set, cls: CHIBI_OF[cls] || cls, wtype: chibiWt(cls, L.weapon.type), special: !!L.weapon.special, wglow, tier, gender, pose, t: tq, k, crown: !!L.head, inject,
      hide: { chest: !!L.outfit, helmet: !!L.head, hair: !!(L.head && HEADWEAR_HIDES_HAIR[L.head.style]) } });
    cache.set(key, cv);
  }
  if (cv) latest.set(base, cv);
  if (cv) {
  c.save(); c.scale(o.face || 1, 1);
  c.drawImage(cv, -OX, -OY, W, H);
  c.restore();
  }
  sparks(c, L, t);
  if (L.aura) { c.save(); c.scale(1.15, 1.15); auraLayer(c, L.aura, t, true); c.restore(); }
}
