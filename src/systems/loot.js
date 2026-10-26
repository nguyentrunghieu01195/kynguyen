// Rơi đồ & nhặt đồ
import { G } from '../core/state.js';
import { log, emit, EV } from '../core/events.js';
import { petPickup } from './pets.js';
import { rnd, rint, chance, clamp, esc, fmt } from '../core/utils.js';
import { CFG } from '../config/constants.js';
import { DROP } from '../config/balance.js';
import { JEWELS, JEWEL_KEYS } from '../config/items.js';
import { TICKETS } from '../config/events.js';
import { NIGHTMARE } from '../config/nightmare.js';
import { generateDrop, rollExc, sellPrice, isJunk, itemColor, itemFull } from './items.js';
import { addText } from './combat.js';
import { blockedAt } from './nav.js';
import { MAPS } from '../config/maps.js';
import { DIVINE } from '../config/divine.js';
import { defaultLoot } from '../config/loot.js';

/** Bậc đồ rơi theo bản đồ hiện tại */
export const mapTier = () => (MAPS[G.S.map] ? MAPS[G.S.map].tier : 0);

/** Vị trí rơi quanh quái, không rơi xuống nước / ngoài bản đồ */
function dropPos(m, spread) {
  const mp = G.R.map, W = mp.w || CFG.MAP_W, H = mp.h || CFG.MAP_H;
  const x = clamp(m.x + rnd(-spread, spread), 1.3, W - 1.3), y = clamp(m.y + rnd(-spread, spread), 1.3, H - 1.3);
  return blockedAt(mp, x, y) ? { x: m.x, y: m.y } : { x, y };
}
export function addDrop(m, kind, val, spread = 0.7) {
  G.R.drops.push({
    ...dropPos(m, spread),
    kind, val, t: 0,
  });
}

export function rollDrops(m) {
  const tier = mapTier(), B = DROP.boss, E = m.elite ? DROP.elite : null;
  const zen = Math.max(1, Math.round(m.lv * rint(...DROP.zenPerLevel) * (1 + G.P.zen / 100) * (m.boss ? B.zenMult : 1) * (E ? E.zenMul : 1)));
  addDrop(m, 'zen', zen);
  if (m.nightmare) { // Hỗn Mang Chi Vương: thưởng lớn, đồ đã ép sẵn và có dòng Hoàn Hảo
    const D = NIGHTMARE.drop, sp = 2.2;
    for (const k of ['chaos', 'soul', 'bless']) for (let i = rint(...D[k]); i--; ) addDrop(m, 'jewel', k, sp);
    addDrop(m, 'shard', rint(...D.shards), sp);
    for (let i = 0; i < D.items; i++) { const it = generateDrop(tier, true); it.plus = rint(D.plusMin, D.plusMax); it.exc = rollExc(it.slot, rint(...D.excLines)); addDrop(m, 'item', it, sp); }
    addDrop(m, 'pot', { t: 'hp', n: 30 }, sp);
    return;
  }
  if (m.boss && !m.event) { // boss sự kiện không dùng bảng rơi boss (đã có thưởng sự kiện)
    const sp = 1.8;
    for (const k of JEWEL_KEYS) for (let i = rint(...B[k]); i--; ) addDrop(m, 'jewel', k, sp);
    for (let i = 0; i < B.items; i++) addDrop(m, 'item', generateDrop(tier, true), sp);
    addDrop(m, 'pot', { t: 'hp', n: B.potHp }, sp);
    if (tier >= DIVINE.drop.bossMapTier) addDrop(m, 'shard', rint(...DIVINE.drop.boss), sp);
    return;
  }
  if (chance(E ? E.itemChance : DROP.item)) addDrop(m, 'item', generateDrop(tier, !!E));
  if (!G.R.event && ((E && tier >= DIVINE.drop.bossMapTier && chance(DIVINE.drop.eliteChance)) || (!E && tier >= DIVINE.drop.mobMapTier && chance(DIVINE.drop.mobChance)))) addDrop(m, 'shard', 1);
  for (let r = E ? E.jewelRolls : 1; r--; ) for (const k of JEWEL_KEYS) if (chance(DROP.jewel[k])) addDrop(m, 'jewel', k);
  if (chance(DROP.potHp)) addDrop(m, 'pot', { t: 'hp', n: rint(1, 3) });
  if (chance(DROP.potMp)) addDrop(m, 'pot', { t: 'mp', n: rint(1, 3) });
  if (!G.R.event) for (const k in TICKETS) if (chance(TICKETS[k].dropChance)) addDrop(m, 'ticket', k);
}

