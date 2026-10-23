// Bảng Nhiệm vụ: 3 tab Chính tuyến · Hằng ngày · Điểm danh
import { G } from '../../core/state.js';
import { MAIN_QUESTS, DAILY, CHECKIN } from '../../config/quests.js';
import {
  currentMain, mainDone, claimMain, goalProgress, dailyList, dailyDone, ensureDaily, activity, claimDaily, claimChest,
  canCheckin, checkinReward, doCheckin, today, currentTierStep, tierStepDone, claimTierStep, nextTier, tierUnlocked,
} from '../../systems/quests.js';
import { TIER_QUESTS, TIER_RESETS, TIER_BONUS, CLASS_TIERS, RANK_CAP } from '../../config/skills.js';
import { JEWELS } from '../../config/items.js';
import { fmt } from '../../core/utils.js';
import { bonusText } from '../components.js';
import { rewardText } from '../../systems/rewards.js';
import { saveGame } from '../../core/save.js';
import { btn } from '../components.js';
import { UI } from '../dom.js';
import { act } from '../../net/actions.js';

const bar = (a, b, col = '#e8c26a') =>
  '<div class="qbar"><i style="width:' + Math.min(100, (100 * a) / Math.max(1, b)) + '%;background:' + col + '"></i><span>' + a + ' / ' + b + '</span></div>';

function mainTab() {
  const Q = G.S.quest, q = currentMain();
  let h = '<div class="muted" style="margin-bottom:8px">Chuỗi nhiệm vụ dẫn anh qua toàn bộ hành trình — từ Đồng Cỏ Xanh tới Reset. Tiến độ: <b>' + Math.min(Q.main, MAIN_QUESTS.length) + ' / ' + MAIN_QUESTS.length + '</b></div>';
  if (!q) return h + '<div class="tip">🏆 Anh đã hoàn thành toàn bộ chuỗi nhiệm vụ chính! Nhiệm vụ mới sẽ có ở bản cập nhật sau.</div>';
  const [a, b] = goalProgress(q.goal, Q.mainProg), ok = mainDone();
  h += '<div class="tip qcard' + (ok ? ' ready' : '') + '"><div class="qhead"><b>' + (Q.main + 1) + '. ' + q.title + '</b>' + (ok ? '<span class="qok">Hoàn thành</span>' : '') + '</div>' +
    '<div>' + q.desc + '</div>' + bar(a, b, ok ? '#5dff7a' : '#e8c26a') +
    '<div class="qrew">🎁 ' + rewardText(q.reward) + '</div>' +
    (ok ? '<div style="margin-top:8px">' + btn('NHẬN THƯỞNG', 'claimMain', {}, { cls: 'green' }) + '</div>' : '') + '</div>';
  const next = MAIN_QUESTS.slice(Q.main + 1, Q.main + 3);
  if (next.length) h += '<h4>Sắp tới</h4>' + next.map((n, i) => '<div class="stat muted"><span>' + (Q.main + 2 + i) + '. ' + n.title + '</span><span>🔒</span></div>').join('');
  return h;
}

function dailyTab() {
  const D = ensureDaily(), act = activity(), maxAct = DAILY.perDay * DAILY.activityPerQuest;
  let h = '<div class="tip"><div class="qhead"><b>Điểm năng động: <span style="color:#ffd54a">' + act + '</span> / ' + maxAct + '</b><span class="muted">Làm mới lúc 0h</span></div>' + bar(act, maxAct, '#ff9a3a') +
    '<div class="chests">' + DAILY.chests.map((ch, i) => {
      const opened = D.chests[i], ready = !opened && act >= ch.at;
      return '<div class="chest' + (ready ? ' ready' : '') + (opened ? ' open' : '') + '"' + (ready ? ' data-act="claimChest" data-i="' + i + '"' : '') + '><div class="ci">' + (opened ? '✅' : '🎁') + '</div><b>' + ch.at + '</b><small>' + rewardText(ch.reward(G.S.lv)) + '</small></div>';
    }).join('') + '</div></div>';
  h += dailyList().map((dq) => {
    const prog = D.prog[dq.id] || 0, [a, b] = goalProgress(dq.goal, prog), ok = dailyDone(dq), claimed = D.claimed[dq.id];
    return '<div class="tip qcard' + (ok && !claimed ? ' ready' : '') + '"><div class="qhead"><b>' + dq.title + '</b>' +
      (claimed ? '<span class="qok">Đã nhận ✓</span>' : ok ? btn('Nhận', 'claimDaily', { id: dq.id }, { cls: 'sm green' }) : '') + '</div>' +
      '<div class="muted">' + dq.desc + ' · +' + DAILY.activityPerQuest + ' năng động · ' + rewardText(DAILY.questReward(G.S.lv)) + '</div>' + bar(a, b, claimed ? '#5a5a5a' : ok ? '#5dff7a' : '#e8c26a') + '</div>';
  }).join('');
  return h;
}

