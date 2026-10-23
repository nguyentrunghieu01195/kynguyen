import { G } from '../../core/state.js';
import { esc, fmt } from '../../core/utils.js';
import { SLOTS, WINGS, JEWELS, JEWEL_KEYS } from '../../config/items.js';
import { WING_RECIPE } from '../../config/balance.js';
import { findItem, itemColor, itemFull } from '../../systems/items.js';
import { upgradeInfo, hasMaterials, upgradeItem, nextWingTier, craftWing, reforge, reforgeCost } from '../../systems/upgrade.js';
import { WEAPON_TYPES, ARMOR_SETS } from '../../config/gear.js';
import { variantLines } from '../components.js';
import { saveGame } from '../../core/save.js';
import { itemCell, powerLine, materialsText, btn } from '../components.js';
import { UI } from '../dom.js';
import { act } from '../../net/actions.js';

const FAIL_TEXT = { none: 'Không thể thất bại.', down: 'Thất bại: món đồ bị giảm 1 cấp.', break: '<div class="warn">Thất bại: MÓN ĐỒ SẼ VỠ!</div>' };
const RESULT_TEXT = {
  success: (it) => '<span style="color:#5dff7a">✨ THÀNH CÔNG! ' + esc(itemFull(it)) + '</span>',
  protected: () => '<span style="color:#ffb070">❌ Thất bại — Bùa Bảo Hộ đã giữ nguyên món đồ.</span>',
  down: (it) => '<span style="color:#ff8a5a">❌ Thất bại! Món đồ bị giảm còn +' + it.plus + '.</span>',
  break: (it) => '<span style="color:#f44">💔 Thất bại! ' + esc(itemFull(it)) + ' đã vỡ vụn.</span>',
};
const rateColor = (r) => (r >= 100 ? '#5dff7a' : r >= 50 ? '#ffd54a' : '#ff8a5a');

function upgradeBox(ref) {
  const S = G.S, it = ref.it, inf = upgradeInfo(it);
  let h = '<div class="tip"><b style="color:' + itemColor(it) + ';font-size:15px">' + esc(itemFull(it)) + '</b><div>' + powerLine(it) + '</div>';
  if (!inf) h += '<div style="color:#ffd54a">Đã đạt cấp tối đa +15!</div>';
  else {
    const next = { ...it, plus: it.plus + 1 };
    h += '<div>+' + it.plus + ' → <b style="color:#ffd54a">+' + next.plus + '</b> · ' + powerLine(next) + '</div>' +
      '<div>Tỉ lệ thành công: <b style="color:' + rateColor(inf.rate) + '">' + inf.rate + '%</b></div>' +
      '<div>Cần: ' + materialsText(inf.need) + (inf.zen ? ' + ' + fmt(inf.zen) + ' Zen' : '') + '</div>' +
      (inf.fail === 'break' ? FAIL_TEXT.break : '<div class="muted">' + FAIL_TEXT[inf.fail] + '</div>') +
      (inf.fail !== 'none' ? '<label class="row" style="margin-top:6px"><input type="checkbox" data-act="toggleCharm" ' + (UI.useCharm ? 'checked' : '') + '> Dùng Bùa Bảo Hộ (giữ nguyên nếu thất bại) — còn ' + S.charm + '</label>' : '') +
      '<div style="margin-top:8px">' + btn('NÂNG CẤP', 'upgrade', {}, { cls: 'big', disabled: !hasMaterials(inf.need, inf.zen) }) + '</div>';
  }
  h += (UI.upMsg ? '<div style="margin-top:8px;font-weight:700">' + UI.upMsg + '</div>' : '') + '</div>';
  // Rèn lại loại vũ khí / dòng bộ
  if (it.slot !== 'wings') {
    const cost = Math.round(reforgeCost(it)), opts = it.slot === 'weapon' ? WEAPON_TYPES[it.cls || S.cls].map((w, i) => [i, w.name]) : ARMOR_SETS[it.tier].map((st, i) => [i, 'Bộ ' + st.name]);
    const cur = it.slot === 'weapon' ? it.wt || 0 : it.line || 0;
    h += '<h4>🔨 Rèn lại ' + (it.slot === 'weapon' ? 'loại vũ khí' : 'dòng bộ giáp') + '</h4><div class="tip">' + variantLines(it) +
      '<div class="row" style="margin-top:8px">' + opts.map(([i, name]) => btn(name, 'reforge', { v: i }, { cls: 'sm ' + (i === cur ? 'green' : ''), disabled: i === cur || S.zen < cost })).join('') + '</div>' +
      '<div class="muted" style="margin-top:4px">Giữ nguyên bậc, cấp ép và dòng Hoàn Hảo · Phí ' + fmt(cost) + ' Zen</div></div>';
  }
  return h;
}

