// Mảnh giao diện tái sử dụng giữa các bảng
import { G } from '../core/state.js';
import { esc, fmt } from '../core/utils.js';
import { SLOT_NAMES, EXC_OPTS, JEWELS } from '../config/items.js';
import { itemPower, wingStats, itemColor, itemFull, sellPrice, weaponType, armorSet, activeSets, itemRarity } from '../systems/items.js';
import { BONUS_NAMES } from '../config/gear.js';

export const bonusText = (b) => Object.entries(b).map(([k, v]) => BONUS_NAMES[k] + ' +' + v + '%').join(', ');

/** Dòng mô tả loại vũ khí / bộ giáp của món đồ */
export function variantLines(it) {
  if (it.slot === 'weapon') { const W = weaponType(it); return '<div class="var">⚔ Loại: <b>' + W.name + '</b> — ' + W.desc + '</div>'; }
  if (it.slot === 'wings') return '';
  const set = armorSet(it), cnt = (G.S ? activeSets(G.S.equip).find((g) => g.set === set) : null), n = cnt ? cnt.count : 0;
  return '<div class="var">🛡 Bộ <b style="color:' + set.trim + '">' + set.name + '</b> (' + n + '/5 đang mặc)' +
    '<div class="' + (n >= 3 ? 'on' : 'off') + '">3 món: ' + bonusText(set.bonus3) + '</div><div class="' + (n >= 5 ? 'on' : 'off') + '">5 món: ' + bonusText(set.bonus5) + '</div></div>';
}
import { art } from '../render/art/index.js';
import { UI } from './dom.js';

export function powerLine(it) {
  if (it.slot === 'weapon') return 'Sát thương: <b>+' + itemPower(it) + '</b>';
  if (it.slot === 'wings') { const w = wingStats(it); return 'Tăng sát thương <b>' + w.dmg.toFixed(1) + '%</b> · Hấp thụ <b>' + w.abs + '%</b>'; }
  return 'Phòng thủ: <b>+' + itemPower(it) + '</b>';
}

export const excLines = (it) =>
  !it.exc ? '' : it.exc.map((o) => { const d = EXC_OPTS.find((e) => e.k === o.k); return '<div class="exc-t">✦ ' + d.name + ' +' + o.v + d.u + '</div>'; }).join('');

/** Ô vật phẩm. act = hành động khi chạm; selId = id đang được chọn */
export function itemCell(it, { placeholder = '', act = 'sel', selId = UI.sel } = {}) {
  if (!it) return '<div class="cell empty"><small class="ph">' + placeholder + '</small></div>';
  return (
    '<div class="cell r-' + itemRarity(it) + ' ' + (it.exc ? 'exc ' : '') + (selId === it.id ? 'sel' : '') + '"' + (act ? ' data-act="' + act + '"' : '') + ' data-id="' + it.id + '" style="color:' + itemColor(it) + '">' +
    art().itemIconHTML(it) +
    (it.plus ? '<small class="pl">+' + it.plus + '</small>' : '') +
    '<small class="tr">' + (it.slot === 'wings' ? 'C' + it.tier : 'T' + (it.tier + 1)) + '</small></div>'
  );
}

export function itemCard(ref, actionsHTML) {
  const it = ref.it;
  let cmp = '';
  if (ref.src === 'inv' && it.slot !== 'wings') {
    const e = G.S.equip[it.slot], diff = itemPower(it) - (e ? itemPower(e) : 0);
    cmp = ' <span style="color:' + (diff >= 0 ? '#5dff7a' : '#f66') + '">(' + (diff >= 0 ? '+' : '') + diff + ' so với đang mặc)</span>';
  }
  return (
    '<div class="tip"><b style="color:' + itemColor(it) + ';font-size:15px">' + (it.exc ? '[Hoàn Hảo] ' : '') + esc(itemFull(it)) + '</b>' +
    '<div class="muted">' + SLOT_NAMES[it.slot] + (it.slot !== 'wings' ? ' · Bậc ' + (it.tier + 1) : '') + '</div>' +
    '<div>' + powerLine(it) + cmp + '</div>' + variantLines(it) + excLines(it) +
    '<div class="muted">Giá bán: ' + fmt(sellPrice(it)) + ' Zen</div>' +
    (actionsHTML ? '<div class="row" style="margin-top:8px">' + actionsHTML + '</div>' : '') + '</div>'
  );
}

export const materialsText = (need) =>
  Object.keys(need).map((k) => '<span style="color:' + JEWELS[k].color + '">' + need[k] + ' ' + JEWELS[k].name + '</span>').join(' + ');

export const btn = (label, act, data = {}, { cls = '', disabled = false } = {}) =>
  '<button class="btn ' + cls + '" data-act="' + act + '"' +
  Object.entries(data).map(([k, v]) => ' data-' + k + '="' + v + '"').join('') + (disabled ? ' disabled' : '') + '>' + label + '</button>';
