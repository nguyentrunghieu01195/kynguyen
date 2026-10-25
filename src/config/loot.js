// BỘ LỌC NHẶT ĐỒ: chọn loại vật phẩm sẽ được tự nhặt (và AUTO sẽ đi tới nhặt). Món bị lọc nằm lại trên đất rồi biến mất.
export const LOOT_SLOTS = ['weapon', 'helm', 'armor', 'pants', 'gloves', 'boots'];
export const LOOT_TOGGLES = ['items', 'zen', 'bless', 'soul', 'chaos', 'shard', 'hp', 'mp', 'ticket', 'excOnly', ...LOOT_SLOTS];
export const LOOT_MAX_TIER = 5, LOOT_MAX_PLUS = 15;

export const defaultLoot = () => ({
  items: true, zen: true, bless: true, soul: true, chaos: true, shard: true, hp: true, mp: true, ticket: true,
  excOnly: false, weapon: true, helm: true, armor: true, pants: true, gloves: true, boots: true,
  minTier: 0, minPlus: 0,
});
/** Chuẩn hoá từ save: chỉ giữ khoá hợp lệ, ép kiểu & giới hạn */
export function migrateLoot(o) {
  const d = defaultLoot();
  if (!o || typeof o !== 'object') return d;
  for (const k of LOOT_TOGGLES) if (typeof o[k] === 'boolean') d[k] = o[k];
  d.minTier = Math.max(0, Math.min(LOOT_MAX_TIER, Math.floor(+o.minTier || 0)));
  d.minPlus = Math.max(0, Math.min(LOOT_MAX_PLUS, Math.floor(+o.minPlus || 0)));
  return d;
}
