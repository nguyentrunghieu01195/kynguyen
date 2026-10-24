// Làm quái / Boss bớt đơn điệu: biến thể từng con, chủ đề nguyên tố theo màu, quầng viền theo hình dáng, vật thể bay quanh Boss, trạng thái cuồng nộ.
import { pCirc, pPoly, sparkle, hash } from './kit.js';
import { mix } from '../../paint.js';
import { gfx3d } from '../v3d/flag.js';
import { gem as gem3, orb as orb3 } from '../v3d/fx3d.js';

/** Chủ đề nguyên tố suy từ sắc độ của màu nhấn: lửa · vàng · độc · băng · huyền bí · xương */
export function themeOf(m) {
  const hex = m.c2 || m.c1, n = parseInt(hex.slice(1, 7), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d < 60) return 'bone';
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360;
  if (h < 42 || h >= 340) return 'fire';
  if (h < 68) return 'gold';
  if (h < 170) return 'poison';
  if (h < 255) return 'ice';
  return 'arcane';
}
const seedOf = (m) => { let s = 0; const id = String(m.id || ''); for (let i = 0; i < id.length; i++) s = (s * 31 + id.charCodeAt(i)) | 0; return (Math.abs(s) % 1000) / 1000; };

/** Biến thể từng con: kích thước ±6% và màu thân lệch nhẹ (5 mức) để cả bầy không giống hệt nhau */
export function variant(m) {
  if (m.boss || m.shape === 'gate' || m.pvp) return { k: 1, c1: m.c1 };
  const s = seedOf(m), q = Math.floor(s * 5) - 2;                // -2..2
  return { k: 1 + q * 0.03, c1: q === 0 ? m.c1 : q > 0 ? mix(m.c1, m.c2, q * 0.1) : mix(m.c1, '#000000', -q * 0.08) };
}

/** Vẽ hạt nguyên tố quanh quái (đã translate tới chân, chưa scale). n = số hạt, k = độ mạnh */
export function themeParticles(c, m, t, n, k = 1) {
  const th = themeOf(m), sz = m.size, col = m.c2;
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const q = (t * (0.5 + 0.25 * k) + i / n + hash(i + m.lv)) % 1, ph = i * 2.4 + hash(i) * 6, x = Math.sin(ph + t * 1.1) * 15 * sz, y = -q * 62 * sz, a = (1 - q);
    c.globalAlpha = a * 0.85;
    if (gfx3d()) { // hạt 3D phát sáng theo chủ đề
      const done = th === 'fire' ? orb3(c, x, y, (2.2 * (1 - q) + 0.9) * sz * k * 2.2, q < 0.5 ? '#ffd060' : '#ff6a20')
        : th === 'ice' ? gem3(c, x, y, 7 * sz, '#e8fbff', Math.sin(ph))
        : th === 'poison' ? orb3(c, x, y, (1.5 + q * 3) * sz * 1.8, '#b8ff60')
        : th === 'arcane' ? gem3(c, x, y, 7 * sz, col, Math.sin(ph))
        : th === 'gold' ? gem3(c, x, y, 6.5 * sz, '#ffe680', ph)
        : orb3(c, x, y * 0.8, (1 + (1 - q)) * sz * 2.4, '#e8e4d0');
      if (done) continue;
    }
    if (th === 'fire') { c.fillStyle = q < 0.5 ? '#ffd060' : '#ff6a20'; pCirc(c, x, y, (2.2 * (1 - q) + 0.5) * sz * k); c.fill(); }
    else if (th === 'ice') { c.fillStyle = '#e8fbff'; pPoly(c, [x, y - 3 * sz, x + 2 * sz, y, x, y + 3 * sz, x - 2 * sz, y]); c.fill(); }
    else if (th === 'poison') { c.strokeStyle = '#b8ff60'; c.lineWidth = 1; pCirc(c, x, y, (1.5 + q * 3) * sz); c.stroke(); }
    else if (th === 'arcane') { c.fillStyle = col; pPoly(c, [x, y - 3 * sz, x + 1.6 * sz, y, x, y + 3 * sz, x - 1.6 * sz, y]); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 0.6; c.stroke(); }
    else if (th === 'gold') { c.restore(); c.save(); c.globalCompositeOperation = 'lighter'; sparkle(c, x, y, 2.2 * sz, '#ffe680', a); }
    else { c.fillStyle = '#e8e4d0'; pCirc(c, x, y * 0.8, (1 + (1 - q)) * sz); c.fill(); }   // xương: bụi / linh hồn nhạt
  }
  c.restore();
}

