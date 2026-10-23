// Chống lạm dụng: lấy IP thật an toàn, giới hạn tần suất tin nhắn WebSocket, nhật ký sự kiện đáng ngờ.

const PRIVATE = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd|::ffff:(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.))/i;
export const isPrivateIp = (ip) => PRIVATE.test(String(ip || ''));
export const isLoopback = (ip) => /^(127\.|::1$|::ffff:127\.)/.test(String(ip || ''));

/**
 * IP khách. Chỉ tin tiêu đề X-Forwarded-For khi kết nối đến từ proxy nội bộ (loopback / mạng riêng) hoặc đặt TRUST_PROXY=1 —
 * nếu không, kẻ tấn công tự điền tiêu đề để đổi IP và vượt giới hạn đăng ký / đăng nhập.
 */
export function clientIp(headers, remote, trustProxy = false) {
  const r = String(remote || '');
  const xff = headers && headers['x-forwarded-for'];
  if (xff && (trustProxy || isPrivateIp(r))) { const list = String(xff).split(',').map((x) => x.trim()).filter(Boolean); return list[list.length - 1] || r; } // phần tử cuối do proxy tin cậy thêm vào
  return r;
}

/** Xô token: cho phép `rate` tin/giây, bùng nổ tối đa `burst`. take() trả false khi hết token */
export class Bucket {
  constructor(rate, burst, now = Date.now()) { this.rate = rate; this.burst = burst; this.tokens = burst; this.at = now; }
  take(now = Date.now()) {
    this.tokens = Math.min(this.burst, this.tokens + ((now - this.at) / 1000) * this.rate); this.at = now;
    if (this.tokens < 1) return false;
    this.tokens -= 1; return true;
  }
}

/** Nhật ký sự kiện đáng ngờ (vòng 500 mục) + đếm theo khoá; dùng cho trang quản trị */
const ring = [], counts = new Map();
export function audit(kind, who, detail = '') {
  const now = Date.now(), key = kind + ':' + who;
  const c = counts.get(key) || { n: 0, first: now, last: now }; c.n++; c.last = now; counts.set(key, c);
  if (c.n === 1 || c.n % 20 === 0) { ring.push({ at: now, kind, who, detail: String(detail).slice(0, 120), n: c.n }); if (ring.length > 500) ring.shift(); console.warn('[audit]', kind, who, c.n > 1 ? '×' + c.n : '', detail); }
  if (counts.size > 5000) for (const [k, v] of counts) if (now - v.last > 36e5) counts.delete(k);
  return c.n;
}
export const auditLog = () => ring.slice().reverse();
export const auditCount = (kind, who) => (counts.get(kind + ':' + who) || { n: 0 }).n;

/** Tra cứu khoá do người dùng gửi: chỉ nhận thuộc tính riêng (chặn __proto__ / constructor…) */
export const own = (o, k) => (o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined);
