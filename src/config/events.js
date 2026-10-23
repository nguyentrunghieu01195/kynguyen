// =====================================================================
//  SỰ KIỆN THEO GIỜ: Huyết Lâu & Quảng Trường Quỷ
// =====================================================================
// Lịch: cổng mở vào các phút trong mỗi giờ (theo giờ máy người chơi), mở trong `window` phút.
// Cấp quái trong sự kiện = cấp người chơi + levelOffset (luôn vừa sức).

const BC_THEME = { g: '#4a2228', g2: '#56282f', edge: '#120406', cliff: '#2a0a10', town: '#6e6a75', bg: '#080203', deco: ['pillar', 'torch'], dcol: '#8a6a70', edgeKind: 'void' };
const DS_THEME = { g: '#2a2438', g2: '#332c44', edge: '#e0531c', cliff: '#1a0a04', town: '#6e6a75', bg: '#0c0406', deco: ['crystal', 'torch'], dcol: '#ff5a2a', edgeKind: 'lava' };

export const EVENTS = {
  bc: {
    id: 'bc',
    name: 'Huyết Lâu',
    icon: '🏰',
    desc: 'Dọn sạch hành lang, phá Cổng Thành rồi hạ Huyết Ma Vương trước khi hết giờ.',
    minLevel: 10,
    schedule: { starts: [0, 30], window: 5 },
    timeLimit: 480,
    levelOffset: 0,
    killQuota: 30,
    maxAlive: 12,
    ticket: 'bc',
    theme: BC_THEME,
    mobs: [
      { id: 'skeleton', name: 'Huyết Cốt Binh', shape: 'humanoid', c1: '#d8b0a8', c2: '#ffd8d0', size: 0.95, bones: true },
      { id: 'darkknight', name: 'Huyết Kỵ Sĩ', shape: 'humanoid', c1: '#4a1018', c2: '#ff3040', size: 1.05, armored: true },
      { id: 'bat', name: 'Dơi Huyết', shape: 'winged', c1: '#5a0810', c2: '#e02030', size: 0.9, spd: 2.2 },
    ],
    gate: { id: 'gate', name: 'Cổng Thành', shape: 'gate', c1: '#6a5a4a', c2: '#ff3040', size: 1.5 },
    boss: { id: 'darkknight', name: 'Huyết Ma Vương', shape: 'humanoid', c1: '#3a0610', c2: '#ff2030', size: 1.2, armored: true, crown: true },
    gateHpMul: 10,
    bossHpMul: 0.8, // nhân thêm trên hệ số boss mặc định
    /** Phần thưởng khi thắng; secLeft = số giây còn dư */
    reward: (lv, expRate, secLeft) => ({
      exp: Math.round((lv * 6 + 10) * expRate * (30 + secLeft / 10)),
      zen: Math.round(lv * 1500 + secLeft * lv * 4),
      bless: 2, soul: 1, chaos: 1 + (secLeft > 180 ? 1 : 0),
      item: { tier: null, plus: 3, exc: 2 }, // tier null = theo bản đồ đang đứng
    }),
    failReward: (lv) => ({ zen: Math.round(lv * 300) }),
  },
  ds: {
    id: 'ds',
    name: 'Quảng Trường Quỷ',
    icon: '😈',
    desc: 'Sống sót qua 4 đợt quỷ dữ. Hạ càng nhiều quái, điểm càng cao, thưởng càng lớn.',
    minLevel: 15,
    schedule: { starts: [15, 45], window: 5 },
    timeLimit: 360,
    levelOffset: 0,
    waves: [
      { count: 10, mobs: [0], time: 70 },
      { count: 14, mobs: [0, 1], time: 80 },
      { count: 18, mobs: [1, 2], time: 90 },
      { count: 20, mobs: [1, 2, 3], time: 120, boss: true },
    ],
    batch: 4,
    ticket: 'ds',
    theme: DS_THEME,
    mobs: [
      { id: 'goblin', name: 'Quỷ Lùn', shape: 'humanoid', c1: '#8a2010', c2: '#ff7040', size: 0.85, ears: true },
      { id: 'firedemon', name: 'Ác Quỷ Lửa', shape: 'winged', c1: '#c02000', c2: '#ff9a20', size: 1, horns: true },
      { id: 'lavagolem', name: 'Golem Dung Nham', shape: 'golem', c1: '#4a1606', c2: '#ff6a1a', size: 1 },
      { id: 'eye', name: 'Ma Nhãn Hỏa Ngục', shape: 'blob', c1: '#7a1010', c2: '#ffb020', size: 1.1, eye: true },
    ],
    boss: { id: 'firedragon', name: 'Chúa Quỷ Hỏa Ngục', shape: 'dragon', c1: '#3a0a0a', c2: '#ff6020', size: 1 },
    bossHpMul: 0.7,
    points: { normal: 1, boss: 15 },
    /** Phần thưởng theo điểm */
    reward: (lv, expRate, score, bossKilled) => ({
      exp: Math.round((lv * 6 + 10) * expRate * score * 0.8),
      zen: Math.round(lv * score * 40),
      bless: score >= 30 ? 1 + (score >= 60 ? 1 : 0) : 0,
      soul: score >= 45 ? 1 : 0,
      chaos: (score >= 70 ? 1 : 0) + (bossKilled ? 1 : 0),
      item: bossKilled ? { tier: null, plus: 2, exc: 2 } : undefined,
    }),
  },
};

/** Vé vào cửa */
export const TICKETS = {
  bc: { name: 'Vé Huyết Lâu', color: '#ff4050', price: (lv) => 20000 + lv * 400, dropChance: 0.004 },
  ds: { name: 'Thư Mời Quỷ', color: '#c060ff', price: (lv) => 20000 + lv * 400, dropChance: 0.004 },
};
export const START_TICKETS = { bc: 1, ds: 1 };
