// Nhiệm vụ chính tuyến, nhiệm vụ hằng ngày, rương năng động, điểm danh.
// Tiến độ được cập nhật bằng cách lắng nghe sự kiện từ các hệ thống khác (core/events.js).
import { G } from '../core/state.js';
import { on, emit, EV, log, announce, sysOn } from '../core/events.js';
import { seededRng } from '../core/utils.js';
import { ARMOR_SLOTS } from '../config/items.js';
import { MAPS } from '../config/maps.js';
import { MAIN_QUESTS, DAILY_POOL, DAILY, CHECKIN, CHECKIN_ZEN_GROWTH } from '../config/quests.js';
import { grantReward, rewardText } from './rewards.js';
import { TIER_QUESTS, TIER_RESETS, CLASS_TIERS } from '../config/skills.js';
import { calcStats } from './stats.js';

/** Ngày hiện tại theo giờ máy, dạng YYYY-MM-DD */
export const today = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

export function defaultQuestState() {
  return { main: 0, mainProg: 0, daily: null, checkin: { count: 0, last: null }, tier: { step: 0, prog: 0 } };
}
const Q = () => G.S.quest;

// ---------------- KIỂM TRA MỤC TIÊU ----------------
const STATE_GOALS = {
  level: (g) => G.S.lv >= g.n,
  plus: (g) => ['weapon', ...ARMOR_SLOTS].some((s) => G.S.equip[s] && G.S.equip[s].plus >= g.n),
  map: (g) => !!MAPS[G.S.map] && (g.id ? MAPS[G.S.map].id === g.id : G.S.map === g.n),
  wings: (g) => !!G.S.equip.wings && G.S.equip.wings.tier >= g.n,
  towerBest: (g) => !!G.S.tower && G.S.tower.best >= g.n,
  deliver: (g) => Object.entries(g.need).every(([k, n]) => (k === 'zen' ? G.S.zen : G.S.jewels[k]) >= n),
};
export const isStateGoal = (g) => !!STATE_GOALS[g.type];

/** Sự kiện có khớp với mục tiêu không */
function matches(g, type, payload) {
  if (g.type !== type) return false;
  if (type === 'kill') {
    const m = payload;
    if (g.mob && m.tpl.id !== g.mob) return false;
    if (g.boss && !m.boss) return false;
    if (g.strong && m.lv < G.S.lv - 5) return false;
  }
  if (type === 'event' && g.ev && payload.id !== g.ev) return false;
  return true;
}

/** Tiến độ hiện tại [đã làm, cần] */
export function goalProgress(g, count) {
  if (g.type === 'level') return [Math.min(G.S.lv, g.n), g.n];
  if (g.type === 'towerBest') return [Math.min(G.S.tower.best, g.n), g.n];
  if (g.type === 'deliver') { const ks = Object.keys(g.need); return [ks.filter((k) => (k === 'zen' ? G.S.zen : G.S.jewels[k]) >= g.need[k]).length, ks.length]; }
  if (isStateGoal(g)) return [STATE_GOALS[g.type](g) ? 1 : 0, 1];
  return [Math.min(count, g.n), g.n];
}
const done = (g, count) => (isStateGoal(g) ? STATE_GOALS[g.type](g) : count >= g.n);

// ---------------- CHÍNH TUYẾN ----------------
export const currentMain = () => MAIN_QUESTS[Q().main] || null;
export const mainDone = () => { const q = currentMain(); return !!q && done(q.goal, Q().mainProg); };

export function claimMain() {
  const q = currentMain();
  if (!q || !mainDone()) return null;
  grantReward(q.reward);
  log('📜 Hoàn thành <b>' + q.title + '</b>: ' + rewardText(q.reward), '#f3d58a');
  Q().main++;
  Q().mainProg = 0;
  emit(EV.QUEST);
  return q;
}

// ---------------- CHUYỂN CHỨC ----------------
const TQ = () => (Q().tier ||= { step: 0, prog: 0 });
/** Bậc kế tiếp (2|3) hoặc null nếu đã tối đa */
export const nextTier = () => ((G.S.tier || 1) < 3 ? (G.S.tier || 1) + 1 : null);
/** Đã đủ số Reset để làm nhiệm vụ chuyển chức chưa */
export const tierUnlocked = () => { const n = nextTier(); return !!n && G.S.resets >= TIER_RESETS[n - 1]; };
/** Bước nhiệm vụ chuyển chức hiện tại (null nếu chưa mở / đã xong) */
export function currentTierStep() {
  if (!tierUnlocked()) return null;
  const q = TIER_QUESTS[nextTier()][TQ().step];
  return q ? { ...q, desc: q.desc.replace('{next}', CLASS_TIERS[G.S.cls][nextTier() - 1]) } : null;
}
export const tierStepDone = () => { const q = currentTierStep(); return !!q && done(q.goal, TQ().prog); };

/** Hoàn thành bước hiện tại; bước cuối → lên bậc. Trả về { q, tierUp } */
export function claimTierStep() {
  const q = currentTierStep(), t = TQ();
  if (!q || !tierStepDone()) return null;
  if (q.goal.type === 'deliver') for (const [k, n] of Object.entries(q.goal.need)) { if (k === 'zen') G.S.zen -= n; else G.S.jewels[k] -= n; }
  grantReward(q.reward);
  t.step++; t.prog = 0;
  let tierUp = null;
  const nt = nextTier();
  if (t.step >= TIER_QUESTS[nt].length) {
    G.S.tier = tierUp = nt;
    t.step = 0;
    calcStats();
    emit(EV.TIER_UP, G.S.tier);
  } else log('🌟 Chuyển chức: hoàn thành <b>' + q.title + '</b>' + (rewardText(q.reward) !== '—' ? ' — ' + rewardText(q.reward) : ''), '#ffd54a');
  emit(EV.QUEST);
  return { q, tierUp };
}

