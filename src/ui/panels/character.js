import { G } from '../../core/state.js';
import { esc, fmt } from '../../core/utils.js';
import { CLASSES } from '../../config/classes.js';
import { calcStats } from '../../systems/stats.js';
import { tierName, tierOf, classSkills, rankOf } from '../../systems/skills.js';
import { expNeed, addPoints } from '../../systems/character.js';
import { btn, bonusText } from '../components.js';
import { previewHTML, startPreview } from '../preview.js';
import { weaponType } from '../../systems/items.js';
import { act } from '../../net/actions.js';

const STAT_ROWS = (cls) => [
  ['str', 'Sức mạnh', cls === 'wizard' ? 'Ít tác dụng với Pháp Sư' : 'Tăng sát thương'],
  ['agi', 'Nhanh nhẹn', 'Tăng phòng thủ & tốc đánh' + (cls === 'archer' ? ' & sát thương' : '')],
  ['vit', 'Thể lực', 'Tăng HP tối đa'],
  ['ene', 'Năng lượng', 'Tăng MP' + (cls === 'wizard' ? ' & sát thương phép' : '')],
];

export default {
  id: 'char',
  title: '👤 Nhân vật',
  render() {
    const S = G.S, P = calcStats(), st = S.stats;
    const derived = [
      ['Sát thương', fmt(P.dmgMin) + ' – ' + fmt(P.dmgMax)], ['Phòng thủ', fmt(P.def)], ['HP tối đa', fmt(P.maxHp)], ['MP tối đa', fmt(P.maxMp)],
      ['Tốc đánh', P.spd.toFixed(2) + ' đòn/giây'], ['Tỉ lệ chí mạng', P.crit + '%'], ['Hấp thụ sát thương (cánh)', P.abs + '%'],
      ['Hồi HP khi hạ quái', P.heal + '%'], ['Tăng Zen', P.zen + '%'], ['Phản sát thương', P.reflect + '%'],
      ['Kỹ năng đã học', classSkills().filter((s) => rankOf(s.id)).length + ' / ' + classSkills().length], ['Giảm sát thương nhận', P.guard + '%'],
    ];
    setTimeout(startPreview, 0);
    const W = S.equip.weapon ? weaponType(S.equip.weapon) : null;
    const setsHTML = P.sets.filter((g) => g.count >= 2).map((g) => '<div class="stat"><span>🛡 Bộ <b style="color:' + g.set.trim + '">' + g.set.name + '</b> ' + g.count + '/5</span><span class="muted" style="text-align:right">' +
      (g.count >= 3 ? '<span style="color:#5dff7a">' + bonusText(g.set.bonus3) + '</span>' : '3 món: ' + bonusText(g.set.bonus3)) + (g.count >= 5 ? '<br><span style="color:#5dff7a">' + bonusText(g.set.bonus5) + '</span>' : '') + '</span></div>').join('');
    return (
      previewHTML(170) + '<div class="row" style="justify-content:center;margin:4px 0 10px">' + btn('👗 Thời trang', 'open', { p: 'fashion' }, { cls: 'sm' }) + btn('🐾 Thú cưng', 'open', { p: 'pets' }, { cls: 'sm' }) + btn('📖 Kỹ năng', 'open', { p: 'skills' }, { cls: 'sm' }) + '</div>' +
      '<div class="tip"><b style="color:#f3d58a">' + esc(S.name) + '</b> — ' + CLASSES[S.cls].name + ' · <b style="color:#ffd54a">Bậc ' + tierOf() + ' ' + tierName() + '</b>' +
      '<br>Cấp ' + S.lv + ' · Reset ' + S.resets + ' · Đã hạ ' + fmt(S.kills) + ' quái<br>EXP: ' + fmt(S.exp) + ' / ' + fmt(expNeed(S.lv)) + '</div>' +
      '<div class="row" style="justify-content:space-between"><b>Điểm chưa cộng: <span style="color:#5dff7a">' + S.pts + '</span></b>' + btn('🔄 Reset nhân vật', 'open', { p: 'reset' }, { cls: 'sm' }) + '</div>' +
      STAT_ROWS(S.cls).map(([k, name, desc]) =>
        '<div class="stat"><div><b>' + name + '</b> <span style="color:#ffd54a">' + st[k] + '</span><div class="muted">' + desc + '</div></div><div class="row">' +
        [1, 10, 100].map((n) => btn('+' + n, 'addpt', { s: k, n }, { cls: 'sm', disabled: S.pts < 1 })).join('') + '</div></div>').join('') +
      (W ? '<h4>Vũ khí & bộ giáp</h4><div class="stat"><span>⚔ ' + W.name + '</span><span class="muted">' + W.desc + '</span></div>' + (setsHTML || '<div class="muted">Mặc từ 3 món cùng bộ để kích hoạt hiệu ứng bộ.</div>') : '') +
      '<h4>Chỉ số chiến đấu</h4><table class="st">' + derived.map((r) => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>').join('') + '</table>'
    );
  },
  actions: {
    addpt: (d) => act('addPoints', d.s, +d.n),
  },
};