/** Vật thể bay quanh Boss theo chủ đề (lửa / băng / độc / huyền bí / vàng / xương) */
export function bossOrbiters(c, m, t, rage) {
  const th = themeOf(m), sz = m.size, N = rage ? 8 : 6, sp = rage ? 1.9 : 1.1;
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < N; i++) {
    const a = t * sp + (i / N) * 6.283, x = Math.cos(a) * 34 * sz, y = -34 * sz + Math.sin(a) * 12 * sz - Math.sin(t * 2 + i) * 3, back = Math.sin(a) < 0;
    c.globalAlpha = back ? 0.45 : 0.9;
    if (gfx3d()) {
      const hh = th === 'fire' ? 14 : th === 'ice' ? 17 : th === 'gold' ? 15 : 11;
      const done = th === 'fire' ? orb3(c, x, y, 7.5 * sz, '#ff7a20') : th === 'ice' ? gem3(c, x, y, hh * sz, '#bff0ff', 0)
        : th === 'poison' ? orb3(c, x, y, 7 * sz, '#9aff40') : th === 'arcane' ? gem3(c, x, y, 13 * sz, m.c2, a) : th === 'gold' ? gem3(c, x, y, hh * sz, '#ffe080', a + 1.57) : orb3(c, x, y, 6.5 * sz, '#f0ecd8');
      if (done) continue;
    }
    if (th === 'fire') { c.fillStyle = '#ff7a20'; pPoly(c, [x, y - 7 * sz, x + 3.5 * sz, y + 2 * sz, x, y + 4 * sz, x - 3.5 * sz, y + 2 * sz]); c.fill(); c.fillStyle = '#ffe080'; pCirc(c, x, y + 1.5 * sz, 1.6 * sz); c.fill(); }
    else if (th === 'ice') { c.fillStyle = '#bff0ff'; pPoly(c, [x, y - 8 * sz, x + 3 * sz, y, x, y + 8 * sz, x - 3 * sz, y]); c.fill(); }
    else if (th === 'poison') { c.fillStyle = '#9aff40'; pCirc(c, x, y, 3.4 * sz); c.fill(); c.strokeStyle = '#e8ff90'; c.lineWidth = 1; c.stroke(); }
    else if (th === 'arcane') { c.fillStyle = m.c2; pPoly(c, [x, y - 6 * sz, x + 4 * sz, y, x, y + 6 * sz, x - 4 * sz, y]); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1; c.stroke(); }
    else if (th === 'gold') { c.save(); c.translate(x, y); c.rotate(a + 1.57); c.fillStyle = '#ffe080'; pPoly(c, [0, -8 * sz, 2.4 * sz, 3 * sz, -2.4 * sz, 3 * sz]); c.fill(); c.restore(); }
    else { c.fillStyle = '#f0ecd8'; pCirc(c, x, y, 3.2 * sz); c.fill(); c.fillStyle = '#201810'; pCirc(c, x - 1.1 * sz, y - 0.4 * sz, 0.8 * sz); pCirc(c, x + 1.1 * sz, y - 0.4 * sz, 0.8 * sz); c.fill(); }
  }
  c.restore();
}

/** Màu quầng viền theo trạng thái: cuồng nộ (đỏ) > Boss (màu nhấn) > tinh anh (vàng) */
export function haloColor(m, rage) { return rage ? '#ff3020' : m.boss ? m.c2 : m.elite ? '#ffd54a' : null; }
export const isRage = (m) => !!m.boss && m.maxHp > 0 && m.hp / m.maxHp < 0.4;

