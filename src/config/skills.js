// Bộ kỹ năng theo class + bậc nhân vật (chuyển chức) + cấp kỹ năng.
//
// BẬC NHÂN VẬT (CLASS_TIERS): mở theo số lần Reset. Bậc càng cao → học được kỹ năng mạnh hơn
//   và nâng cấp kỹ năng lên cấp cao hơn (RANK_CAP).
// KỸ NĂNG: { id, name, icon, type: 'active'|'buff'|'passive', lv: cấp nhân vật yêu cầu,
//   tier: bậc yêu cầu (1..3), cd, cost (MP), learn (Zen), desc, ...tham số }
//   - active: hàm xử lý cùng tên id trong systems/skills.js (SKILL_FN)
//   - buff:   mods tạm thời (%), dur giây
//   - passive: mods cộng mỗi cấp kỹ năng (cộng dồn vào calcStats)
// Mod hợp lệ: dmg, def, hp, mp, spd, crit, skill (sát thương kỹ năng %), guard (giảm sát thương nhận %)

export const CLASS_TIERS = {
  knight: ['Kiếm Sĩ', 'Kiếm Vương', 'Kiếm Thánh'],
  wizard: ['Pháp Sư', 'Đại Pháp Sư', 'Pháp Thần'],
  archer: ['Xạ Thủ', 'Thần Tiễn Thủ', 'Tiễn Thánh'],
};
/** Số lần Reset cần để đạt bậc 1/2/3 */
export const TIER_RESETS = [0, 1, 3];
/** Cấp kỹ năng tối đa theo bậc nhân vật */
export const RANK_CAP = [5, 8, 10];
export const MAX_RANK = 10;
/** Số ô kỹ năng trên thanh HUD */
export const BAR_SLOTS = 4;
/** Thời gian chờ chung giữa 2 lần dùng kỹ năng (giây) */
export const GCD = 0.35;

