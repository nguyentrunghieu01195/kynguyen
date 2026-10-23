// Dữ liệu vật phẩm: tên, bộ đồ, ngọc, dòng hoàn hảo, cánh.
export const SLOTS = ['weapon', 'helm', 'armor', 'pants', 'gloves', 'boots', 'wings'];
export const ARMOR_SLOTS = ['helm', 'armor', 'pants', 'gloves', 'boots'];
export const DROP_SLOTS = ['weapon', ...ARMOR_SLOTS];

export const SLOT_NAMES = { weapon: 'Vũ khí', helm: 'Mũ', armor: 'Áo', pants: 'Quần', gloves: 'Găng', boots: 'Giày', wings: 'Cánh' };
export const PIECE_PREFIX = { helm: 'Mũ', armor: 'Áo Giáp', pants: 'Quần', gloves: 'Găng Tay', boots: 'Giày' };
export const PIECE_DEF = { helm: 0.8, armor: 1.3, pants: 1.0, gloves: 0.7, boots: 0.7 };

export const WEAPON_NAMES = {
  knight: ['Kiếm Ngắn', 'Kiếm Thép', 'Đại Kiếm Xương', 'Kiếm Băng Phong', 'Kiếm Hỏa Ngục', 'Thánh Kiếm'],
  wizard: ['Gậy Gỗ', 'Gậy Pha Lê', 'Trượng Xương', 'Trượng Băng', 'Trượng Dung Nham', 'Trượng Thiên Giới'],
  archer: ['Cung Gỗ', 'Cung Sừng', 'Cung Xương', 'Cung Băng', 'Cung Hỏa Long', 'Cung Thiên Sứ'],
};

/** 6 bộ giáp theo bậc (tier 0..5) */
export const SETS = [
  { name: 'Da', color: '#8b6b47' },
  { name: 'Đồng', color: '#c07a3a' },
  { name: 'Xương', color: '#d9d2bb' },
  { name: 'Băng', color: '#8fd0ff' },
  { name: 'Hỏa Long', color: '#ff6a2b' },
  { name: 'Thiên Thần', color: '#f6e7a0' },
];

export const JEWELS = {
  bless: { name: 'Ngọc Ước Nguyện', short: 'Ước', color: '#a58bff' },
  soul: { name: 'Ngọc Linh Hồn', short: 'Hồn', color: '#ffd54a' },
  chaos: { name: 'Ngọc Hỗn Nguyên', short: 'Hỗn', color: '#ff5a3c' },
};
export const JEWEL_KEYS = Object.keys(JEWELS);

/** Dòng hoàn hảo. t = atk (vũ khí) | def (giáp) */
export const EXC_OPTS = [
  { k: 'dmg', name: 'Tăng sát thương', min: 5, max: 12, u: '%', t: 'atk' },
  { k: 'crit', name: 'Tỉ lệ chí mạng', min: 3, max: 8, u: '%', t: 'atk' },
  { k: 'spd', name: 'Tốc độ đánh', min: 5, max: 10, u: '%', t: 'atk' },
  { k: 'heal', name: 'Hồi HP khi hạ quái', min: 2, max: 5, u: '% HP', t: 'atk' },
  { k: 'hp', name: 'Tăng HP tối đa', min: 3, max: 8, u: '%', t: 'def' },
  { k: 'def', name: 'Tăng phòng thủ', min: 4, max: 10, u: '%', t: 'def' },
  { k: 'zen', name: 'Tăng Zen rơi ra', min: 15, max: 40, u: '%', t: 'def' },
  { k: 'reflect', name: 'Phản sát thương', min: 3, max: 8, u: '%', t: 'def' },
];

export const WINGS = [
  null,
  { name: 'Cánh Lông Vũ', dmg: 12, abs: 12, color: '#f0f0ff' },
  { name: 'Cánh Ma Long', dmg: 20, abs: 20, color: '#9a4cff' },
  { name: 'Cánh Thiên Sứ', dmg: 30, abs: 28, color: '#ffd700' },
];

export const RARITY_COLORS = { normal: '#ffffff', good: '#9fd0ff', high: '#ffd54a', excellent: '#5dff7a', wings: '#d6a8ff' };
