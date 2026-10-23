// Trang Design Sheet — dùng chính code vẽ của game để trình bày bộ đồ hoạ V2.
import './design.css';
import { G } from '../core/state.js';
import { createCharacter } from '../systems/character.js';
import { generateMap } from '../systems/world.js';
import { itemFull, itemRarity, makeItem } from '../systems/items.js';
import { MAPS } from '../config/maps.js';
import { CLASSES } from '../config/classes.js';
import { SETS, WINGS, JEWELS, RARITY_COLORS, ARMOR_SLOTS, SLOT_NAMES, WEAPON_NAMES, PIECE_PREFIX } from '../config/items.js';
import { CFG } from '../config/constants.js';
import { iso } from '../render/iso.js';
import { emit, EV } from '../core/events.js';
import { initParticles, drawParticles } from '../render/particles.js';
import v2 from '../render/art/v2/index.js';
import classic from '../render/art/classic/index.js';
import { iconURL, iconCanvas } from '../render/art/v2/items.js';
import { SKILL_LIST, CLASS_TIERS } from '../config/skills.js';
import { TRIM } from '../render/art/v2/hero.js';
import { WEAPON_TYPES, ARMOR_SETS, BONUS_NAMES } from '../config/gear.js';
import { FASHION, FASHION_SLOTS } from '../config/fashion.js';

G.S = createCharacter('knight', 'Demo');

// ---------------- hạ tầng canvas sống ----------------
const live = [];
const io = new IntersectionObserver((es) => es.forEach((e) => (e.target._e.vis = e.isIntersecting)), { rootMargin: '200px' });
function canvas(w, h, draw, bg) {
  const cv = document.createElement('canvas'), dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = w * dpr; cv.height = h * dpr; cv.style.width = w + 'px'; cv.className = 'art';
  const e = { cv, c: cv.getContext('2d'), w, h, dpr, draw, bg, vis: false };
  cv._e = e; live.push(e); io.observe(cv);
  return cv;
}
function frame() {
  const t = performance.now() / 1000;
  for (const e of live) {
    if (!e.vis && e.drawn) continue;
    e.drawn = true;
    const { c, dpr, w, h } = e;
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    if (e.bg) { c.fillStyle = e.bg; c.fillRect(0, 0, w, h); }
    c.save(); try { e.draw(c, t, w, h); } catch (er) { if (!e.err) console.error('Design Sheet: lỗi khi vẽ', er); e.err = true; } c.restore(); // một khung lỗi không làm chết cả trang
  }
  requestAnimationFrame(frame);
}

const app = document.getElementById('app'), toc = document.getElementById('toc');
function section(id, title, sub) {
  const s = document.createElement('section'); s.id = id;
  s.innerHTML = '<h2>' + title + (sub ? ' <small>' + sub + '</small>' : '') + '</h2>';
  app.appendChild(s);
  toc.insertAdjacentHTML('beforeend', '<a href="#' + id + '">' + title + '</a>');
  return s;
}
function card(parent, code, title, note) {
  const d = document.createElement('div'); d.className = 'card';
  d.innerHTML = '<h3><span class="code">' + code + '</span>' + title + '</h3>' + (note ? '<p class="note">' + note + '</p>' : '');
  parent.appendChild(d);
  return d;
}
const add = (parent, html) => { const d = document.createElement('div'); d.innerHTML = html; while (d.firstChild) parent.appendChild(d.firstChild); return parent.lastChild; };
const gridOf = (parent, cls) => add(parent, '<div class="grid ' + cls + '"></div>');
function tile(parent, label, sub, cv) { const d = add(parent, '<div class="tile"></div>'); d.appendChild(cv); d.insertAdjacentHTML('beforeend', '<b>' + label + '</b>' + (sub || '')); return d; }

// ---------------- dữ liệu mẫu ----------------
function equipSet(cls, tier, plus = 0, wings = 0, wingPlus = 0) {
  const eq = { weapon: { slot: 'weapon', tier, plus, cls } };
  for (const s of ARMOR_SLOTS) eq[s] = { slot: s, tier, plus };
  if (wings) eq.wings = { slot: 'wings', tier: wings, plus: wingPlus };
  return eq;
}
function mob(tpl, o = {}) {
  return { tpl, name: tpl.name, shape: tpl.shape, c1: tpl.c1, c2: tpl.c2, size: (tpl.size || 1) * (o.boss ? 2 : 1), boss: !!o.boss, lv: 1,
    x: o.x || 0, y: o.y || 0, face: o.face || 1, flash: 0, moving: !!o.moving, lunge: 0, hp: 1, maxHp: 1 };
}
/** Hoạt ảnh chu kỳ: thỉnh thoảng quái lao tới & nháy trắng */
function animateMob(m, t, seed) { const k = (t * 0.7 + seed) % 2.4; m.lunge = k < 0.2 ? 0.2 - k : 0; m.flash = k > 1.2 && k < 1.32 ? 0.1 : 0; }

function groundPatch(c, theme, cx, cy, n, scale = 1) {
  c.save(); c.translate(cx, cy); c.scale(scale, scale);
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
    if (Math.abs(i) + Math.abs(j) > n + 1) continue;
    const p0 = iso(i, j), p1 = iso(i + 1, j), p2 = iso(i + 1, j + 1), p3 = iso(i, j + 1);
    c.beginPath(); c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y); c.lineTo(p2.x, p2.y); c.lineTo(p3.x, p3.y); c.closePath();
    c.fillStyle = (i * 7 + j * 3) % 3 === 0 ? theme.g2 : theme.g; c.fill(); c.strokeStyle = 'rgba(0,0,0,.08)'; c.stroke();
  }
  c.restore();
}

