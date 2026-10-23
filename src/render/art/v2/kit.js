// Bộ công cụ vẽ của phong cách V2: "Chibi Dark Fantasy"
//  - Viền tối 1.5px theo màu gốc (không dùng đen thuần)
//  - Đổ bóng 3 tông: shadow / base / highlight + viền sáng (rim light)
//  - Hình khối tròn trịa, đầu to (tỉ lệ chibi ~1:2.2)
import { mix } from '../../paint.js';

const cache = {};
/** Bảng tông màu từ 1 màu gốc */
export function tones(base) {
  if (cache[base]) return cache[base];
  return (cache[base] = {
    b: base,
    s: mix(base, '#1a1030', 0.28),   // bóng: hơi ngả tím cho có chiều sâu
    d: mix(base, '#0c0614', 0.5),
    h: mix(base, '#ffffff', 0.35),
    hh: mix(base, '#ffffff', 0.65),
    o: mix(base, '#0a0612', 0.72),   // viền
  });
}

export const OUTLINE_W = 1.5;

// ---------- đường dẫn (path) ----------
export function pEll(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2); }
export function pCirc(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2); }
export function pPoly(c, pts) { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); }
export function pRR(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

/** Tô + viền path hiện tại */
export function fs(c, fill, stroke, lw = OUTLINE_W) {
  c.fillStyle = fill; c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.lineJoin = 'round'; c.stroke(); }
}

/** Gradient dọc cho khối (sáng trên, tối dưới) */
export function vgrad(c, y0, y1, top, bottom) { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, top); g.addColorStop(1, bottom); return g; }
export function rgrad(c, x, y, r0, r1, inner, outer) { const g = c.createRadialGradient(x, y, r0, x, y, r1); g.addColorStop(0, inner); g.addColorStop(1, outer); return g; }

/** Khối có đổ bóng 3 tông: path được tạo bởi fn() */
export function shaded(c, fn, base, top, bottom) {
  const T = tones(base);
  fn(); c.fillStyle = vgrad(c, top, bottom, T.h, T.s); c.fill();
  c.strokeStyle = T.o; c.lineWidth = OUTLINE_W; c.lineJoin = 'round'; c.stroke();
  return T;
}

/** Đốm sáng bóng (specular) */
export function gloss(c, x, y, rx, ry, a = 0.55) { c.save(); c.globalAlpha = a; c.fillStyle = '#fff'; pEll(c, x, y, rx, ry, -0.4); c.fill(); c.restore(); }

/** Bóng đổ trên mặt đất */
export function groundShadow(c, rx, ry, a = 0.35) {
  c.save(); c.fillStyle = rgrad(c, 0, 0, 0, rx, 'rgba(0,0,0,' + a + ')', 'rgba(0,0,0,0)'); c.scale(1, ry / rx); pCirc(c, 0, 0, rx); c.fill(); c.restore();
}

/** Mắt chibi: lòng trắng + con ngươi + điểm sáng */
export function eye(c, x, y, r, iris = '#1a1a2a', look = 0.4) {
  pEll(c, x, y, r * 0.8, r); fs(c, '#fff', '#2a1a20', 0.8);
  pCirc(c, x + look * r * 0.3, y + r * 0.1, r * 0.55); c.fillStyle = iris; c.fill();
  pCirc(c, x + look * r * 0.3 - r * 0.2, y - r * 0.25, r * 0.22); c.fillStyle = '#fff'; c.fill();
}

/** Mắt phát sáng (quái hung dữ) */
export function glowEye(c, x, y, r, col) {
  c.save(); c.shadowColor = col; c.shadowBlur = 8; pEll(c, x, y, r, r * 0.7); c.fillStyle = col; c.fill(); c.restore();
  pCirc(c, x, y, r * 0.35); c.fillStyle = '#fff'; c.fill();
}

/** Tia lấp lánh 4 cánh */
export function sparkle(c, x, y, r, col = '#fff', a = 1) {
  c.save(); c.globalAlpha = a; c.fillStyle = col;
  c.beginPath(); c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r); c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r); c.fill();
  c.restore();
}

/** Hạt ngẫu nhiên ổn định theo seed (để vẽ hiệu ứng không nhấp nháy) */
export const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
