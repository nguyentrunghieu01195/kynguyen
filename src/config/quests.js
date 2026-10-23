// =====================================================================
//  NHIỆM VỤ, ĐIỂM DANH, CÀY OFFLINE — dữ liệu & số cân bằng
// =====================================================================
// Kiểu mục tiêu (goal.type):
//   Đếm sự kiện: kill (mob?: id, boss?: true, strong?: true), event (ev?: 'bc'|'ds'), points, auto, jewel,
//                upgrade (mọi lần ép), upgradeOk (ép thành công), skill, potion, buy, reset
//   Đếm thêm: tower (số tầng tháp vượt được)
//   Kiểm tra trạng thái: towerBest (kỷ lục tháp ≥ n), level (n), plus (có món đồ đang mặc ≥ +n), map (đang ở bản đồ có id), wings (cánh cấp ≥ n)
// Phần thưởng: { zen, exp, bless, soul, chaos, charm, potHp, potMp, item: { slot, tier, plus, exc } }

export const MAIN_QUESTS = [
  { title: 'Bước đầu săn quái', desc: 'Hạ 5 Slime Xanh quanh thị trấn.', goal: { type: 'kill', mob: 'slime', n: 5 }, reward: { zen: 1000, potHp: 10 } },
  { title: 'Rèn luyện bản thân', desc: 'Mở bảng Nhân vật và cộng 5 điểm tiềm năng.', goal: { type: 'points', n: 5 }, reward: { bless: 1 } },
  { title: 'Trợ thủ đắc lực', desc: 'Bật nút AUTO để nhân vật tự động săn quái.', goal: { type: 'auto', n: 1 }, reward: { zen: 2000 } },
  { title: 'Chiến binh tập sự', desc: 'Đạt cấp 5.', goal: { type: 'level', n: 5 }, reward: { potHp: 20, potMp: 10 } },
  { title: 'Ngọc quý', desc: 'Nhặt được 1 viên ngọc bất kỳ từ quái.', goal: { type: 'jewel', n: 1 }, reward: { soul: 1 } },
  { title: 'Thợ rèn nhập môn', desc: 'Vào Ép đồ, dùng Ngọc Ước Nguyện ép thành công 1 lần.', goal: { type: 'upgradeOk', n: 1 }, reward: { bless: 2 } },
  { title: 'Dọn sạch đồng cỏ', desc: 'Hạ 40 quái bất kỳ.', goal: { type: 'kill', n: 40 }, reward: { zen: 5000 } },
  { title: 'Món quà của trưởng làng', desc: 'Đạt cấp 12.', goal: { type: 'level', n: 12 }, reward: { item: { slot: 'weapon', tier: 0, plus: 3, exc: 2 } } },
  { title: 'Hạ bệ Vua Slime', desc: 'Boss Vua Slime xuất hiện ở góc xa bản đồ. Hạ gục nó!', goal: { type: 'kill', mob: 'kingslime', n: 1 }, reward: { bless: 2, soul: 1 } },
  { title: 'Bóng tối phía trước', desc: 'Đạt cấp 15 rồi đến Rừng Hắc Ám (bảng Bản đồ).', goal: { type: 'map', id: 'darkwood' }, reward: { zen: 10000 } },
  { title: 'Lâu đài nhuốm máu', desc: 'Tham gia sự kiện Huyết Lâu 1 lần (bảng Sự kiện, mở lúc :00 và :30 mỗi giờ).', goal: { type: 'event', ev: 'bc', n: 1 }, reward: { ticketDs: 1, zen: 15000 } },
  { title: 'Ánh sáng đầu tiên', desc: 'Ép một món đồ đang mặc lên +4.', goal: { type: 'plus', n: 4 }, reward: { chaos: 3, bless: 1 } },
  { title: 'Đôi cánh đầu tiên', desc: 'Chế tạo Cánh Lông Vũ trong bảng Ép đồ.', goal: { type: 'wings', n: 1 }, reward: { zen: 20000, potHp: 50 } },
  { title: 'Hầm mộ lạnh lẽo', desc: 'Đạt cấp 60 rồi đến Hầm Mộ Cổ.', goal: { type: 'map', id: 'crypt' }, reward: { zen: 50000, soul: 2 } },
  { title: 'Phá giấc ngủ ngàn năm', desc: 'Hạ boss Vua Xương.', goal: { type: 'kill', mob: 'boneking', n: 1 }, reward: { chaos: 2, charm: 1 } },
  { title: 'Vũ khí phát sáng', desc: 'Ép một món đồ đang mặc lên +7.', goal: { type: 'plus', n: 7 }, reward: { item: { slot: 'armor', tier: 2, plus: 3, exc: 2 } } },
  { title: 'Miền băng giá', desc: 'Đạt cấp 120 rồi đến Băng Nguyên.', goal: { type: 'map', id: 'tundra' }, reward: { zen: 200000 } },
  { title: 'Kẻ thống trị băng tuyết', desc: 'Hạ boss Rồng Băng.', goal: { type: 'kill', mob: 'icedragon', n: 1 }, reward: { chaos: 3, soul: 3 } },
  { title: 'Thử thách Tháp Vô Tận', desc: 'Đạt cấp 100 rồi vượt tầng 5 Tháp Vô Tận (bảng Sự kiện).', goal: { type: 'towerBest', n: 5 }, reward: { chaos: 2, charm: 1, zen: 100000 } },
  { title: 'Sa mạc rực lửa', desc: 'Đạt cấp 190 rồi đến Sa Mạc Lửa.', goal: { type: 'map', id: 'desert' }, reward: { zen: 500000, charm: 2 } },
  { title: 'Diệt Hỏa Long', desc: 'Hạ boss Hỏa Long.', goal: { type: 'kill', mob: 'firedragon', n: 1 }, reward: { chaos: 5 } },
  { title: 'Thiên giới đọa lạc', desc: 'Đạt cấp 270 rồi đến Thiên Giới Đọa Lạc.', goal: { type: 'map', id: 'fallen' }, reward: { zen: 1000000 } },
  { title: 'Đỉnh cao sức mạnh', desc: 'Đạt cấp 300.', goal: { type: 'level', n: 300 }, reward: { zen: 1000000 } },
  { title: 'Tái sinh', desc: 'Thực hiện Reset lần đầu tiên.', goal: { type: 'reset', n: 1 }, reward: { chaos: 10, bless: 10, soul: 10, charm: 3 } },
];