// Nền bản đồ thật (cache)
const grounds = {};
function mapGround(mi, town) {
  const gk = mi + (town ? 't' : '');
  if (grounds[gk]) return grounds[gk];
  // Bản đồ rộng: chỉ vẽ vùng 28×28 ô quanh bãi quái thứ 3 (nơi dựng cảnh)
  const map = generateMap(mi), C = town ? map.town : map.centers[2] || map.centers[0], N = 14, i0 = Math.floor(C.x) - N, j0 = Math.floor(C.y) - N, i1 = i0 + 2 * N, j1 = j0 + 2 * N;
  const off = document.createElement('canvas'); off.width = 4 * N * 32 + 64; off.height = 4 * N * 16 + 64;
  const x0 = (i0 - j1) * 32 - 32, y0 = (i0 + j0) * 16 - 32, g = off.getContext('2d'); g.translate(-x0, -y0);
  v2.paintMap(g, map, MAPS[mi], { i0, j0, i1, j1 });
  return (grounds[gk] = { off, OX: -x0, OY: -y0, map });
}
function diorama(mi, w, h, zoom, focusFn, town) {
  const M = MAPS[mi];
  let state = null;
  return canvas(w, h, (c, t) => {
    const Gd = mapGround(mi, town);
    if (!state) {
      const C = Gd.map.centers[2] || Gd.map.centers[0];
      const f = focusFn ? focusFn(Gd.map) : { x: C.x - 1.2, y: C.y - 1.2 };
      const mobs = [];
      for (let k = 0; k < 4; k++) mobs.push(mob(M.mobs[k % 3], { x: C.x + Math.cos(k * 1.7) * 1.8, y: C.y + Math.sin(k * 1.7) * 1.8, face: k % 2 ? 1 : -1 }));
      state = { f, mobs, decos: Gd.map.decos.filter((d) => Math.hypot(d.x - f.x, d.y - f.y) < 9) };
    }
    const cam = iso(state.f.x, state.f.y);
    c.translate(w / 2, h / 2 + 20); c.scale(zoom, zoom); c.translate(-cam.x, -cam.y);
    c.drawImage(Gd.off, -Gd.OX, -Gd.OY);
    const list = [...state.decos.map((d) => ({ z: d.x + d.y, f: () => v2.drawDeco(c, d, t) })),
      ...state.mobs.map((m, i) => ({ z: m.x + m.y, f: () => { animateMob(m, t, i * 0.6); v2.drawMob(c, m, t); } })),
      { z: state.f.x + state.f.y, f: () => { const s = iso(state.f.x, state.f.y); c.save(); c.translate(s.x, s.y); v2.drawHero(c, ['knight', 'wizard', 'archer'][mi % 3], equipSet(['knight', 'wizard', 'archer'][mi % 3], Math.min(5, mi), mi * 2 + 1, mi >= 3 ? Math.min(3, mi - 2) : 0), t, { face: 1, moving: false, atk: 0 }); c.restore(); } }];
    list.sort((a, b) => a.z - b.z).forEach((o) => o.f());
  }, M.theme.bg);
}

// ======================= A. ĐỊNH HƯỚNG =======================
{
  const s = section('a', 'A. Định hướng', 'Art direction');
  const c1 = card(s, 'A1', 'Phong cách “Chibi Dark Fantasy”');
  add(c1, '<ul class="dir">' +
    '<li><b>Tỉ lệ chibi</b>: đầu to (~1/3 chiều cao), mắt to có điểm sáng — dễ thương nhưng vẫn ngầu khi mặc giáp bậc cao.</li>' +
    '<li><b>Viền màu tối</b> 1.5px theo màu gốc (không dùng đen thuần) → hình rõ trên nền sáng lẫn tối, nhìn tốt trên điện thoại.</li>' +
    '<li><b>Đổ bóng 3 tông</b> (sáng – gốc – tối ngả tím) + đốm bóng (gloss) → cảm giác khối 3D nhưng nhẹ để chạy mượt.</li>' +
    '<li><b>Ánh sáng là phần thưởng</b>: đồ +7 trở lên phát sáng theo màu (xanh → vàng → đỏ → cầu vồng), cả bộ +9 có hào quang dưới chân — đúng tinh thần “khoe đồ” của MU.</li>' +
    '<li><b>Mỗi bậc giáp có hình riêng</b> (vai, mũ, huy hiệu ngực) chứ không chỉ đổi màu → nhìn là biết bậc đồ.</li>' +
    '<li><b>Mỗi bản đồ một bảng màu</b> và hoạ tiết nền riêng, quái mang màu của vùng đất.</li></ul>');
  const c2 = card(s, 'A2', 'So sánh bản hiện tại (Classic) và bản đề xuất (V2)');
  const g = gridOf(c2, 'g2');
  for (const [A, label] of [[classic, 'Classic — hiện tại'], [v2, 'V2 — đề xuất']]) {
    const sl = mob(MAPS[0].mobs[0], { x: 1.6, y: -0.6, face: -1 }), wf = mob(MAPS[0].mobs[2], { x: -0.4, y: 1.8, face: 1 }), tree = { x: -1.6, y: -1.6, kind: 'tree', s: 1, col: MAPS[0].theme.dcol, seed: 0.1 };
    tile(g, label, '', canvas(340, 220, (c, t) => {
      groundPatch(c, MAPS[0].theme, 170, 60, 3, 1.3);
      c.translate(170, 120); c.scale(1.6, 1.6);
      A.drawDeco(c, tree, t);
      animateMob(sl, t, 0); animateMob(wf, t, 1.1);
      A.drawMob(c, wf, t); c.save(); A.drawHero(c, 'knight', equipSet('knight', 2, 7), t, { face: 1, moving: false, atk: (t % 1.4) < 0.25 ? 0.25 - (t % 1.4) : 0 }); c.restore();
      A.drawMob(c, sl, t);
    }, '#0f1a10'));
  }
}

// ======================= B. MÀU SẮC =======================
{
  const s = section('b', 'B. Bảng màu');
  const sw = (hex, name, sub = '') => '<div class="swatch"><i style="background:' + hex + '"></i><span><b>' + name + '</b>' + hex + sub + '</span></div>';
  add(card(s, 'B1', 'Màu giao diện', 'Vàng hoàng gia làm điểm nhấn, nền nâu đêm ấm (không đen lạnh) để hợp không khí cổ điển.'),
    '<div class="sw">' + [['#e8c26a', 'Vàng hoàng gia'], ['#f3d58a', 'Vàng nhạt (chữ)'], ['#8a6d2b', 'Viền đồng'], ['#17120c', 'Nền bảng'], ['#0b0908', 'Nền sâu'], ['#e9e2d0', 'Chữ chính'], ['#c0201a', 'HP'], ['#2050c0', 'MP'], ['#ffe082', 'EXP']].map((x) => sw(...x)).join('') + '</div>');
  add(card(s, 'B2', 'Độ hiếm vật phẩm', 'Dùng cho tên đồ, viền ô túi đồ và cột sáng khi rơi.'),
    '<div class="sw">' + [['normal', 'Thường'], ['good', '+4 trở lên'], ['high', '+7 trở lên'], ['excellent', 'Hoàn Hảo'], ['wings', 'Cánh']].map(([k, n]) => sw(RARITY_COLORS[k], n)).join('') + '</div>');
  add(card(s, 'B3', 'Ngọc'), '<div class="sw">' + Object.values(JEWELS).map((j) => sw(j.color, j.name)).join('') + '</div>');
  add(card(s, 'B4', '6 bộ giáp: màu chính + màu viền'), '<div class="sw">' + SETS.map((st, i) => '<div class="swatch"><i style="background:linear-gradient(90deg,' + st.color + ' 70%,' + TRIM[i] + ' 70%)"></i><span><b>Bậc ' + (i + 1) + ' · ' + st.name + '</b>' + st.color + ' / ' + TRIM[i] + '</span></div>').join('') + '</div>');
  add(card(s, 'B5', 'Bảng màu ' + MAPS.length + ' bản đồ'), '<div class="sw">' + MAPS.map((M) => '<div class="swatch"><i style="background:linear-gradient(90deg,' + M.theme.g + ' 0 30%,' + M.theme.g2 + ' 30% 55%,' + M.theme.edge + ' 55% 75%,' + M.theme.cliff + ' 75%)"></i><span><b>' + M.name + '</b>nền · nền 2 · biên · vách</span></div>').join('') + '</div>');
}

