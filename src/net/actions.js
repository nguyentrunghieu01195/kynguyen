// =====================================================================
//  HÀNH ĐỘNG NGƯỜI CHƠI — dùng chung cho chơi ngoại tuyến (máy người chơi) và máy chủ.
// =====================================================================
// Mọi thao tác làm thay đổi nhân vật (đi, đánh, ép đồ, mua bán, nhận thưởng…) đều gọi act(tên, ...tham số).
//  - Chơi khách (ngoại tuyến): chạy ngay trên máy.
//  - Chơi bằng tài khoản: gửi lên máy chủ; máy chủ chạy đúng hàm này trên nhân vật thật rồi gửi kết quả về.
// Tham số luôn được kiểm tra kiểu & giới hạn ở đây (máy chủ không tin dữ liệu từ máy người chơi).
import { G } from '../core/state.js';
import { log, announce } from '../core/events.js';
import { MAPS } from '../config/maps.js';
import { PROGRESSION as PG } from '../config/balance.js';
import { WEAPON_TYPES, regularIndexes } from '../config/gear.js';
import { commandMove, commandAttack, toggleAuto } from '../systems/player.js';
import { usePotion } from '../systems/combat.js';
import { castSlot, learnSkill, setSlot, toggleAutoSkill } from '../systems/skills.js';
import { addPoints, doReset, canEnterMap } from '../systems/character.js';
import { masterAdd, masterReset } from '../systems/master.js';
import { ascend, dismantle } from '../systems/divine.js';
import { LOOT_TOGGLES, LOOT_MAX_TIER, LOOT_MAX_PLUS } from '../config/loot.js';
import { changeClass } from '../systems/classchange.js';
import { CLASSES } from '../config/classes.js';
import { equip, unequip, sell, sellJunk, sellMany, findItem } from '../systems/items.js';
import { upgradeItem, craftWing, reforge } from '../systems/upgrade.js';
import { buy } from '../systems/shop.js';
import { claimMain, claimDaily, claimChest, doCheckin, claimTierStep } from '../systems/quests.js';
import { buyFashion, toggleFashion } from '../systems/fashion.js';
import { petUse, petBuy, petRelease } from '../systems/pets.js';
import { enterEvent, leaveEvent } from '../systems/events.js';
import { enterTower } from '../systems/tower.js';
import { enterGBoss } from '../systems/gboss.js';
import { enterSiege } from '../systems/siege.js';
import { enterMap } from '../systems/world.js';
import { claimOffline } from '../systems/offline.js';

// ---------------- KIỂM TRA THAM SỐ ----------------
const num = (v, lo, hi) => { v = +v; if (!Number.isFinite(v)) throw new Error('bad'); return Math.max(lo, Math.min(hi, v)); };
const int = (v, lo, hi) => Math.floor(num(v, lo, hi));
// mã dạng chữ-số ngắn; chặn tên thuộc tính của Object (__proto__, constructor…) để không chạm tới nguyên mẫu khi dùng làm khoá tra cứu
const PROTO = new Set(['__proto__', 'constructor', 'prototype', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'toString', 'toLocaleString', 'valueOf']);
const id = (v) => { if (typeof v !== 'string' || !/^[a-zA-Z0-9_-]{1,32}$/.test(v) || PROTO.has(v)) throw new Error('bad'); return v; };
const optId = (v) => (v == null || v === '' ? null : id(v));
const bool = (v) => !!v;
const oneOf = (v, list) => { if (!list.includes(v)) throw new Error('bad'); return v; };

/** Thưởng hoàn thành hướng dẫn tân thủ (chỉ nhận 1 lần) */
export const TUT_REWARD = { zen: 30000, hp: 20, mp: 20 };

/**
 * Danh sách hành động: tên → [kiểm tra tham số, hàm thực thi]. Hàm trả về kết quả đơn giản (số, bool, object thuần)
 * vì kết quả có thể phải gửi qua mạng.
 */
