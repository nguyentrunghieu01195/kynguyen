// ĐỒ THẦN: nâng đồ Thiên Thần (bậc 6) lên "Thần cấp" bằng Mảnh Thần. Không rơi trực tiếp — phải rèn.
// Thần cấp 1..5: mỗi cấp tăng chỉ số gốc thêm 18%; mặc nhiều món Thần kích hoạt hiệu ứng "Thần Uy".
export const DIVINE = {
  tier: 5,            // chỉ đồ Thiên Thần (bậc 6) mới thần hoá được
  minPlus: 9,         // cần ép từ +9
  maxGod: 5,
  color: '#ff7aff',
  slots: ['weapon', 'helm', 'armor', 'pants', 'gloves', 'boots'],
  /** Phí thần hoá (lên Thần cấp 1) */
  ascend: { zen: 10000000, chaos: 5, rate: 70, shards: { weapon: 12, armor: 8, pants: 6, helm: 5, gloves: 4, boots: 4 } },
  /** Phí lên Thần cấp g+1 (index = cấp hiện tại g: 1..4) */
  up: [null, { zen: 15000000, chaos: 8, shards: 6, rate: 80 }, { zen: 30000000, chaos: 12, shards: 10, rate: 60 }, { zen: 60000000, chaos: 18, shards: 16, rate: 45 }, { zen: 120000000, chaos: 25, shards: 24, rate: 30 }],
  /** Hệ số chỉ số gốc theo Thần cấp */
  mult: (g) => 1 + 0.18 * g,
  /** Thần Uy: số món Thần (vũ khí + 5 giáp, tối đa 6) → chỉ số cộng thêm (cộng dồn các mốc đã đạt) */
  setBonus: [[3, { dmg: 12, def: 12 }], [5, { crit: 8, hp: 15, skill: 15 }], [6, { dmg: 20, cd: 10 }]],
  /** Mảnh Thần rơi: Boss (bản đồ bậc ≥ 4) 1–3 mảnh; tinh anh / quái thường ở bản đồ bậc 6 theo xác suất */
  /** Tách đồ Thiên Thần chưa thần hoá (từ +9) thành Mảnh Thần: cơ bản + thưởng nếu Hoàn Hảo / +12 */
  dismantle: { base: 1, exc: 1, plus12: 1 },
  drop: { bossMapTier: 4, boss: [1, 2], eliteChance: 0.03, mobChance: 0.0005, mobMapTier: 5 },
};
/** Tên đồ Thần: vũ khí theo class, giáp theo ô */
export const DIVINE_NAMES = {
  weapon: { knight: 'Thần Kiếm Vô Cực', wizard: 'Thần Trượng Hỗn Nguyên', archer: 'Thần Cung Thiên Lý' },
  helm: 'Thần Miện', armor: 'Thần Giáp', pants: 'Thần Khố', gloves: 'Thần Thủ', boots: 'Thần Hài',
};
export const godDropMult = (it) => (it && it.god ? DIVINE.mult(it.god) : 1);
