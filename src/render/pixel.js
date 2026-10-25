// Phiên bản giao diện PIXEL: thế giới vẽ ở độ phân giải thấp + bảng màu giới hạn, phông canvas đổi sang VT323, bộ CSS html.pixel.
// Bật: ?style=pixel (ghi nhớ trong localStorage 'kng_style'); trở về mặc định: ?style=default.
let on = null;
export const pixelOn = () => {
  if (on === null) {
    try {
      const q = new URLSearchParams(location.search).get('style');
      if (q !== null) localStorage.setItem('kng_style', q === 'pixel' ? 'pixel' : 'default');
      on = localStorage.getItem('kng_style') === 'pixel';
    } catch (e) { on = false; }
  }
  return on;
};

/** Gọi 1 lần lúc khởi động: gắn lớp CSS và đổi phông vẽ chữ trên canvas */
export function initPixel() {
  if (!pixelOn()) return;
  document.documentElement.classList.add('pixel');
  const d = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'font');
  if (!d || !d.set) return;
  Object.defineProperty(CanvasRenderingContext2D.prototype, 'font', {
    get: d.get, configurable: true,
    set(v) { d.set.call(this, String(v).replace(/^(?:(?:bold|\d{3})\s+)?(\d+(?:\.\d+)?)px\s.*$/, (m, sz) => Math.round(sz * 1.45) + 'px VT323, monospace')); },
  });
}

const LOS = new Map();
// Bảng màu cố định 32 màu (Endesga 32) — tra bảng 4 bit/kênh cho nhanh
const PAL = 'be4a2f d77643 ead4aa e4a672 b86f50 733e39 3e2731 a22633 e43b44 f77622 feae34 fee761 63c74d 3e8948 265c42 193c3e 124e89 0099db 2ce8f5 ffffff c0cbdc 8b9bb4 5a6988 3a4466 262b44 181425 ff0044 68386c b55088 f6757a e8b796 c28569'.split(' ').map((h) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]);
let LUT = null;
function lut() {
  if (LUT) return LUT; LUT = new Uint8Array(4096 * 3);
  for (let i = 0; i < 4096; i++) {
    const r = ((i >> 8) & 15) * 17, g = ((i >> 4) & 15) * 17, b = (i & 15) * 17; let best = 0, bd = 1e9;
    for (let k = 0; k < PAL.length; k++) { const q = PAL[k], rm = (r + q[0]) / 2, dr = r - q[0], dg = g - q[1], db = b - q[2], d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db; if (d < bd) { bd = d; best = k; } }
    LUT[i * 3] = PAL[best][0]; LUT[i * 3 + 1] = PAL[best][1]; LUT[i * 3 + 2] = PAL[best][2];
  }
  return LUT;
}
/** Thanh máu pixel: viền đậm, nền tối, phần máu theo khối 2 px, vệt sáng phía trên (toạ độ thế giới, tâm tại x) */
export function pxBar(c, x, y, w, frac, col, h = 5) {
  const f = Math.max(0, Math.min(1, frac)), fw = Math.round((w * f) / 2) * 2;
  c.fillStyle = '#181425'; c.fillRect(x - w / 2 - 2, y - 2, w + 4, h + 4);
  c.fillStyle = '#3a4466'; c.fillRect(x - w / 2, y, w, h);
  c.fillStyle = col; c.fillRect(x - w / 2, y, fw, h);
  c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(x - w / 2, y, fw, 1.5);
}
/** Làm pixel toàn bộ nội dung đã vẽ trên canvas c (kích thước w×h px): thu nhỏ k lần, giảm màu, phóng lại không làm mịn */
export function pixelate(c, w, h, k, quant = true) {
  const lw = Math.ceil(w / k), lh = Math.ceil(h / k);
  const kk = lw + 'x' + lh; let e = LOS.get(kk); if (!e) { if (LOS.size > 6) LOS.clear(); const cv = document.createElement('canvas'); cv.width = lw; cv.height = lh; e = { lo: cv, lg: cv.getContext('2d', { willReadFrequently: true }) }; LOS.set(kk, e); }
  const lo = e.lo, lg = e.lg;
  c.setTransform(1, 0, 0, 1, 0, 0);
  lg.clearRect(0, 0, lw, lh); lg.imageSmoothingEnabled = true; lg.imageSmoothingQuality = 'medium'; lg.drawImage(c.canvas, 0, 0, w, h, 0, 0, lw, lh);
  if (quant) {
    const img = lg.getImageData(0, 0, lw, lh), d = img.data, T = lut();
    for (let i = 0; i < d.length; i += 4) { const j = (((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4)) * 3; d[i] = T[j]; d[i + 1] = T[j + 1]; d[i + 2] = T[j + 2]; d[i + 3] = d[i + 3] > 110 ? 255 : 0; }
    lg.putImageData(img, 0, 0);
  }
  c.imageSmoothingEnabled = false; c.drawImage(lo, 0, 0, lw, lh, 0, 0, lw * k, lh * k);
}
