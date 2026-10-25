// Bảng Master: cấp Master, điểm còn lại, cây 3 nhánh của class hiện tại, tẩy điểm.
import { G } from '../../core/state.js';
import { fmt } from '../../core/utils.js';
import { CLASSES } from '../../config/classes.js';
import { PROGRESSION as PG } from '../../config/balance.js';
import { MASTER, MASTER_TOTAL, masterNeed, masterTree, modText } from '../../config/master.js';
import { masterOf, masterUnlocked, masterPoints, masterSpent, masterRank, masterBonus, masterRespecCost } from '../../systems/master.js';
import { isMaxLevel } from '../../systems/character.js';
import { btn } from '../components.js';
import { act } from '../../net/actions.js';

function nodeRow(n, br) {
  const S = G.S, r = masterRank(n.id), pts = masterPoints(S), locked = n.req && masterRank(n.req[0]) < n.req[1];
  const reqName = n.req ? masterTree(S.cls).byId[n.req[0]].name : '';
  const pips = Array.from({ length: n.max }, (_, i) => '<i style="display:inline-block;width:10px;height:10px;margin-right:2px;border:1px solid #000;background:' + (i < r ? br.color : '#2a2a38') + '"></i>').join('');
  return '<div class="stat" style="opacity:' + (locked ? 0.55 : 1) + '"><div><b style="color:' + (n.top ? '#ffd54a' : '#fff') + '">' + (n.top ? '★ ' : '') + n.name + '</b> <span class="muted">' + r + '/' + n.max + '</span><div>' + pips + '</div>' +
    '<div class="muted">' + n.desc + (locked ? ' · 🔒 cần <b>' + reqName + '</b> ≥ ' + n.req[1] : '') + '</div></div>' +
    btn('+1', 'mAdd', { n: n.id }, { cls: 'sm green', disabled: locked || r >= n.max || pts < 1 }) + '</div>';
}

export default {
  id: 'master',
  title: '🌟 Master',
  render() {
    const S = G.S, m = masterOf(S), cls = CLASSES[S.cls];
    if (!masterUnlocked(S)) {
      return '<div class="tip">🌟 <b>Cây Master</b> mở khi đạt <b>Bậc ' + MASTER.unlockTier + '</b> (3 lần Reset + nhiệm vụ chuyển chức) rồi đạt <b>cấp tối đa ' + PG.resetLevel + '</b>.<br>Từ đó, EXP dư thay vì bỏ phí sẽ thành <b>cấp Master</b> (tối đa ' + MASTER.maxLv + '), mỗi cấp cho 1 điểm để đầu tư vào cây riêng của từng class.</div>' +
        '<div class="stat"><span>Bậc hiện tại</span><b>' + (S.tier || 1) + ' / ' + MASTER.unlockTier + '</b></div><div class="stat"><span>Cấp hiện tại</span><b>' + S.lv + ' / ' + PG.resetLevel + '</b></div>';
    }
    const tree = masterTree(S.cls), need = m.lv >= MASTER.maxLv ? 0 : masterNeed(m.lv), pct = need ? Math.min(100, (100 * m.exp) / need) : 100, bonus = masterBonus(S);
    return '<div class="tip"><b style="color:#ffd54a">Master ' + m.lv + ' / ' + MASTER.maxLv + '</b> · ' + cls.name + ' · Điểm còn: <b style="color:#5dff7a">' + masterPoints(S) + '</b> (đã dùng ' + masterSpent(S) + ' / tối đa ' + MASTER_TOTAL + ')' +
      '<div class="qbar" style="margin-top:6px"><i style="width:' + pct + '%;background:#ffd54a"></i><span>' + (need ? fmt(m.exp) + ' / ' + fmt(need) + ' EXP Master' : 'Cấp Master tối đa') + '</span></div>' +
      '<div class="muted" style="margin-top:4px">' + (isMaxLevel() ? '✔ Đang ở cấp tối đa — mọi EXP nhận được đều thành EXP Master.' : 'EXP chỉ chuyển thành Master khi nhân vật đang ở <b>cấp ' + PG.resetLevel + '</b> (chưa Reset).') + ' Cây tính riêng cho từng class; điểm Master dùng chung.</div></div>' +
      tree.branches.map((br) => '<h4 style="color:' + br.color + '">' + br.icon + ' ' + br.name + '</h4>' + br.nodes.map((n) => nodeRow(n, br)).join('')).join('') +
      '<h4>Tổng hiệu quả Master</h4><div class="muted">' + (Object.keys(bonus).length ? modText(bonus) : 'Chưa đầu tư điểm nào.') + '</div>' +
      '<div class="row" style="margin-top:10px">' + btn('♻ Tẩy điểm (' + fmt(masterRespecCost()) + ' Zen)', 'mReset', {}, { cls: 'sm red', disabled: !masterSpent(S) || S.zen < masterRespecCost() }) + '</div>';
  },
  actions: {
    mAdd: (d) => act('masterAdd', d.n),
    mReset: () => { if (confirm('Tẩy toàn bộ điểm Master của class này? Mất ' + fmt(masterRespecCost()) + ' Zen.')) return act('masterReset'); },
  },
};
