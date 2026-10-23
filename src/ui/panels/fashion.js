// Bảng Thời trang: xem trước, mặc/cởi, mua, xem điều kiện mở khóa
import { G } from '../../core/state.js';
import { log } from '../../core/events.js';
import { fmt } from '../../core/utils.js';
import { FASHION, FASHION_SLOTS } from '../../config/fashion.js';
import { owns, unlockText, unlockProgress, buyFashion, toggleFashion, checkUnlocks } from '../../systems/fashion.js';
import { iconURL } from '../../render/art/v2/items.js';
import { saveGame } from '../../core/save.js';
import { previewHTML, startPreview } from '../preview.js';
import { btn } from '../components.js';
import { act } from '../../net/actions.js';

function card(f) {
  const S = G.S, have = owns(f.id), worn = S.fashion.eq[f.slot] === f.id, shop = f.unlock.type === 'shop';
  const [a, b] = unlockProgress(f), pct = shop ? 0 : Math.min(100, (100 * a) / b);
  const action = worn ? btn('Cởi ra', 'faToggle', { id: f.id }, { cls: 'sm' })
    : have ? btn('Mặc', 'faToggle', { id: f.id }, { cls: 'sm green' })
    : shop ? btn('Mua ' + fmt(f.unlock.zen), 'faBuy', { id: f.id }, { cls: 'sm', disabled: S.zen < f.unlock.zen })
    : '<div class="qbar" style="margin-top:4px"><i style="width:' + pct + '%;background:#c060ff"></i><span>' + Math.min(a, b) + '/' + b + '</span></div>';
  return '<div class="fa' + (worn ? ' worn' : have ? ' have' : ' locked') + '"><img src="' + iconURL('fashion', f.id) + '"><b>' + f.name + '</b>' +
    '<small>' + (have ? (worn ? '✔ Đang mặc' : 'Đã sở hữu') : '🔒 ' + unlockText(f)) + '</small>' + action + '</div>';
}

export default {
  id: 'fashion',
  title: '👗 Thời trang',
  render() {
    checkUnlocks(true);
    setTimeout(startPreview, 0);
    const S = G.S, n = S.fashion.owned.length;
    return previewHTML(190) +
      '<div class="row" style="justify-content:space-between;margin:6px 0"><span class="muted">Đã sưu tầm <b style="color:#ffb8f0">' + n + '/' + FASHION.length + '</b> · Thời trang chỉ đổi ngoại hình, không đổi chỉ số</span>' +
      '<label class="row"><input type="checkbox" data-act="faShow" ' + (S.fashion.show ? 'checked' : '') + '> Hiện thời trang</label></div>' +
      Object.entries(FASHION_SLOTS).map(([slot, name]) => '<h4>' + name + '</h4><div class="fagrid">' + FASHION.filter((f) => f.slot === slot).map(card).join('') + '</div>').join('') +
      '<p class="muted" style="margin-top:10px">Mở khóa qua điểm danh, Tháp Vô Tận, sự kiện, Reset hoặc mua bằng Zen. Bản thương mại có thể thêm thời trang giới hạn bán bằng tiền thật.</p>';
  },
  actions: {
    faToggle: (d) => act('faToggle', d.id),
    faBuy: (d) => act('faBuy', d.id),
    faShow: () => act('faShow'),
  },
};
