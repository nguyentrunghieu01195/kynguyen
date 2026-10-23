// =====================================================================
//  THÁP VÔ TẬN — thử thách cho người chơi cấp cao
// =====================================================================
// Mỗi tầng là một đấu trường nhỏ: hạ hết quái trong thời gian giới hạn để lên tầng.
// Cứ 5 tầng có Boss. Vùng đất (quái & màu) chọn theo cấp quái của tầng, vượt cấp 320 thì xoay vòng 3 vùng cuối.
// Quái trong tháp có cấp cố định theo tầng (không theo cấp người chơi) → đo đúng sức mạnh.

export const TOWER = {
  name: 'Tháp Vô Tận',
  icon: '🗼',
  unlock: { level: 100, orResets: 1 },  // cấp ≥ 100 hoặc đã Reset
  attemptsPerDay: 3,
  checkpointEvery: 5,                    // bắt đầu lại từ mốc 5 tầng gần nhất đã vượt
  breakSec: 3,                           // nghỉ giữa các tầng
  healOnClear: 0.3,                      // hồi 30% HP/MP khi vượt tầng
  /** Cấp quái theo tầng */
  mobLevel: (floor) => 95 + floor * 5,
  /** Hệ số máu thêm theo tầng (tầng cao trâu hơn) */
  hpMul: (floor) => 1 + floor * 0.03,
  /** Số quái thường mỗi tầng */
  mobCount: (floor) => Math.min(20, 8 + Math.floor(floor / 4)),
  timeLimit: (floor) => (floor % 5 === 0 ? 120 : 90),
  bossEvery: 5,
  bossAdds: 3,
  /** Hiệu ứng tầng: tầng chia hết cho 3 có 1 hiệu ứng ngẫu nhiên (cố định theo số tầng) */
  modifierEvery: 3,
  modifiers: [
    { id: 'swift', name: 'Cuồng Phong', desc: 'Quái di chuyển nhanh hơn 40%', spd: 1.4 },
    { id: 'tough', name: 'Giáp Đá', desc: 'Quái có thêm 40% máu', hp: 1.4 },
    { id: 'frenzy', name: 'Cuồng Nộ', desc: 'Quái gây thêm 30% sát thương, thưởng EXP +30%', dmg: 1.3, exp: 1.3 },
    { id: 'horde', name: 'Bầy Đàn', desc: 'Thêm 50% số quái nhưng mỗi con yếu hơn', count: 1.5, hp: 0.7 },
  ],
  /** Thưởng vượt tầng lần đầu */
  firstClear: (floor, mobExp, expRate) => {
    const r = { zen: 5000 + floor * 3000, exp: Math.round(mobExp * expRate * 15) };
    if (floor % 5 === 0) Object.assign(r, { bless: 2, soul: 1, chaos: 1 });
    if (floor % 10 === 0) Object.assign(r, { chaos: 2 + Math.floor(floor / 20), charm: 1, item: { tier: null, plus: Math.min(9, 3 + Math.floor(floor / 10)), exc: 2 } });
    return r;
  },
  /** Thưởng khi vượt lại tầng đã từng vượt */
  repeatFactor: { zen: 0.2, exp: 0.3 },
  /** Mốc hiển thị trong bảng (tầng: mô tả) */
  milestones: [5, 10, 20, 30, 50, 75, 100],
};
