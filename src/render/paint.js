// Hàm vẽ cơ bản dùng chung cho mọi bộ đồ hoạ
import { clamp } from '../core/utils.js';

export function ell(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2); c.fill(); }
export function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2); c.fill(); }
export function poly(c, pts) { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); c.fill(); }
export function rrect(c, x, y, w, h, r) { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); }

/** Làm sáng/tối màu hex theo lượng p (-255..255). Trả về chuỗi rgb(). */
export function shade(hex, p) {
  const n = parseInt(hex.slice(1, 7), 16);
  return 'rgb(' + clamp((n >> 16) + p, 0, 255) + ',' + clamp(((n >> 8) & 255) + p, 0, 255) + ',' + clamp((n & 255) + p, 0, 255) + ')';
}

/** Trộn 2 màu hex, trả về hex */
export function mix(a, b, t) {
  const pa = parseInt(a.slice(1, 7), 16), pb = parseInt(b.slice(1, 7), 16);
  const ch = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}

/** Màu phát sáng của vũ khí theo cấp ép */
export function glowColor(plus, t) {
  if (plus >= 13) return 'hsl(' + Math.floor((t * 120) % 360) + ',100%,60%)';
  if (plus >= 11) return '#ff4040';
  if (plus >= 9) return '#ffd700';
  if (plus >= 7) return '#66aaff';
  return null;
}
