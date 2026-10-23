// Vật phẩm: tạo, đặt tên, tính chỉ số, trang bị/bán.
import { G } from '../core/state.js';
import { uid, rint, chance, pick } from '../core/utils.js';
import { log } from '../core/events.js';
import { ITEM, DROP } from '../config/balance.js';
import { CFG } from '../config/constants.js';
import { SLOTS, DROP_SLOTS, PIECE_DEF, PIECE_PREFIX, WEAPON_NAMES, SETS, WINGS, EXC_OPTS, RARITY_COLORS } from '../config/items.js';
import { calcStats } from './stats.js';
import { WEAPON_TYPES, ARMOR_SETS, TIER_ADJ, LINE_B_CHANCE, regularWeaponCount } from '../config/gear.js';
import { ARMOR_SLOTS } from '../config/items.js';

/** Loại vũ khí của món đồ (mặc định loại đầu nếu save cũ không có) */
export const weaponType = (it) => { const L = WEAPON_TYPES[it.cls || (G.S ? G.S.cls : 'knight')]; return L[it.wt || 0] || L[0]; };
/** Bộ giáp của món đồ */
export const armorSet = (it) => ARMOR_SETS[it.tier][it.line || 0] || ARMOR_SETS[it.tier][0];

/** Hiệu ứng bộ đang kích hoạt: [{ set, count, active: [bonus3, bonus5?] }] */
export function activeSets(equip) {
  const groups = {};
  for (const sl of ARMOR_SLOTS) { const it = equip[sl]; if (!it) continue; const k = it.tier + ':' + (it.line || 0); groups[k] = (groups[k] || 0) + 1; }
  return Object.entries(groups).map(([k, count]) => {
    const [t, l] = k.split(':').map(Number), set = ARMOR_SETS[t][l];
    return { set, tier: t, line: l, count, active: [count >= 3 ? set.bonus3 : null, count >= 5 ? set.bonus5 : null].filter(Boolean) };
  }).sort((a, b) => b.count - a.count);
}

export function itemPower(it) {
  if (it.slot === 'weapon') return Math.round(ITEM.weaponDmg(it.tier, it.plus));
  if (it.slot === 'wings') return 0;
  return Math.round(ITEM.armorDef(it.tier, PIECE_DEF[it.slot], it.plus));
}

export function wingStats(it) {
  const w = WINGS[it.tier];
  return { dmg: w.dmg + it.plus * 1.5, abs: Math.min(50, w.abs + it.plus) };
}

export function itemName(it) {
  if (it.slot === 'weapon') { const W = weaponType(it); return W.names ? W.names[it.tier] : W.name + ' ' + TIER_ADJ[it.tier]; }
  if (it.slot === 'wings') return WINGS[it.tier].name;
  return PIECE_PREFIX[it.slot] + ' ' + armorSet(it).name;
}
export const itemFull = (it) => itemName(it) + (it.plus ? ' +' + it.plus : '');

export function itemRarity(it) {
  if (it.slot === 'wings') return 'wings';
  if (it.slot === 'weapon' && weaponType(it).special) return 'royal'; // vũ khí Vương Giả (công thành)
  if (it.exc) return 'excellent';
  if (it.plus >= 7) return 'high';
  if (it.plus >= 4) return 'good';
  return 'normal';
}
export const itemColor = (it) => RARITY_COLORS[itemRarity(it)];
export const sellPrice = (it) => ITEM.sellPrice(it);
export const isJunk = (it) => !it.exc && it.plus < 4 && it.slot !== 'wings';

export function rollExc(slot, n) {
  const pool = EXC_OPTS.filter((o) => o.t === (slot === 'weapon' ? 'atk' : 'def'));
  const out = [];
  while (out.length < n && pool.length) {
    const o = pool.splice(rint(0, pool.length - 1), 1)[0];
    out.push({ k: o.k, v: rint(o.min, o.max) });
  }
  return out;
}

export function makeItem(slot, tier, plus = 0, exc = null, cls = null, extra = {}) {
  const it = { id: uid(), slot, tier, plus, exc };
  if (slot === 'weapon') { it.cls = cls || (G.S ? G.S.cls : 'knight'); it.wt = extra.wt || 0; }
  else if (slot !== 'wings') it.line = extra.line || 0;
  return it;
}

/** Thuộc tính ngẫu nhiên khi rơi: loại vũ khí / dòng giáp */
export function randomVariant(slot) {
  if (slot === 'weapon') return { wt: rint(0, regularWeaponCount(G.S ? G.S.cls : 'knight') - 1) }; // loại đặc biệt không rơi ngẫu nhiên
  return { line: chance(LINE_B_CHANCE) ? 1 : 0 };
}

export function generateDrop(tier, boss) {
  const slot = pick(DROP_SLOTS);
  if (!boss && tier > 0 && chance(DROP.tierDownChance)) tier--;
  const exc = boss || chance(DROP.excellent);
  const plus = chance(boss ? DROP.boss.plusChance : DROP.plusChance) ? rint(1, boss ? DROP.boss.maxPlus : DROP.maxPlus) : 0;
  return makeItem(slot, tier, plus, exc ? rollExc(slot, rint(1, boss ? 3 : 2)) : null, null, randomVariant(slot));
}

/** Tìm vật phẩm theo id trong trang bị hoặc túi đồ */
export function findItem(id) {
  const S = G.S;
  if (!id) return null;
  for (const sl of SLOTS) if (S.equip[sl] && S.equip[sl].id === id) return { it: S.equip[sl], src: 'eq', key: sl };
  const i = S.inv.findIndex((x) => x.id === id);
  return i >= 0 ? { it: S.inv[i], src: 'inv', key: i } : null;
}

export function removeItem(ref) {
  if (ref.src === 'eq') G.S.equip[ref.key] = null;
  else G.S.inv.splice(ref.key, 1);
}

export function equip(id) {
  const S = G.S, r = findItem(id);
  if (!r || r.src !== 'inv') return false;
  if (r.it.slot === 'weapon' && r.it.cls && r.it.cls !== S.cls) { log('Vũ khí này dành cho lớp nhân vật khác.', '#f88'); return false; }
  const old = S.equip[r.it.slot];
  S.inv.splice(r.key, 1);
  S.equip[r.it.slot] = r.it;
  if (old) S.inv.push(old);
  calcStats();
  return true;
}

export function unequip(id) {
  const S = G.S, r = findItem(id);
  if (!r || r.src !== 'eq') return false;
  if (S.inv.length >= CFG.INV_SIZE) { log('Túi đồ đầy!', '#f88'); return false; }
  S.equip[r.key] = null;
  S.inv.push(r.it);
  calcStats();
  return true;
}

export function sell(id) {
  const r = findItem(id);
  if (!r || r.src !== 'inv') return 0;
  const pr = sellPrice(r.it);
  G.S.zen += pr;
  G.S.inv.splice(r.key, 1);
  return pr;
}

export function sellJunk() {
  let zen = 0, n = 0;
  G.S.inv = G.S.inv.filter((it) => {
    if (isJunk(it)) { zen += sellPrice(it); n++; return false; }
    return true;
  });
  G.S.zen += zen;
  return { zen, n };
}