// ======================= S. QUY CHUẨN NHÂN VẬT (Character Style Guide) =======================
{
  const s = section('s', 'S. Nhân vật theo Style Guide', 'Claude Design N0 · tỉ lệ 1:2.2 · 3 tông + viền sáng');
  const starter = (cls) => { const e = { weapon: { slot: 'weapon', tier: 0, plus: 0, cls } }; for (const sl of ARMOR_SLOTS) e[sl] = { slot: sl, tier: 0, plus: 0 }; return e; };
  const c1 = card(s, 'S1', '3 class gốc — Bộ Da', 'Phóng 4× (320px) và cỡ thật 80 / 120px.');
  const g1 = gridOf(c1, 'g3');
  for (const cls of ['knight', 'wizard', 'archer']) tile(g1, CLASSES[cls].name, '', canvas(340, 470, (c, t) => {
    c.save(); c.translate(130, 450); c.scale(4, 4); v2.drawHero(c, cls, starter(cls), t, { face: 1, moving: false, atk: 0 }); c.restore();
    c.save(); c.translate(280, 450); v2.drawHero(c, cls, starter(cls), t, { face: 1, moving: false, atk: 0 }); c.restore();
    c.save(); c.translate(280, 300); c.scale(1.5, 1.5); v2.drawHero(c, cls, starter(cls), t, { face: 1, moving: false, atk: 0 }); c.restore();
  }, '#0b0a10'));
  // Kiếm Sĩ nam / nữ: bản chi tiết (mắt long lanh, tóc từng lọn, giáp có chi tiết) + tư thế bị đánh / gục
  const cK = card(s, 'S1+', 'Kiếm Sĩ nam & nữ (bản chi tiết)', 'Phóng 3× · hàng dưới: đứng · đi · đánh · kỹ năng · bị đánh · gục ngã.');
  const knightEq = (tier, plus) => equipSet('knight', tier, plus);
  for (const gd of ['m', 'f']) {
    add(cK, '<div class="rowlab">' + (gd === 'm' ? 'Nam' : 'Nữ') + '</div>');
    const g = gridOf(cK, 'g3');
    for (const tier of [0, 2, 5]) tile(g, 'Bậc ' + (tier + 1), SETS[tier].name, canvas(300, 380, (c, t) => {
      c.save(); c.translate(150, 360); c.scale(3.3, 3.3); v2.drawHero(c, 'knight', knightEq(tier, tier >= 3 ? 9 : 0), t, { face: 1, moving: false, atk: 0, gd }); c.restore();
    }, '#0b0a10'));
    const g2 = gridOf(cK, 'g6');
    [['Đứng', {}], ['Đi bộ', { moving: true }], ['Đánh', { atk: 0.15 }], ['Kỹ năng', { atk: 0.28 }], ['Bị đánh', { hurt: true }], ['Gục ngã', { dead: true }]].forEach(([n, o]) => tile(g2, n, '', canvas(150, 160, (c, t) => {
      c.translate(o.dead ? 36 : 60, 140); c.scale(1.45, 1.45); v2.drawHero(c, 'knight', knightEq(1, 0), o.moving ? t : 0.4, { face: 1, moving: false, atk: 0, gd, ...o });
    }, '#0b0a10')));
  }
  const c2 = card(s, 'S2', 'Tư thế', 'Đứng thở · Đi bộ · Đánh thường · Kỹ năng (lặp lại).');
  for (const cls of ['knight', 'wizard', 'archer']) {
    add(c2, '<div class="rowlab">' + CLASSES[cls].name + '</div>');
    const g = gridOf(c2, 'g6');
    [['Đứng', 0, 0], ['Đi bộ', 1, 0], ['Đánh 1', 0, 0.2], ['Đánh 2', 0, 0.13], ['Đánh 3', 0, 0.05], ['Kỹ năng', 0, 0.16]].forEach(([n, mv, atk]) => tile(g, n, '', canvas(150, 160, (c, t) => {
      c.translate(70, 146); c.scale(1.4, 1.4); v2.drawHero(c, cls, starter(cls), mv ? t : 0.4, { face: 1, moving: !!mv, atk: n === 'Kỹ năng' ? 0.29 - ((t * 0.5) % 0.29) : atk });
    }, '#0b0a10')));
  }
  const c3 = card(s, 'S3', 'Theo bậc trang bị', 'Bậc 1 → 6, +9 từ bậc 4, cánh từ bậc 3.');
  for (const cls of ['knight', 'wizard', 'archer']) {
    add(c3, '<div class="rowlab">' + CLASSES[cls].name + '</div>');
    const g = gridOf(c3, 'g6');
    for (let tr = 0; tr < 6; tr++) tile(g, 'Bậc ' + (tr + 1), SETS[tr].name, canvas(130, 160, (c, t) => { c.translate(62, 148); c.scale(1.3, 1.3); v2.drawHero(c, cls, equipSet(cls, tr, tr >= 3 ? 9 : 0, tr >= 2 ? Math.min(3, tr - 1) : 0), t, { face: 1, moving: false, atk: 0 }); }, '#0b0a10'));
  }
}