/** Nhiệm vụ hằng ngày: mỗi ngày chọn ngẫu nhiên DAILY.perDay nhiệm vụ (theo ngày, giống nhau cả ngày) */
export const DAILY_POOL = [
  { id: 'kill', title: 'Săn quái', desc: 'Hạ 150 quái', goal: { type: 'kill', n: 150 } },
  { id: 'strong', title: 'Đối thủ xứng tầm', desc: 'Hạ 60 quái có cấp ≥ cấp bạn − 5', goal: { type: 'kill', strong: true, n: 60 } },
  { id: 'boss', title: 'Thợ săn Boss', desc: 'Hạ 1 Boss bất kỳ', goal: { type: 'kill', boss: true, n: 1 } },
  { id: 'upgrade', title: 'Lò rèn', desc: 'Ép đồ 3 lần (thành công hay thất bại đều tính)', goal: { type: 'upgrade', n: 3 } },
  { id: 'skill', title: 'Tinh thông kỹ năng', desc: 'Dùng kỹ năng 40 lần', goal: { type: 'skill', n: 40 } },
  { id: 'jewel', title: 'Nhà sưu tầm ngọc', desc: 'Nhặt 3 viên ngọc', goal: { type: 'jewel', n: 3 } },
  { id: 'potion', title: 'Hồi phục', desc: 'Dùng 15 bình thuốc', goal: { type: 'potion', n: 15 } },
  { id: 'event', title: 'Chiến binh sự kiện', desc: 'Tham gia 1 sự kiện bất kỳ', goal: { type: 'event', n: 1 } },
  { id: 'tower', title: 'Leo tháp', desc: 'Vượt 3 tầng Tháp Vô Tận', goal: { type: 'tower', n: 3 }, req: (S) => S.lv >= 100 || S.resets >= 1 },
  { id: 'buy', title: 'Khách quen', desc: 'Mua đồ ở Cửa hàng 1 lần', goal: { type: 'buy', n: 1 } },
];

export const DAILY = {
  perDay: 5,
  activityPerQuest: 20,
  /** Phần thưởng mỗi nhiệm vụ ngày, theo cấp nhân vật */
  questReward: (lv) => ({ zen: Math.round(2000 + lv * 400) }),
  /** Rương năng động: đủ điểm thì mở */
  chests: [
    { at: 40, reward: (lv) => ({ bless: 1, potHp: 20 }) },
    { at: 60, reward: (lv) => ({ soul: 1, zen: Math.round(5000 + lv * 800) }) },
    { at: 100, reward: (lv) => ({ chaos: 1, bless: 1, soul: 1, charm: lv >= 50 ? 1 : 0, ticketBc: 1 }) },
  ],
};

/** Điểm danh: chu kỳ 7 ngày, không mất chuỗi khi bỏ lỡ. Chu kỳ sau thưởng Zen nhân lên. */
export const CHECKIN = [
  { zen: 5000, potHp: 20 },
  { bless: 2 },
  { zen: 15000, potMp: 30, ticketBc: 1 },
  { soul: 2 },
  { zen: 30000, charm: 1, ticketDs: 1 },
  { bless: 3, soul: 2 },
  { chaos: 3, charm: 2, zen: 50000 }, // Ngày 7: quà lớn
];
export const CHECKIN_ZEN_GROWTH = 0.5; // mỗi chu kỳ +50% Zen

/** Cày khi vắng mặt */
export const OFFLINE = {
  minMinutes: 5,
  capHours: 8,
  efficiency: 0.5,    // hiệu suất so với chơi trực tiếp
  travelSec: 2,       // thời gian tìm quái mỗi lần hạ
  skillBonus: 1.3,    // hệ số sát thương nhờ kỹ năng
  zenPerKillLv: 8,
  gapFree: 10,        // chênh cấp (người − quái) chưa bị giảm EXP
  gapRange: 30,       // mỗi 30 cấp chênh thêm → EXP về mức tối thiểu
  gapMinFactor: 0.1,
  jewelFactor: 0.3,   // tỉ lệ rơi ngọc offline so với online
};
