import { G } from '../../core/state.js';
import { log } from '../../core/events.js';
import { fmt } from '../../core/utils.js';
import { CFG } from '../../config/constants.js';
import { SLOTS, SLOT_NAMES } from '../../config/items.js';
import { findItem, equip, unequip, sell, sellJunk } from '../../systems/items.js';
import { itemCell, itemCard, btn } from '../components.js';
import { UI } from '../dom.js';
import { openSellItem } from './market.js';
import { act } from '../../net/actions.js';

export default {
  id: 'inv',
  title: '🎒 Túi đồ',
  render() {
    const S = G.S, ref = findItem(UI.sel);
    const acts = !ref ? '' : ref.src === 'inv'
      ? btn('Trang bị', 'equip', {}, { cls: 'sm green' }) + btn('Bán', 'sell', {}, { cls: 'sm red' }) + btn('⚖️ Bán ở chợ', 'toMarket', {}, { cls: 'sm' }) + btn('⚒️ Ép đồ', 'toUpgrade', {}, { cls: 'sm' })
      : btn('Tháo ra', 'unequip', {}, { cls: 'sm' }) + btn('⚒️ Ép đồ', 'toUpgrade', {}, { cls: 'sm' });
    return (
      (ref ? itemCard(ref, acts) : '<div class="tip muted">Chạm vào một món đồ để xem chi tiết. Viền xanh lá = đồ Hoàn Hảo.</div>') +
      '<h4>Đang trang bị</h4><div class="grid eqgrid">' + SLOTS.map((sl) => itemCell(S.equip[sl], { placeholder: SLOT_NAMES[sl] })).join('') + '</div>' +
      '<h4>Túi đồ (' + S.inv.length + '/' + CFG.INV_SIZE + ')</h4><div class="grid">' + S.inv.map((it) => itemCell(it)).join('') + '</div>' +
      '<div class="row" style="margin-top:12px;justify-content:space-between">' + btn('Bán hết đồ thường', 'sellJunk', {}, { cls: 'sm red' }) +
      '<label class="row"><input type="checkbox" data-act="toggleAutoSell" ' + (S.autoSell ? 'checked' : '') + '> Tự bán đồ thường khi nhặt</label></div>'
    );
  },
  actions: {
    sel: (d) => (UI.sel = UI.sel === d.id ? null : d.id),
    equip: () => act('equip', UI.sel),
    unequip: () => act('unequip', UI.sel),
    sell: async () => { const z = await act('sell', UI.sel); UI.sel = null; if (z) log('Đã bán được ' + fmt(z) + ' Zen', '#ffd54a'); },
    sellJunk: async () => { const r = await act('sellJunk'); UI.sel = null; if (r) log('Đã bán ' + r.n + ' món, nhận ' + fmt(r.zen) + ' Zen', '#ffd54a'); },
    toggleAutoSell: () => act('setPref', 'autoSell', !G.S.autoSell),
    toMarket: () => { openSellItem(UI.sel); UI.sel = null; return { open: 'market' }; },
    toUpgrade: () => { UI.up = UI.sel; UI.upMsg = ''; return { open: 'up' }; },
  },
};
