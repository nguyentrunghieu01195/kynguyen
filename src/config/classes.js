// Định nghĩa class nhân vật. Thêm class mới: thêm 1 entry + công thức trong STAT_FORMULA.
/** Class đã có bản nhân vật nữ (các class còn lại sẽ thêm sau) */
export const FEMALE_CLASSES = ['knight'];
export const CLASSES = {
  knight: {
    name: 'Kiếm Sĩ',
    desc: 'Cận chiến, máu trâu. Kỹ năng Xoáy Kiếm đánh lan xung quanh.',
    stats: { str: 28, agi: 20, vit: 25, ene: 10 },
    atkSpd: 1.1,
    range: 1.4,
    attack: 'melee',
  },
  wizard: {
    name: 'Pháp Sư',
    desc: 'Phép tầm xa, sát thương diện rộng lớn nhưng máu mỏng.',
    stats: { str: 18, agi: 18, vit: 15, ene: 30 },
    atkSpd: 0.95,
    range: 6,
    attack: 'fire',
  },
  archer: {
    name: 'Xạ Thủ',
    desc: 'Bắn xa, đánh nhanh. Mưa Tên bắn cùng lúc nhiều mục tiêu.',
    stats: { str: 22, agi: 25, vit: 20, ene: 15 },
    atkSpd: 1.1,
    range: 7,
    attack: 'arrow',
  },
};

/** Công thức chỉ số gốc theo class */
export const STAT_FORMULA = {
  knight: { dmg: (s) => s.str / 3.5, hp: (s, lv) => 60 + lv * 2 + s.vit * 3, mp: (s, lv) => 20 + lv * 0.5 + s.ene, defDiv: 3 },
  wizard: { dmg: (s) => s.ene / 3.6, hp: (s, lv) => 60 + lv * 1.5 + s.vit * 2.5, mp: (s, lv) => 40 + lv + s.ene * 2, defDiv: 4 },
  archer: { dmg: (s) => (s.str + s.agi * 2) / 11, hp: (s, lv) => 50 + lv * 1.5 + s.vit * 2.5, mp: (s, lv) => 30 + lv * 0.8 + s.ene * 1.5, defDiv: 4 },
};

export const STAT_INFO = [
  { k: 'str', name: 'Sức mạnh' },
  { k: 'agi', name: 'Nhanh nhẹn' },
  { k: 'vit', name: 'Thể lực' },
  { k: 'ene', name: 'Năng lượng' },
];
