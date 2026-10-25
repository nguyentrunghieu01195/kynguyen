import { G } from '../../core/state.js';
import { log } from '../../core/events.js';
import { fmt } from '../../core/utils.js';
import { CFG } from '../../config/constants.js';
import { SLOTS, SLOT_NAMES } from '../../config/items.js';
import { findItem, equip, unequip, sell, sellJunk, sellPrice, isJunk } from '../../systems/items.js';
import { itemCell, itemCard, btn } from '../components.js';
import { UI } from '../dom.js';
import { divineInfo } from '../../systems/divine.js';
import { openSellItem } from './market.js';
import { act } from '../../net/actions.js';

const picks = () => (UI.picks = UI.picks || {});
/** Danh sách món đang chọn (bỏ id không còn trong túi) */
const picked = () => { const P = picks(); return G.S.inv.filter((it) => P[it.id]); };
/** Có món đáng tiếc trong số chọn: Hoàn Hảo, +4 trở lên hoặc bậc cao */
const precious = (list) => list.filter((it) => it.exc || it.plus >= 4 || it.tier >= 3).length;

/** Ô đồ ở chế độ chọn nhiều: chạm để chọn / bỏ chọn, ô đã chọn có dấu ✓ */
function pickCell(it) {
  const html = itemCell(it, { act: 'pick', selId: null });
  return picks()[it.id] ? html.replace('class="cell ', 'class="cell pick ') : html;
}
/** Thanh điều khiển chọn nhiều phía trên lưới túi đồ */
function multiBar(S) {
  if (!UI.multi) return '<div class="row" style="margin-bottom:6px">' + btn('☑ Chọn nhiều để xoá', 'multiToggle', {}, { cls: 'sm' }) + '</div>';
  const list = picked(), zen = list.reduce((a, it) => a + sellPrice(it), 0), warn = precious(list);
  return '<div class="tip"><div class="row" style="margin-bottom:6px;flex-wrap:wrap">' + btn('Chọn tất cả', 'pickAll', {}, { cls: 'sm' }) + btn('Đồ thường', 'pickJunk', {}, { cls: 'sm' }) + btn('Đảo chọn', 'pickInvert', {}, { cls: 'sm' }) + btn('Bỏ chọn', 'pickNone', {}, { cls: 'sm' }) + btn('✕ Thoát', 'multiToggle', {}, { cls: 'sm' }) + '</div>' +
    '<b>Đã chọn ' + list.length + ' / ' + S.inv.length + ' món</b>' + (list.length ? ' · nhận khoảng <span style="color:#ffd54a">' + fmt(zen) + ' Zen</span>' : '') +
    (warn ? '<div style="color:#ff8a8a;margin-top:2px">⚠ Có ' + warn + ' món đáng giá (Hoàn Hảo / +4 trở lên / bậc cao).</div>' : '') +
    '<div style="margin-top:6px">' + btn('🗑 Xoá đã chọn (' + list.length + ')', 'delPicked', {}, { cls: 'sm red', disabled: !list.length }) + '</div></div>';
}

