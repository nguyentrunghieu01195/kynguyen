// Event bus nhỏ: tầng logic (systems) phát sự kiện, tầng UI lắng nghe.
// Nhờ vậy systems không phụ thuộc DOM — dễ test, dễ chuyển sang server sau này.
const handlers = {};

export function on(evt, fn) {
  (handlers[evt] ||= []).push(fn);
  return () => (handlers[evt] = handlers[evt].filter((f) => f !== fn));
}

/**
 * Lắng nghe dành cho luật chơi (systems/): KHÔNG chạy khi máy này chỉ hiển thị (chế độ máy chủ),
 * vì khi đó máy chủ mới là nơi tính nhiệm vụ, mở khoá… — máy người chơi chỉ nhận sự kiện để vẽ/phát âm thanh.
 */
export const BUS = { viewOnly: false };
export const sysOn = (evt, fn) => on(evt, (...a) => { if (!BUS.viewOnly) fn(...a); });

export function emit(evt, ...args) {
  (handlers[evt] || []).forEach((fn) => fn(...args));
}

// Danh sách sự kiện dùng trong game (để tra cứu)
export const EV = {
  LOG: 'log',             // (html, color)
  ANNOUNCE: 'announce',   // (text)
  LEVEL_UP: 'levelUp',    // (level, levelsGained)
  KILL: 'kill',           // (monster)
  PLAYER_DIE: 'playerDie',
  MAP_ENTER: 'mapEnter',  // (mapIndex)
  INVENTORY: 'inventory', // túi đồ thay đổi
  UPGRADE: 'upgrade',     // (outcome, item)
  CRAFT: 'craft',         // (ok, tier)
  AUTO: 'auto',           // (on)
  POINTS: 'points',       // (n)
  PICKUP: 'pickup',       // (kind, val)
  SKILL: 'skill',         // (skillId)
  HIT: 'hit',             // (monster, damage, crit, skill) người chơi đánh trúng quái
  BASIC: 'basic',         // (kiểu đánh: melee|fire|arrow) ra đòn thường
  PLAYER_HIT: 'playerHit', // (damage, monster)
  BOSS_CAST: 'bossCast',  // (boss) boss bắt đầu gồng chiêu
  BOSS_SLAM: 'bossSlam',  // (boss, trúng?) boss ra chiêu
  SHAKE: 'shake',         // (độ mạnh) yêu cầu rung màn hình
  SKILL_LEARN: 'skillLearn', // (skillId, rank) học / nâng cấp / đổi ô kỹ năng
  POTION: 'potion',       // (type)
  BUY: 'buy',             // (key, n)
  RESET: 'reset',         // (resets)
  TIER_UP: 'tierUp',      // (tier) hoàn thành nhiệm vụ chuyển chức
  QUEST: 'quest',         // trạng thái nhiệm vụ thay đổi
  EVENT: 'event',         // (id, success) kết thúc sự kiện
  EVENT_END: 'eventEnd',  // (result) đã rời đấu trường
  TOWER_FLOOR: 'towerFloor', // (floor, firstClear) vượt 1 tầng tháp
  TOWER_END: 'towerEnd',  // (result) kết thúc lượt leo tháp
  SIEGE_END: 'siegeEnd',  // (result) kết thúc trận công thành
  SIEGE_GATE: 'siegeGate', // Cổng Thành vừa bị phá
  SIEGE_THRONE: 'siegeThrone', // (mine) Ngai Vàng đổi chủ; mine = bang của mình giữ
  PET: 'pet',             // chuồng pet / pet đang theo thay đổi
  PET_ATK: 'petAtk',      // (x, y) pet tham chiến vừa ra đòn
  GBOSS_END: 'gbossEnd',  // (result) kết thúc 1 lượt đánh Boss bang
  NET: 'net',             // trạng thái kết nối / dữ liệu máy chủ thay đổi
  TRADE: 'trade',         // giao dịch trực tiếp thay đổi (mời / trạng thái / kết thúc)
  MAIL: 'mail',           // có thư mới trong hộp thư (chợ, giao dịch)
  CHAT: 'chat',           // (msg) tin nhắn mới
};

export const log = (msg, col) => emit(EV.LOG, msg, col);
export const announce = (msg) => emit(EV.ANNOUNCE, msg);
