// Bảng Bộ lọc nhặt đồ: chọn loại vật phẩm được tự nhặt.
import { G } from '../../core/state.js';
import { SLOT_NAMES, JEWELS, SETS } from '../../config/items.js';
import { DIVINE } from '../../config/divine.js';
import { LOOT_SLOTS, LOOT_MAX_TIER, LOOT_MAX_PLUS, defaultLoot } from '../../config/loot.js';
import { btn } from '../components.js';
import { act } from '../../net/actions.js';

const tog = (k, label, L) => '<label class="row" style="margin:3px 0"><input type="checkbox" data-act="lootTog" data-k="' + k + '" ' + (L[k] ? 'checked' : '') + '> ' + label + '</label>';

export default {
  id: 'loot',
  title: '🎯 Nhặt đồ',
  render() {
    const L = G.S.loot || defaultLoot();
    return '<div class="tip">Chọn loại vật phẩm <b>được tự nhặt</b>. Món bị lọc nằm lại trên đất (rồi biến mất) và AUTO sẽ không đi tới nhặt. <b style="color:' + DIVINE.color + '">Đồ Thần luôn được nhặt.</b></div>' +
      '<h4>Trang bị</h4>' + tog('items', 'Nhặt đồ trang bị', L) +
      '<div class="row" style="flex-wrap:wrap">' + LOOT_SLOTS.map((k) => tog(k, SLOT_NAMES[k], L)).join('') + '</div>' +
      tog('excOnly', 'Chỉ nhặt đồ <b style="color:#5dff7a">Hoàn Hảo</b>', L) +
      '<div class="stat"><span>Bậc tối thiểu: <b>' + (L.minTier + 1) + ' · ' + SETS[L.minTier].name + '</b></span><div class="row">' + btn('−', 'lootStep', { k: 'minTier', d: -1 }, { cls: 'sm', disabled: L.minTier <= 0 }) + btn('+', 'lootStep', { k: 'minTier', d: 1 }, { cls: 'sm', disabled: L.minTier >= LOOT_MAX_TIER }) + '</div></div>' +
      '<div class="stat"><span>Cấp ép tối thiểu: <b>+' + L.minPlus + '</b></span><div class="row">' + btn('−', 'lootStep', { k: 'minPlus', d: -1 }, { cls: 'sm', disabled: L.minPlus <= 0 }) + btn('+', 'lootStep', { k: 'minPlus', d: 1 }, { cls: 'sm', disabled: L.minPlus >= LOOT_MAX_PLUS }) + btn('+5', 'lootStep', { k: 'minPlus', d: 5 }, { cls: 'sm', disabled: L.minPlus >= LOOT_MAX_PLUS }) + '</div></div>' +
      '<h4>Vật phẩm khác</h4><div class="row" style="flex-wrap:wrap">' + tog('zen', 'Zen', L) +
      ['bless', 'soul', 'chaos'].map((k) => tog(k, '<span style="color:' + JEWELS[k].color + '">' + JEWELS[k].name + '</span>', L)).join('') +
      tog('shard', '<span style="color:' + DIVINE.color + '">Mảnh Thần</span>', L) + tog('hp', 'Bình máu', L) + tog('mp', 'Bình mana', L) + tog('ticket', 'Vé sự kiện', L) + '</div>' +
      '<div class="row" style="margin-top:10px">' + btn('Nhặt tất cả (mặc định)', 'lootReset', {}, { cls: 'sm' }) + btn('Chỉ nhặt đồ tốt', 'lootGood', {}, { cls: 'sm green' }) + '</div>';
  },
  actions: {
    lootTog: (d) => act('setLoot', d.k, !G.S.loot[d.k]),
    lootStep: (d) => act('setLoot', d.k, (G.S.loot[d.k] || 0) + +d.d),
    lootReset: async () => { const D = defaultLoot(); for (const k of Object.keys(D)) await act('setLoot', k, D[k]); },
    // Đồ tốt: bỏ bình thường / đồ thường (bậc < 3), chỉ giữ Hoàn Hảo hoặc +4 trở lên
    lootGood: async () => { await act('setLoot', 'minTier', 2); await act('setLoot', 'minPlus', 0); await act('setLoot', 'excOnly', false); },
  },
};