export default {
  id: 'inv',
  title: '🎒 Túi đồ',
  render() {
    const S = G.S, ref = UI.multi ? null : findItem(UI.sel);
    const acts = !ref ? '' : ref.src === 'inv'
      ? btn('Trang bị', 'equip', {}, { cls: 'sm green' }) + (divineInfo(ref.it).kind ? btn('✨ Thần hoá', 'toDivine', {}, { cls: 'sm' }) : '') + btn('Bán', 'sell', {}, { cls: 'sm red' }) + btn('⚖️ Bán ở chợ', 'toMarket', {}, { cls: 'sm' }) + btn('⚒️ Ép đồ', 'toUpgrade', {}, { cls: 'sm' })
      : btn('Tháo ra', 'unequip', {}, { cls: 'sm' }) + btn('⚒️ Ép đồ', 'toUpgrade', {}, { cls: 'sm' });
    return (
      (ref ? itemCard(ref, acts) : '<div class="tip muted">Chạm vào một món đồ để xem chi tiết. Viền xanh lá = đồ Hoàn Hảo.</div>') +
      '<h4>Đang trang bị</h4><div class="grid eqgrid">' + SLOTS.map((sl) => itemCell(S.equip[sl], { placeholder: SLOT_NAMES[sl] })).join('') + '</div>' +
      '<div class="row" style="margin-top:8px">' + btn('✨ Rèn đồ Thần', 'open', { p: 'divine' }, { cls: 'sm' }) + btn('🎯 Bộ lọc nhặt', 'open', { p: 'loot' }, { cls: 'sm' }) + '<span class="muted" style="margin-left:auto">✦ Mảnh Thần: <b style="color:#ff7aff">' + (S.shards || 0) + '</b></span></div>' +
      '<h4>Túi đồ (' + S.inv.length + '/' + CFG.INV_SIZE + ')</h4>' + multiBar(S) +
      '<div class="grid">' + S.inv.map((it) => (UI.multi ? pickCell(it) : itemCell(it))).join('') + '</div>' +
      '<div class="row" style="margin-top:12px;justify-content:space-between">' + btn('Bán hết đồ thường', 'sellJunk', {}, { cls: 'sm red' }) +
      '<label class="row"><input type="checkbox" data-act="toggleAutoSell" ' + (S.autoSell ? 'checked' : '') + '> Tự bán đồ thường khi nhặt</label></div>'
    );
  },
  actions: {
    multiToggle: () => { UI.multi = !UI.multi; UI.picks = {}; UI.sel = null; },
    pick: (d) => { const P = picks(); if (P[d.id]) delete P[d.id]; else P[d.id] = true; },
    pickAll: () => { const P = picks(); for (const it of G.S.inv) P[it.id] = true; },
    pickNone: () => { UI.picks = {}; },
    pickJunk: () => { const P = picks(); for (const it of G.S.inv) if (isJunk(it)) P[it.id] = true; },
    pickInvert: () => { const P = picks(), N = {}; for (const it of G.S.inv) if (!P[it.id]) N[it.id] = true; UI.picks = N; },
    delPicked: async () => {
      const list = picked(); if (!list.length) return;
      const warn = precious(list), zen = list.reduce((a, it) => a + sellPrice(it), 0);
      if (!confirm('Xoá ' + list.length + ' món đã chọn' + (warn ? ' (trong đó ' + warn + ' món đáng giá: Hoàn Hảo / +4 trở lên / bậc cao)' : '') + '?\nBạn nhận ' + fmt(zen) + ' Zen. Không thể hoàn tác.')) return;
      const r = await act('sellMany', list.map((it) => it.id)); UI.picks = {};
      if (r && r.n) log('Đã xoá ' + r.n + ' món, nhận ' + fmt(r.zen) + ' Zen', '#ffd54a');
    },
    sel: (d) => (UI.sel = UI.sel === d.id ? null : d.id),
    equip: () => act('equip', UI.sel),
    unequip: () => act('unequip', UI.sel),
    sell: async () => { const z = await act('sell', UI.sel); UI.sel = null; if (z) log('Đã bán được ' + fmt(z) + ' Zen', '#ffd54a'); },
    sellJunk: async () => { const r = await act('sellJunk'); UI.sel = null; if (r) log('Đã bán ' + r.n + ' món, nhận ' + fmt(r.zen) + ' Zen', '#ffd54a'); },
    toggleAutoSell: () => act('setPref', 'autoSell', !G.S.autoSell),
    toDivine: () => ({ open: 'divine' }),
    toMarket: () => { openSellItem(UI.sel); UI.sel = null; return { open: 'market' }; },
    toUpgrade: () => { UI.up = UI.sel; UI.upMsg = ''; return { open: 'up' }; },
  },
};