export const SKILL_LIST = {
  knight: [
    { id: 'whirl', name: 'Xoáy Kiếm', icon: '🌀', type: 'active', lv: 1, tier: 1, cd: 2.2, cost: 10, learn: 0, mult: 2.4, radius: 3.4,
      desc: 'Xoay kiếm chém toàn bộ quái xung quanh.' },
    { id: 'slam', name: 'Địa Chấn Kích', icon: '💥', type: 'active', lv: 30, tier: 1, cd: 7, cost: 16, learn: 100000, mult: 2.8, radius: 2.4, stun: 1.5,
      desc: 'Bổ kiếm xuống đất, gây sát thương diện rộng và làm choáng quái.' },
    { id: 'iron', name: 'Thân Thể Sắt Thép', icon: '🛡️', type: 'passive', lv: 50, tier: 1, learn: 300000, mods: { hp: 4, def: 3 },
      desc: 'Nội tại: tăng HP tối đa và phòng thủ.' },
    { id: 'warcry', name: 'Chiến Hống', icon: '📯', type: 'buff', lv: 90, tier: 1, cd: 30, cost: 20, learn: 1000000, dur: 12, mods: { dmg: 20, def: 15 }, rankMods: { dmg: 2, def: 1.5 },
      desc: 'Gầm thét tăng sát thương và phòng thủ trong thời gian ngắn.' },
    { id: 'charge', name: 'Xung Phong Trảm', icon: '⚡', type: 'active', lv: 60, tier: 2, cd: 6, cost: 22, learn: 3000000, mult: 3.6, castRange: 7, width: 1,
      desc: 'Lao thẳng tới mục tiêu, chém mọi quái trên đường đi.' },
    { id: 'skyblade', name: 'Thiên Kiếm Giáng Thế', icon: '🗡️', type: 'active', lv: 100, tier: 3, cd: 16, cost: 40, learn: 10000000, mult: 7.5, radius: 3.4, castRange: 7, stun: 1,
      desc: 'Triệu hồi thanh kiếm khổng lồ từ trời giáng xuống.' },
  ],
  wizard: [
    { id: 'meteor', name: 'Mưa Thiên Thạch', icon: '☄️', type: 'active', lv: 1, tier: 1, cd: 2.6, cost: 14, learn: 0, mult: 2.6, radius: 2.8, castRange: 7.5,
      desc: 'Gọi thiên thạch rơi xuống mục tiêu, nổ lan xung quanh.' },
    { id: 'frost', name: 'Băng Tuyết Trận', icon: '❄️', type: 'active', lv: 30, tier: 1, cd: 6, cost: 18, learn: 100000, mult: 2, radius: 3, castRange: 7.5, slow: 3,
      desc: 'Đóng băng một vùng: gây sát thương và làm chậm quái 50%.' },
    { id: 'arcane', name: 'Tinh Thông Pháp Thuật', icon: '📘', type: 'passive', lv: 50, tier: 1, learn: 300000, mods: { skill: 3, mp: 4 },
      desc: 'Nội tại: tăng sát thương kỹ năng và MP tối đa.' },
    { id: 'manashield', name: 'Ma Pháp Hộ Thể', icon: '🔮', type: 'buff', lv: 90, tier: 1, cd: 35, cost: 25, learn: 1000000, dur: 15, mods: { guard: 20 }, rankMods: { guard: 1.5 },
      desc: 'Lá chắn phép thuật giảm sát thương phải nhận.' },
    { id: 'chain', name: 'Lôi Điện Liên Hoàn', icon: '🌩️', type: 'active', lv: 60, tier: 2, cd: 5, cost: 24, learn: 3000000, mult: 3.2, jumps: 5, castRange: 7.5, stun: 0.4,
      desc: 'Tia sét nảy liên tiếp giữa nhiều kẻ địch.' },
    { id: 'blackhole', name: 'Hố Đen Hư Không', icon: '🌑', type: 'active', lv: 100, tier: 3, cd: 18, cost: 45, learn: 10000000, mult: 1.7, radius: 3.8, castRange: 7.5, ticks: 6, every: 0.4,
      desc: 'Mở hố đen hút quái vào tâm và nghiền nát liên tục.' },
  ],
  archer: [
    { id: 'arrowrain', name: 'Mưa Tên', icon: '🏹', type: 'active', lv: 1, tier: 1, cd: 2.6, cost: 9, learn: 0, mult: 1.4, targets: 4, castRange: 7.5,
      desc: 'Bắn cùng lúc nhiều mũi tên vào các quái gần nhất.' },
    { id: 'pierce', name: 'Xuyên Tâm Tiễn', icon: '🎯', type: 'active', lv: 30, tier: 1, cd: 5, cost: 14, learn: 100000, mult: 3, length: 9, width: 0.9, castRange: 8,
      desc: 'Mũi tên năng lượng xuyên thủng mọi quái trên một đường thẳng.' },
    { id: 'eagle', name: 'Bách Phát Bách Trúng', icon: '🦅', type: 'passive', lv: 50, tier: 1, learn: 300000, mods: { crit: 1.5, spd: 2 },
      desc: 'Nội tại: tăng chí mạng và tốc độ đánh.' },
    { id: 'focus', name: 'Ưng Nhãn', icon: '👁️', type: 'buff', lv: 90, tier: 1, cd: 30, cost: 18, learn: 1000000, dur: 12, mods: { spd: 25, crit: 8 }, rankMods: { spd: 2, crit: 0.5 },
      desc: 'Tập trung cao độ: tăng mạnh tốc độ đánh và chí mạng.' },
    { id: 'icearrow', name: 'Hàn Băng Tiễn', icon: '🧊', type: 'active', lv: 60, tier: 2, cd: 6, cost: 20, learn: 3000000, mult: 2.8, targets: 4, castRange: 8, slow: 3,
      desc: 'Tên băng bắn vào nhiều mục tiêu, làm chậm 50%.' },
    { id: 'phoenix', name: 'Phượng Hoàng Tiễn', icon: '🔥', type: 'active', lv: 100, tier: 3, cd: 16, cost: 40, learn: 10000000, mult: 7, radius: 3.2, castRange: 8.5,
      desc: 'Phóng mũi tên phượng hoàng lửa, nổ tung tại mục tiêu.' },
  ],
};

export const SKILLS_BY_ID = Object.fromEntries(Object.values(SKILL_LIST).flat().map((s) => [s.id, s]));
export const TYPE_NAMES = { active: 'Chủ động', buff: 'Tăng cường', passive: 'Nội tại' };

/** Hệ số sát thương theo cấp kỹ năng (+9%/cấp) */
export const rankMult = (r) => 1 + 0.09 * (r - 1);
/** Hồi chiêu giảm 3%/cấp (tối đa −27%) */
export const rankCd = (r) => 1 - 0.03 * (r - 1);
/** Cấp nhân vật cần để nâng kỹ năng lên cấp r */
export const rankLevelReq = (sk, r) => Math.min(299, sk.lv + (r - 1) * 12);
/** Chi phí nâng lên cấp r: Zen + ngọc */
export function rankCost(sk, r) {
  // Hệ số theo cấp yêu cầu của kỹ năng: kỹ năng đầu ~8 triệu, chiêu bậc 3 ~70 triệu Zen để lên cấp 10
  const zen = Math.round((20000 + sk.lv * 1600) * r * r / 1000) * 1000;
  const need = { bless: Math.ceil(r / 2) };
  if (r >= 6) need.soul = r - 5;
  if (r >= 9) need.chaos = r - 8;
  return { zen, need };
}

