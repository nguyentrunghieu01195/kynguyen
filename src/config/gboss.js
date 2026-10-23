// =====================================================================
//  BOSS BANG HỘI & ĐẤU GIÁ — dữ liệu và số cân bằng
// =====================================================================
// Mỗi ngày mở cổng 2 lần (giờ Việt Nam, UTC+7 — không phụ thuộc múi giờ máy chủ). Trong lúc mở, mỗi thành viên bang
// vào đấu trường riêng, đánh một con Boss không thể hạ gục trong `runSec` giây; sát thương gây ra được tính cho bang.
// Điểm của bang = tổng sát thương LƯỢT TỐT NHẤT của từng thành viên. Hết giờ → xếp hạng bang → quà cho vào đấu giá.

export const GBOSS = {
  name: 'Boss Bang Hội', icon: '🐲',
  tzOffsetMin: 7 * 60,           // giờ Việt Nam
  starts: [12 * 60, 20 * 60],    // 12:00 và 20:00 (phút trong ngày)
  windowMin: 15,                 // cổng mở 15 phút; hết giờ mới tính điểm
  minLevel: 30,
  minActiveSec: 180,             // phải chiến đấu thực sự ≥ 3 phút (mỗi giây có gây sát thương mới tính) mới được tính là tham gia — người yếu vẫn đạt được, người treo máy thì không
  graceMs: 5000,                 // chờ thêm sau khi đóng cổng rồi mới chốt kết quả
  /** Thưởng tham gia (gửi hộp thư cho mọi người đã gây sát thương), theo cấp nhân vật */
  participation: (lv) => ({ zen: Math.round(20000 + lv * 600), bless: 1 }),
};

/** Đấu trường dùng chung: mọi người chơi cùng một khu, cùng một Boss (máy chủ điều khiển Boss duy nhất) */
export const ARENA = {
  x0: 8, x1: 32, y0: 8, y1: 32,
  start: { x: 20, y: 29 },        // chỗ người chơi xuất hiện / hồi sinh
  bossStart: { x: 20, y: 15 },
  room: 'gb',                    // phòng hiện diện: người chơi trong phòng này thấy nhau
  hpMul: 1e9,                    // máu Boss cực lớn: không bao giờ hạ được (hết giờ mới tính điểm)
};
/** Mẫu quái Boss (hình dạng / màu) */
export const BOSS_TPL = { id: 'gbossdragon', name: 'Long Vương Bang Hội', shape: 'dragon', c1: '#2a1646', c2: '#c060ff', size: 1.15 };
/** Hành vi Boss. Sát thương tính theo % máu tối đa của người bị đánh để người cấp thấp vẫn tham gia được */
export const BOSS_AI = {
  spd: 2.4,                      // ô / giây
  reach: 2.3,                    // tầm đánh thường
  hitFrac: 0.07, hitCd: 1.4,     // đòn đánh thường: 7% máu mỗi 1.4 giây (một mục tiêu)
  slamEvery: [7, 10], slamWarn: 1.6, slamR: 3.4, slamFrac: 0.32, // đập đất: báo trước 1.6s, vùng bán kính 3.4, 32% máu, trúng nhiều người
  retarget: 1.5,                 // chỉ đổi mục tiêu khi người khác gần hơn hẳn (hệ số)
};

/** Đợt hiện tại / kế tiếp tại thời điểm `now` (ms). Khoá đợt dạng YYYYMMDD-HHMM (giờ VN) */
export function gbossStatus(now = Date.now()) {
  const off = GBOSS.tzOffsetMin * 60000, vn = now + off, day0 = Math.floor(vn / 864e5) * 864e5;
  const startAt = (k, i) => day0 + k * 864e5 + GBOSS.starts[i] * 60000 - off;
  for (let k = 0; k <= 1; k++) for (let i = 0; i < GBOSS.starts.length; i++) {
    const s = startAt(k, i), e = s + GBOSS.windowMin * 60000;
    if (now >= s && now < e) return { open: true, key: roundKey(s), startAt: s, endAt: e, secLeft: Math.ceil((e - now) / 1000) };
  }
  for (let k = -1; k <= 1; k++) for (let i = 0; i < GBOSS.starts.length; i++) {
    const s = startAt(k, i);
    if (s > now) return { open: false, nextAt: s, secUntil: Math.ceil((s - now) / 1000), key: roundKey(s) };
  }
  return { open: false, secUntil: 0 };
}
function roundKey(startAt) {
  const d = new Date(startAt + GBOSS.tzOffsetMin * 60000), p = (n) => String(n).padStart(2, '0');
  return d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + '-' + p(d.getUTCHours()) + p(d.getUTCMinutes());
}

