// Thú cưng: 12 loại, 5 độ hiếm, công dụng khác nhau. Mọi con số cân bằng nằm ở đây.
export const PET = {
  maxLv: 10,
  expNeed: (lv) => 60 * lv,                 // kinh nghiệm pet cần để lên cấp lv+1 (1 hạ quái = 1, Boss = 15)
  bossExp: 15,
  maxPets: 24,                              // số pet tối đa trong chuồng
  maxEggs: 6,
  // Trứng: số quái cần hạ để nở, theo độ hiếm
  eggNeed: { common: 150, rare: 400, epic: 900, legend: 2000, royal: 3000 },
  // Tỉ lệ rơi trứng khi hạ quái thường / elite / boss (xác suất 0..1 cho từng độ hiếm)
  drop: {
    mob: { common: 0.0015, rare: 0.0004 },
    elite: { common: 0.01, rare: 0.005, epic: 0.0008 },
    boss: { rare: 0.25, epic: 0.06, legend: 0.015 },
  },
  // Cửa hàng: chỉ bán pet thường / hiếm
  shop: { common: 200000, rare: 2000000 },
  releaseZen: { common: 20000, rare: 150000, epic: 800000, legend: 3000000, royal: 5000000 },
  // Quà trứng từ nội dung khó
  rewards: { towerEvery: 10, towerEgg: 'rare', eventEgg: 'rare', eventChance: 0.3, siegeWinEgg: 'royal', siegeMinActive: 60 },
  fightSkipEvents: ['siege'],               // pet không tham chiến trong PvP công thành
};

export const RARITY = {
  common: { name: 'Thường', color: '#cfcfcf' },
  rare: { name: 'Hiếm', color: '#6ab8ff' },
  epic: { name: 'Sử Thi', color: '#c070ff' },
  legend: { name: 'Huyền Thoại', color: '#ffb030' },
  royal: { name: 'Vương Giả', color: '#ffd34a' },
};
export const RARITY_ORDER = ['common', 'rare', 'epic', 'legend', 'royal'];

/**
 * fx: [giá trị cấp 1, tăng mỗi cấp]. dmg / def / hp / zen / exp / heal tính theo %, crit theo điểm, pickup = bán kính nhặt đồ (ô).
 * fight: { pct: [% sát thương của người chơi mỗi đòn, tăng/cấp], every: giây giữa 2 đòn, range: tầm (ô) }.
 */
export const PETS = [
  { id: 'slime', name: 'Slime Tài Lộc', rarity: 'common', role: 'Kiếm Zen', desc: 'Zen rơi +%', fx: { zen: [4, 0.8] }, c: ['#5fd35f', '#2e8b2e'], shape: 'blob' },
  { id: 'wolf', name: 'Sói Con', rarity: 'common', role: 'Phòng thủ', desc: 'Phòng thủ +%, HP +%', fx: { def: [4, 0.7], hp: [2, 0.4] }, c: ['#9aa0a8', '#5a6068'], shape: 'beast' },
  { id: 'cat', name: 'Mèo Nhặt Vàng', rarity: 'common', role: 'Nhặt đồ', desc: 'Tự nhặt đồ trong tầm xa hơn', fx: { pickup: [2.2, 0.25] }, c: ['#f0c070', '#a06a20'], shape: 'cat' },
  { id: 'fox', name: 'Hồ Ly Lửa', rarity: 'rare', role: 'Sát thương', desc: 'Sát thương +%, chí mạng', fx: { dmg: [3, 0.6], crit: [2, 0.3] }, c: ['#ff8a3a', '#b8400a'], shape: 'fox' },
  { id: 'owl', name: 'Cú Trí Tuệ', rarity: 'rare', role: 'Kinh nghiệm', desc: 'EXP nhận +%', fx: { exp: [6, 1.2] }, c: ['#b89a70', '#6a5030'], shape: 'bird' },
  { id: 'bird', name: 'Chim Lượm Ngọc', rarity: 'rare', role: 'Nhặt đồ', desc: 'Nhặt đồ rất xa, hút ngọc', fx: { pickup: [4, 0.35] }, c: ['#6ad0ff', '#2a78b8'], shape: 'bird' },
  { id: 'dragon', name: 'Rồng Con', rarity: 'epic', role: 'Tham chiến', desc: 'Phun lửa đánh quái', fight: { pct: [0.22, 0.03], every: 1.7, range: 7 }, c: ['#7adf6a', '#2a8a2a'], shape: 'dragon' },
  { id: 'golem', name: 'Golem Đá', rarity: 'epic', role: 'Phòng thủ', desc: 'Phòng thủ +%, HP +%', fx: { def: [8, 1.2], hp: [6, 1] }, c: ['#a09a90', '#5a5650'], shape: 'golem' },
  { id: 'ghost', name: 'Bóng Ma Tham Lam', rarity: 'epic', role: 'Zen + EXP', desc: 'Zen +%, EXP +%', fx: { zen: [10, 1.5], exp: [5, 0.8] }, c: ['#c8b8ff', '#6a50b8'], shape: 'ghost' },
  { id: 'phoenix', name: 'Phượng Hoàng Non', rarity: 'legend', role: 'Tham chiến + hồi máu', desc: 'Đánh quái, hồi máu khi hạ quái', fx: { heal: [0.6, 0.12] }, fight: { pct: [0.3, 0.035], every: 1.5, range: 7.5 }, c: ['#ff9a30', '#c8300a'], shape: 'phoenix' },
  { id: 'unicorn', name: 'Kỳ Lân Thánh', rarity: 'legend', role: 'Hỗ trợ chiến đấu', desc: 'Sát thương, chí mạng, HP +%', fx: { dmg: [8, 1.2], crit: [4, 0.5], hp: [6, 0.8] }, c: ['#fff0ff', '#c88ae8'], shape: 'unicorn' },
  { id: 'lion', name: 'Sư Tử Vương Giả', rarity: 'royal', role: 'Toàn năng', desc: 'Mọi chỉ số + tham chiến (chỉ có từ Công Thành Chiến)', fx: { dmg: [10, 1.5], def: [10, 1.5], zen: [10, 1.5], exp: [10, 1.5], hp: [8, 1], crit: [3, 0.4] }, fight: { pct: [0.4, 0.04], every: 1.4, range: 8 }, c: ['#ffd34a', '#a06a10'], shape: 'lion' },
];
export const PET_BY_ID = Object.fromEntries(PETS.map((p) => [p.id, p]));
export const PETS_BY_RARITY = Object.fromEntries(RARITY_ORDER.map((r) => [r, PETS.filter((p) => p.rarity === r)]));

/** Chỉ số cộng của 1 pet ở cấp lv: { dmg, crit, def, hp, zen, exp, heal, pickup } */
export function petFx(kind, lv) {
  const p = PET_BY_ID[kind], o = {};
  if (!p || !p.fx) return o;
  for (const k in p.fx) o[k] = +(p.fx[k][0] + p.fx[k][1] * (Math.max(1, lv) - 1)).toFixed(2);
  return o;
}
/** Thông số tham chiến ở cấp lv, hoặc null */
export function petFight(kind, lv) {
  const p = PET_BY_ID[kind];
  return p && p.fight ? { pct: +(p.fight.pct[0] + p.fight.pct[1] * (Math.max(1, lv) - 1)).toFixed(3), every: p.fight.every, range: p.fight.range } : null;
}