// ---------------- HẰNG NGÀY ----------------
/** Tạo bộ nhiệm vụ của ngày hôm nay nếu chưa có */
export function ensureDaily() {
  const q = Q(), d = today();
  if (q.daily && q.daily.date === d) return q.daily;
  const rng = seededRng(d.split('-').reduce((a, b) => a * 31 + +b, 7)), pool = DAILY_POOL.filter((q) => !q.req || q.req(G.S)), ids = [];
  while (ids.length < DAILY.perDay && pool.length) ids.push(pool.splice(Math.floor(rng() * pool.length), 1)[0].id);
  q.daily = { date: d, ids, prog: {}, claimed: {}, chests: {} };
  return q.daily;
}
export const dailyList = () => ensureDaily().ids.map((id) => DAILY_POOL.find((x) => x.id === id));
export const dailyDone = (dq) => done(dq.goal, ensureDaily().prog[dq.id] || 0);
export const activity = () => Object.keys(ensureDaily().claimed).length * DAILY.activityPerQuest;

export function claimDaily(id) {
  const D = ensureDaily(), dq = DAILY_POOL.find((x) => x.id === id);
  if (!dq || D.claimed[id] || !dailyDone(dq)) return null;
  D.claimed[id] = true;
  const r = DAILY.questReward(G.S.lv);
  grantReward(r);
  emit(EV.QUEST);
  return r;
}

export function claimChest(i) {
  const D = ensureDaily(), ch = DAILY.chests[i];
  if (!ch || D.chests[i] || activity() < ch.at) return null;
  D.chests[i] = true;
  const r = ch.reward(G.S.lv);
  grantReward(r);
  announce('Mở rương năng động ' + ch.at + '!');
  emit(EV.QUEST);
  return r;
}

// ---------------- ĐIỂM DANH ----------------
export const canCheckin = () => Q().checkin.last !== today();
export function checkinReward(count = Q().checkin.count) {
  const base = CHECKIN[count % CHECKIN.length], cycle = Math.floor(count / CHECKIN.length);
  return { ...base, zen: base.zen ? Math.round(base.zen * (1 + cycle * CHECKIN_ZEN_GROWTH)) : 0 };
}
export function doCheckin() {
  const c = Q().checkin;
  if (!canCheckin()) return null;
  const r = checkinReward(c.count);
  grantReward(r);
  c.count++;
  c.last = today();
  announce('Điểm danh ngày ' + c.count + '!');
  emit(EV.QUEST);
  return r;
}

// ---------------- THÔNG BÁO ----------------
/** Có phần thưởng đang chờ nhận không (để hiện chấm đỏ) */
export function hasClaimable() {
  if (!G.S) return false;
  if (mainDone() || canCheckin() || tierStepDone()) return true;
  const D = ensureDaily();
  if (dailyList().some((dq) => !D.claimed[dq.id] && dailyDone(dq))) return true;
  return DAILY.chests.some((ch, i) => !D.chests[i] && activity() >= ch.at);
}

// ---------------- LẮNG NGHE SỰ KIỆN ----------------
function progress(type, payload, amount = 1) {
  const S = G.S;
  if (!S || !S.quest) return;
  let changed = false;
  const q = currentMain();
  if (q && !isStateGoal(q.goal) && matches(q.goal, type, payload) && Q().mainProg < q.goal.n) {
    Q().mainProg += amount;
    changed = true;
    if (mainDone()) log('📜 Nhiệm vụ <b>' + q.title + '</b> đã hoàn thành — mở bảng Nhiệm vụ để nhận thưởng!', '#8f8');
  }
  const tq = currentTierStep();
  if (tq && !isStateGoal(tq.goal) && matches(tq.goal, type, payload) && TQ().prog < tq.goal.n) {
    TQ().prog += amount;
    changed = true;
    if (tierStepDone()) log('🌟 Nhiệm vụ chuyển chức <b>' + tq.title + '</b> đã xong — mở tab <b>Chuyển chức</b> để hoàn thành!', '#ffd54a');
  }
  const D = ensureDaily();
  for (const dq of dailyList()) {
    if (D.claimed[dq.id] || !matches(dq.goal, type, payload)) continue;
    D.prog[dq.id] = (D.prog[dq.id] || 0) + amount;
    changed = true;
  }
  if (changed) emit(EV.QUEST);
}

let inited = false;
export function initQuests() {
  if (inited) return;
  inited = true;
  sysOn(EV.KILL, (m) => progress('kill', m));
  sysOn(EV.POINTS, (n) => progress('points', null, n));
  sysOn(EV.AUTO, (onState) => onState && progress('auto'));
  sysOn(EV.PICKUP, (kind) => kind === 'jewel' && progress('jewel'));
  sysOn(EV.UPGRADE, (outcome) => { progress('upgrade'); if (outcome === 'success') progress('upgradeOk'); });
  sysOn(EV.SKILL, () => progress('skill'));
  sysOn(EV.POTION, () => progress('potion'));
  sysOn(EV.BUY, () => progress('buy'));
  sysOn(EV.RESET, () => progress('reset'));
  sysOn(EV.EVENT, (id) => progress('event', { id }));
  sysOn(EV.TOWER_FLOOR, () => progress('tower'));
}
