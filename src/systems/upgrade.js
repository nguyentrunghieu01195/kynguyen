// Ép đồ & chế tạo cánh. Trả về kết quả dạng dữ liệu để UI tự hiển thị.
import { G } from '../core/state.js';
import { WEAPON_TYPES } from '../config/gear.js';
import { log, announce, emit, EV } from '../core/events.js';
import { uid, esc } from '../core/utils.js';
import { UPGRADE, WING_RECIPE, ITEM } from '../config/balance.js';
import { WINGS } from '../config/items.js';
import { findItem, removeItem, itemFull } from './items.js';
import { calcStats } from './stats.js';

export function upgradeInfo(it) {
  const p = it.plus;
  if (p >= ITEM.maxPlus) return null;
  const row = UPGRADE.find((r) => p >= r.from && p <= r.to);
  return { need: row.need, rate: row.rate(p), zen: row.zen(p), fail: row.fail };
}

export const hasMaterials = (need, zen) => Object.keys(need).every((k) => G.S.jewels[k] >= need[k]) && G.S.zen >= zen;
const pay = (need, zen) => { for (const k in need) G.S.jewels[k] -= need[k]; G.S.zen -= zen; };

/**
 * Ép 1 món đồ. Kết quả: { ok, outcome: 'success'|'protected'|'down'|'break', item }
 */
export function upgradeItem(id, useCharm) {
  const S = G.S, ref = findItem(id);
  if (!ref) return null;
  const it = ref.it, inf = upgradeInfo(it);
  if (!inf || !hasMaterials(inf.need, inf.zen)) return null;
  pay(inf.need, inf.zen);
  const charm = useCharm && S.charm > 0 && inf.fail !== 'none';
  if (charm) S.charm--;

  let outcome;
  if (Math.random() * 100 < inf.rate) {
    it.plus++;
    outcome = 'success';
    if (it.plus >= 7) { announce('Ép thành công +' + it.plus + '!'); log('✨ Ép thành công <b>' + esc(itemFull(it)) + '</b>', '#ffd54a'); }
  } else if (charm) outcome = 'protected';
  else if (inf.fail === 'down') { it.plus = Math.max(0, it.plus - 1); outcome = 'down'; }
  else { removeItem(ref); outcome = 'break'; log('💔 ' + esc(itemFull(it)) + ' đã vỡ khi ép!', '#f66'); }
  calcStats();
  emit(EV.UPGRADE, outcome, it);
  return { outcome, item: it };
}

export function nextWingTier() {
  const cw = G.S.equip.wings ? G.S.equip.wings.tier : 0;
  return cw + 1 < WINGS.length ? cw + 1 : null;
}

export function craftWing() {
  const nt = nextWingTier();
  if (!nt) return null;
  const rc = WING_RECIPE[nt];
  if (!hasMaterials(rc.need, rc.zen)) return null;
  pay(rc.need, rc.zen);
  const ok = Math.random() * 100 < rc.rate;
  if (ok) {
    G.S.equip.wings = { id: uid(), slot: 'wings', tier: nt, plus: 0, exc: null };
    announce('Nhận được ' + WINGS[nt].name + '!');
  }
  calcStats();
  emit(EV.CRAFT, ok, nt);
  return { ok, tier: nt };
}

// ---------------- RÈN LẠI: đổi loại vũ khí / dòng bộ giáp, giữ nguyên bậc, cấp ép, dòng hoàn hảo ----------------
export const reforgeCost = (it) => 20000 * Math.pow(it.tier + 1, 2) * (1 + it.plus * 0.25);
export function reforge(id, variant) {
  const S = G.S, ref = findItem(id);
  if (!ref || ref.it.slot === 'wings') return false;
  const it = ref.it, cost = Math.round(reforgeCost(it));
  if (S.zen < cost) return false;
  if (it.slot === 'weapon') {
    const L = WEAPON_TYPES[it.cls || S.cls] || [];
    if ((it.wt || 0) === variant || !L[variant] || L[variant].special || (L[it.wt || 0] && L[it.wt || 0].special)) return false; // vũ khí đặc biệt không rèn lại được
    it.wt = variant;
  }
  else { if ((it.line || 0) === variant) return false; it.line = variant; }
  S.zen -= cost;
  calcStats();
  return true;
}
