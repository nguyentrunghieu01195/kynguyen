// Bảng Kỹ năng: bậc nhân vật, học / nâng cấp kỹ năng, gắn vào thanh kỹ năng, bật/tắt tự dùng.
import { G } from '../../core/state.js';
import { fmt } from '../../core/utils.js';
import { JEWELS } from '../../config/items.js';
import { CLASS_TIERS, TIER_RESETS, RANK_CAP, MAX_RANK, BAR_SLOTS, TYPE_NAMES, rankMult, rankCd } from '../../config/skills.js';
import { BONUS_NAMES } from '../../config/gear.js';
import { classSkills, rankOf, tierOf, tierName, rankCap, learnInfo, learnSkill, setSlot, toggleAutoSkill, mpCost, buffMods } from '../../systems/skills.js';
import { saveGame } from '../../core/save.js';
import { btn } from '../components.js';
import { skillIconHTML } from '../icons.js';
import { UI } from '../dom.js';
import { act } from '../../net/actions.js';

const MOD_NAMES = { ...BONUS_NAMES, hp: 'HP', mp: 'MP', def: 'Phòng thủ', dmg: 'Sát thương', spd: 'Tốc đánh', crit: 'Chí mạng', skill: 'ST kỹ năng', guard: 'Giảm ST nhận' };
const modsText = (m) => Object.entries(m).map(([k, v]) => (MOD_NAMES[k] || k) + ' +' + +(+v).toFixed(1) + '%').join(', ');

/** Mô tả số liệu kỹ năng ở cấp r */
export function effectText(sk, r) {
  if (sk.type === 'passive') return modsText(Object.fromEntries(Object.entries(sk.mods).map(([k, v]) => [k, v * r])));
  const cd = (sk.cd * rankCd(r)).toFixed(1) + 's hồi · ' + mpCost(sk, r) + ' MP';
  if (sk.type === 'buff') return modsText(buffMods(sk, r)) + ' trong ' + sk.dur + 's · ' + cd;
  const ex = [];
  if (sk.ticks) ex.push(sk.ticks + ' nhịp');
  if (sk.targets) ex.push(sk.targets + ' mục tiêu');
  if (sk.jumps) ex.push('nảy ' + sk.jumps + ' lần');
  if (sk.stun) ex.push('choáng ' + sk.stun + 's');
  if (sk.slow) ex.push('làm chậm ' + sk.slow + 's');
  return 'Sát thương <b>' + Math.round(sk.mult * rankMult(r) * 100) + '%</b>' + (ex.length ? ' · ' + ex.join(' · ') : '') + ' · ' + cd;
}

const needText = (zen, need) => [zen ? fmt(zen) + ' Zen' : ''].concat(Object.entries(need).map(([k, n]) => '<span style="color:' + JEWELS[k].color + '">' + n + ' ' + JEWELS[k].name + '</span>')).filter(Boolean).join(' + ') || 'Miễn phí';

