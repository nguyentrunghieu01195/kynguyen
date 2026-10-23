export const rnd = (a, b) => a + Math.random() * (b - a);
export const rint = (a, b) => Math.floor(rnd(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const chance = (p) => Math.random() < p;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const uid = () => Math.random().toString(36).slice(2, 10);

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function fmt(n) {
  n = Math.floor(n);
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e5) return (n / 1e3).toFixed(0) + 'K';
  return n.toLocaleString('vi-VN');
}

/** RNG có seed — để bản đồ luôn giống nhau mỗi lần vào */
export function seededRng(seed) {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Di chuyển o về (tx,ty). Trả về true khi đã tới nơi. Cập nhật o.face (hướng trên màn hình). */
export function moveToward(o, tx, ty, spd, dt) {
  const dx = tx - o.x, dy = ty - o.y, d = Math.hypot(dx, dy);
  if (d < 0.05) return true;
  const s = Math.min(d, spd * dt);
  o.x += (dx / d) * s;
  o.y += (dy / d) * s;
  const sd = dx - dy;
  if (Math.abs(sd) > 0.02) o.face = sd > 0 ? 1 : -1;
  return d <= s + 0.001;
}
