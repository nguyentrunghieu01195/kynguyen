// Nhân vật: tạo mới, cộng điểm, kinh nghiệm, reset.
import { defaultLoot } from '../config/loot.js';
import { gainMasterExp } from './master.js';
import { defaultMaster } from '../config/master.js';
import { G } from '../core/state.js';
import { log, announce, emit, EV } from '../core/events.js';
import { SAVE_VERSION } from '../config/constants.js';
import { CLASSES, FEMALE_CLASSES } from '../config/classes.js';
import { ARMOR_SLOTS } from '../config/items.js';
import { MAPS } from '../config/maps.js';
import { PROGRESSION as PG, PLAYER } from '../config/balance.js';
import { makeItem } from './items.js';
import { calcStats } from './stats.js';
import { defaultQuestState } from './quests.js';
import { START_TICKETS } from '../config/events.js';
import { defaultTowerState } from './tower.js';
import { defaultFashion } from './fashion.js';
import { defaultPets } from './pets.js';
import { defaultSkills } from '../config/skills.js';

export function createCharacter(cls, name, gender = 'm') {
  const S = {
    v: SAVE_VERSION, cls, name, gender: gender === 'f' && FEMALE_CLASSES.includes(cls) ? 'f' : 'm', lv: 1, exp: 0, resets: 0, pts: 0,
    stats: { ...CLASSES[cls].stats },
    zen: PLAYER.startZen,
    jewels: { ...PLAYER.startJewels },
    pot: { ...PLAYER.startPotions },
    charm: 0, equip: {}, inv: [], map: 0,
    expRate: PG.defaultExpRate, autoSell: false, kills: 0,
    quest: defaultQuestState(), lastSeen: Date.now(),
    tickets: { ...START_TICKETS }, eventTest: false, art: null, tower: defaultTowerState(), fashion: defaultFashion(), pets: defaultPets(), evDone: 0, skills: defaultSkills(cls), tier: 1, master: defaultMaster(), alt: {}, shards: 0, loot: defaultLoot(),
  };
  S.equip.weapon = makeItem('weapon', 0, 0, null, cls);
  for (const sl of ARMOR_SLOTS) S.equip[sl] = makeItem(sl, 0);
  S.equip.wings = null;
  return S;
}

export const expNeed = PG.expNeed;
/** Tốc độ EXP đang áp dụng (bị giới hạn khi chơi trực tuyến) */
export const expRate = () => (G.online ? Math.min(G.S.expRate, PG.onlineMaxExpRate) : G.S.expRate);
export const eventTestOn = () => !!G.S.eventTest && !G.online;
export const isMaxLevel = () => G.S.lv >= PG.resetLevel;
export const mapReq = (i) => Math.max(1, MAPS[i].req - G.S.resets * PG.mapReqReducePerReset);
export const canEnterMap = (i) => G.S.lv >= mapReq(i);
/** Cấp "tương đương" để AUTO chọn quái: mỗi lần Reset hạ yêu cầu bản đồ nên người đã Reset được đánh quái cao hơn cấp thật (đúng ý nghĩa Reset) */
export const autoLevel = () => G.S.lv + G.S.resets * PG.mapReqReducePerReset;

export function addPoints(stat, n) {
  const S = G.S;
  n = Math.min(n, S.pts);
  if (n <= 0) return false;
  S.stats[stat] += n;
  S.pts -= n;
  calcStats();
  emit(EV.POINTS, n);
  return true;
}

export function gainExp(amount) {
  const S = G.S;
  if (isMaxLevel()) { gainMasterExp(amount); return; } // đủ bậc → EXP dư thành cấp Master
  S.exp += amount;
  let up = 0;
  while (S.lv < PG.resetLevel && S.exp >= expNeed(S.lv)) {
    S.exp -= expNeed(S.lv);
    S.lv++;
    S.pts += PG.pointsPerLevel;
    up++;
  }
  if (isMaxLevel()) S.exp = 0;
  if (!up) return;
  calcStats();
  const p = G.R.p;
  p.hp = G.P.maxHp;
  p.mp = G.P.maxMp;
  G.R.fx.push({ k: 'lvl', x: p.x, y: p.y, t: 0, d: 1.2 });
  announce('LÊN CẤP ' + S.lv + '!');
  log('Lên cấp ' + S.lv + ' — nhận ' + up * PG.pointsPerLevel + ' điểm. Vào <b>Nhân vật</b> để cộng điểm.', '#ffe082');
  if (isMaxLevel()) log('Đã đạt cấp tối đa ' + PG.resetLevel + ' — hãy <b>Reset</b>!', '#ff9a3a');
  emit(EV.LEVEL_UP, S.lv, up);
}

export const resetCost = () => PG.resetCost(G.S.resets);
export const canReset = () => isMaxLevel() && G.S.zen >= resetCost();

/** Thực hiện reset. Trả về bản đồ phù hợp để chuyển tới. */
export function doReset() {
  const S = G.S;
  if (!canReset()) return null;
  S.zen -= resetCost();
  S.resets++;
  S.lv = 1;
  S.exp = 0;
  S.pts += PG.resetBonusPoints;
  emit(EV.RESET, S.resets);
  let mi = S.map;
  while (mi > 0 && !canEnterMap(mi)) mi--;
  return mi;
}
