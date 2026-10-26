// =====================================================================
//  CÔNG THÀNH CHIẾN — dữ liệu và số cân bằng
// =====================================================================
// Hằng tuần một trận: bang giữ thành (thủ) đấu với tối đa 3 bang công trong MỘT đấu trường dùng chung.
// Phá Cổng Thành rồi chiếm / giữ Ngai Vàng; hết giờ bang giữ ngai lâu nhất thắng và chiếm thành 1 tuần.
import { CLASSES } from './classes.js';
export const SIEGE = {
  name: 'Công Thành Chiến', icon: '🏯',
  // ---- lịch (giờ Việt Nam UTC+7) ----
  tzOffsetMin: 7 * 60,
  weekday: 0,                    // 0 = Chủ nhật
  startMin: 20 * 60,             // 20:00
  battleMin: 30,                 // trận kéo dài 30 phút
  regCloseMin: 30,               // đóng đăng ký 30 phút trước giờ đánh
  // ---- quy mô & điều kiện ----
  maxAttackers: 3,               // tối đa 3 bang công (lần đầu chưa có chủ thành thì cổng do NPC giữ)
  maxPerGuild: 25,               // tối đa 25 người mỗi bang vào trận
  minLevel: 50,                  // cấp tối thiểu của người vào trận
  minGuildLv: 2,                 // cấp bang tối thiểu để đăng ký
  regFee: 2000000,               // phí đăng ký (Zen) do bang chủ/phó trả
  minActiveSec: 300,             // phải chiến đấu ≥ 5 phút (có đánh / bị đánh / giữ ngai) mới được nhận thưởng
  // ---- PvP ----
  pvpCoef: 0.25,                 // hệ số giảm sát thương người đánh người (chỉ số thật × 0.25)
  respawnSec: 6,                 // hồi sinh sau 6 giây tại điểm xuất phát của bang
  spawnProtSec: 3,               // bất tử 3 giây sau khi hồi sinh
  maxProxies: 30,                // tối đa 30 người địch gần nhất có thể chọn làm mục tiêu cùng lúc (giảm tải khi đông)
  viewRadius: 20,                // chỉ tạo "đại diện" cho người địch trong tầm này (nhẹ cho máy chủ)
  maxHitRange: 16,               // sát thương PvP chỉ nhận nếu người đánh cách mục tiêu không quá số ô này
  // ---- Cổng Thành & Ngai Vàng ----
  gate: { x: 20, y: 26.4, x0: 18, x1: 23, hp: 120000, unit: 10 }, // x0..x1: các ô cổng trên tường dưới (y = castle.y1-1);  // máu tính theo "đòn" (mỗi đòn thường = 10 điểm, kỹ năng = 10 × hệ số) — không phụ thuộc cấp người đánh
  throne: { x: 20, y: 20, r: 2.6, captureSec: 10 },
  // điểm xuất phát: ô 0 = bang thủ (trong thành, sau tường), ô 1–3 = ba bang công ở ba hướng bên ngoài
  spawns: [{ x: 20, y: 16.5 }, { x: 6, y: 6 }, { x: 34, y: 6 }, { x: 20, y: 34 }],
  teamColors: ['#4aa8ff', '#ff5a4a', '#5aff7a', '#ffd54a'],
  area: { x0: 3, x1: 37, y0: 3, y1: 37 },
  castle: { x0: 14, x1: 26, y0: 14, y1: 26 }, // tường thành (cổng ở cạnh dưới)
};

// ---- quyền lợi bang giữ thành ----
export const CASTLE = {
  buff: { dmg: 5, hp: 5, def: 5, zen: 15 },   // % cộng thêm cho mọi thành viên bang giữ thành (tới khi đổi chủ — tối đa 1 tuần)
  taxShare: 0.3,                              // 30% phí chợ (5%) chuyển vào quỹ bang chủ thành ⇒ 1.5% giá bán; số tiền người bán nhận KHÔNG đổi
  participation: (lv) => ({ zen: lv * 3000, bless: 2, soul: 2 }), // thưởng cho mọi người đủ điều kiện (bang thắng ×2)
  winnerMul: 2,
};
/** Quà bang thắng: 1 vũ khí đặc biệt (Hoàn Hảo +9, bậc cao nhất) cho mỗi class, vào đấu giá bang 15' → thế giới 30'. Giá tham chiếu × premium vì chỉ có từ công thành */
export const siegeRewardSpecs = (withStart) => Object.keys(CLASSES).map((cls) => withStart({ item: { tier: 5, plus: 9, exc: 3, slot: 'weapon', cls, special: true }, premium: 1.8 }));

export const PVP_TPL = { id: 'pvp', name: 'Đối thủ', shape: 'humanoid', c1: '#888', c2: '#ddd', size: 1 };
export const GATE_TPL = { id: 'sgate', name: 'Cổng Thành', shape: 'gate', c1: '#6a5a4a', c2: '#ffb050', size: 1.6 };

// ---- thời gian ----
/** Mốc đánh kế tiếp / đang diễn ra tại thời điểm now. Trả về { phase: 'battle'|'reg'|'closed', startAt, endAt, regCloseAt, key } */
export function siegeStatus(now = Date.now()) {
  const off = SIEGE.tzOffsetMin * 60000, vn = now + off, day = 864e5;
  const dow = new Date(vn).getUTCDay(), day0 = Math.floor(vn / day) * day;
  let ahead = (SIEGE.weekday - dow + 7) % 7;
  const startOf = (a) => day0 + a * day + SIEGE.startMin * 60000 - off;
  let startAt = startOf(ahead);
  // đang trong trận tuần này hoặc đã qua trận hôm nay → lấy mốc phù hợp
  const endAt = startAt + SIEGE.battleMin * 60000;
  if (now >= endAt) { ahead += 7; startAt = startOf(ahead); }
  const regCloseAt = startAt - SIEGE.regCloseMin * 60000, end = startAt + SIEGE.battleMin * 60000;
  const phase = now >= startAt && now < end ? 'battle' : now < regCloseAt ? 'reg' : 'closed'; // closed: đã đóng đăng ký, chờ giờ đánh
  return { phase, startAt, endAt: end, regCloseAt, key: keyOf(startAt), secLeft: phase === 'battle' ? Math.ceil((end - now) / 1000) : 0, secUntil: phase === 'battle' ? 0 : Math.ceil((startAt - now) / 1000) };
}
function keyOf(startAt) {
  const d = new Date(startAt + SIEGE.tzOffsetMin * 60000), p = (n) => String(n).padStart(2, '0');
  return 'sg' + d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate());
}
