import { G } from '../../core/state.js';
import { announce } from '../../core/events.js';
import { MAPS } from '../../config/maps.js';
import { SETS } from '../../config/items.js';
import { mapReq, canEnterMap } from '../../systems/character.js';
import { enterMap } from '../../systems/world.js';
import { btn } from '../components.js';
import { act } from '../../net/actions.js';

export default {
  id: 'map',
  title: '🗺️ Bản đồ',
  render() {
    const S = G.S;
    return MAPS.map((M, i) => {
      const ok = canEnterMap(i);
      return '<div class="stat"><div><b style="color:' + (ok ? '#f3d58a' : '#777') + '">' + M.name + '</b>' + (i === S.map ? ' <span style="color:#5dff7a">(đang ở)</span>' : '') +
        '<div class="muted">Yêu cầu cấp ' + mapReq(i) + ' · Quái cấp ' + M.lv[0] + '–' + M.lv[1] + '<br>Quái: ' + M.mobs.map((x) => x.name).join(', ') + ' · Boss: ' + M.boss.name +
        '<br>Rơi đồ bậc ' + (M.tier + 1) + ' (' + SETS[M.tier].name + ') · ' + M.size + '×' + M.size + ' ô</div></div>' + btn('Đi', 'warp', { i }, { cls: 'sm', disabled: !ok || i === S.map }) + '</div>';
    }).join('') + (S.resets ? '<p class="muted" style="margin-top:8px">Mỗi lần Reset giảm 60 cấp yêu cầu vào bản đồ.</p>' : '');
  },
  actions: {
    warp: async (d) => ((await act('warp', +d.i)) ? { close: true } : undefined),
  },
};
