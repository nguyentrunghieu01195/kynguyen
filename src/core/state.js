// Trạng thái toàn cục, chia 3 tầng rõ ràng:
//  G.S — Save data: dữ liệu bền vững của nhân vật (được lưu/tải).
//  G.P — Derived stats: chỉ số tính ra từ S (calcStats), không lưu.
//  G.R — Runtime: thế giới đang chạy (quái, rơi đồ, hiệu ứng…), tạo lại khi vào bản đồ.
import { SPAWN, SAFE_RADIUS } from '../config/constants.js';

export const G = { S: null, P: null, R: null, online: false };

/** Móc mở rộng cho các chế độ đặc biệt (tránh import vòng): auto = AUTO ưu tiên mục tiêu riêng (vd. công thành); trả true nếu đã tự quyết định */
export const HOOKS = { auto: null };

/** Trong thị trấn an toàn của bản đồ hiện tại (đấu trường không có thị trấn) */
export const inSafe = (o) => { const T = G.R && G.R.map ? G.R.map.town : SPAWN; return !!T && Math.hypot(o.x - T.x, o.y - T.y) < (G.R && G.R.map && G.R.map.townR || SAFE_RADIUS); };
