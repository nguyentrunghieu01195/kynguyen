// Đồ Thần: điều kiện, thần hoá (rèn), nâng Thần cấp, hiệu ứng Thần Uy.
import { G } from '../core/state.js';
import { log, announce } from '../core/events.js';
import { fmt } from '../core/utils.js';
import { DIVINE } from '../config/divine.js';
import { findItem, rollExc, itemFull } from './items.js';
import { calcStats } from './stats.js';

export const godOf = (it) => (it && it.god > 0 ? it.god : 0);
export const isDivine = (it) => godOf(it) > 0;
/** Số món Thần đang mặc (vũ khí + 5 giáp) */
export const divineCount = (equip) => DIVINE.slots.filter((sl) => godOf(equip[sl]) > 0).length;
/** Chỉ số cộng thêm của Thần Uy theo số món đang mặc */
export function divineBonus(equip) {
  const n = divineCount(equip || {}), out = {};
  for (const [need, mods] of DIVINE.setBonus) if (n >= need) for (const k in mods) out[k] = (out[k] || 0) + mods[k];
  return out;
}

/** Thông tin thần hoá / nâng cấp một món đồ: { ok, reason, kind: 'ascend'|'up', cost, rate } */
export function divineInfo(it, S = G.S) {
  if (!it || !DIVINE.slots.includes(it.slot)) return { ok: false, reason: 'Chỉ vũ khí và giáp mới thần hoá được.' };
  const g = godOf(it);
  if (!g) {
    if (it.tier !== DIVINE.tier) return { ok: false, reason: 'Cần đồ Thiên Thần (bậc 6).' };
    if (it.plus < DIVINE.minPlus) return { ok: false, reason: 'Cần ép từ +' + DIVINE.minPlus + '.' };
    const a = DIVINE.ascend, cost = { shards: a.shards[it.slot], zen: a.zen, chaos: a.chaos };
    return { kind: 'ascend', cost, rate: a.rate, ...check(S, cost) };
  }
  if (g >= DIVINE.maxGod) return { ok: false, reason: 'Đã đạt Thần cấp tối đa.', max: true };
  const u = DIVINE.up[g], cost = { shards: u.shards, zen: u.zen, chaos: u.chaos };
  return { kind: 'up', cost, rate: u.rate, ...check(S, cost) };
}
function check(S, cost) {
  if ((S.shards || 0) < cost.shards) return { ok: false, reason: 'Thiếu Mảnh Thần (' + (S.shards || 0) + '/' + cost.shards + ').' };
  if (S.zen < cost.zen) return { ok: false, reason: 'Thiếu Zen (' + fmt(cost.zen) + ').' };
  if ((S.jewels.chaos || 0) < cost.chaos) return { ok: false, reason: 'Thiếu Ngọc Hỗn Nguyên (' + cost.chaos + ').' };
  return { ok: true, reason: null };
}

/**
 * Thần hoá / nâng Thần cấp. Thất bại: mất nửa nguyên liệu (làm tròn lên), đồ không đổi. Trả về { ok, success } hoặc null nếu không hợp lệ.
 */
export function ascend(id) {
  const S = G.S, r = findItem(id);
  if (!r) return null;
  const it = r.it, info = divineInfo(it, S);
  if (!info.ok) { log('⚠ ' + info.reason, '#ff8a8a'); return null; }
  const ok = Math.random() * 100 < info.rate, c = info.cost, f = ok ? 1 : 0.5;
  S.shards -= Math.ceil(c.shards * f); S.zen -= Math.ceil(c.zen * f); S.jewels.chaos -= Math.ceil(c.chaos * f);
  if (!ok) { log('💔 Thần hoá thất bại — mất một nửa nguyên liệu, ' + itemFull(it) + ' không đổi.', '#ff8a8a'); return { ok: true, success: false }; }
  it.god = godOf(it) + 1;
  if (!it.exc || it.exc.length < 2) it.exc = (it.exc || []).concat(rollExc(it.slot, 2 - (it.exc ? it.exc.length : 0)));
  calcStats();
  announce(info.kind === 'ascend' ? 'THẦN HOÁ THÀNH CÔNG!' : 'THẦN CẤP ' + it.god + '!');
  log('✨ <b>' + itemFull(it) + '</b> đạt <b style="color:' + DIVINE.color + '">Thần cấp ' + it.god + '</b> (chỉ số gốc ×' + DIVINE.mult(it.god).toFixed(2) + ').', DIVINE.color);
  const p = G.R.p; G.R.fx.push({ k: 'tierup', x: p.x, y: p.y, t: 0, d: 2, tier: 3, follow: true });
  return { ok: true, success: true };
}

/** Nhận Mảnh Thần (từ rơi / thưởng) */
export function addShards(n) { G.S.shards = (G.S.shards || 0) + n; }

/** Tách món đồ Thiên Thần trong túi thành Mảnh Thần. Trả về số mảnh nhận được hoặc 0. */
export function dismantle(id) {
  const S = G.S, r = findItem(id);
  if (!r || r.src !== 'inv') return 0;
  const it = r.it, D = DIVINE.dismantle;
  if (!DIVINE.slots.includes(it.slot) || it.tier !== DIVINE.tier || it.plus < DIVINE.minPlus || godOf(it)) return 0;
  const n = D.base + (it.exc ? D.exc : 0) + (it.plus >= 12 ? D.plus12 : 0);
  S.inv.splice(r.key, 1); S.shards = (S.shards || 0) + n;
  log('🔨 Tách <b>' + itemFull(it) + '</b> thành <b style="color:' + DIVINE.color + '">' + n + ' Mảnh Thần</b>.', DIVINE.color);
  return n;
}
