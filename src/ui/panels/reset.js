import { G } from '../../core/state.js';
import { log, announce } from '../../core/events.js';
import { fmt } from '../../core/utils.js';
import { PROGRESSION as PG } from '../../config/balance.js';
import { isMaxLevel, resetCost, canReset, doReset } from '../../systems/character.js';
import { enterMap } from '../../systems/world.js';
import { saveGame } from '../../core/save.js';
import { btn } from '../components.js';
import { tierOf } from '../../systems/skills.js';
import { CLASS_TIERS, TIER_RESETS, RANK_CAP } from '../../config/skills.js';
import { act } from '../../net/actions.js';

const check = (label, ok) => '<div class="stat"><span>' + label + '</span><b style="color:' + (ok ? '#5dff7a' : '#f66') + '">' + (ok ? '✔' : '✘') + '</b></div>';

export default {
  id: 'reset',
  title: '🔄 Reset',
  render() {
    const S = G.S, cost = resetCost();
    return (
      '<div class="tip">Reset đưa nhân vật về <b>cấp 1</b> nhưng <b>giữ nguyên chỉ số và trang bị</b>, đồng thời thưởng thêm <b style="color:#5dff7a">' + PG.resetBonusPoints +
      ' điểm</b>. Mỗi lần Reset còn giảm ' + PG.mapReqReducePerReset + ' cấp yêu cầu vào bản đồ.</div>' +
      (tierOf() < 3 ? '<div class="tip">🌟 Thăng bậc: Reset đủ <b>' + TIER_RESETS[tierOf()] + '</b> lần sẽ mở <b>nhiệm vụ chuyển chức</b> lên <b style="color:#ffd54a">' + CLASS_TIERS[S.cls][tierOf()] + '</b> — mở kỹ năng mới và nâng kỹ năng tới cấp ' + RANK_CAP[tierOf()] + '.</div>' : '') +
      check('Cấp ' + PG.resetLevel + ' (hiện tại: ' + S.lv + ')', isMaxLevel()) +
      check(fmt(cost) + ' Zen (hiện có: ' + fmt(S.zen) + ')', S.zen >= cost) +
      '<div class="stat"><span>Số lần đã Reset</span><b>' + S.resets + '</b></div>' +
      '<div style="margin-top:12px">' + btn('RESET NGAY', 'doReset', {}, { cls: 'big', disabled: !canReset() }) + '</div>'
    );
  },
  actions: {
    doReset: async () => ((await act('doReset')) != null ? { close: true } : undefined),
  },
};
