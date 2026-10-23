// Cày khi vắng mặt: ước lượng số quái hạ được dựa trên sát thương thật của nhân vật.
import { G } from '../core/state.js';
import { expRate, eventTestOn } from './character.js';
import { clamp } from '../core/utils.js';
import { MAPS } from '../config/maps.js';
import { MONSTER, DROP, PROGRESSION, mitigate } from '../config/balance.js';
import { JEWEL_KEYS } from '../config/items.js';
import { OFFLINE } from '../config/quests.js';
import { calcStats } from './stats.js';
import { grantReward } from './rewards.js';
import { SKILL_LIST } from '../config/skills.js';

const activeLearned = (S) => SKILL_LIST[S.cls].filter((s) => s.type === 'active' && S.skills && S.skills.r[s.id]).length;

export const markSeen = () => { if (G.S) G.S.lastSeen = Date.now(); };

/**
 * Tính thưởng cho khoảng vắng mặt (ms). Trả về null nếu quá ngắn.
 * Kết quả: { minutes, capped, kills, mobLv, reward }
 */
export function computeOffline(ms) {
  const S = G.S;
  if (!S || !(ms > 0)) return null;
  const capMs = OFFLINE.capHours * 3600e3, minutes = Math.min(ms, capMs) / 60000;
  if (minutes < OFFLINE.minMinutes) return null;
  const P = G.P || calcStats(), M = MAPS[S.map];
  // Quái điển hình của bản đồ nhưng không cao quá cấp người chơi
  const mobLv = clamp(Math.round((M.lv[0] + M.lv[1]) / 2), M.lv[0], Math.max(M.lv[0], S.lv + 5));
  const hit = mitigate((P.dmgMin + P.dmgMax) / 2, MONSTER.def(mobLv)) * OFFLINE.skillBonus * (1 + 0.04 * Math.max(0, activeLearned(S) - 1));
  const killSec = MONSTER.hp(mobLv) / Math.max(1, hit * P.spd) + OFFLINE.travelSec;
  const kills = Math.floor(((minutes * 60) / killSec) * OFFLINE.efficiency);
  if (kills <= 0) return null;
  // Mô phỏng theo 12 chặng: nhân vật lên cấp dần, quái quá yếu so với cấp sẽ cho ít EXP hơn
  const STEPS = 12, perStep = kills / STEPS, expPerKill = MONSTER.exp(mobLv) * expRate();
  let lv = S.lv, exp = S.exp, totalExp = 0, penalized = false;
  for (let i = 0; i < STEPS; i++) {
    const gap = lv - mobLv - OFFLINE.gapFree, f = clamp(1 - gap / OFFLINE.gapRange, OFFLINE.gapMinFactor, 1);
    if (f < 1) penalized = true;
    const gain = perStep * expPerKill * f;
    totalExp += gain; exp += gain;
    while (lv < PROGRESSION.resetLevel && exp >= PROGRESSION.expNeed(lv)) { exp -= PROGRESSION.expNeed(lv); lv++; }
  }
  const reward = {
    exp: Math.round(totalExp),
    zen: Math.round(kills * mobLv * OFFLINE.zenPerKillLv * (1 + P.zen / 100)),
  };
  for (const k of JEWEL_KEYS) { const n = Math.floor(kills * DROP.jewel[k] * OFFLINE.jewelFactor); if (n) reward[k] = n; }
  return { minutes, capped: ms > capMs, kills, mobLv, reward, penalized, toLevel: lv };
}

export function claimOffline(res) {
  if (!res) return;
  G.S.kills += res.kills;
  grantReward(res.reward);
  markSeen();
}

export function formatDuration(min) {
  const h = Math.floor(min / 60), m = Math.floor(min % 60);
  return (h ? h + ' giờ ' : '') + m + ' phút';
}