function wingBox() {
  const S = G.S, nt = nextWingTier();
  let h = '<h4>🪽 Chế tạo Cánh</h4><div class="tip">';
  if (!nt) h += 'Bạn đã sở hữu cánh cấp cao nhất!';
  else {
    const rc = WING_RECIPE[nt], W = WINGS[nt];
    h += '<b style="color:' + W.color + '">' + W.name + '</b> (cấp ' + nt + '): +' + W.dmg + '% sát thương, hấp thụ ' + W.abs + '%<br>Cần: ' +
      (nt > 1 ? '<b>' + WINGS[nt - 1].name + '</b> đang đeo + ' : '') + materialsText(rc.need) + ' + ' + fmt(rc.zen) + ' Zen<br>Tỉ lệ: <b>' + rc.rate + '%</b> ' +
      '<span class="muted">(thất bại mất nguyên liệu, giữ cánh cũ)</span><div style="margin-top:8px">' + btn('Chế tạo', 'craftWing', {}, { disabled: !hasMaterials(rc.need, rc.zen) }) + '</div>';
  }
  return h + (UI.craftMsg ? '<div style="margin-top:6px;font-weight:700">' + UI.craftMsg + '</div>' : '') + '</div>';
}

export default {
  id: 'up',
  title: '⚒️ Ép đồ & Chế tạo',
  render() {
    const S = G.S, ref = findItem(UI.up);
    let h = '<div class="tip">Ngọc: ' + JEWEL_KEYS.map((k) => '<span style="color:' + JEWELS[k].color + '">' + JEWELS[k].name + ' <b>' + S.jewels[k] + '</b></span>').join(' · ') +
      '<br>Bùa Bảo Hộ: <b>' + S.charm + '</b> · Zen: <b style="color:#ffd54a">' + fmt(S.zen) + '</b></div>';
    h += ref ? upgradeBox(ref)
      : '<div class="tip muted">Chọn món đồ bên dưới để ép. +1→+6 dùng Ngọc Ước Nguyện (100%), +7→+9 dùng Ngọc Linh Hồn, +10→+15 cần cả 3 loại ngọc và có thể làm vỡ đồ.</div>' +
        (UI.upMsg ? '<div class="tip">' + UI.upMsg + '</div>' : '');
    const cell = (it) => itemCell(it, { act: 'upSel', selId: UI.up });
    h += '<h4>Đang trang bị</h4><div class="grid">' + SLOTS.map((sl) => S.equip[sl]).filter(Boolean).map(cell).join('') + '</div>';
    if (S.inv.length) h += '<h4>Trong túi</h4><div class="grid">' + S.inv.map(cell).join('') + '</div>';
    return h + wingBox();
  },
  actions: {
    upSel: (d) => { UI.up = d.id; UI.upMsg = ''; },
    toggleCharm: () => (UI.useCharm = !UI.useCharm),
    reforge: async (d) => { if (await act('reforge', UI.up, +d.v)) UI.upMsg = '<span style="color:#8fd0ff">🔨 Rèn lại thành công!</span>'; },
    upgrade: async () => {
      if (UI.upBusy) return;
      UI.upBusy = true;
      const r = await act('upgrade', UI.up, !!UI.useCharm);
      UI.upBusy = false;
      if (!r) return;
      UI.upMsg = RESULT_TEXT[r.outcome](r.item);
      if (r.outcome === 'break') { if (UI.sel === UI.up) UI.sel = null; UI.up = null; }
      G.R.saveOk = saveGame();
    },
    craftWing: async () => {
      const r = await act('craftWing');
      if (!r) return;
      UI.craftMsg = r.ok ? '<span style="color:#5dff7a">✨ Chế tạo thành công ' + WINGS[r.tier].name + '!</span>' : '<span style="color:#f66">❌ Chế tạo thất bại, mất nguyên liệu.</span>';
      G.R.saveOk = saveGame();
    },
  },
};