// ======================= C. NHÂN VẬT =======================
{
  const s = section('c', 'C. Nhân vật');
  const c1 = card(s, 'C1', '3 class × 6 bậc giáp', 'Mỗi bậc thay đổi hình dáng vai giáp, mũ, huy hiệu ngực và vũ khí — không chỉ đổi màu.');
  for (const cls of Object.keys(CLASSES)) {
    add(c1, '<div class="rowlab">' + CLASSES[cls].name + '</div>');
    const g = gridOf(c1, 'g6');
    for (let tr = 0; tr < 6; tr++) tile(g, 'Bậc ' + (tr + 1), SETS[tr].name, canvas(120, 150, (c, t) => { c.translate(60, 138); c.scale(1.45, 1.45); v2.drawHero(c, cls, equipSet(cls, tr), t, { face: 1, moving: false, atk: 0 }); }));
  }
  const c2 = card(s, 'C2', 'Hoạt ảnh: đứng · chạy · tấn công');
  const g2 = gridOf(c2, 'g3');
  for (const cls of Object.keys(CLASSES)) tile(g2, CLASSES[cls].name, '', canvas(300, 150, (c, t) => {
    for (const [i, mode] of [[0, 'idle'], [1, 'run'], [2, 'atk']].map((x) => x)) {
      c.save(); c.translate(55 + i * 95, 135); c.scale(1.3, 1.3);
      const ph = t % 0.9, atk = mode === 'atk' && ph < 0.25 ? 0.25 - ph : 0;
      v2.drawHero(c, cls, equipSet(cls, 3, 0), t, { face: 1, moving: mode === 'run', atk });
      c.restore();
    }
    c.fillStyle = '#a49a86'; c.font = '11px sans-serif'; c.textAlign = 'center'; ['Đứng', 'Chạy', 'Tấn công'].forEach((l, i) => c.fillText(l, 55 + i * 95, 148));
  }));
  const c3 = card(s, 'C3', 'Vũ khí phát sáng theo cấp ép', '+0 · +7 xanh · +9 vàng · +11 đỏ · +13 cầu vồng.');
  for (const cls of Object.keys(CLASSES)) {
    const g = gridOf(c3, 'g6');
    for (const p of [0, 7, 9, 11, 13]) tile(g, '+' + p, CLASSES[cls].name, canvas(120, 140, (c, t) => { c.translate(60, 128); c.scale(1.35, 1.35); v2.drawHero(c, cls, { ...equipSet(cls, 4), weapon: { slot: 'weapon', tier: 4, plus: p, cls } }, t, { face: 1, moving: false, atk: 0 }); }));
  }
  const c4 = card(s, 'C4', 'Cánh & hào quang', 'Cánh có 3 cấp, vỗ nhẹ khi đứng. Cả bộ giáp từ +9 xuất hiện hào quang và hạt sáng bay lên.');
  const g4 = gridOf(c4, 'g6');
  for (const [label, sub, cls, eq] of [
    ['Cánh cấp 1', WINGS[1].name, 'knight', equipSet('knight', 3, 0, 1)],
    ['Cánh cấp 2', WINGS[2].name, 'wizard', equipSet('wizard', 4, 0, 2)],
    ['Cánh cấp 3', WINGS[3].name, 'archer', equipSet('archer', 5, 0, 3)],
    ['Cánh 3 +7', 'cánh phát sáng', 'knight', equipSet('knight', 5, 7, 3, 7)],
    ['Cả bộ +9', 'hào quang vàng', 'knight', equipSet('knight', 5, 9, 3, 9)],
    ['Cả bộ +13', 'hào quang cầu vồng', 'wizard', equipSet('wizard', 5, 13, 3, 13)],
  ]) tile(g4, label, sub, canvas(130, 150, (c, t) => { c.translate(65, 132); c.scale(1.3, 1.3); v2.drawHero(c, cls, eq, t, { face: 1, moving: false, atk: 0 }); }));
}

// ======================= D. QUÁI VẬT =======================
{
  const s = section('d', 'D. Quái vật', MAPS.reduce((a, M) => a + M.mobs.length, 0) + ' quái + ' + MAPS.length + ' boss');
  MAPS.forEach((M, mi) => {
    const cd = card(s, 'D' + (mi + 1), M.name, 'Cấp ' + M.lv[0] + '–' + M.lv[1] + ' · ' + M.mobs.map((x) => x.name).join(' · ') + ' · Boss: <b style="color:#ffb070">' + M.boss.name + '</b>');
    const ms = M.mobs.map((tp, i) => mob(tp, { face: 1 })), boss = mob(M.boss, { boss: true, face: -1 });
    cd.appendChild(canvas(900, 230, (c, t, w) => {
      groundPatch(c, M.theme, w / 2, 70, 5, 1.2);
      ms.forEach((m, i) => { animateMob(m, t, i * 0.8); c.save(); c.translate(90 + i * 150, 175); c.scale(1.7, 1.7); v2.drawMob(c, m, t); c.restore(); });
      animateMob(boss, t, 2); c.save(); c.translate(790, 200); c.scale(1.05, 1.05); boss.boss = true; v2.drawMob(c, boss, t); c.restore();
      c.font = 'bold 12px sans-serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = '#000';
      const lab = (txt, x, col) => { c.strokeText(txt, x, 222); c.fillStyle = col; c.fillText(txt, x, 222); };
      ms.forEach((m, i) => lab(m.name, 90 + i * 150, '#e9e2d0')); lab('BOSS ' + boss.name, 640, '#ffb070');
    }, M.theme.bg));
  });
}

// ======================= E. VẬT PHẨM =======================
{
  const s = section('e', 'E. Vật phẩm', 'icon vẽ bằng code, thay toàn bộ emoji');
  const ic = (url, label, r = '') => '<div class="ic ' + r + '"><img src="' + url + '">' + label + '</div>';
  const c1 = card(s, 'E1', 'Vũ khí 3 class × 6 bậc');
  for (const [cls, kind] of [['knight', 'sword'], ['wizard', 'staff'], ['archer', 'bow']]) add(c1, '<div class="rowlab">' + CLASSES[cls].name + '</div><div class="icons">' + WEAPON_NAMES[cls].map((n, i) => ic(iconURL(kind, i), n)).join('') + '</div>');
  const c2 = card(s, 'E2', 'Giáp 5 món × 6 bộ');
  SETS.forEach((st, i) => add(c2, '<div class="rowlab">Bộ ' + st.name + ' (bậc ' + (i + 1) + ')</div><div class="icons">' + ARMOR_SLOTS.map((sl) => ic(iconURL(sl, i), PIECE_PREFIX[sl])).join('') + '</div>'));
  add(card(s, 'E3', 'Cánh, ngọc, thuốc, bùa, zen'), '<div class="icons">' +
    [1, 2, 3].map((t) => ic(iconURL('wings', t), WINGS[t].name, 'r-wings')).join('') +
    Object.entries(JEWELS).map(([k, j]) => ic(iconURL('jewel', k), j.name)).join('') +
    ic(iconURL('potion', 'hp'), 'Bình Máu') + ic(iconURL('potion', 'mp'), 'Bình Mana') + ic(iconURL('charm'), 'Bùa Bảo Hộ') + ic(iconURL('zen'), 'Zen') + '</div>');
  add(card(s, 'E4', 'Khung theo độ hiếm (ô túi đồ)'), '<div class="icons">' +
    [['', 'Thường'], ['r-good', '+4'], ['r-high', '+7'], ['r-excellent', 'Hoàn Hảo'], ['r-wings', 'Cánh']].map(([r, l], i) => ic(i === 4 ? iconURL('wings', 2) : iconURL('sword', 3), l, r)).join('') + '</div>');
  const c5 = card(s, 'E5', 'Vật phẩm rơi trên đất', 'Đồ quý có cột sáng theo màu độ hiếm để nhận ra từ xa.');
  const drops = [
    { x: -2.6, y: 2.6, kind: 'zen', val: 120 }, { x: -1.6, y: 1.6, kind: 'pot', val: { t: 'hp', n: 1 } },
    { x: -0.4, y: 0.4, kind: 'jewel', val: 'bless' }, { x: 0.8, y: -0.8, kind: 'jewel', val: 'chaos' },
    { x: 2.2, y: -2.2, kind: 'item', val: makeItem('armor', 4, 0, [{ k: 'hp', v: 5 }]) }, { x: 0.6, y: 1.8, kind: 'item', val: makeItem('weapon', 2, 7, null, 'knight') },
  ];
  c5.appendChild(canvas(560, 200, (c, t, w) => { groundPatch(c, MAPS[0].theme, w / 2, 30, 4, 1.4); c.translate(w / 2, 110); c.scale(1.4, 1.4); drops.forEach((d) => v2.drawDrop(c, d, t)); }, '#0f1a10'));
}

