// =====================================================================
//  TRANG BỊ MỞ RỘNG: loại vũ khí & bộ giáp (2 dòng mỗi bậc) có hiệu ứng bộ
// =====================================================================
import { WEAPON_NAMES } from './items.js';

/** Tính từ theo bậc, dùng ghép tên vũ khí loại mới: "Rìu Băng Phong", "Nỏ Thiên Thần"… */
export const TIER_ADJ = ['Thô', 'Thép', 'Xương', 'Băng Phong', 'Hỏa Ngục', 'Thiên Thần'];

/**
 * Loại vũ khí theo class. mods (tỉ lệ):
 *   dmg, spd, mp: % cộng thêm (0.18 = +18%) · crit, def: điểm % cộng thẳng
 *   range: cộng tầm đánh (ô) · skill/basic: % sát thương kỹ năng / đánh thường
 *   skillArea: % bán kính kỹ năng · extraArrows: số mũi tên thêm cho Mưa Tên
 * Loại đầu tiên của mỗi class giữ tên cũ để tương thích save cũ.
 */
export const WEAPON_TYPES = {
  knight: [
    { id: 'sword', name: 'Kiếm', names: WEAPON_NAMES.knight, desc: 'Cân bằng công và tốc', mods: {} },
    { id: 'axe', name: 'Rìu', desc: 'Sát thương +18%, tốc đánh −12%', mods: { dmg: 0.18, spd: -0.12 } },
    { id: 'mace', name: 'Chùy', desc: 'Chí mạng +6%, phòng thủ +8%', mods: { crit: 6, def: 0.08 } },
    { id: 'spear', name: 'Thương', desc: 'Tầm đánh +0.8, Xoáy Kiếm rộng hơn 25%, sát thương −4%', mods: { range: 0.8, skillArea: 0.25, dmg: -0.04 } },
  ],
  wizard: [
    { id: 'staff', name: 'Trượng', names: WEAPON_NAMES.wizard, desc: 'Cân bằng công và tốc', mods: {} },
    { id: 'orb', name: 'Quả Cầu', desc: 'Tốc thi triển +18%, MP +15%, sát thương −8%', mods: { spd: 0.18, mp: 0.15, dmg: -0.08 } },
    { id: 'tome', name: 'Sách Phép', desc: 'Sát thương kỹ năng +25%, đánh thường −10%', mods: { skill: 0.25, basic: -0.1 } },
  ],
  archer: [
    { id: 'bow', name: 'Cung', names: WEAPON_NAMES.archer, desc: 'Cân bằng công và tốc', mods: {} },
    { id: 'crossbow', name: 'Nỏ', desc: 'Sát thương +22%, tốc đánh −15%, tầm +1', mods: { dmg: 0.22, spd: -0.15, range: 1 } },
    { id: 'twinbow', name: 'Song Cung', desc: 'Tốc đánh +22%, sát thương −12%, Mưa Tên thêm 2 mũi', mods: { spd: 0.22, dmg: -0.12, extraArrows: 2 } },
  ],
};

/**
 * Bộ giáp: mỗi bậc 2 dòng (line 0 / 1). style quyết định hình dáng khi vẽ.
 * bonus3 / bonus5: hiệu ứng khi mặc 3 / đủ 5 món cùng bộ (đơn vị % như dòng Hoàn Hảo).
 */
export const ARMOR_SETS = [
  [
    { id: 'leather', name: 'Da', color: '#8b6b47', trim: '#6b4524', style: 'leather', bonus3: { hp: 5 }, bonus5: { def: 5 } },
    { id: 'traveler', name: 'Lữ Khách', color: '#5a7a4a', trim: '#c9a24a', style: 'cloth', bonus3: { zen: 15 }, bonus5: { spd: 5 } },
  ],
  [
    { id: 'bronze', name: 'Đồng', color: '#c07a3a', trim: '#8a5520', style: 'bronze', bonus3: { def: 6 }, bonus5: { hp: 6 } },
    { id: 'wolf', name: 'Sói Xám', color: '#7a8088', trim: '#4a3a2a', style: 'fur', bonus3: { crit: 3 }, bonus5: { dmg: 6 } },
  ],
  [
    { id: 'bone', name: 'Xương', color: '#d9d2bb', trim: '#9a9078', style: 'bone', bonus3: { dmg: 6 }, bonus5: { heal: 3 } },
    { id: 'shadow', name: 'Hắc Cốt', color: '#4a4458', trim: '#8a5cff', style: 'shadow', bonus3: { crit: 4 }, bonus5: { reflect: 5 } },
  ],
  [
    { id: 'ice', name: 'Băng', color: '#8fd0ff', trim: '#3d86c2', style: 'ice', bonus3: { def: 8 }, bonus5: { hp: 8 } },
    { id: 'dawn', name: 'Sương Mai', color: '#bfe8d8', trim: '#4aa078', style: 'leaf', bonus3: { spd: 6 }, bonus5: { heal: 4 } },
  ],
  [
    { id: 'dragon', name: 'Hỏa Long', color: '#ff6a2b', trim: '#6a1808', style: 'dragon', bonus3: { dmg: 8 }, bonus5: { crit: 5 } },
    { id: 'magma', name: 'Dung Nham', color: '#4a2a22', trim: '#ff8a2a', style: 'magma', bonus3: { reflect: 6 }, bonus5: { def: 10 } },
  ],
  [
    { id: 'angel', name: 'Thiên Thần', color: '#f6e7a0', trim: '#c9a227', style: 'angel', bonus3: { hp: 8, def: 6 }, bonus5: { dmg: 10 } },
    { id: 'fallen', name: 'Đọa Thiên', color: '#3a2a5a', trim: '#ff40c0', style: 'demon', bonus3: { dmg: 8 }, bonus5: { crit: 6, spd: 6 } },
  ],
];

export const BONUS_NAMES = { dmg: 'Sát thương', crit: 'Chí mạng', spd: 'Tốc đánh', heal: 'Hồi HP khi hạ quái', hp: 'HP tối đa', def: 'Phòng thủ', zen: 'Zen rơi ra', reflect: 'Phản sát thương' };

/** Tỉ lệ rơi dòng giáp thứ 2 */
export const LINE_B_CHANCE = 0.5;
