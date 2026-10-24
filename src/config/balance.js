// =====================================================================
//  CÂN BẰNG GAME — mọi con số ảnh hưởng tới trải nghiệm đều nằm ở đây.
//  Game designer chỉ cần sửa file này, không cần đụng vào logic.
// =====================================================================

export const PROGRESSION = {
  resetLevel: 300,
  pointsPerLevel: 5,
  resetBonusPoints: 400,
  resetCost: (resets) => 500000 * (resets + 1),
  mapReqReducePerReset: 60,
  expNeed: (lv) => Math.floor(40 + 6 * lv * lv),
  defaultExpRate: 3,
  expRates: [1, 3, 10, 50],
  /** Khi kết nối máy chủ: tốc độ EXP tối đa & tắt chế độ thử sự kiện (chống gian lận) */
  onlineMaxExpRate: 3,
};

export const PLAYER = {
  moveSpeed: 3.4,
  hpRegenPerSec: 0.008, // % HP tối đa / giây
  mpRegenPerSec: 0.025,
  baseCrit: 5,
  critMult: 1.6,
  dmgSpread: 0.15,
  atkSpeedCap: 3,
  deathExpLoss: 0.03,
  respawnSec: 3,
  startZen: 5000,
  startJewels: { bless: 2, soul: 1, chaos: 0 },
  startPotions: { hp: 30, mp: 20 },
};

export const POTION = {
  hpHeal: 0.35,
  mpHeal: 0.4,
  cooldown: 0.8,
  autoHpBelow: 0.45,
  autoMpBelow: 0.25,
  price: (lv, type) => Math.round((10 + lv * 1.2) * (type === 'mp' ? 0.8 : 1)),
};

export const SHOP = { charmPrice: 150000 };

/** Công thức giảm sát thương chung cho cả người chơi lẫn quái */
export const mitigate = (dmg, def) => (dmg * 100) / (100 + def);

export const MONSTER = {
  hp: (lv) => 30 + 6 * Math.pow(lv, 1.2),
  dmg: (lv) => (3 + lv * 1.45) * (1 + Math.min(0.3, lv / 700)), // bản đồ sau mạnh hơn tới +30%
  def: (lv) => lv * 0.3,
  exp: (lv) => lv * 6 + 10,
  speed: 1.5,
  range: 1.1,
  aggroRange: 4,
  attackCd: 1.6,
  leash: 11,
  respawnSec: 6,
  packCount: 9,   // (chỉ còn dùng cho đấu trường) — bản đồ rộng tự tính theo diện tích
  packSize: 4,
  /** Quái tinh anh: tỉ lệ xuất hiện & hệ số (rơi đồ x3, xem DROP.elite) */
  elite: { chance: 0.05, hp: 3.2, dmg: 1.4, exp: 3, size: 1.2 },
  /** Quái đánh xa: tốc độ đạn (ô/giây), hệ số sát thương so với cận chiến */
  rangedProjSpd: 7, rangedDmg: 0.85,
  /** Chỉ cập nhật AI quái trong bán kính này quanh người chơi (tiết kiệm CPU) */
  activeRadius: 26,
  /** Chiêu đập đất của boss: cảnh báo vùng đỏ rồi gây sát thương lớn — người chơi có thể né */
  bossSlam: { every: [6, 9], warn: 1.3, radius: 2.6, dmgMul: 2.4, triggerRange: 3.5 },
  boss: { hp: 25, dmg: 2.2, def: 1.5, exp: 25, size: 2, speed: 0.85, range: 1.9, aggroRange: 6, attackCd: 1.3, leash: 14, levelBonus: 5, firstSpawnSec: 45, respawnSec: 180 },
};

export const DROP = {
  zenPerLevel: [4, 12],
  item: 0.09,
  excellent: 0.05,
  plusChance: 0.25,
  maxPlus: 3,
  tierDownChance: 0.15,
  jewel: { bless: 0.009, soul: 0.006, chaos: 0.0035 },
  potHp: 0.06,
  potMp: 0.04,
  despawnSec: 90,
  elite: { zenMul: 3, jewelRolls: 3, itemChance: 0.45 },
  pickupRadius: 0.9,
  boss: { zenMult: 30, bless: [2, 4], soul: [1, 3], chaos: [1, 3], items: 2, plusChance: 0.8, maxPlus: 5, potHp: 20 },
};

export const ITEM = {
  plusMult: (p) => 1 + 0.12 * p + (p > 9 ? 0.15 * (p - 9) : 0),
  weaponDmg: (tier, plus) => 6 * Math.pow(tier + 1, 1.6) * ITEM.plusMult(plus) + plus * 2,
  armorDef: (tier, pieceK, plus) => (2 * Math.pow(tier + 1, 1.5) + 1) * pieceK * ITEM.plusMult(plus) + plus,
  sellPrice: (it) => Math.round(Math.pow(it.tier + 1, 2) * 60 * (1 + it.plus * 0.5) * (it.exc ? 4 : 1) * (it.slot === 'wings' ? 50 : 1)),
  maxPlus: 15,
};

/** Bảng ép đồ theo cấp hiện tại. fail: none | down | break */
export const UPGRADE = [
  { from: 0, to: 5, need: { bless: 1 }, rate: () => 100, zen: () => 0, fail: 'none' },
  { from: 6, to: 8, need: { soul: 1 }, rate: (p) => [60, 55, 50][p - 6], zen: () => 0, fail: 'down' },
  { from: 9, to: 14, need: { chaos: 1, bless: 1, soul: 1 }, rate: (p) => [60, 55, 50, 45, 40, 35][p - 9], zen: (p) => 50000 * (p - 8), fail: 'break' },
];

export const WING_RECIPE = [
  null,
  { need: { chaos: 3, bless: 1 }, zen: 100000, rate: 70 },
  { need: { chaos: 8, bless: 5, soul: 5 }, zen: 1000000, rate: 50 },
  { need: { chaos: 20, bless: 10, soul: 10 }, zen: 5000000, rate: 40 },
  { need: { chaos: 40, bless: 20, soul: 20 }, zen: 15000000, rate: 35 },
  { need: { chaos: 70, bless: 35, soul: 35 }, zen: 40000000, rate: 30 },
  { need: { chaos: 120, bless: 60, soul: 60 }, zen: 100000000, rate: 25 },
];