// ======================= F. BẢN ĐỒ =======================
{
  const s = section('f', 'F. Bản đồ', 'cắt từ bản đồ thật trong game');
  const g = gridOf(s, 'g2');
  MAPS.forEach((M, mi) => {
    const cd = card(g, 'F' + (mi + 1), M.name, ({ meadow: 'Cỏ, hoa dại, sông xanh, cây ăn quả.', darkwood: 'Rừng tối, nấm phát sáng tím, bụi rậm biên.', crypt: 'Nền đá lát nứt, rêu, bia mộ, cột đổ.', tundra: 'Tuyết lấp lánh, thông phủ tuyết, pha lê băng.', desert: 'Cát gợn sóng, khe dung nham phát sáng, xương rồng ra hoa.', fallen: 'Nền tím thẫm, ấn chú phát sáng, pha lê nhịp thở, hư không sao.', swamp: 'Đầm nước đục, lau sậy, cây chết, ma trơi xanh.', canyon: 'Vách đá đỏ nhô cao, tảng đá lớn, bụi cát.', coast: 'Cát vàng, biển ngọc, dừa, san hô, vỏ sò.', volcano: 'Nền đá bazan, cột đá nứt lửa, sông dung nham.' })[M.id]);
    cd.appendChild(diorama(mi, 500, 280, 1.25));
  });
  const ct = card(s, 'F' + (MAPS.length + 1), 'Thị trấn an toàn', 'Nền lát đá + 4 đuốc lửa, đánh dấu vùng không có quái.');
  ct.appendChild(diorama(0, 760, 300, 1.2, (map) => ({ x: map.town.x, y: map.town.y }), true));
}

// ======================= G. HIỆU ỨNG =======================
{
  const s = section('g', 'G. Hiệu ứng kỹ năng');
  const g = gridOf(s, 'g3');
  const loopFx = (k, D, extra = {}) => (t) => ({ k, x: 0, y: 0, t: t % D, d: D, ...extra, hit: true });
  const slimes = [mob(MAPS[0].mobs[0], { x: 1.6, y: 0 }), mob(MAPS[0].mobs[0], { x: -0.6, y: 1.6, face: -1 }), mob(MAPS[0].mobs[0], { x: 0.8, y: -1.4, face: -1 })];
  const scene = (code, title, note, draw) => { const cd = card(g, code, title, note); cd.appendChild(canvas(320, 220, (c, t, w, h) => { groundPatch(c, MAPS[2].theme, w / 2, -10, 6, 1.4); c.translate(w / 2, 135); c.scale(1.35, 1.35); draw(c, t); }, '#09080c')); };
  scene('G1', 'Xoáy Kiếm', 'Kiếm Sĩ · đánh lan xung quanh', (c, t) => {
    const f = loopFx('whirl', 1.2)(t); slimes.forEach((m) => { m.flash = f.t < 0.15 ? 0.1 : 0; v2.drawMob(c, m, t); });
    v2.drawHero(c, 'knight', equipSet('knight', 4, 9), t, { face: 1, moving: false, atk: f.t < 0.25 ? 0.25 - f.t : 0 }); if (f.t < 0.45) v2.drawFx(c, { ...f, d: 0.45, r: 2.6 }, t);
  });
  scene('G2', 'Mưa Thiên Thạch', 'Pháp Sư · thiên thạch rơi chéo, nổ diện rộng', (c, t) => {
    const f = { k: 'meteor', x: 1.5, y: -0.5, t: t % 1.4, d: 0.75, r: 2.4 };
    const tg = mob(MAPS[3].mobs[0], { x: 1.5, y: -0.5, face: -1 }); tg.flash = f.t > 0.35 && f.t < 0.45 ? 0.1 : 0; v2.drawMob(c, tg, t);
    c.save(); const s0 = iso(-1.6, 1.2); c.translate(s0.x, s0.y); v2.drawHero(c, 'wizard', equipSet('wizard', 5, 11), t, { face: 1, moving: false, atk: f.t < 0.25 ? 0.25 - f.t : 0 }); c.restore();
    if (f.t < f.d) v2.drawFx(c, f, t);
  });
  scene('G3', 'Mưa Tên', 'Xạ Thủ · 6 mũi tên phát sáng cùng lúc', (c, t) => {
    const tg = [mob(MAPS[1].mobs[1], { x: 2, y: -1.2, face: -1 }), mob(MAPS[1].mobs[1], { x: 2.4, y: 0.4, face: -1 }), mob(MAPS[1].mobs[0], { x: 1, y: 1.6, face: -1 })];
    tg.forEach((m) => v2.drawMob(c, m, t));
    const o = { x: -1.6, y: 0.4 }, ph = (t % 1.1) / 0.6;
    c.save(); const s0 = iso(o.x, o.y); c.translate(s0.x, s0.y); v2.drawHero(c, 'archer', equipSet('archer', 3, 9), t, { face: 1, moving: false, atk: t % 1.1 < 0.25 ? 0.25 - (t % 1.1) : 0 }); c.restore();
    if (ph < 1) tg.forEach((m, i) => v2.drawProjectile(c, { x: o.x + (m.x - o.x) * ph, y: o.y + (m.y - o.y) * ph, tgt: m, k: 'arrow2' }, t));
  });
  scene('G4', 'Lên cấp', 'Cột sáng + vòng tròn + hạt sáng', (c, t) => { v2.drawHero(c, 'knight', equipSet('knight', 1), t, { face: 1, moving: false, atk: 0 }); v2.drawFx(c, loopFx('lvl', 1.6)(t), t); });
  scene('G5', 'Quái bị hạ', 'Bung hạt màu quái + linh hồn bay lên', (c, t) => { const k = t % 1.4; if (k > 0.6) v2.drawMob(c, mob(MAPS[2].mobs[0]), t); else v2.drawFx(c, { k: 'die', x: 0, y: 0, t: k, d: 0.6, col: MAPS[2].mobs[0].c1, size: 1 }, t); });
  scene('G6', 'Cầu lửa & chạm di chuyển', 'Đạn phép có vệt lửa · dấu chạm xanh', (c, t) => {
    const ph = (t % 1) / 0.8, tg = mob(MAPS[4].mobs[0], { x: 1.8, y: -0.6, face: -1 }); v2.drawMob(c, tg, t);
    if (ph < 1) v2.drawProjectile(c, { x: -1.6 + 3.4 * ph, y: 0.6 - 1.2 * ph, tgt: tg, k: 'fire' }, t); else v2.drawFx(c, { k: 'boom', x: 1.8, y: -0.6, t: (ph - 1) * 0.8, d: 0.25 }, t);
    v2.drawFx(c, { k: 'click', x: -1, y: 1.6, t: t % 0.6, d: 0.6 }, t);
  });
}

