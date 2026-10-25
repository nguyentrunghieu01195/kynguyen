// Chuyển class: đổi sang class khác, giữ cấp / Reset / Zen / bậc / trang bị. Vũ khí đổi theo class mới,
// điểm chỉ số được hoàn lại để cộng lại, kỹ năng của class cũ được cất lại (đổi về là có lại).
import { G } from '../core/state.js';
import { log, announce } from '../core/events.js';
import { fmt } from '../core/utils.js';
import { CLASSES, FEMALE_CLASSES } from '../config/classes.js';
import { defaultSkills, migrateSkills } from '../config/skills.js';
import { regularWeaponCount, specialWeaponIndex } from '../config/gear.js';
import { makeItem } from './items.js';
import { calcStats } from './stats.js';

export const CLASS_CHANGE = {
  zen: (resets) => 2000000 * (1 + resets),
  jewels: { soul: 3 },
  cooldownSec: 6 * 3600,
};

export const classChangeCost = (S = G.S) => ({ zen: CLASS_CHANGE.zen(S.resets || 0), jewels: CLASS_CHANGE.jewels });
export const classChangeWait = (S = G.S) => Math.max(0, ((S.ccAt || 0) + CLASS_CHANGE.cooldownSec * 1000 - Date.now()) / 1000);

/** Lý do chưa chuyển được (null = được) */
export function classChangeBlock(cls, S = G.S) {
  if (!CLASSES[cls] || cls === S.cls) return 'Chọn một class khác.';
  if (G.R && G.R.event) return 'Không thể chuyển class khi đang ở sự kiện / đấu trường.';
  const c = classChangeCost(S);
  if (S.zen < c.zen) return 'Không đủ Zen (' + fmt(c.zen) + ').';
  for (const k in c.jewels) if ((S.jewels[k] || 0) < c.jewels[k]) return 'Không đủ ngọc.';
  const w = classChangeWait(S);
  if (w > 0) return 'Phải chờ thêm ' + Math.ceil(w / 60) + ' phút nữa mới chuyển class tiếp.';
  return null;
}

/** Đổi vũ khí sang class mới: giữ bậc, cấp ép, dòng thuộc tính; kiểu vũ khí map theo thứ tự (đặc biệt → đặc biệt) */
function convertWeapon(it, from, to) {
  const special = it.wt === specialWeaponIndex(from) && specialWeaponIndex(from) >= 0;
  const wt = special ? specialWeaponIndex(to) : Math.min(it.wt || 0, regularWeaponCount(to) - 1);
  const n = makeItem('weapon', it.tier, it.plus, it.exc, to, { wt });
  return n;
}

/** Thực hiện chuyển class. Trả về true nếu thành công. */
export function changeClass(cls) {
  const S = G.S, from = S.cls, block = classChangeBlock(cls, S);
  if (block) { log('⚠ ' + block, '#ff8a8a'); return false; }
  const c = classChangeCost(S);
  S.zen -= c.zen; for (const k in c.jewels) S.jewels[k] -= c.jewels[k];
  // 1) chỉ số: hoàn điểm đã cộng
  const base = CLASSES[from].stats; let spent = 0;
  for (const k in base) spent += Math.max(0, (S.stats[k] || 0) - base[k]);
  S.pts += spent; S.stats = { ...CLASSES[cls].stats };
  // 2) kỹ năng: cất class cũ, nạp class mới (nếu từng chơi)
  S.alt = S.alt || {}; S.alt[from] = { skills: S.skills };
  S.skills = S.alt[cls] && S.alt[cls].skills ? migrateSkills(S.alt[cls].skills, cls) : defaultSkills(cls);
  // 3) vũ khí: đổi cả đang mặc và trong túi
  if (S.equip.weapon) S.equip.weapon = convertWeapon(S.equip.weapon, from, cls);
  S.inv = S.inv.map((it) => (it.slot === 'weapon' && it.cls === from ? convertWeapon(it, from, cls) : it));
  S.cls = cls;
  if (!FEMALE_CLASSES.includes(cls)) S.gender = 'm';
  S.ccAt = Date.now();
  calcStats();
  const p = G.R.p; p.hp = G.P.maxHp; p.mp = G.P.maxMp; p.cds = {}; p.buffs = {}; p.target = null;
  G.R.fx.push({ k: 'tierup', x: p.x, y: p.y, t: 0, d: 2.2, tier: 2, follow: true });
  announce('CHUYỂN CLASS: ' + CLASSES[cls].name.toUpperCase());
  log('🔁 Đã chuyển sang <b>' + CLASSES[cls].name + '</b>. Hoàn lại ' + spent + ' điểm chỉ số — vào <b>Nhân vật</b> để cộng lại. Kỹ năng cũ được cất, đổi về sẽ có lại.', '#ffd54a');
  return true;
}
