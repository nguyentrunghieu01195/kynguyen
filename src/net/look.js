// Ngoại hình & lực chiến gửi cho người chơi khác / bảng xếp hạng (dùng chung máy chủ & máy người chơi)
import { SLOTS } from '../config/items.js';

export function lookOf(S) {
  const eq = {};
  for (const sl of SLOTS) { const it = S.equip[sl]; if (it) eq[sl] = [it.tier, it.plus, sl === 'weapon' ? it.wt || 0 : it.line || 0]; }
  const F = S.fashion && S.fashion.show ? S.fashion.eq : null;
  return { cls: S.cls, eq, fa: F ? { o: F.outfit, h: F.head, a: F.aura } : null, tr: S.tier || 1, g: S.guild ? S.guild.name : null };
}
/** Lực chiến: chỉ số tổng hợp để xếp hạng */
export function powerOf(P) { return Math.round(((P.dmgMin + P.dmgMax) / 2) * P.spd * 10 + P.def * 6 + P.maxHp + P.abs * 50); }