const willAutoSell = (it) => G.S.autoSell && isJunk(it);

/** Bộ lọc nhặt: vật phẩm này có được nhặt không (đồ Thần luôn được nhặt) */
export function wantPick(d) {
  const L = G.S.loot || defaultLoot();
  switch (d.kind) {
    case 'zen': return L.zen;
    case 'jewel': return L[d.val] !== false;
    case 'shard': return L.shard;
    case 'pot': return d.val.t === 'hp' ? L.hp : L.mp;
    case 'ticket': return L.ticket;
    case 'item': {
      const it = d.val;
      if (it.god > 0) return true;
      if (!L.items) return false;
      if (it.slot !== 'wings' && L[it.slot] === false) return false;
      if (L.excOnly && !it.exc) return false;
      return it.tier >= L.minTier && it.plus >= L.minPlus;
    }
    default: return true;
  }
}
export const canPick = (d) => wantPick(d) && (d.kind !== 'item' || willAutoSell(d.val) || G.S.inv.length < CFG.INV_SIZE);

export function pickup(d, i) {
  const S = G.S;
  switch (d.kind) {
    case 'item': {
      const it = d.val;
      if (willAutoSell(it)) {
        const pr = sellPrice(it);
        S.zen += pr;
        addText(d.x, d.y, '+' + fmt(pr) + ' Zen', '#ffd54a');
      } else if (S.inv.length >= CFG.INV_SIZE) {
        if (!d.warned) { log('Túi đồ đầy! Hãy bán bớt đồ.', '#f88'); d.warned = true; }
        return;
      } else {
        S.inv.push(it);
        log('Nhặt được <span style="color:' + itemColor(it) + '">' + (it.exc ? '[Hoàn Hảo] ' : '') + esc(itemFull(it)) + '</span>');
      }
      break;
    }
    case 'shard':
      S.shards = (S.shards || 0) + d.val;
      log('Nhặt được <span style="color:' + DIVINE.color + '">' + d.val + ' Mảnh Thần</span>');
      addText(d.x, d.y, '+' + d.val + ' Mảnh Thần', DIVINE.color, true);
      break;
    case 'zen':
      S.zen += d.val;
      addText(d.x, d.y, '+' + fmt(d.val) + ' Zen', '#ffd54a');
      break;
    case 'jewel': {
      const J = JEWELS[d.val];
      S.jewels[d.val]++;
      log('Nhặt được <span style="color:' + J.color + '">' + J.name + '</span>');
      addText(d.x, d.y, J.short, J.color, true);
      break;
    }
    case 'ticket':
      S.tickets[d.val]++;
      log('Nhặt được <span style="color:' + TICKETS[d.val].color + '">' + TICKETS[d.val].name + '</span>!');
      addText(d.x, d.y, TICKETS[d.val].name, TICKETS[d.val].color, true);
      break;
    case 'pot':
      S.pot[d.val.t] += d.val.n;
      addText(d.x, d.y, '+' + d.val.n + (d.val.t === 'hp' ? ' bình máu' : ' bình mana'), d.val.t === 'hp' ? '#ff7070' : '#6aaaff');
      break;
  }
  G.R.drops.splice(i, 1);
  emit(EV.PICKUP, d.kind, d.val);
}

export function updateDrops(dt) {
  const R = G.R, p = R.p;
  for (let i = R.drops.length - 1; i >= 0; i--) {
    const d = R.drops[i];
    d.t += dt;
    if (d.t > DROP.despawnSec) { R.drops.splice(i, 1); continue; }
    if (p.dead <= 0 && Math.hypot(d.x - p.x, d.y - p.y) < DROP.pickupRadius + petPickup() && wantPick(d)) pickup(d, i);
  }
}