// ======================= G+. HẠT HIỆU ỨNG =======================
{
  initParticles();
  const s = section('g2', 'G+. Hạt hiệu ứng', 'tia lửa · vòng xung kích · linh hồn · bụi · vệt đạn · lên cấp (vòng lặp 7 giây)');
  const cd = card(s, 'G7', 'Chuỗi hiệu ứng', 'Đánh thường → kỹ năng → chí mạng → hạ quái → lên cấp → đạn lửa; người chạy luôn có bụi dưới chân');
  const m = mob(MAPS[0].mobs[0], { x: 2, y: 0, face: -1 });
  const R = { p: { x: -2, y: 0, moving: true, dead: 0 }, projs: [], eprojs: [], M: { theme: MAPS[0].theme }, texts: [] };
  const STEPS = [[0.4, () => emit(EV.HIT, m, 120, false, false)], [1.2, () => emit(EV.HIT, m, 300, false, true)], [2.0, () => emit(EV.HIT, m, 900, true, false)], [3.0, () => emit(EV.KILL, { ...m, boss: false, c1: '#7ad07a' })], [4.2, () => emit(EV.LEVEL_UP, 5, 1)], [5.4, () => emit(EV.HIT, { ...m, size: 1.6, boss: true }, 5000, true, true)]];
  let lastT = 0, fired = new Set();
  cd.appendChild(canvas(640, 280, (c, t, w, h) => {
    const dt = Math.min(0.05, Math.max(0.001, t - lastT)); lastT = t;
    const ph = t % 7; if (ph < 0.1) fired.clear();
    G.R = R;
    for (const [at, fn] of STEPS) if (ph >= at && !fired.has(at)) { fired.add(at); fn(); }
    R.projs = ph > 5.8 && ph < 6.4 ? [{ x: -1.6 + 3.6 * ((ph - 5.8) / 0.6), y: 0, k: 'fire' }] : [];
    groundPatch(c, MAPS[0].theme, w / 2, -10, 8, 1.4); c.translate(w / 2, 170); c.scale(1.5, 1.5);
    if (ph < 3.05 || ph > 3.5) v2.drawMob(c, m, t);
    c.save(); const s0 = iso(R.p.x, R.p.y); c.translate(s0.x, s0.y); v2.drawHero(c, 'knight', equipSet('knight', 3, 9), t, { face: 1, moving: true, atk: 0 }); c.restore();
    drawParticles(c, t, dt);
  }, '#09080c'));
}

// ======================= H. GIAO DIỆN =======================
{
  const s = section('h', 'H. Giao diện (UI kit)', 'đề xuất — chưa áp dụng vào game');
  const g = gridOf(s, 'g2');
  const c1 = card(g, 'H1', 'Màn hình chơi trên điện thoại', 'Khung viền vàng có góc trang trí, nút tròn kiểu “ngọc”, icon vẽ riêng thay emoji.');
  const ph = add(c1, '<div class="phone"></div>');
  const cv = diorama(3, 284, 584, 1.0); cv.style.width = '100%'; ph.appendChild(cv);
  add(ph, '<div class="uk-top"><div class="uk-frame" style="flex:1"><div class="uk-name">LôiThần27 · Kiếm Sĩ</div><div class="uk-lv">Cấp 96 · Reset 1</div>' +
    '<div class="uk-bar hp"><i></i><span>1.240 / 1.720</span></div><div class="uk-bar mp"><i></i><span>860 / 1.560</span></div></div>' +
    '<div class="uk-frame" style="text-align:right;font-size:9px"><div class="uk-name">Băng Nguyên</div><div style="color:#ffd54a;font-weight:700">2.48M Zen</div></div></div>' +
    '<div class="uk-btns"><div style="display:flex;gap:8px"><div class="uk-orb sm"><img src="' + iconURL('potion', 'hp') + '"></div><div class="uk-orb sm"><img src="' + iconURL('potion', 'mp') + '"></div></div>' +
    '<div class="uk-orb"><img src="' + iconURL('sk_meteor') + '"></div></div>' +
    '<div class="uk-menu">' + [['ui_char', 'Nhân vật'], ['ui_bag', 'Túi đồ'], ['ui_anvil', 'Ép đồ'], ['ui_map', 'Bản đồ'], ['ui_shop', 'Cửa hàng'], ['ui_reset', 'Reset'], ['ui_gear', 'Cài đặt']].map(([k, l]) => '<div><img src="' + iconURL(k) + '">' + l + '</div>').join('') + '</div>');
  const c2 = card(g, 'H2', 'Thẻ thông tin vật phẩm & nút bấm');
  const demo = makeItem('weapon', 4, 9, [{ k: 'dmg', v: 10 }, { k: 'crit', v: 6 }], 'knight');
  add(c2, '<div class="uk-tip"><div class="hd"><img src="' + iconURL('sword', 4) + '"><div><div class="nm">[Hoàn Hảo] ' + itemFull(demo) + '</div><div style="color:#a49a86;font-size:11px">Vũ khí · Bậc 5</div></div></div>' +
    '<div>Sát thương: <b>+' + 0 + '</b></div><div style="color:#5dff7a">✦ Tăng sát thương +10%</div><div style="color:#5dff7a">✦ Tỉ lệ chí mạng +6%</div><div style="color:#a49a86;font-size:11px;margin:6px 0">Giá bán: 86.400 Zen</div>' +
    '<span class="uk-btn g">Trang bị</span><span class="uk-btn">⚒ Ép đồ</span><span class="uk-btn r">Bán</span><span class="uk-btn o">Đóng</span></div>');
  c2.querySelector('.uk-tip b').textContent = '+' + Math.round(6 * Math.pow(5, 1.6) * (1 + 0.12 * 9) + 18);
  add(card(g, 'H3', 'Bộ icon menu & kỹ năng'), '<div class="icons">' +
    [['ui_char', 'Nhân vật'], ['ui_bag', 'Túi đồ'], ['ui_anvil', 'Ép đồ'], ['ui_map', 'Bản đồ'], ['ui_shop', 'Cửa hàng'], ['ui_reset', 'Reset'], ['ui_gear', 'Cài đặt'], ['sk_whirl', 'Xoáy Kiếm'], ['sk_meteor', 'Thiên Thạch'], ['sk_arrowrain', 'Mưa Tên']]
      .map(([k, l]) => '<div class="ic"><img src="' + iconURL(k) + '">' + l + '</div>').join('') + '</div>');
}

