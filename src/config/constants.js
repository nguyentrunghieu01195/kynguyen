// Hằng số kỹ thuật của game (không phải số cân bằng — xem balance.js)
export const CFG = {
  MAP_W: 40,
  MAP_H: 40,
  INV_SIZE: 40,
  AUTOSAVE_SEC: 15,
  MAX_DT: 0.05,
  /** Bộ đồ hoạ đang dùng: 'classic' | 'v2' */
  ART_STYLE: 'v2',
};

export const SPAWN = { x: 4.5, y: 4.5 };
export const SAFE_RADIUS = 3.6;

export const SAVE_KEY = 'kynguyen_save_v1';
export const SAVE_VERSION = 2; // 2: thêm bản đồ mới → chỉ số bản đồ đổi (xem LEGACY_MAP_IDS)

/** Kích thước ô isometric (pixel) */
export const TILE = { W: 64, H: 32, HW: 32, HH: 16 };
