// Trao phần thưởng chung cho nhiệm vụ, điểm danh, cày offline.
import { G } from '../core/state.js';
import { mapTier } from './loot.js';
import { fmt } from '../core/utils.js';
import { JEWELS, DROP_SLOTS } from '../config/items.js';
import { TICKETS } from '../config/events.js';
import { pick } from '../core/utils.js';
import { makeItem, rollExc, itemFull, itemColor, randomVariant } from './items.js';
import { gainExp } from './character.js';

const LABEL = {
  zen: (v) => '<span style="color:#ffd54a">' + fmt(v) + ' Zen</span>',
  exp: (v) => '<span style="color:#ffe082">' + fmt(v) + ' EXP</span>',
  bless: (v) => '<span style="color:' + JEWELS.bless.color + '">' + v + ' ' + JEWELS.bless.name + '</span>',
  soul: (v) => '<span style="color:' + JEWELS.soul.color + '">' + v + ' ' + JEWELS.soul.name + '</span>',
  chaos: (v) => '<span style="color:' + JEWELS.chaos.color + '">' + v + ' ' + JEWELS.chaos.name + '</span>',
  charm: (v) => v + ' Bùa Bảo Hộ',
  potHp: (v) => v + ' Bình Máu',
  potMp: (v) => v + ' Bình Mana',
  ticketBc: (v) => '<span style="color:' + TICKETS.bc.color + '">' + v + ' ' + TICKETS.bc.name + '</span>',
  ticketDs: (v) => '<span style="color:' + TICKETS.ds.color + '">' + v + ' ' + TICKETS.ds.name + '</span>',
};

/** Tạo món đồ từ mô tả phần thưởng (dùng cho cả hiển thị lẫn trao) */
export function rewardItem(spec) {
  const slot = spec.slot || pick(DROP_SLOTS), tier = spec.tier == null ? mapTier() : spec.tier;
  return makeItem(slot, tier, spec.plus || 0, spec.exc ? rollExc(slot, spec.exc) : null, null, randomVariant(slot));
}

/** Mô tả phần thưởng thành HTML ngắn */
export function rewardText(r) {
  const parts = Object.keys(LABEL).filter((k) => r[k]).map((k) => LABEL[k](r[k]));
  if (r.item && !r.item.slot) parts.push('<span style="color:#5dff7a">1 món đồ ' + (r.item.exc ? 'Hoàn Hảo ' : '') + '+' + (r.item.plus || 0) + '</span>');
  else if (r.item) {
    const preview = makeItem(r.item.slot, r.item.tier, r.item.plus || 0, r.item.exc ? [{}] : null);
    parts.push('<span style="color:' + itemColor(preview) + '">' + (r.item.exc ? '[Hoàn Hảo] ' : '') + itemFull(preview) + '</span>');
  }
  return parts.join(' · ') || '—';
}

export function grantReward(r) {
  const S = G.S;
  if (r.zen) S.zen += Math.round(r.zen);
  for (const k of ['bless', 'soul', 'chaos']) if (r[k]) S.jewels[k] += r[k];
  if (r.charm) S.charm += r.charm;
  if (r.potHp) S.pot.hp += r.potHp;
  if (r.potMp) S.pot.mp += r.potMp;
  if (r.ticketBc) S.tickets.bc += r.ticketBc;
  if (r.ticketDs) S.tickets.ds += r.ticketDs;
  if (r.item) S.inv.push(rewardItem(r.item));
  if (r.exp && G.R) gainExp(r.exp);
}