export const ACTIONS = {
  // --- di chuyển & chiến đấu ---
  move: [(a) => [num(a[0], 0, 200), num(a[1], 0, 200), bool(a[2])], (x, y, travel) => { commandMove(x, y, travel); }],
  attack: [(a) => [id(a[0])], (mid) => { const m = G.R.mobs.find((x) => x.id === mid); if (m) commandAttack(m); return !!m; }],
  auto: [() => [], () => { toggleAuto(); return G.R.auto; }],
  skill: [(a) => [int(a[0], 0, 3)], (i) => { if (!G.S.skills.bar[i]) return false; const r = castSlot(i, true); G.R.manualT = 1; return !!r; }],
  pot: [(a) => [oneOf(a[0], ['hp', 'mp'])], (t) => !!usePotion(t, true)],
  // --- nhân vật ---
  addPoints: [(a) => [id(a[0]), int(a[1], 1, 100000)], (k, n) => (Object.prototype.hasOwnProperty.call(G.S.stats, k) ? addPoints(k, n) : false)],
  learnSkill: [(a) => [id(a[0])], (k) => !!learnSkill(k)],
  setSlot: [(a) => [int(a[0], 0, 3), optId(a[1])], (i, k) => !!setSlot(i, k)],
  toggleAutoSkill: [(a) => [id(a[0])], (k) => { toggleAutoSkill(k); return true; }],
  dismantle: [(a) => [id(a[0])], (k) => dismantle(k)],
  ascend: [(a) => [id(a[0])], (k) => ascend(k)],
  setLoot: [(a) => [oneOf(a[0], [...LOOT_TOGGLES, 'minTier', 'minPlus']), a[1]], (k, v) => {
    const L = G.S.loot; if (!L) return false;
    if (k === 'minTier') L.minTier = int(v, 0, LOOT_MAX_TIER); else if (k === 'minPlus') L.minPlus = int(v, 0, LOOT_MAX_PLUS); else L[k] = !!v;
    return true;
  }],
  masterAdd: [(a) => [id(a[0])], (k) => masterAdd(k)],
  masterReset: [() => [], () => masterReset()],
  changeClass: [(a) => [oneOf(a[0], Object.keys(CLASSES))], (c) => changeClass(c)],
  doReset: [() => [], () => {
    const mi = doReset();
    if (mi == null) return null;
    enterMap(mi);
    announce('RESET LẦN ' + G.S.resets + '!');
    log('🔄 Reset lần ' + G.S.resets + ' thành công! Nhận ' + PG.resetBonusPoints + ' điểm.', '#ffd54a');
    return mi;
  }],
  // --- đồ đạc ---
  equip: [(a) => [id(a[0])], (k) => !!equip(k)],
  unequip: [(a) => [id(a[0])], (k) => !!unequip(k)],
  sell: [(a) => [id(a[0])], (k) => sell(k) || 0],
  sellJunk: [() => [], () => sellJunk()],
  sellMany: [(a) => { if (!Array.isArray(a[0]) || a[0].length > 300) throw new Error('bad'); return [[...new Set(a[0].map(id))]]; }, (ids) => sellMany(ids)],
  upgrade: [(a) => [id(a[0]), bool(a[1])], (k, charm) => upgradeItem(k, charm) || null],
  craftWing: [() => [], () => craftWing() || null],
  reforge: [(a) => [id(a[0]), int(a[1], 0, 9)], (k, v) => {
    const r = findItem(k);
    if (!r) return false;
    const ok = r.it.slot === 'weapon' ? regularIndexes(r.it.cls || G.S.cls).includes(v) : v >= 0 && v <= 1;
    return ok ? !!reforge(k, v) : false;
  }],
  buy: [(a) => [id(a[0]), int(a[1], 1, 1000)], (k, n) => !!buy(k, n)],
  // --- nhiệm vụ & thưởng ---
  claimMain: [() => [], () => claimMain() || null],
  claimDaily: [(a) => [id(a[0])], (k) => claimDaily(k) || null],
  claimChest: [(a) => [int(a[0], 0, 9)], (i) => claimChest(i) || null],
  checkin: [() => [], () => doCheckin() || null],
  claimTier: [() => [], () => claimTierStep() || null],
  claimOffline: [() => [], () => { const r = G.pendingOffline; G.pendingOffline = null; if (r) claimOffline(r); return !!r; }],
  // --- thời trang ---
  faToggle: [(a) => [id(a[0])], (k) => !!toggleFashion(k)],
  faBuy: [(a) => [id(a[0])], (k) => { if (!buyFashion(k)) return false; toggleFashion(k); log('👗 Đã mua thời trang mới!', '#ffb8f0'); return true; }],
  faShow: [() => [], () => (G.S.fashion.show = !G.S.fashion.show)],
  // --- thú cưng ---
  petUse: [(a) => [optId(a[0])], (pid) => petUse(pid)],
  petBuy: [(a) => [id(a[0])], (k) => petBuy(k)],
  petRelease: [(a) => [id(a[0])], (pid) => petRelease(pid)],
  // --- bản đồ, sự kiện, tháp ---
  warp: [(a) => [int(a[0], 0, MAPS.length - 1)], (i) => { if (!canEnterMap(i) || (G.R && G.R.event)) return false; enterMap(i); announce(MAPS[i].name); return true; }],
  enterEvent: [(a) => [oneOf(a[0], ['bc', 'ds'])], (k) => !!enterEvent(k)],
  leaveEvent: [() => [], () => { leaveEvent(); return true; }],
  enterTower: [() => [], () => !!enterTower()],
  enterGBoss: [() => [], () => !!enterGBoss()],
  enterSiege: [() => [], () => !!enterSiege()],
  // --- tuỳ chọn (danh sách trắng) ---
  setPref: [(a) => [oneOf(a[0], ['autoSell', 'expRate', 'eventTest', 'art']), a[1]], (k, v) => {
    const S = G.S;
    if (k === 'autoSell') S.autoSell = !!v;
    else if (k === 'expRate') { v = +v; if (PG.expRates.includes(v) && !(G.online && v > PG.onlineMaxExpRate)) S.expRate = v; }
    else if (k === 'eventTest') S.eventTest = !G.online && !!v;
    else if (k === 'art') S.art = v === 'classic' || v === 'v2' ? v : null;
    return true;
  }],
  // --- hướng dẫn tân thủ ---
  tut: [(a) => [int(a[0], -1, 20)], (n) => { G.S.tut = n; return n; }],
  tutFinish: [(a) => [bool(a[0])], (skipped) => {
    const S = G.S;
    S.tut = -1;
    if (skipped || S.tutRw) return false;
    S.tutRw = true;
    S.zen += TUT_REWARD.zen; S.pot.hp += TUT_REWARD.hp; S.pot.mp += TUT_REWARD.mp;
    log('🎓 Hoàn thành hướng dẫn! Thưởng <b>' + TUT_REWARD.zen.toLocaleString('vi-VN') + ' Zen</b>, ' + TUT_REWARD.hp + ' bình máu, ' + TUT_REWARD.mp + ' bình mana.', '#f3d58a');
    return true;
  }],
};

/** Chạy 1 hành động trên nhân vật hiện tại (G). Tham số không hợp lệ → { error } */
export function runAction(name, args) {
  const A = Object.prototype.hasOwnProperty.call(ACTIONS, name) && ACTIONS[name];
  if (!A || !G.S || !G.R) return { error: 'unknown' };
  let clean;
  try { clean = A[0](Array.isArray(args) ? args : []); } catch (e) { return { error: 'bad_args' }; }
  try { return { r: A[1](...clean) }; } catch (e) { return { error: 'failed' }; } // lỗi bất ngờ trong hành động không được làm hỏng phiên
}

// ---------------- ĐIỀU PHỐI ----------------
// Chế độ máy chủ: client gắn hàm gửi (net/remote.js). Không gắn → chạy trên máy.
let remoteSend = null;
export const setRemote = (fn) => { remoteSend = fn; };
export const isRemote = () => !!remoteSend;

/** Gọi hành động. Luôn trả về Promise (kết quả có thể đến từ máy chủ) */
export function act(name, ...args) {
  if (remoteSend) return remoteSend(name, args);
  const out = runAction(name, args);
  return Promise.resolve(out.error ? null : out.r);
}