// ======================= N. TRANG BỊ & THỜI TRANG (MỚI) =======================
{
  const s = section('n', 'N. Trang bị & Thời trang', 'bản mở rộng');
  const eqV = (cls, tier, wt, line, plus = 0) => { const e = equipSet(cls, tier, plus); e.weapon.wt = wt; for (const sl of ARMOR_SLOTS) e[sl].line = line; return e; };
  const bt = (b) => Object.entries(b).map(([k, v]) => BONUS_NAMES[k] + ' +' + v + '%').join(', ');
  // N1: loại vũ khí
  const c1 = card(s, 'N1', '10 loại vũ khí', 'Mỗi loại có chỉ số riêng; rèn lại loại vũ khí ở bảng Ép đồ mà vẫn giữ cấp ép.');
  for (const cls of Object.keys(WEAPON_TYPES)) {
    add(c1, '<div class="rowlab">' + CLASSES[cls].name + '</div>');
    const g = gridOf(c1, 'g6');
    WEAPON_TYPES[cls].forEach((W, wt) => tile(g, W.name, '<div style="font-size:10px">' + W.desc + '</div>', canvas(150, 150, (c, t) => {
      c.translate(75, 136); c.scale(1.35, 1.35); const ph = (t + wt * 0.3) % 1.3, atk = ph < 0.25 ? 0.25 - ph : 0;
      v2.drawHero(c, cls, eqV(cls, 4, wt, 0, 7), t, { face: 1, moving: false, atk });
    })));
  }
  // N2: 12 bộ giáp
  const c2 = card(s, 'N2', '12 bộ giáp (2 dòng mỗi bậc) & hiệu ứng bộ', 'Mặc 3 món cùng bộ kích hoạt hiệu ứng 1, đủ 5 món kích hoạt hiệu ứng 2 và hào quang màu bộ.');
  ARMOR_SETS.forEach((lines, tier) => {
    const g = gridOf(c2, 'g2');
    lines.forEach((st, line) => {
      const d = tile(g, 'Bậc ' + (tier + 1) + ' · Bộ ' + st.name, '<div style="font-size:11px">3 món: ' + bt(st.bonus3) + '<br>5 món: ' + bt(st.bonus5) + '</div>', canvas(330, 150, (c, t) => {
        ['knight', 'wizard', 'archer'].forEach((cls, i) => { c.save(); c.translate(60 + i * 105, 136); c.scale(1.3, 1.3); v2.drawHero(c, cls, eqV(cls, tier, 0, line), t + i, { face: 1, moving: false, atk: 0 }); c.restore(); });
      }));
      d.style.borderColor = st.trim;
    });
  });
  // N3: thời trang
  const c3 = card(s, 'N3', '14 món thời trang', 'Chỉ đổi ngoại hình, mặc đè lên giáp. Người chơi khác trên máy chủ cũng nhìn thấy.');
  for (const [slot, name] of Object.entries(FASHION_SLOTS)) {
    add(c3, '<div class="rowlab">' + name + '</div>');
    const g = gridOf(c3, 'g6');
    FASHION.filter((f) => f.slot === slot).forEach((f, i) => {
      const cls = ['knight', 'wizard', 'archer'][i % 3], u = f.unlock;
      const how = { shop: 'Mua ' + (u.zen / 1000) + 'K Zen', checkin: 'Điểm danh ' + u.n + ' ngày', tower: 'Tháp tầng ' + u.n, events: u.n + ' lần sự kiện', reset: 'Reset ' + u.n + ' lần' }[u.type];
      tile(g, f.name, '<div style="font-size:10px">' + how + '</div>', canvas(140, 160, (c, t) => {
        c.translate(70, 146); c.scale(1.35, 1.35); v2.drawHero(c, cls, equipSet(cls, 2), t + i, { face: 1, moving: (t % 6) > 4, atk: 0, fa: { [slot]: f.id } });
      }));
    });
  }
  // N4: icon mới
  add(card(s, 'N4', 'Icon vũ khí & giáp mới'), '<div class="icons">' +
    ['axe', 'mace', 'spear', 'orb', 'tome', 'crossbow', 'twinbow'].map((k) => '<div class="ic"><img src="' + iconURL(k, 4) + '">' + k + '</div>').join('') +
    ARMOR_SETS.map((l, tier) => '<div class="ic"><img src="' + iconURL('armor', tier + '_1') + '">' + l[1].name + '</div>').join('') +
    FASHION.slice(0, 6).map((f) => '<div class="ic"><img src="' + iconURL('fashion', f.id) + '">' + f.name + '</div>').join('') + '</div>');
}