// ---------------- GIÁ THAM CHIẾU: "TỰ KIẾM / TỰ ÉP" ----------------
// Giá khởi điểm đấu giá được tính từ chi phí tự cày: thời gian cần để tự kiếm đủ đồ + ngọc, quy ra Zen theo thu nhập cày trung bình.
// Số liệu đo bằng bot mô phỏng (tools/sim/balance.mjs, ~950 quái/giờ) và bảng ép đồ UPGRADE (balance.js, đã tính xác suất rớt cấp / vỡ đồ).
export const DIY = {
  zenPerHour: 2000000,                        // thu nhập cày trung bình quy đổi (thấp hơn mức cuối game ~3.2M/giờ để thiên về người chơi giữa game)
  rate: { bless: 8.5, soul: 5.7, chaos: 3.3 }, // ngọc rơi trung bình mỗi giờ cày
  excItemPerHour: 0.7,                        // đồ Hoàn Hảo đúng loại rơi mỗi giờ
  // tài nguyên kỳ vọng để ép 1 món từ +0 lên +N (đã tính các lần thất bại)
  plusCost: { 0: { bless: 0, soul: 0 }, 5: { bless: 5, soul: 0 }, 7: { bless: 6.7, soul: 1.7 }, 9: { bless: 7.8, soul: 10 } },
  tierMul: (tier) => 1 + 0.25 * Math.max(0, tier - 3), // đồ bậc cao chỉ rơi ở bản đồ cuối → đắt hơn
  laborFrac: 0.15,                            // công ép đồ / gom ngọc thêm vào thời gian cày
  startFrac: 0.35,                            // giá khởi điểm = 35% giá tự kiếm; đấu giá đẩy dần lên nhưng thường vẫn rẻ hơn tự cày
};
/** Tài nguyên + thời gian tự cày một phần quà (spec: { item?, jewels? }) */
export function diyOf(spec) {
  const need = { bless: 0, soul: 0, chaos: 0 }; let items = 0, tier = 0;
  if (spec.item) {
    const c = DIY.plusCost[spec.item.plus] || DIY.plusCost[9];
    need.bless += c.bless; need.soul += c.soul; items = 1; tier = spec.item.tier;
  }
  if (spec.jewels) for (const k in spec.jewels) need[k] += spec.jewels[k];
  const tb = need.bless / DIY.rate.bless, ts = need.soul / DIY.rate.soul, tc = need.chaos / DIY.rate.chaos;
  // cày đồ và ngọc diễn ra song song (lấy mốc lâu nhất) + công ép/nhặt riêng lẻ (15% tổng thời gian từng loại)
  const hours = Math.max(tb, ts, tc, items / DIY.excItemPerHour) + DIY.laborFrac * (tb + ts + tc);
  const zen = Math.round((hours * DIY.zenPerHour * (items ? DIY.tierMul(tier) : 1) * (spec.premium || 1)) / 10000) * 10000;
  return { need, items, hours, zen };
}
export const withStart = (spec) => { const d = diyOf(spec); return { ...spec, diy: d.zen, start: Math.max(10000, Math.round((d.zen * DIY.startFrac) / 10000) * 10000) }; };

// ---------------- QUÀ XẾP HẠNG → ĐẤU GIÁ ----------------
// Mỗi "lô" là 1 phiên đấu giá riêng. item: { tier, plus, exc } (loại đồ & lớp vũ khí ngẫu nhiên khi tạo), jewels: { bless, soul, chaos }.
// Giá khởi điểm (start) và giá tham chiếu tự cày (diy) tính tự động từ DIY ở trên.
const J = (b, s, c) => ({ jewels: { bless: b, soul: s, chaos: c } });
export const GBOSS_REWARDS = {
  1: [{ item: { tier: 5, plus: 9, exc: 3 } }, { item: { tier: 4, plus: 7, exc: 3 } }, { item: { tier: 4, plus: 5, exc: 2 } }, J(10, 10, 10)].map(withStart),
  2: [{ item: { tier: 4, plus: 7, exc: 3 } }, { item: { tier: 4, plus: 5, exc: 2 } }, J(6, 6, 6)].map(withStart),
  3: [{ item: { tier: 4, plus: 5, exc: 2 } }, J(4, 4, 4)].map(withStart),
};
export const GBOSS_REWARD_REST = [J(3, 3, 2)].map(withStart); // hạng 4–10
export const GBOSS_MAX_RANK_REWARD = 10;
export const rewardsForRank = (rank) => (GBOSS_REWARDS[rank] || (rank <= GBOSS_MAX_RANK_REWARD ? GBOSS_REWARD_REST : []));

// ---------------- ĐẤU GIÁ ----------------
export const AUCTION = {
  guildMin: 15,                  // đấu giá trong bang: 15 phút (chỉ người đã đánh Boss của bang đó được đặt giá)
  worldMin: 30,                  // không ai đặt trong bang → ra đấu giá thế giới 30 phút (ai cũng đặt được)
  minRaise: 0.05,                // mỗi lần trả giá phải cao hơn giá hiện tại ít nhất 5%
  snipeSec: 30,                  // có người đặt giá khi còn dưới 30 giây → cộng thêm 30 giây để người khác kịp đặt đè
  snipeExtendSec: 30,
  snipeMaxMin: 10,               // tổng thời gian cộng thêm tối đa 10 phút cho mỗi phiên
  maxPrice: 2e9,
  maxLots: 300,                  // giữ tối đa bấy nhiêu phiên (kể cả đã kết thúc gần đây) trong danh sách
};
/** Giá tối thiểu cho lần đặt kế tiếp */
export const nextBid = (lot) => (lot.bid ? lot.bid.amount + Math.max(1, Math.ceil(lot.bid.amount * AUCTION.minRaise)) : lot.start);