function card(sk) {
  const S = G.S, r = rankOf(sk.id), inf = learnInfo(sk), cap = rankCap(), sel = UI.skSel === sk.id;
  const onBar = S.skills.bar.indexOf(sk.id);
  let h = '<div class="skc ' + (r ? 'own' : 'lock') + (sel ? ' sel' : '') + '" data-act="skSel" data-id="' + sk.id + '">' +
    '<div class="ski">' + skillIconHTML(sk.id) + (r ? '<small>' + r + '</small>' : '') + '</div><div class="skb">' +
    '<div class="skn"><b>' + sk.name + '</b> <span class="tag t-' + sk.type + '">' + TYPE_NAMES[sk.type] + '</span>' +
    (r ? ' <span class="muted">Cấp ' + r + '/' + Math.min(cap, MAX_RANK) + '</span>' : '') + (onBar >= 0 ? ' <span class="tag">Ô ' + (onBar + 1) + '</span>' : '') + '</div>' +
    '<div class="muted">' + sk.desc + '</div>' +
    '<div class="ske">' + effectText(sk, Math.max(1, r)) + '</div>';
  if (sel || !r) {
    if (inf.max) h += '<div style="color:#ffd54a">Đã đạt cấp tối đa!</div>';
    else {
      if (r) h += '<div class="ske nx">Cấp ' + inf.next + ': ' + effectText(sk, inf.next) + '</div>';
      h += '<div class="req">' + inf.reqs.map((q) => '<span class="' + (q.ok ? 'ok' : 'no') + '">' + (q.ok ? '✔ ' : '✘ ') + q.text + '</span>').join('') + '</div>' +
        '<div class="row" style="margin-top:6px">' + btn(r ? 'Nâng cấp ' + inf.next : 'Học kỹ năng', 'skLearn', { id: sk.id }, { cls: 'sm ' + (r ? '' : 'green'), disabled: !inf.ok }) +
        '<span class="muted">' + needText(inf.zen, inf.need) + '</span></div>';
    }
    if (r && sk.type !== 'passive') {
      h += '<div class="row" style="margin-top:6px"><span class="muted">Gắn vào ô:</span>' +
        Array.from({ length: BAR_SLOTS }, (_, i) => btn(String(i + 1), 'skSlot', { id: sk.id, i }, { cls: 'sm ' + (onBar === i ? 'green' : '') })).join('') +
        (onBar >= 0 ? btn('Gỡ', 'skSlot', { id: '', i: onBar }, { cls: 'sm red' }) : '') +
        '<button class="sw' + (S.skills.off[sk.id] ? '' : ' on') + '" data-act="skAuto" data-id="' + sk.id + '"><i></i>Tự dùng: ' + (S.skills.off[sk.id] ? 'TẮT' : 'BẬT') + '</button></div>';
    }
  }
  return h + '</div></div>';
}

export default {
  id: 'skills',
  title: '📖 Kỹ năng',
  render() {
    const S = G.S, t = tierOf(), names = CLASS_TIERS[S.cls];
    let h = '<div class="tip"><b style="color:#f3d58a">Bậc ' + t + ' — ' + tierName() + '</b> · Cấp kỹ năng tối đa: <b>' + rankCap() + '</b>' +
      '<div class="tiers">' + names.map((n, i) => '<span class="' + (t > i ? 'on' : '') + '">' + (i + 1) + '. ' + n + '</span>').join('<i>›</i>') + '</div>' +
      (t < 3 ? '<div class="muted">Lên <b>' + names[t] + '</b>: Reset ' + TIER_RESETS[t] + ' lần rồi hoàn thành <b>nhiệm vụ chuyển chức</b> — mở kỹ năng bậc ' + (t + 1) + ' và nâng kỹ năng tới cấp ' + RANK_CAP[t] + '.</div><div class="row" style="margin-top:4px">' + btn('🌟 Nhiệm vụ chuyển chức', 'openQuest', { tab: 'tier' }, { cls: 'sm' }) + '</div>' : '') +
      '<div class="muted" style="margin-top:4px">Chạm một kỹ năng để nâng cấp / gắn vào ô. AUTO sẽ tự dùng các kỹ năng trên thanh (trừ kỹ năng bị tắt).</div></div>';
    h += '<div class="row skbar">' + S.skills.bar.map((id, i) => '<div class="cell' + (id ? '' : ' empty') + '" ' + (id ? 'data-act="skSel" data-id="' + id + '"' : '') + '>' + (id ? skillIconHTML(id) : '<small class="ph">Ô ' + (i + 1) + '</small>') + '<small class="pl">' + (i + 1) + '</small></div>').join('') + '</div>';
    for (let tier = 1; tier <= 3; tier++) {
      const list = classSkills().filter((s) => s.tier === tier);
      if (!list.length) continue;
      h += '<h4 class="' + (t >= tier ? '' : 'lockh') + '">' + (t >= tier ? '' : '🔒 ') + 'Bậc ' + tier + ' — ' + names[tier - 1] + '</h4>' + list.map(card).join('');
    }
    return h;
  },
  actions: {
    skSel: (d) => { UI.skSel = UI.skSel === d.id ? null : d.id; },
    skLearn: async (d) => { if (await act('learnSkill', d.id)) UI.skSel = d.id; },
    skSlot: (d) => { UI.skSel = d.id || UI.skSel; return act('setSlot', +d.i, d.id || null); },
    skAuto: (d) => act('toggleAutoSkill', d.id),
  },
};