// ======================= K. BỘ KỸ NĂNG (MỚI) =======================
{
  const s = section('k', 'K. Bộ kỹ năng', '18 kỹ năng · 3 bậc nhân vật');
  const TN = { active: 'Chủ động', buff: 'Tăng cường', passive: 'Nội tại' };
  const HERO = { x: -1.7, y: 0.7 }, TG = { x: 1.4, y: -0.4 };
  const SCN = {
    whirl: (c, t, k) => ({ fx: k < 0.45 ? [{ k: 'whirl', x: HERO.x, y: HERO.y, t: k, d: 0.45, r: 2.4 }] : [], atk: k < 0.3 }),
    meteor: (c, t, k) => ({ fx: [{ k: 'meteor', x: TG.x, y: TG.y, t: k * 0.75, d: 0.75, r: 2.4 }], atk: k < 0.3 }),
    arrowrain: (c, t, k) => ({ pr: k < 0.6 ? [0, 1, 2].map((i) => ({ q: k / 0.6, k: 'arrow2', i })) : [], atk: k < 0.3 }),
    slam: (c, t, k) => ({ fx: [{ k: 'nova', x: HERO.x, y: HERO.y, t: k * 0.6, d: 0.6, r: 2.2, col: '#ffb060', crack: true }], atk: k < 0.3 }),
    warcry: (c, t, k) => ({ fx: [{ k: 'buff', x: HERO.x, y: HERO.y, t: k * 0.9, d: 0.9, col: '#ff7a3a' }], atk: k < 0.3 }),
    charge: (c, t, k) => ({ fx: [{ k: 'dash', x: 0.6, y: -0.1, x0: -2.6, y0: 1.4, t: k * 0.4, d: 0.4 }], at: { x: 0.6, y: -0.1 }, atk: k < 0.3 }),
    skyblade: (c, t, k) => ({ fx: [{ k: 'skyblade', x: TG.x, y: TG.y, t: k, d: 1, hitAt: 0.45, r: 2.4 }] }),
    frost: (c, t, k) => ({ fx: [{ k: 'frost', x: TG.x, y: TG.y, t: k * 0.9, d: 0.9, r: 2.2 }], slow: true }),
    manashield: (c, t, k) => ({ fx: [{ k: 'buff', x: HERO.x, y: HERO.y, t: k * 0.9, d: 0.9, col: '#7fb8ff' }] }),
    chain: (c, t, k) => ({ fx: [{ k: 'bolt', x: HERO.x, y: HERO.y, pts: [HERO, { x: 0.6, y: -1.2 }, TG, { x: 1.2, y: 1.2 }], t: k * 0.4, d: 0.4 }], stun: true }),
    blackhole: (c, t, k) => ({ fx: [{ k: 'vortex', x: TG.x, y: TG.y, t: k * 2.4, d: 2.4, r: 2.4 }] }),
    pierce: (c, t, k) => ({ fx: [{ k: 'beam', x: HERO.x, y: HERO.y, x1: 3.2, y1: -1.2, t: k * 0.45, d: 0.45, col: '#7ff8ff' }], atk: k < 0.3 }),
    focus: (c, t, k) => ({ fx: [{ k: 'buff', x: HERO.x, y: HERO.y, t: k * 0.9, d: 0.9, col: '#7fff9a' }] }),
    icearrow: (c, t, k) => ({ pr: k < 0.6 ? [0, 1, 2].map((i) => ({ q: k / 0.6, k: 'ice', i })) : [], slow: k >= 0.6, atk: k < 0.3 }),
    phoenix: (c, t, k) => ({ pr: k < 0.5 ? [{ q: k / 0.5, k: 'phoenix', i: 1 }] : [], fx: k >= 0.5 ? [{ k: 'nova', x: TG.x, y: TG.y, t: (k - 0.5) * 1.4, d: 0.7, r: 2.4, col: '#ff7a2a', fire: true }] : [], atk: k < 0.3 }),
  };
  const DUR = { blackhole: 3, skyblade: 1.6, charge: 1.2 };
  for (const cls of Object.keys(SKILL_LIST)) {
    const c1 = card(s, 'K-' + cls[0].toUpperCase(), CLASS_TIERS[cls].join(' → '), 'Lên bậc: Reset 1 / Reset 3 để mở nhiệm vụ chuyển chức 5 bước. Cấp kỹ năng tối đa theo bậc: 5 / 8 / 10.');
    const g = gridOf(c1, 'g3');
    SKILL_LIST[cls].forEach((sk) => {
      const sub = '<div style="font-size:10px">' + TN[sk.type] + ' · Bậc ' + sk.tier + ' · Cấp ' + sk.lv + '<br>' + sk.desc + '</div>';
      const tgs = [mob(MAPS[2].mobs[0], { ...TG, face: -1 }), mob(MAPS[2].mobs[0], { x: 0.6, y: -1.2, face: -1 }), mob(MAPS[2].mobs[1], { x: 1.2, y: 1.2, face: -1 })];
      tile(g, sk.name, sub, canvas(260, 190, (c, t, w, h) => {
        groundPatch(c, MAPS[2].theme, w / 2, -10, 5, 1.2); c.translate(w / 2, 118); c.scale(1.15, 1.15);
        if (sk.type === 'passive') { const img = iconCanvas('sk_' + sk.id); c.globalAlpha = 0.9; c.drawImage(img, -48, -80, 96, 96); c.globalAlpha = 1; return; }
        const D = DUR[sk.id] || 1.3, k = (t % D) / D, f = SCN[sk.id] ? SCN[sk.id](c, t, Math.min(1, k * 1.15)) : { fx: [] };
        const at = f.at || HERO;
        tgs.forEach((m) => { m.stun = f.stun ? 1 : 0; v2.drawMob(c, m, t); });
        c.save(); const s0 = iso(at.x, at.y); c.translate(s0.x, s0.y); v2.drawHero(c, cls, equipSet(cls, 4, 9), t, { face: 1, moving: false, atk: f.atk ? 0.3 - k * 0.3 : 0 }); c.restore();
        (f.pr || []).forEach((pr) => { const m = tgs[pr.i % 3]; v2.drawProjectile(c, { x: at.x + (m.x - at.x) * pr.q, y: at.y + (m.y - at.y) * pr.q, tgt: m, k: pr.k }, t); });
        (f.fx || []).forEach((fx) => v2.drawFx(c, fx, t));
      }));
    });
    add(c1, '<div class="icons">' + SKILL_LIST[cls].map((sk) => '<div class="ic"><img src="' + iconURL('sk_' + sk.id) + '">' + sk.name + '</div>').join('') + '</div>');
  }
}

// ======================= I. DUYỆT =======================
{
  const s = section('i', 'I. Danh sách duyệt');
  const rows = [
    ['A', 'Định hướng phong cách Chibi Dark Fantasy'], ['B', 'Bảng màu giao diện, độ hiếm, bộ giáp, bản đồ'],
    ['C', 'Nhân vật 3 class × 6 bậc, hoạt ảnh, phát sáng, cánh, hào quang'], ['D', '18 quái thường + 6 boss'],
    ['E', 'Icon vũ khí, giáp, cánh, ngọc, thuốc; khung độ hiếm; đồ rơi'], ['F', 'Nền & trang trí 6 bản đồ + thị trấn'],
    ['G', 'Hiệu ứng kỹ năng, lên cấp, hạ quái'], ['H', 'UI kit: khung, nút, icon menu (đã áp dụng)'], ['N', 'Vũ khí 10 loại, 12 bộ giáp + hiệu ứng bộ, 14 món thời trang'], ['K', '18 kỹ năng (6/class) · 3 bậc nhân vật · hiệu ứng & icon mới'],
  ];
  add(card(s, 'I1', 'Trạng thái', 'Sau khi anh duyệt: bật V2 làm mặc định, thay emoji bằng icon mới, áp dụng UI kit. Bản game hiện tại đã có nút chuyển Classic/V2 trong Cài đặt để anh thử trực tiếp.'),
    '<table class="chk"><tr><th>Mã</th><th>Nội dung</th><th>Trạng thái</th></tr>' + rows.map(([k, v]) => '<tr><td><b>' + k + '</b></td><td>' + v + '</td><td><span class="pill">Chờ duyệt</span></td></tr>').join('') + '</table>');
}

requestAnimationFrame(frame);
window.__ready = true;
