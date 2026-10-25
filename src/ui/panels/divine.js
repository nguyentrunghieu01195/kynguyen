// Bảng Rèn Đồ Thần: thần hoá đồ Thiên Thần (+9 trở lên) và nâng Thần cấp bằng Mảnh Thần.
import { G } from '../../core/state.js';
import { fmt } from '../../core/utils.js';
import { SLOTS, SLOT_NAMES } from '../../config/items.js';
import { DIVINE } from '../../config/divine.js';
import { divineInfo, divineCount, divineBonus, godOf } from '../../systems/divine.js';
import { itemFull, itemColor } from '../../systems/items.js';
import { modText } from '../../config/master.js';
import { itemCell, btn } from '../components.js';
import { UI } from '../dom.js';
import { act } from '../../net/actions.js';

const costText = (c) => '<span style="color:' + DIVINE.color + '">' + c.shards + ' Mảnh Thần</span> + ' + fmt(c.zen) + ' Zen + <span style="color:#ff5a3c">' + c.chaos + ' Ngọc Hỗn Nguyên</span>';

function card(it, where) {
  const info = divineInfo(it), g = godOf(it);
  const state = g ? '<b style="color:' + DIVINE.color + '">✦ Thần cấp ' + g + '/' + DIVINE.maxGod + '</b> (×' + DIVINE.mult(g).toFixed(2) + ')' : '<span class="muted">Chưa thần hoá</span>';
  const next = info.cost ? '<div class="muted">' + (g ? 'Lên Thần cấp ' + (g + 1) : 'Thần hoá') + ': ' + costText(info.cost) + ' · tỉ lệ <b>' + info.rate + '%</b> (thất bại mất nửa nguyên liệu)</div>' : '';
  return '<div class="fa ' + (g ? 'worn' : 'have') + '" style="display:flex;gap:10px;align-items:center;width:auto;margin-bottom:8px;text-align:left"><div style="width:52px">' + itemCell(it, { act: null, selId: null }) + '</div><div style="flex:1;text-align:left">' +
    '<b style="color:' + itemColor(it) + '">' + itemFull(it) + '</b> <small class="muted">' + where + ' · ' + SLOT_NAMES[it.slot] + '</small><div>' + state + '</div>' + next +
    (info.max ? '<div class="muted">Đã đạt tối đa.</div>' : info.kind ? btn(g ? '⬆ Nâng Thần cấp' : '✨ Thần hoá', 'dvGo', { id: it.id }, { cls: 'sm ' + (info.ok ? 'green' : ''), disabled: !info.ok }) + (info.ok ? '' : '<small class="muted"> ' + info.reason + '</small>') : '') + '</div></div>';
}

export default {
  id: 'divine',
  title: '✨ Rèn Đồ Thần',
  render() {
    const S = G.S, n = divineCount(S.equip), bonus = divineBonus(S.equip);
    const eq = SLOTS.filter((sl) => DIVINE.slots.includes(sl) && S.equip[sl]).map((sl) => [S.equip[sl], 'Đang mặc']);
    const inv = S.inv.filter((it) => DIVINE.slots.includes(it.slot) && (it.god > 0 || (it.tier === DIVINE.tier && it.plus >= DIVINE.minPlus))).map((it) => [it, 'Trong túi']);
    const list = eq.concat(inv).filter(([it]) => it.god > 0 || it.tier === DIVINE.tier);
    const dis = S.inv.filter((it) => DIVINE.slots.includes(it.slot) && it.tier === DIVINE.tier && it.plus >= DIVINE.minPlus && !it.god);
    return '<div class="tip">✨ <b>Đồ Thần</b>: nâng <b>đồ Thiên Thần (bậc 6) từ +' + DIVINE.minPlus + '</b> lên Thần cấp 1–' + DIVINE.maxGod + ' — mỗi cấp tăng chỉ số gốc thêm 18%, tự có đủ dòng Hoàn Hảo, bán rất đắt, đổi ngoại hình 3D.<br>' +
      '<b>Mảnh Thần</b> rơi từ <b>Boss</b> (bản đồ bậc 5 trở lên), hiếm hơn từ quái tinh anh và quái ở bản đồ cuối. Bạn đang có: <b style="color:' + DIVINE.color + '">' + (S.shards || 0) + ' Mảnh Thần</b>.</div>' +
      '<h4>Thần Uy (' + n + '/6 món Thần đang mặc)</h4><div class="stat"><span>' + DIVINE.setBonus.map(([k, m]) => '<span style="color:' + (n >= k ? '#5dff7a' : '#888') + '">' + k + ' món: ' + modText(m) + '</span>').join('<br>') + '</span></div>' +
      '<div class="muted">Đang cộng: ' + (Object.keys(bonus).length ? modText(bonus) : 'chưa có') + '</div>' +
      '<h4>🔨 Tách đồ lấy Mảnh Thần</h4><div class="muted">Tách đồ Thiên Thần +' + DIVINE.minPlus + ' trong túi (chưa thần hoá): ' + DIVINE.dismantle.base + ' mảnh, +' + DIVINE.dismantle.exc + ' nếu Hoàn Hảo, +' + DIVINE.dismantle.plus12 + ' nếu từ +12.</div>' +
      (dis.length ? dis.map((it) => '<div class="stat"><span style="color:' + itemColor(it) + '">' + itemFull(it) + (it.exc ? ' [Hoàn Hảo]' : '') + '</span>' + btn('Tách', 'dvDis', { id: it.id }, { cls: 'sm red' }) + '</div>').join('') : '<div class="muted">Không có món nào phù hợp trong túi.</div>') +
      '<h4>Đồ có thể thần hoá</h4>' + (list.length ? '<div>' + list.map(([it, w]) => card(it, w)).join('') + '</div>' : '<div class="muted">Chưa có đồ Thiên Thần +' + DIVINE.minPlus + ' nào (đang mặc hoặc trong túi).</div>');
  },
  actions: {
    dvDis: (d) => { if (confirm('Tách món này thành Mảnh Thần? Không thể hoàn tác.')) return act('dismantle', d.id); },
    dvGo: async (d) => { const r = await act('ascend', d.id); UI.dvMsg = r ? (r.success ? '✨ Thành công!' : '💔 Thất bại') : ''; },
  },
};
