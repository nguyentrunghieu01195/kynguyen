// =====================================================================
//  THỜI TRANG — chỉ thay ngoại hình, không cộng chỉ số
// =====================================================================
// unlock.type:
//   shop    — mua bằng Zen (zen)            checkin — tổng số ngày điểm danh ≥ n
//   tower   — kỷ lục Tháp Vô Tận ≥ n        events  — hoàn thành sự kiện ≥ n lần
//   reset   — số lần Reset ≥ n
// Bản thương mại có thể thêm type 'premium' (bán bằng tiền thật) mà không cần sửa logic vẽ.

export const FASHION_SLOTS = { outfit: 'Trang phục', head: 'Mũ & Đầu', aura: 'Hào quang' };

export const FASHION = [
  // ---- Trang phục ----
  { id: 'cloak', slot: 'outfit', name: 'Áo Choàng Lữ Khách', style: 'cloak', colors: ['#34506e', '#c9a24a'], unlock: { type: 'shop', zen: 200000 } },
  { id: 'aodai', slot: 'outfit', name: 'Áo Dài Cung Đình', style: 'aodai', colors: ['#c0202a', '#ffd54a'], unlock: { type: 'checkin', n: 7 } },
  { id: 'royal', slot: 'outfit', name: 'Giáp Hiệp Sĩ Hoàng Gia', style: 'royal', colors: ['#eef0f8', '#2a4aa8'], unlock: { type: 'tower', n: 10 } },
  { id: 'ninja', slot: 'outfit', name: 'Nhẫn Giả Bóng Đêm', style: 'ninja', colors: ['#1c1c28', '#e02040'], unlock: { type: 'events', n: 5 } },
  { id: 'winter', slot: 'outfit', name: 'Lễ Phục Mùa Đông', style: 'winter', colors: ['#c82a2a', '#ffffff'], unlock: { type: 'shop', zen: 800000 } },
  { id: 'jade', slot: 'outfit', name: 'Long Thần Giáp Ngọc', style: 'jade', colors: ['#16382a', '#3affa0'], unlock: { type: 'tower', n: 30 } },
  // ---- Mũ & đầu ----
  { id: 'nonla', slot: 'head', name: 'Nón Lá', style: 'nonla', colors: ['#e8d8a0', '#8a7040'], unlock: { type: 'shop', zen: 50000 } },
  { id: 'crown', slot: 'head', name: 'Vương Miện Vàng', style: 'crown', colors: ['#ffd54a', '#ff3a5a'], unlock: { type: 'reset', n: 1 } },
  { id: 'pumpkin', slot: 'head', name: 'Mũ Bí Ngô', style: 'pumpkin', colors: ['#ff8a1a', '#2a8a2a'], unlock: { type: 'events', n: 10 } },
  { id: 'horns', slot: 'head', name: 'Sừng Ác Quỷ', style: 'horns', colors: ['#2a0a0a', '#ff4020'], unlock: { type: 'tower', n: 20 } },
  // ---- Hào quang ----
  { id: 'fire', slot: 'aura', name: 'Hào Quang Lửa', style: 'fire', colors: ['#ff6a1a', '#ffd060'], unlock: { type: 'events', n: 3 } },
  { id: 'frost', slot: 'aura', name: 'Hào Quang Băng', style: 'frost', colors: ['#8fd0ff', '#ffffff'], unlock: { type: 'tower', n: 15 } },
  { id: 'fireflies', slot: 'aura', name: 'Đom Đóm', style: 'fireflies', colors: ['#d8ff60', '#80ff40'], unlock: { type: 'shop', zen: 300000 } },
  { id: 'sakura', slot: 'aura', name: 'Hoa Anh Đào', style: 'sakura', colors: ['#ffb8d0', '#ff70a0'], unlock: { type: 'checkin', n: 14 } },
];

export const FASHION_BY_ID = Object.fromEntries(FASHION.map((f) => [f.id, f]));
