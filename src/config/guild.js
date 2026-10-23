// Cấu hình Bang hội — mọi con số cân bằng của bang nằm ở đây.
export const GUILD = {
  createCost: 3000000,      // Zen để lập bang
  createMinLv: 50,          // cấp tối thiểu để lập bang
  nameMin: 2, nameMax: 12,
  // Điểm cống hiến bang cần để đạt cấp 1, 2, 3… (chỉ số i = điểm cần cho cấp i+1)
  levels: [0, 500, 2000, 5000, 10000, 20000, 40000, 80000, 150000, 300000],
  zenPerPt: 1000,           // 1 điểm cống hiến / 1.000 Zen quyên
  jewelPts: { bless: 200, soul: 500, chaos: 1500 }, // điểm cống hiến mỗi viên ngọc
  baseMembers: 20, perLevel: 5, // sức chứa = 20 + 5 × cấp bang
  maxOfficers: 3,
  maxApps: 30,              // đơn xin vào tối đa mỗi bang
  buffPerLevel: { dmg: 1, hp: 1.5, def: 1.5 }, // % cộng thêm mỗi cấp bang
  chatKeep: 30,
};

export const guildMax = () => GUILD.levels.length;
/** Cấp bang theo tổng điểm cống hiến */
export function guildLevelOf(pts) {
  let lv = 1;
  for (let i = 1; i < GUILD.levels.length; i++) if (pts >= GUILD.levels[i]) lv = i + 1;
  return lv;
}
export const guildCap = (lv) => GUILD.baseMembers + GUILD.perLevel * lv;
/** Buff (đơn vị %) theo cấp bang */
export function guildBuff(lv) {
  const o = {};
  for (const k in GUILD.buffPerLevel) o[k] = GUILD.buffPerLevel[k] * Math.max(0, lv || 0);
  return o;
}

/** Nhiệm vụ bang hằng ngày: mỗi người mỗi ngày nhận `perDay` nhiệm vụ riêng (theo ngày, giống nhau cả bang). Mục tiêu cùng kiểu với config/quests.js */
/** Nhiệm vụ bang hằng tuần: mỗi tuần (tính từ thứ Hai) 3 nhiệm vụ lớn, giống nhau cả bang. Thưởng: điểm cống hiến + Zen cho người làm; nhận đủ cả bộ thêm điểm và 1 Ngọc Hỗn Nguyên. */
export const GUILD_WEEKLY = {
  perWeek: 3,
  pts: 200,
  allBonus: 400,
  allChaos: 1,
  zenMul: 8,                     // Zen = zenMul × Zen nhiệm vụ ngày
  pool: [
    { id: 'w_kill', title: 'Quét sạch lãnh thổ', desc: 'Hạ 1.500 quái', goal: { type: 'kill', n: 1500 } },
    { id: 'w_strong', title: 'Đội tinh binh', desc: 'Hạ 600 quái có cấp ≥ cấp bạn − 5', goal: { type: 'kill', strong: true, n: 600 } },
    { id: 'w_boss', title: 'Đồ tể Boss', desc: 'Hạ 5 Boss bất kỳ', goal: { type: 'kill', boss: true, n: 5 } },
    { id: 'w_upgrade', title: 'Lò rèn của bang', desc: 'Ép đồ 40 lần', goal: { type: 'upgrade', n: 40 } },
    { id: 'w_skill', title: 'Khổ luyện', desc: 'Dùng kỹ năng 400 lần', goal: { type: 'skill', n: 400 } },
    { id: 'w_jewel', title: 'Kho ngọc bang', desc: 'Nhặt 25 viên ngọc', goal: { type: 'jewel', n: 25 } },
    { id: 'w_event', title: 'Vinh quang sự kiện', desc: 'Tham gia 5 sự kiện', goal: { type: 'event', n: 5 } },
    { id: 'w_tower', title: 'Chinh phục tháp', desc: 'Vượt 15 tầng Tháp Vô Tận', goal: { type: 'tower', n: 15 }, req: (S) => S.lv >= 100 || S.resets >= 1 },
    { id: 'w_potion', title: 'Hậu cần cả tuần', desc: 'Dùng 150 bình thuốc', goal: { type: 'potion', n: 150 } },
    { id: 'w_gboss', title: 'Chiến binh Boss Bang', desc: 'Tham gia Boss Bang Hội 3 lượt (có gây sát thương)', goal: { type: 'gboss', n: 3 } },
    { id: 'w_siege', title: 'Tiếng gọi công thành', desc: 'Tham gia 1 trận Công Thành Chiến', goal: { type: 'siege', n: 1 } },
  ],
};

export const GUILD_QUESTS = {
  perDay: 3,
  pts: 30,                       // điểm cống hiến cho bang mỗi nhiệm vụ
  allBonus: 40,                  // thưởng thêm khi nhận đủ cả bộ trong ngày
  zen: (lv) => Math.round(1500 + lv * 300), // Zen cho người làm, mỗi nhiệm vụ
  pool: [
    { id: 'kill', title: 'Bảo vệ lãnh địa', desc: 'Hạ 200 quái', goal: { type: 'kill', n: 200 } },
    { id: 'strong', title: 'Tinh binh của bang', desc: 'Hạ 80 quái có cấp ≥ cấp bạn − 5', goal: { type: 'kill', strong: true, n: 80 } },
    { id: 'boss', title: 'Săn Boss vì bang', desc: 'Hạ 1 Boss bất kỳ', goal: { type: 'kill', boss: true, n: 1 } },
    { id: 'upgrade', title: 'Rèn khí giới', desc: 'Ép đồ 5 lần', goal: { type: 'upgrade', n: 5 } },
    { id: 'skill', title: 'Luyện chiêu', desc: 'Dùng kỹ năng 60 lần', goal: { type: 'skill', n: 60 } },
    { id: 'jewel', title: 'Góp ngọc', desc: 'Nhặt 4 viên ngọc', goal: { type: 'jewel', n: 4 } },
    { id: 'event', title: 'Vinh danh bang', desc: 'Tham gia 1 sự kiện bất kỳ', goal: { type: 'event', n: 1 } },
    { id: 'tower', title: 'Chinh phục tháp', desc: 'Vượt 3 tầng Tháp Vô Tận', goal: { type: 'tower', n: 3 }, req: (S) => S.lv >= 100 || S.resets >= 1 },
    { id: 'potion', title: 'Hậu cần', desc: 'Dùng 20 bình thuốc', goal: { type: 'potion', n: 20 } },
  ],
};
