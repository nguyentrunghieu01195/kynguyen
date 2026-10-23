// Bảng Sự kiện (lịch mở cổng, đếm ngược) + bảng kết quả sau sự kiện
import { G } from '../../core/state.js';
import { EVENTS, TICKETS } from '../../config/events.js';
import { eventStatus, entryBlock, enterEvent } from '../../systems/events.js';
import { eventTestOn } from '../../systems/character.js';
import { rewardText } from '../../systems/rewards.js';
import { btn } from '../components.js';
import { UI } from '../dom.js';
import { towerCard, towerActions } from './tower.js';
import { act } from '../../net/actions.js';

export const mmss = (sec) => Math.floor(sec / 60) + ':' + String(Math.max(0, Math.floor(sec % 60))).padStart(2, '0');
const startsText = (def) => def.schedule.starts.map((s) => ':' + String(s).padStart(2, '0')).join(' và ');

/** Phần thưởng tham khảo theo cấp hiện tại */
function previewReward(def) {
  const S = G.S, lv = S.lv + def.levelOffset;
  return def.id === 'bc' ? def.reward(lv, S.expRate, 180) : def.reward(lv, S.expRate, 60, true);
}

export const eventsPanel = {
  id: 'events',
  title: '⚔️ Sự kiện & Thử thách',
  live: true,
  render() {
    const S = G.S;
    return towerCard() + Object.values(EVENTS).map((def) => {
      const st = eventTestOn() ? { open: true, secLeft: 0 } : eventStatus(def), block = entryBlock(def.id), T = TICKETS[def.ticket];
      return '<div class="tip evcard"><div class="ico">' + def.icon + '</div><b style="font-size:15px;color:#f3d58a">' + def.name + '</b>' +
        (st.open ? '<span class="st open">ĐANG MỞ' + (eventTestOn() ? ' (chế độ thử)' : ' · còn ' + mmss(st.secLeft)) + '</span>' : '<span class="st closed">Mở sau ' + mmss(st.secUntil) + '</span>') +
        '<div style="clear:both;margin-top:6px">' + def.desc + '</div>' +
        '<div class="muted">Mở vào phút ' + startsText(def) + ' mỗi giờ, trong ' + def.schedule.window + ' phút · Thời gian ' + Math.round(def.timeLimit / 60) + ' phút · Cấp ≥ ' + def.minLevel + '</div>' +
        '<div style="margin-top:4px">Vé: <b style="color:' + T.color + '">' + T.name + ' × ' + (S.tickets[def.ticket] || 0) + '</b> <span class="muted">(rơi từ quái, Cửa hàng, điểm danh, rương năng động)</span></div>' +
        '<div class="qrew">🎁 Thưởng tham khảo: ' + rewardText(previewReward(def)) + '</div>' +
        '<div style="margin-top:8px" class="row">' + btn('VÀO ' + def.name.toUpperCase(), 'enterEvent', { id: def.id }, { cls: 'green', disabled: !!block }) +
        (block ? '<span class="muted">' + block + '</span>' : '') + '</div></div>';
    }).join('');
  },
  actions: {
    enterEvent: async (d) => ((await act('enterEvent', d.id)) ? { close: true } : undefined),
    ...towerActions,
  },
};

export const resultPanel = {
  id: 'evresult',
  title: '🏆 Kết quả sự kiện',
  render() {
    const r = UI.evResult;
    if (!r) return '';
    const def = EVENTS[r.id];
    const stats = r.id === 'bc'
      ? 'Hạ ' + r.kills + ' quái · Thời gian ' + mmss(r.time) + (r.success ? ' · Dư ' + mmss(r.secLeft) : '')
      : 'Đợt ' + Math.min(r.wave, def.waves.length) + '/' + def.waves.length + ' · Hạ ' + r.kills + ' quái · <b style="color:#ffd54a">' + r.score + ' điểm</b>' + (r.bossKilled ? ' · Đã hạ ' + def.boss.name : '');
    return '<div class="tip" style="text-align:center"><div style="font-size:42px">' + (r.success ? '🏆' : '💀') + '</div>' +
      '<div style="font-size:20px;font-weight:800;color:' + (r.success ? '#5dff7a' : '#ff8a5a') + '">' + def.name + ' — ' + (r.success ? 'HOÀN THÀNH' : 'THẤT BẠI') + '</div>' +
      '<div style="margin:8px 0">' + stats + '</div><div style="font-size:14px;line-height:1.8">🎁 ' + rewardText(r.reward) + '</div></div>' +
      '<div style="text-align:center">' + btn('Về thành', 'close', {}, { cls: 'big' }) + '</div>';
  },
  actions: {},
};
