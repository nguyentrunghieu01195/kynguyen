// Bản đồ & quái vật. Thêm bản đồ mới = thêm 1 object vào mảng (giữ thứ tự theo cấp).
//  size: số ô mỗi cạnh · tier: bậc đồ rơi (0..5) · lv: tầm cấp quái (gần thị trấn yếu, xa mạnh)
//  mobs: 4 loại theo vùng, từ gần thị trấn ra xa · boss: ở hang ổ xa nhất
//  shape: blob | beast | humanoid | bug | golem | winged | dragon | serpent | crab | ghost
//  ranged: { r: tầm bắn, proj: spit | mbolt | mfire | arrow | ice } → quái đánh xa, giữ khoảng cách
//  theme.edgeKind: kiểu địa hình chặn đường (nước, dung nham, vách đá, bụi rậm, hư không, đầm lầy)
export const MAPS = [
  {
    id: 'meadow', name: 'Đồng Cỏ Xanh', req: 1, lv: [1, 14], tier: 0, size: 72,
    theme: { g: '#5b8f3e', g2: '#68a048', path: '#a89a6e', edge: '#2f6fa8', cliff: '#5a3d22', town: '#9a8f7a', bg: '#0f1a10', deco: ['tree', 'tree', 'rock', 'bush'], dcol: '#3f8a2e', edgeKind: 'water' },
    mobs: [
      { id: 'slime', name: 'Slime Xanh', shape: 'blob', c1: '#5fd35f', c2: '#2e8b2e', size: 0.9 },
      { id: 'rat', name: 'Chuột Đồng', shape: 'beast', c1: '#a07850', c2: '#7a5a3a', size: 0.75, spd: 2 },
      { id: 'hornet', name: 'Ong Bắp Cày', shape: 'winged', c1: '#f0c020', c2: '#3a2a10', size: 0.8, spd: 2.4, stripes: true },
      { id: 'wolf', name: 'Sói Hoang', shape: 'beast', c1: '#8a8a8a', c2: '#5a5a5a', size: 1, spd: 2.2 },
    ],
    boss: { id: 'kingslime', name: 'Vua Slime', shape: 'blob', c1: '#ffd54a', c2: '#c99a10', size: 1.2, crown: true },
  },
  {
    id: 'darkwood', name: 'Rừng Hắc Ám', req: 15, lv: [15, 40], tier: 1, size: 84,
    theme: { g: '#2f4f2a', g2: '#385a30', path: '#5a4a32', edge: '#1a2a18', cliff: '#2b1d12', town: '#7a7468', bg: '#070d06', deco: ['pine', 'mushroom', 'tree', 'pine'], dcol: '#1f4a22', edgeKind: 'bush' },
    mobs: [
      { id: 'goblin', name: 'Yêu Tinh Goblin', shape: 'humanoid', c1: '#6b8e23', c2: '#9acd32', size: 0.85, ears: true },
      { id: 'spider', name: 'Nhện Độc', shape: 'bug', c1: '#5a1b7a', c2: '#b04cff', size: 1, spd: 2 },
      { id: 'goblinshaman', name: 'Pháp Sư Goblin', shape: 'humanoid', c1: '#4a7a2a', c2: '#60ff80', size: 0.85, ears: true, staff: true, ranged: { r: 4.5, proj: 'spit' } },
      { id: 'treant', name: 'Người Cây', shape: 'golem', c1: '#5d4037', c2: '#7cb342', size: 1, leaves: true },
    ],
    boss: { id: 'goblinlord', name: 'Thủ Lĩnh Goblin', shape: 'humanoid', c1: '#3e5e10', c2: '#c0e040', size: 1.1, crown: true, ears: true },
  },
  {
    id: 'swamp', name: 'Đầm Lầy Độc', req: 35, lv: [35, 65], tier: 1, size: 84,
    theme: { g: '#4a5a32', g2: '#52603a', path: '#6a5a3a', edge: '#2a3a22', cliff: '#2a2014', town: '#7a7462', bg: '#080c06', deco: ['reed', 'mushroom', 'deadtree', 'reed'], dcol: '#6a8a3a', edgeKind: 'swamp' },
    mobs: [
      { id: 'toad', name: 'Cóc Độc', shape: 'blob', c1: '#7aa83a', c2: '#c8e040', size: 0.95, toad: true },
      { id: 'swampsnake', name: 'Rắn Đầm Lầy', shape: 'serpent', c1: '#5a7a2a', c2: '#c8b040', size: 1, spd: 1.9 },
      { id: 'wisp', name: 'Ma Trơi Đầm Lầy', shape: 'ghost', c1: '#6aff9a', c2: '#c0ffd8', size: 0.9, ranged: { r: 5, proj: 'spit' } },
      { id: 'croc', name: 'Người Cá Sấu', shape: 'beast', c1: '#3a5a2a', c2: '#a8b860', size: 1.15, spd: 1.6, croc: true },
    ],
    boss: { id: 'hydra', name: 'Thủy Quái Đầm Lầy', shape: 'serpent', c1: '#2a5a3a', c2: '#e0ff60', size: 1.25, crown: true },
  },
  {
    id: 'crypt', name: 'Hầm Mộ Cổ', req: 60, lv: [60, 95], tier: 2, size: 84,
    theme: { g: '#4a4552', g2: '#55505e', path: '#6a6472', edge: '#1a181e', cliff: '#2a2630', town: '#6e6a75', bg: '#09080c', deco: ['tomb', 'pillar', 'tomb', 'bones'], dcol: '#8a8494', edgeKind: 'wall' },
    mobs: [
      { id: 'skeleton', name: 'Bộ Xương', shape: 'humanoid', c1: '#e0dcc8', c2: '#f5f1e0', size: 0.95, bones: true },
      { id: 'zombie', name: 'Xác Sống', shape: 'humanoid', c1: '#5f7a52', c2: '#9ab88a', size: 1, spd: 1.2 },
      { id: 'phantom', name: 'Hồn Ma', shape: 'ghost', c1: '#b8c8e8', c2: '#e8f0ff', size: 1, ranged: { r: 5, proj: 'mbolt' } },
      { id: 'bat', name: 'Dơi Máu', shape: 'winged', c1: '#7a0f14', c2: '#c0262c', size: 0.85, spd: 2.2 },
    ],
    boss: { id: 'boneking', name: 'Vua Xương', shape: 'humanoid', c1: '#c8c0a0', c2: '#fff6d0', size: 1.2, crown: true, bones: true },
  },
  {
    id: 'canyon', name: 'Hẻm Núi Đá Đỏ', req: 90, lv: [90, 125], tier: 2, size: 88,
    theme: { g: '#a8643a', g2: '#b4703e', path: '#c89a6a', edge: '#5a2a18', cliff: '#4a2010', town: '#9a7a62', bg: '#140804', deco: ['rock', 'rock', 'cactus', 'boulder'], dcol: '#6a8a3a', edgeKind: 'cliff' },
    mobs: [
      { id: 'lizard', name: 'Thằn Lằn Đá', shape: 'beast', c1: '#b8784a', c2: '#e8b070', size: 0.95, spd: 2.2, spikes: true },
      { id: 'bandit', name: 'Cung Thủ Đạo Tặc', shape: 'humanoid', c1: '#7a4a2a', c2: '#c03a2a', size: 0.95, bow: true, ranged: { r: 5.5, proj: 'arrow' } },
      { id: 'vulture', name: 'Kền Kền Đỏ', shape: 'winged', c1: '#5a3a2a', c2: '#e05a3a', size: 0.95, spd: 2.3, bird: true },
      { id: 'stonegolem', name: 'Người Đá Hẻm Núi', shape: 'golem', c1: '#8a5a3a', c2: '#ffb060', size: 1.1 },
    ],
    boss: { id: 'banditking', name: 'Vua Đạo Tặc', shape: 'humanoid', c1: '#5a2a1a', c2: '#ffd040', size: 1.15, crown: true },
  },
  {
    id: 'tundra', name: 'Băng Nguyên', req: 120, lv: [120, 160], tier: 3, size: 88,
    theme: { g: '#d5e6f0', g2: '#c3d9e8', path: '#a8c0d0', edge: '#4f8fc0', cliff: '#5c7c96', town: '#a9b8c4', bg: '#0c1620', deco: ['ice', 'pine', 'ice', 'snowrock'], dcol: '#2f6a5a', edgeKind: 'water', snow: true },
    mobs: [
      { id: 'icewolf', name: 'Sói Băng', shape: 'beast', c1: '#9ad0ff', c2: '#5a90c0', size: 1.05, spd: 2.3 },
      { id: 'yeti', name: 'Người Tuyết', shape: 'golem', c1: '#f2f8ff', c2: '#9fc8e8', size: 1 },
      { id: 'icefairy', name: 'Yêu Tinh Băng', shape: 'winged', c1: '#4aa8d8', c2: '#bff0ff', size: 1, ranged: { r: 5, proj: 'ice' } },
      { id: 'icebear', name: 'Gấu Băng', shape: 'beast', c1: '#e8f4ff', c2: '#8ab8d8', size: 1.3, spd: 1.6, bear: true },
    ],
    boss: { id: 'icedragon', name: 'Rồng Băng', shape: 'dragon', c1: '#7fd3ff', c2: '#dff6ff', size: 1 },
  },
  {
    id: 'coast', name: 'Bờ Biển San Hô', req: 155, lv: [155, 195], tier: 3, size: 88,
    theme: { g: '#e8d4a0', g2: '#f0dcaa', path: '#d8c08a', edge: '#2ab0c8', cliff: '#8a6a40', town: '#c8b890', bg: '#04141a', deco: ['palm', 'coral', 'palm', 'shell'], dcol: '#3a9a5a', edgeKind: 'sea' },
    mobs: [
      { id: 'crab', name: 'Cua Khổng Lồ', shape: 'crab', c1: '#e05a3a', c2: '#ffb090', size: 1 },
      { id: 'seasnake', name: 'Rắn Biển', shape: 'serpent', c1: '#2a8ab8', c2: '#f0e070', size: 1.05, spd: 2 },
      { id: 'jelly', name: 'Sứa Điện', shape: 'ghost', c1: '#c070ff', c2: '#80e0ff', size: 0.95, jelly: true, ranged: { r: 4.5, proj: 'mbolt' } },
      { id: 'merman', name: 'Chiến Binh Người Cá', shape: 'humanoid', c1: '#2a7a8a', c2: '#80f0e0', size: 1.05, fins: true },
    ],
    boss: { id: 'crabking', name: 'Cua Hoàng Đế', shape: 'crab', c1: '#c02a2a', c2: '#ffd040', size: 1.3, crown: true },
  },
  {
    id: 'desert', name: 'Sa Mạc Lửa', req: 190, lv: [190, 235], tier: 4, size: 92,
    theme: { g: '#c4803c', g2: '#b87232', path: '#d8a060', edge: '#e0531c', cliff: '#5a2a10', town: '#8a6a50', bg: '#1a0a04', deco: ['rock', 'cactus', 'rock', 'skull'], dcol: '#4f8a3a', edgeKind: 'lava' },
    mobs: [
      { id: 'scorpion', name: 'Bọ Cạp Lửa', shape: 'bug', c1: '#e8562a', c2: '#ffb040', size: 1.05, spd: 1.9, tail: true },
      { id: 'sandworm', name: 'Rắn Cát', shape: 'serpent', c1: '#c89a5a', c2: '#ff7a2a', size: 1.15, spd: 1.8 },
      { id: 'firedemon', name: 'Ác Quỷ Lửa', shape: 'winged', c1: '#c02000', c2: '#ff9a20', size: 1, horns: true, ranged: { r: 5, proj: 'mfire' } },
      { id: 'lavagolem', name: 'Golem Dung Nham', shape: 'golem', c1: '#5a1e08', c2: '#ff6a1a', size: 1.05 },
    ],
    boss: { id: 'firedragon', name: 'Hỏa Long', shape: 'dragon', c1: '#ff5722', c2: '#ffcc40', size: 1.05 },
  },
  {
    id: 'volcano', name: 'Núi Lửa Hỏa Ngục', req: 230, lv: [230, 275], tier: 4, size: 92,
    theme: { g: '#3a2a2a', g2: '#443030', path: '#5a3a30', edge: '#ff5a10', cliff: '#1a0a08', town: '#5a4a48', bg: '#100404', deco: ['basalt', 'crystal', 'basalt', 'skull'], dcol: '#ff4a2a', edgeKind: 'lava' },
    mobs: [
      { id: 'hellhound', name: 'Chó Địa Ngục', shape: 'beast', c1: '#5a1010', c2: '#ff6a1a', size: 1.05, spd: 2.4, flame: true },
      { id: 'hellmage', name: 'Pháp Sư Hỏa Ngục', shape: 'humanoid', c1: '#4a1010', c2: '#ffa020', size: 1, staff: true, horns: true, ranged: { r: 5, proj: 'mfire' } },
      { id: 'flamespirit', name: 'Hồn Lửa', shape: 'ghost', c1: '#ff6a1a', c2: '#ffe080', size: 0.95, spd: 2 },
      { id: 'obsidian', name: 'Golem Hắc Thạch', shape: 'golem', c1: '#2a2030', c2: '#ff4a2a', size: 1.2 },
    ],
    boss: { id: 'demonlord', name: 'Ma Vương Hỏa Ngục', shape: 'dragon', c1: '#3a0a0a', c2: '#ff7a10', size: 1.15 },
  },
  {
    id: 'fallen', name: 'Thiên Giới Đọa Lạc', req: 270, lv: [270, 330], tier: 5, size: 96,
    theme: { g: '#3b3058', g2: '#463a68', path: '#5a4a7a', edge: '#120c22', cliff: '#1c1430', town: '#6a5f8a', bg: '#06040c', deco: ['crystal', 'pillar', 'crystal', 'pillar'], dcol: '#b46cff', edgeKind: 'void' },
    mobs: [
      { id: 'eye', name: 'Ma Nhãn', shape: 'blob', c1: '#7b1fa2', c2: '#ff4cf0', size: 1.2, eye: true },
      { id: 'voidshade', name: 'Bóng Ma Hư Không', shape: 'ghost', c1: '#4a2a8a', c2: '#c080ff', size: 1.05, spd: 2.1 },
      { id: 'fallenangel', name: 'Thiên Thần Sa Ngã', shape: 'winged', c1: '#9a90c8', c2: '#e8e0ff', size: 1, halo: true, ranged: { r: 5.5, proj: 'mbolt' } },
      { id: 'darkknight', name: 'Hiệp Sĩ Bóng Tối', shape: 'humanoid', c1: '#2a2450', c2: '#7a5cff', size: 1.1, armored: true },
    ],
    boss: { id: 'azoth', name: 'Ma Thần Azoth', shape: 'dragon', c1: '#4a148c', c2: '#ff40ff', size: 1.15 },
  },
];

/** Thứ tự id bản đồ ở save phiên bản 1 (để chuyển chỉ số bản đồ cũ sang mới) */
export const LEGACY_MAP_IDS = ['meadow', 'darkwood', 'crypt', 'tundra', 'desert', 'fallen'];
export const mapIndexById = (id) => MAPS.findIndex((M) => M.id === id);
