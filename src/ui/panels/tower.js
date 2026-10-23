// Thẻ Tháp Vô Tận (hiển thị trong bảng Sự kiện & Thử thách) + bảng kết quả lượt leo
import { G } from '../../core/state.js';

import { MAPS } from '../../config/maps.js';
import { MONSTER } from '../../config/balance.js';
import { TOWER } from '../../config/tower.js';
import { isTowerUnlocked, attemptsLeft, startFloor, towerBlock, enterTower, bandOf, modifierOf } from '../../systems/tower.js';
import { rewardText } from '../../systems/rewards.js';
import { btn } from '../components.js';
import { UI } from '../dom.js';
import { act } from '../../net/actions.js';

export function towerCard() {
  const S = G.S, best = S.tower.best, from = startFloor(), block = towerBlock(), unlocked = isTowerUnlocked();
  const nextMile = TOWER.milestones.find((m) => m > best);
  const band = MAPS[bandOf(from)], mod = modifierOf(from);
  const preview = TOWER.firstClear(nextMile || best + 1, MONSTER.exp(TOWER.mobLevel(nextMile || best + 1)), S.expRate);
  return '<div class="tip evcard tower"><div class="ico">' + TOWER.icon + '</div><b style="font-size:15px;color:#8fd0ff">' + TOWER.name + '</b>' +
    '<span class="st ' + (unlocked ? 'open' : 'closed') + '">' + (unlocked ? 'Còn ' + attemptsLeft() + '/' + TOWER.attemptsPerDay + ' lượt hôm nay' : 'Chưa mở') + '</span>' +
    '<div style="clear:both;margin-top:6px">Leo liên tiếp từng tầng: hạ hết quái trong thời gian giới hạn để lên tầng. Cứ 5 tầng có Boss; càng lên cao, quái và vùng đất càng khó. Quái có cấp theo tầng — đo đúng sức mạnh thật của anh.</div>' +
    '<div class="tw-stats"><div><b>' + best + '</b><small>Kỷ lục</small></div><div><b>' + from + '</b><small>Bắt đầu từ tầng</small></div><div><b>Lv' + TOWER.mobLevel(from) + '</b><small>Quái tầng ' + from + '</small></div></div>' +
    '<div class="muted">Vùng: ' + band.name + (mod ? ' · Hiệu ứng tầng: <b style="color:#ffb070">' + mod.name + '</b> (' + mod.desc + ')' : '') + ' · Mỗi lần vượt mốc 5 tầng được lưu làm điểm xuất phát.</div>' +
    '<div class="tw-track">' + TOWER.milestones.map((m) => '<span class="' + (best >= m ? 'done' : m === nextMile ? 'next' : '') + '">' + m + '</span>').join('') + '</div>' +
    (nextMile ? '<div class="qrew">🎯 Mốc tầng ' + nextMile + ': ' + rewardText(preview) + '</div>' : '') +
    '<div style="margin-top:8px" class="row">' + btn('LEO THÁP TỪ TẦNG ' + from, 'enterTower', {}, { cls: 'green', disabled: !!block }) + (block ? '<span class="muted">' + block + '</span>' : '') + '</div></div>';
}

export const towerActions = {
  enterTower: async () => ((await act('enterTower')) ? { close: true } : undefined),
};

const REASON = { death: 'Anh đã gục ngã', timeout: 'Hết thời gian của tầng', leave: 'Anh đã rời tháp' };

export const towerResultPanel = {
  id: 'towerres',
  title: TOWER.icon + ' Kết quả leo tháp',
  render() {
    const r = UI.towerResult;
    if (!r) return '';
    const rw = { ...r.reward }, items = rw.items; delete rw.items;
    return '<div class="tip" style="text-align:center"><div style="font-size:42px">' + (r.newRecord ? '🏆' : TOWER.icon) + '</div>' +
      (r.newRecord ? '<div style="font-size:20px;font-weight:800;color:#5dff7a">KỶ LỤC MỚI: TẦNG ' + r.best + '!</div>' : '<div style="font-size:18px;font-weight:800;color:#8fd0ff">Kỷ lục: tầng ' + r.best + '</div>') +
      '<div style="margin:8px 0">Vượt <b>' + r.cleared + '</b> tầng (tầng ' + r.from + ' → ' + (r.from + r.cleared - 1 >= r.from ? r.from + r.cleared - 1 : '—') + ') · ' + REASON[r.reason] + ' ở tầng ' + r.reached + '</div>' +
      '<div style="font-size:14px;line-height:1.8">🎁 ' + (r.cleared ? rewardText(rw) + (items ? ' · <span style="color:#5dff7a">' + items + ' món đồ Hoàn Hảo</span>' : '') : 'Chưa vượt được tầng nào') + '</div></div>' +
      '<p class="muted" style="text-align:center">Lần sau bắt đầu từ tầng ' + startFloor() + ' · Còn ' + attemptsLeft() + ' lượt hôm nay. Mạnh hơn bằng cách ép đồ, cộng điểm và chế cánh.</p>' +
      '<div style="text-align:center">' + btn('Về thành', 'close', {}, { cls: 'big' }) + '</div>';
  },
  actions: {},
};

