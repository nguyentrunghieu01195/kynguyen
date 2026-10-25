// Bảng Chuyển class: chọn class mới, xem chi phí / thời gian chờ / những gì thay đổi.
import { G } from '../../core/state.js';
import { fmt } from '../../core/utils.js';
import { CLASSES } from '../../config/classes.js';
import { CLASS_TIERS } from '../../config/skills.js';
import { JEWELS } from '../../config/items.js';
import { classChangeCost, classChangeBlock, classChangeWait } from '../../systems/classchange.js';
import { btn } from '../components.js';
import { act } from '../../net/actions.js';

export default {
  id: 'classchange',
  title: '🔁 Chuyển class',
  render() {
    const S = G.S, c = classChangeCost(S), wait = classChangeWait(S);
    const cost = fmt(c.zen) + ' Zen' + Object.keys(c.jewels).map((k) => ' + ' + c.jewels[k] + ' ' + (JEWELS[k] ? JEWELS[k].name : k)).join('');
    return '<div class="tip">Đổi sang class khác mà <b>giữ cấp, Reset, Zen, bậc, thú cưng, cánh, thời trang và giáp</b>.<br>' +
      '• <b>Vũ khí</b> (đang mặc và trong túi) tự đổi sang vũ khí tương ứng của class mới, giữ bậc / cấp ép / dòng thuộc tính.<br>' +
      '• <b>Điểm chỉ số</b> đã cộng được hoàn lại để cộng lại.<br>• <b>Kỹ năng</b> của class cũ được cất lại — chuyển về sẽ có lại. Cây Master tính riêng từng class.<br>' +
      '• Phí: <b>' + cost + '</b> · mỗi lần cách nhau 6 giờ' + (wait > 0 ? ' · <span style="color:#ff8a8a">còn chờ ' + Math.ceil(wait / 60) + ' phút</span>' : '') + '.</div>' +
      Object.keys(CLASSES).map((k) => {
        const cur = k === S.cls, block = cur ? 'Class hiện tại' : classChangeBlock(k, S);
        return '<div class="fa ' + (cur ? 'worn' : 'have') + '"><b>' + CLASSES[k].name + (cur ? ' <small>(hiện tại)</small>' : '') + '</b><small>' + CLASSES[k].desc + '</small>' +
          '<small>Bậc: ' + CLASS_TIERS[k].join(' → ') + '</small>' +
          (cur ? '' : btn('Chuyển sang ' + CLASSES[k].name, 'ccGo', { c: k }, { cls: 'sm green', disabled: !!block }) + (block ? '<small class="muted">' + block + '</small>' : '')) + '</div>';
      }).join('');
  },
  actions: {
    ccGo: (d) => { if (confirm('Chuyển sang ' + CLASSES[d.c].name + '? Điểm chỉ số được hoàn lại, vũ khí đổi theo class mới, mất phí.')) return act('changeClass', d.c); },
  },
};
