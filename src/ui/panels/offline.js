// Bảng thưởng cày offline (tự mở khi quay lại game)
import { G } from '../../core/state.js';
import { fmt } from '../../core/utils.js';
import { MAPS } from '../../config/maps.js';
import { OFFLINE } from '../../config/quests.js';
import { claimOffline, formatDuration } from '../../systems/offline.js';
import { canCheckin } from '../../systems/quests.js';
import { rewardText } from '../../systems/rewards.js';
import { saveGame } from '../../core/save.js';
import { btn } from '../components.js';
import { UI } from '../dom.js';
import { act } from '../../net/actions.js';

export default {
  id: 'offline',
  title: '🌙 Trong lúc anh vắng mặt',
  render() {
    const r = UI.offline;
    if (!r) return '<div class="tip">Không có phần thưởng.</div>';
    return '<div class="tip" style="text-align:center"><div style="font-size:40px">⚔️</div>' +
      '<div>Nhân vật đã tự cày ở <b>' + MAPS[G.S.map].name + '</b> trong <b style="color:#ffd54a">' + formatDuration(r.minutes) + '</b>' + (r.capped ? ' <span class="muted">(tối đa ' + OFFLINE.capHours + ' giờ)</span>' : '') + '</div>' +
      '<div style="font-size:22px;font-weight:800;margin:10px 0">Hạ <span style="color:#ff8a5a">' + fmt(r.kills) + '</span> quái</div>' +
      '<div style="font-size:14px;line-height:1.8">' + rewardText(r.reward) + '</div>' + (r.toLevel > G.S.lv ? '<div style="margin-top:6px">Lên tới <b style="color:#5dff7a">cấp ' + r.toLevel + '</b></div>' : '') + '</div>' +
      (r.penalized ? '<p class="muted" style="text-align:center;color:#ffb070">⚠ Quái ở đây quá yếu so với cấp của anh nên EXP bị giảm. Hãy đứng ở bản đồ phù hợp trước khi rời game.</p>' : '') +
      '<p class="muted" style="text-align:center">Hiệu suất offline bằng ' + OFFLINE.efficiency * 100 + '% so với chơi trực tiếp. Bản thương mại có thể cho thẻ VIP kéo dài lên 12–24 giờ.</p>' +
      '<div style="text-align:center;margin-top:10px">' + btn('NHẬN THƯỞNG', 'claimOffline', {}, { cls: 'big green' }) + '</div>';
  },
  actions: {
    claimOffline: async () => {
      await act('claimOffline');
      UI.offline = null;
      // Sau khi nhận offline, nhắc điểm danh nếu chưa
      if (canCheckin()) { UI.qtab = 'checkin'; return { open: 'quest' }; }
      return { close: true };
    },
  },
};