function checkinTab() {
  const c = G.S.quest.checkin, cycleStart = Math.floor(c.count / CHECKIN.length) * CHECKIN.length, can = canCheckin();
  let h = '<div class="muted" style="margin-bottom:8px">Điểm danh mỗi ngày để nhận quà. Bỏ lỡ một ngày cũng không mất chuỗi. Mỗi vòng 7 ngày sau, phần thưởng Zen tăng thêm 50%.</div><div class="checkin">';
  for (let i = 0; i < CHECKIN.length; i++) {
    const n = cycleStart + i, got = n < c.count, isToday = n === c.count && can, r = checkinReward(n);
    h += '<div class="day' + (got ? ' got' : '') + (isToday ? ' today' : '') + (i === 6 ? ' big' : '') + '"><b>Ngày ' + (n + 1) + '</b><small>' + rewardText(r) + '</small>' + (got ? '<div class="stamp">✓</div>' : '') + '</div>';
  }
  h += '</div><div style="margin-top:12px;text-align:center">' +
    (can ? btn('ĐIỂM DANH HÔM NAY', 'checkin', {}, { cls: 'big green' }) : '<span class="muted">Hôm nay (' + today() + ') anh đã điểm danh. Quay lại vào ngày mai nhé!</span>') + '</div>';
  return h;
}

const NEED_NAME = (k) => (k === 'zen' ? 'Zen' : JEWELS[k].name);
function tierTab() {
  const S = G.S, names = CLASS_TIERS[S.cls], cur = S.tier || 1, nt = nextTier();
  let h = '<div class="tip"><div class="tiers">' + names.map((n, i) => '<span class="' + (cur > i ? 'on' : '') + '">' + (i + 1) + '. ' + n + '</span>').join('<i>›</i>') + '</div>' +
    '<div class="muted">Mỗi bậc: mở kỹ năng mới, nâng giới hạn cấp kỹ năng và cộng chỉ số vĩnh viễn.</div></div>';
  if (!nt) return h + '<div class="tip">👑 Bạn đã đạt bậc cao nhất — <b style="color:#ffd54a">' + names[2] + '</b>!</div>';
  const bonus = TIER_BONUS[nt - 1];
  h += '<h4>🌟 Chuyển chức: ' + names[nt - 1] + '</h4><div class="tip">Phần thưởng: mở kỹ năng bậc ' + nt + ' · kỹ năng tối đa cấp ' + RANK_CAP[nt - 1] + ' · <span style="color:#5dff7a">' + bonusText(bonus) + '</span></div>';
  if (!tierUnlocked()) return h + '<div class="tip muted">🔒 Cần <b>Reset ' + TIER_RESETS[nt - 1] + ' lần</b> để nhận nhiệm vụ (hiện tại: ' + S.resets + ').</div>' + stepsList(nt, -1);
  const q = currentTierStep(), T = S.quest.tier, ok = tierStepDone(), [a, b] = goalProgress(q.goal, T.prog);
  h += '<div class="tip qcard' + (ok ? ' ready' : '') + '"><div class="qhead"><b>Bước ' + (T.step + 1) + '/' + TIER_QUESTS[nt].length + ': ' + q.title + '</b>' + (ok ? '<span class="qok">Đủ điều kiện</span>' : '') + '</div><div>' + q.desc + '</div>';
  if (q.goal.type === 'deliver') h += '<div class="req" style="margin:6px 0">' + Object.entries(q.goal.need).map(([k, n]) => { const have = k === 'zen' ? S.zen : S.jewels[k]; return '<span class="' + (have >= n ? 'ok' : 'no') + '">' + (have >= n ? '✔ ' : '✘ ') + fmt(n) + ' ' + NEED_NAME(k) + ' (có ' + fmt(have) + ')</span>'; }).join('') + '</div>';
  else h += bar(a, b, ok ? '#5dff7a' : '#e8c26a');
  if (rewardText(q.reward) !== '—') h += '<div class="qrew">🎁 ' + rewardText(q.reward) + '</div>';
  const last = T.step === TIER_QUESTS[nt].length - 1;
  h += (ok ? '<div style="margin-top:8px">' + btn(last ? '🌟 THĂNG BẬC ' + names[nt - 1].toUpperCase() : 'HOÀN THÀNH', 'claimTier', {}, { cls: 'green' + (last ? ' big' : '') }) + '</div>' : '') + '</div>';
  return h + stepsList(nt, T.step);
}
function stepsList(nt, cur) {
  return '<h4>Các bước</h4>' + TIER_QUESTS[nt].map((s, i) => '<div class="stat' + (i === cur ? '' : ' muted') + '"><span>' + (i + 1) + '. ' + s.title + '</span><span>' + (i < cur ? '✅' : i === cur ? '▶' : '🔒') + '</span></div>').join('');
}

const TABS = [['main', '📜 Chính tuyến', mainTab], ['tier', '🌟 Chuyển chức', tierTab], ['daily', '📅 Hằng ngày', dailyTab], ['checkin', '🎁 Điểm danh', checkinTab]];

export default {
  id: 'quest',
  title: '📜 Nhiệm vụ',
  render() {
    const tab = UI.qtab || 'main';
    return '<div class="tabs">' + TABS.map(([id, label]) => '<button class="tab' + (tab === id ? ' on' : '') + '" data-act="qtab" data-t="' + id + '">' + label + '</button>').join('') + '</div>' +
      TABS.find((t) => t[0] === tab)[2]();
  },
  actions: {
    qtab: (d) => (UI.qtab = d.t),
    claimMain: () => act('claimMain'),
    claimDaily: (d) => act('claimDaily', d.id),
    claimChest: (d) => act('claimChest', +d.i),
    checkin: () => act('checkin'),
    claimTier: () => act('claimTier'),
  },
};
