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
  { id: 'samurai', slot: 'outfit', name: 'Giáp Samurai', style: 'samurai', base: 'royal', colors: ['#8a1c1c', '#e0c050'], unlock: { type: 'kills', n: 20000 } },
  { id: 'starrobe', slot: 'outfit', name: 'Pháp Bào Tinh Tú', style: 'starrobe', base: 'cloak', colors: ['#1c2a6a', '#ffd860'], unlock: { type: 'shop', zen: 2500000 } },
  { id: 'captain', slot: 'outfit', name: 'Áo Thuyền Trưởng', style: 'captain', base: 'cloak', colors: ['#2a4a7a', '#e8c060'], unlock: { type: 'shop', zen: 1500000 } },
  { id: 'dragonlord', slot: 'outfit', name: 'Long Vương Giáp', style: 'dragonlord', base: 'jade', colors: ['#7a1a10', '#ff9a30'], unlock: { type: 'master', n: 10 } },
  { id: 'angelrobe', slot: 'outfit', name: 'Thiên Y', style: 'angelrobe', base: 'aodai', colors: ['#f4f0ff', '#ffd860'], unlock: { type: 'reset', n: 10 } },
  { id: 'demonking', slot: 'outfit', name: 'Ma Vương Y', style: 'demonking', base: 'ninja', colors: ['#240a30', '#ff3a90'], unlock: { type: 'nm', n: 10 } },
  // ---- Mũ & đầu ----
  { id: 'nonla', slot: 'head', name: 'Nón Lá', style: 'nonla', colors: ['#e8d8a0', '#8a7040'], unlock: { type: 'shop', zen: 50000 } },
  { id: 'crown', slot: 'head', name: 'Vương Miện Vàng', style: 'crown', colors: ['#ffd54a', '#ff3a5a'], unlock: { type: 'reset', n: 1 } },
  { id: 'pumpkin', slot: 'head', name: 'Mũ Bí Ngô', style: 'pumpkin', colors: ['#ff8a1a', '#2a8a2a'], unlock: { type: 'events', n: 10 } },
  { id: 'horns', slot: 'head', name: 'Sừng Ác Quỷ', style: 'horns', colors: ['#2a0a0a', '#ff4020'], unlock: { type: 'tower', n: 20 } },
  { id: 'wizardhat', slot: 'head', name: 'Nón Phù Thủy', style: 'wizardhat', base: 'nonla', colors: ['#3a2a8a', '#ffd860'], unlock: { type: 'shop', zen: 400000 } },
  { id: 'winghelm', slot: 'head', name: 'Mũ Cánh Chim', style: 'winghelm', base: 'crown', colors: ['#c8ccd8', '#ffffff'], unlock: { type: 'tower', n: 40 } },
  { id: 'catears', slot: 'head', name: 'Tai Mèo', style: 'catears', base: 'crown', colors: ['#ffb8d0', '#ff70a0'], unlock: { type: 'checkin', n: 21 } },
  { id: 'kabuto', slot: 'head', name: 'Mũ Kabuto', style: 'kabuto', base: 'horns', colors: ['#3a3a48', '#e0c050'], unlock: { type: 'kills', n: 8000 } },
  { id: 'flowerhat', slot: 'head', name: 'Vòng Hoa', style: 'flowerhat', base: 'crown', colors: ['#ff9ac0', '#ffe060'], unlock: { type: 'shop', zen: 600000 } },
  // ---- Hào quang ----
  { id: 'fire', slot: 'aura', name: 'Hào Quang Lửa', style: 'fire', colors: ['#ff6a1a', '#ffd060'], unlock: { type: 'events', n: 3 } },
  { id: 'frost', slot: 'aura', name: 'Hào Quang Băng', style: 'frost', colors: ['#8fd0ff', '#ffffff'], unlock: { type: 'tower', n: 15 } },
  { id: 'fireflies', slot: 'aura', name: 'Đom Đóm', style: 'fireflies', colors: ['#d8ff60', '#80ff40'], unlock: { type: 'shop', zen: 300000 } },
  { id: 'storm', slot: 'aura', name: 'Hào Quang Bão Tố', style: 'storm', colors: ['#8fb8ff', '#ffffff'], unlock: { type: 'tower', n: 60 } },
  { id: 'void', slot: 'aura', name: 'Hào Quang Hư Không', style: 'void', colors: ['#8a40ff', '#ff40e0'], unlock: { type: 'nm', n: 25 } },
  { id: 'holy', slot: 'aura', name: 'Hào Quang Thần Thánh', style: 'holy', colors: ['#ffe680', '#ffffff'], unlock: { type: 'god', n: 3 } },
  { id: 'sakura', slot: 'aura', name: 'Hoa Anh Đào', style: 'sakura', colors: ['#ffb8d0', '#ff70a0'], unlock: { type: 'checkin', n: 14 } },
];

export const FASHION_BY_ID = Object.fromEntries(FASHION.map((f) => [f.id, f]));