// ---------------- HOÀN THIỆN HÌNH KHỐI: viền màu đồng nhất · khối sáng-tối · viền sáng ----------------
// Mọi loài quái được vẽ vào canvas nháp rồi xử lý theo đúng hình bóng của nó (source-atop / source-in), nên áp dụng được cho cả 50+ loại.
const BOX = { x: -52, y: -100, w: 104, h: 120 };          // vùng chứa quái (đơn vị phác)
let SA = null, SB = null, SR = null, budget = 0, pend = false;
function scratch() {
  if (SA) return true;
  if (typeof document === 'undefined') return false;
  const mk = () => { const cv = document.createElement('canvas'); cv.width = 320; cv.height = 370; return cv; };
  SA = mk(); SB = mk(); SR = mk(); return true;
}
/** Còn ngân sách xử lý trong khung hình này không (tối đa 36 con / khung; còn lại vẽ thẳng) */
function allow() {
  if (!pend) { pend = true; budget = 0; requestAnimationFrame(() => { pend = false; }); }
  return ++budget <= 36;
}
/**
 * Vẽ quái đã được hoàn thiện. c đang ở hệ toạ độ quái (gốc = chân, đã scale theo kích thước). draw(ctx) vẽ thân quái.
 * outline: màu viền ngoài; flash: 0..1 nháy trắng khi trúng đòn.
 */
export function drawPolished(c, draw, outline, flash, force = false) {
  const mt = c.getTransform(), k = Math.min(3, Math.max(1, Math.hypot(mt.a, mt.b)));
  if (!scratch() || (!force && !allow())) { draw(c); return; }
  const w = Math.ceil(BOX.w * k), h = Math.ceil(BOX.h * k), setT = (g) => g.setTransform(k, 0, 0, k, -BOX.x * k, -BOX.y * k), clr = (g) => { g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, w + 2, h + 2); };
  const a = SA.getContext('2d'), b = SB.getContext('2d'), r = SR.getContext('2d');
  clr(a); setT(a); draw(a);
  a.setTransform(1, 0, 0, 1, 0, 0); a.globalCompositeOperation = 'source-atop';
  if (flash > 0) { a.globalAlpha = Math.min(0.75, flash * 0.75); a.fillStyle = '#ffffff'; a.fillRect(0, 0, w, h); a.globalAlpha = 1; }
  const g = a.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,248,235,.20)'); g.addColorStop(0.42, 'rgba(255,248,235,0)'); g.addColorStop(1, 'rgba(20,8,34,.30)');
  a.fillStyle = g; a.fillRect(0, 0, w, h);
  // bóng đen viền: hình bóng nhuộm màu viền
  clr(b); b.drawImage(SA, 0, 0); b.globalCompositeOperation = 'source-in'; b.fillStyle = outline; b.fillRect(0, 0, w, h);
  // viền sáng phía trên-trái: hình bóng trừ chính nó lệch xuống-phải
  clr(r); r.drawImage(SA, 0, 0); r.globalCompositeOperation = 'destination-out'; r.drawImage(SA, 2.2, 2.6); r.globalCompositeOperation = 'source-in'; r.fillStyle = '#fffbe8'; r.fillRect(0, 0, w, h);
  const u = 1.7 / k, dx = BOX.x, dy = BOX.y, dw = w / k, dh = h / k;
  for (const [ox, oy] of [[-u, 0], [u, 0], [0, -u], [0, u], [-u, -u], [u, -u], [-u, u], [u, u]]) c.drawImage(SB, 0, 0, w, h, dx + ox, dy + oy, dw, dh);
  c.drawImage(SA, 0, 0, w, h, dx, dy, dw, dh);
  c.globalAlpha = 0.55; c.drawImage(SR, 0, 0, w, h, dx, dy, dw, dh); c.globalAlpha = 1;
}

/** Dựng sẵn một sprite tĩnh đã hoàn thiện (viền + khối sáng-tối) vào canvas riêng: dùng cho vật trang trí. Trả về { cv, box } */
export function bakePolished(draw, outline, k = 2) {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas'); cv.width = Math.ceil(BOX.w * k); cv.height = Math.ceil(BOX.h * k);
  const g = cv.getContext('2d'); g.setTransform(k, 0, 0, k, -BOX.x * k, -BOX.y * k);
  drawPolished(g, draw, outline, 0, true);
  return { cv, box: BOX };
}