/** Trạng thái kỹ năng mặc định: kỹ năng đầu tiên đã học cấp 1 và đặt ở ô 1 */
export function defaultSkills(cls) {
  const first = SKILL_LIST[cls][0].id;
  return { r: { [first]: 1 }, bar: [first, null, null, null], off: {} };
}
/** Chuẩn hoá dữ liệu kỹ năng từ save cũ */
export function migrateSkills(o, cls) {
  const d = defaultSkills(cls);
  if (!o || typeof o !== 'object') return d;
  const own = SKILL_LIST[cls].map((s) => s.id);
  const r = {};
  for (const id of own) if (o.r && o.r[id] > 0) r[id] = Math.min(MAX_RANK, Math.floor(o.r[id]));
  Object.assign(r, { [own[0]]: Math.max(1, r[own[0]] || 1) });
  const bar = Array.from({ length: BAR_SLOTS }, (_, i) => { const id = o.bar && o.bar[i]; return id && r[id] && SKILLS_BY_ID[id].type !== 'passive' ? id : null; });
  if (!bar.some(Boolean)) bar[0] = own[0];
  return { r, bar, off: Object.assign({}, o.off) };
}

// ---------------- NHIỆM VỤ CHUYỂN CHỨC ----------------
// Đủ số Reset (TIER_RESETS) sẽ mở chuỗi nhiệm vụ lên bậc tiếp theo. Xong bước cuối mới lên bậc.
// goal dùng chung kiểu với nhiệm vụ chính tuyến (config/quests.js) + 'deliver' (nộp Zen / ngọc khi bấm hoàn thành).
// Tên bậc trong mô tả: {next} = tên bậc sắp lên.
export const TIER_QUESTS = {
  2: [
    { title: 'Lời triệu tập', desc: 'Trưởng lão thị trấn cảm nhận sức mạnh của bạn sau lần tái sinh. Đạt cấp 50.', goal: { type: 'level', n: 50 }, reward: { zen: 200000 } },
    { title: 'Chứng minh bản lĩnh', desc: 'Hạ 250 quái có cấp ≥ cấp bạn − 5.', goal: { type: 'kill', strong: true, n: 250 }, reward: { bless: 5 } },
    { title: 'Thợ săn đầu lĩnh', desc: 'Hạ 3 Boss bất kỳ.', goal: { type: 'kill', boss: true, n: 3 }, reward: { soul: 3 } },
    { title: 'Máu và danh dự', desc: 'Tham gia 2 sự kiện (Huyết Lâu hoặc Quảng Trường Quỷ).', goal: { type: 'event', n: 2 }, reward: { charm: 2 } },
    { title: 'Lễ thăng bậc', desc: 'Nộp lễ vật để chính thức trở thành {next}.', goal: { type: 'deliver', need: { zen: 15000000, bless: 20, soul: 10 } }, reward: {} },
  ],
  3: [
    { title: 'Tiếng gọi thần thánh', desc: 'Đạt cấp 150.', goal: { type: 'level', n: 150 }, reward: { zen: 1000000 } },
    { title: 'Bách chiến bách thắng', desc: 'Hạ 800 quái có cấp ≥ cấp bạn − 5.', goal: { type: 'kill', strong: true, n: 800 }, reward: { soul: 5 } },
    { title: 'Diệt Hỏa Long', desc: 'Đến Sa Mạc Lửa và hạ boss Hỏa Long.', goal: { type: 'kill', mob: 'firedragon', n: 1 }, reward: { chaos: 5 } },
    { title: 'Đỉnh tháp thử thách', desc: 'Đạt kỷ lục tầng 40 Tháp Vô Tận.', goal: { type: 'towerBest', n: 40 }, reward: { charm: 3 } },
    { title: 'Lễ phong thánh', desc: 'Nộp lễ vật để chính thức trở thành {next}.', goal: { type: 'deliver', need: { zen: 30000000, soul: 40, chaos: 30 } }, reward: {} },
  ],
};
/** Chỉ số cộng vĩnh viễn theo bậc nhân vật (%) */
export const TIER_BONUS = [{}, { dmg: 6, hp: 6, def: 6 }, { dmg: 15, hp: 15, def: 15, crit: 3 }];
