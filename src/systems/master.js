// Cây Master: EXP dư ở cấp tối đa → cấp Master → điểm đầu tư vào cây của class hiện tại.
import { G } from '../core/state.js';
import { log, announce } from '../core/events.js';
import { fmt } from '../core/utils.js';
import { MASTER, masterNeed, masterTree, defaultMaster } from '../config/master.js';
import { calcStats } from './stats.js';
import { checkUnlocks } from './fashion.js';

export const masterOf = (S = G.S) => S.master || (S.master = defaultMaster());
export const masterUnlocked = (S = G.S) => (S.tier || 1) >= MASTER.unlockTier || masterOf(S).lv > 0;
const alloc = (S = G.S) => { const m = masterOf(S); return m.nodes[S.cls] || (m.nodes[S.cls] = {}); };
export const masterSpent = (S = G.S) => Object.values(alloc(S)).reduce((a, b) => a + b, 0);
export const masterPoints = (S = G.S) => masterOf(S).lv - masterSpent(S);
export const masterRank = (id, S = G.S) => alloc(S)[id] || 0;

/** Tổng chỉ số cộng từ cây Master của class hiện tại (dùng trong calcStats) */
export function masterBonus(S) {
  const out = {};
  if (!S.master) return out;
  const t = masterTree(S.cls), a = (S.master.nodes && S.master.nodes[S.cls]) || {};
  for (const n of t.nodes) { const r = a[n.id] || 0; if (r) for (const k in n.mods) out[k] = (out[k] || 0) + n.mods[k] * r; }
  return out;
}

/** Nhận EXP dư ở cấp tối đa (chỉ khi đã đủ bậc). Trả về số cấp Master vừa lên. */
export function gainMasterExp(amount) {
  const S = G.S, m = masterOf(S);
  if ((S.tier || 1) < MASTER.unlockTier || m.lv >= MASTER.maxLv) return 0;
  m.exp += amount;
  let up = 0;
  while (m.lv < MASTER.maxLv && m.exp >= masterNeed(m.lv)) { m.exp -= masterNeed(m.lv); m.lv++; up++; }
  if (m.lv >= MASTER.maxLv) m.exp = 0;
  if (up) {
    const p = G.R.p;
    G.R.fx.push({ k: 'tierup', x: p.x, y: p.y, t: 0, d: 1.8, tier: 3, follow: true });
    announce('MASTER CẤP ' + m.lv + '!'); checkUnlocks();
    log('🌟 Lên <b>cấp Master ' + m.lv + '</b> — có ' + masterPoints(S) + ' điểm Master. Mở bảng <b>Master</b> để đầu tư.', '#ffd54a');
  }
  return up;
}

/** Cộng 1 cấp cho ô nodeId. Trả về cấp mới hoặc null nếu không hợp lệ. */
export function masterAdd(nodeId) {
  const S = G.S, t = masterTree(S.cls), n = t.byId[nodeId], a = alloc(S);
  if (!n || !masterUnlocked(S) || masterPoints(S) < 1) return null;
  if ((a[nodeId] || 0) >= n.max) return null;
  if (n.req && (a[n.req[0]] || 0) < n.req[1]) return null;
  a[nodeId] = (a[nodeId] || 0) + 1;
  calcStats();
  return a[nodeId];
}

export const masterRespecCost = () => MASTER.respecZen;
/** Tẩy toàn bộ điểm đã đầu tư của class hiện tại (mất Zen) */
export function masterReset() {
  const S = G.S;
  if (!masterSpent(S) || S.zen < MASTER.respecZen) return false;
  S.zen -= MASTER.respecZen;
  masterOf(S).nodes[S.cls] = {};
  calcStats();
  log('♻ Đã tẩy điểm Master (−' + fmt(MASTER.respecZen) + ' Zen).', '#8fd0ff');
  return true;
}
