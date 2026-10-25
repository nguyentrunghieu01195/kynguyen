import { SAVE_KEY, SAVE_VERSION } from '../config/constants.js';
import { MAPS, LEGACY_MAP_IDS, mapIndexById } from '../config/maps.js';
import { CLASSES } from '../config/classes.js';
import { G } from './state.js';
import { createCharacter } from '../systems/character.js';
import { defaultQuestState } from '../systems/quests.js';
import { defaultTowerState } from '../systems/tower.js';
import { defaultFashion } from '../systems/fashion.js';
import { defaultPets } from '../systems/pets.js';
import { migrateSkills } from '../config/skills.js';
import { migrateMaster } from '../config/master.js';
import { migrateLoot } from '../config/loot.js';

// Ô lưu: khách dùng SAVE_KEY; tài khoản dùng ô riêng theo tên đăng nhập (không ghi đè lẫn nhau)
let slot = SAVE_KEY;
export const guestSlot = SAVE_KEY;
export const setSaveSlot = (user) => { slot = user ? SAVE_KEY + '@' + user.toLowerCase() : SAVE_KEY; };
export const currentSlot = () => slot;

export function saveGame() {
  if (!G.S) return false;
  G.S.lastSeen = Date.now();
  try {
    localStorage.setItem(slot, JSON.stringify(G.S));
    return true;
  } catch (e) {
    return false;
  }
}

export function loadRaw(key = slot) {
  try {
    const t = localStorage.getItem(key);
    return t ? JSON.parse(t) : null;
  } catch (e) {
    return null;
  }
}

export function deleteSave() {
  try { localStorage.removeItem(slot); } catch (e) { /* bỏ qua */ }
}

export const isValidSave = (o) => !!(o && o.cls && CLASSES[o.cls]);

/** Nâng cấp save cũ lên cấu trúc mới (thêm trường mặc định). */
export function migrate(o) {
  const base = createCharacter(o.cls, o.name || 'Hiệp Sĩ');
  const s = Object.assign(base, o);
  s.jewels = Object.assign({ bless: 0, soul: 0, chaos: 0 }, o.jewels);
  s.pot = Object.assign({ hp: 0, mp: 0 }, o.pot);
  s.inv = o.inv || [];
  s.equip = Object.assign({}, o.equip);
  const dq = defaultQuestState();
  s.quest = Object.assign(dq, o.quest);
  s.quest.checkin = Object.assign(defaultQuestState().checkin, o.quest && o.quest.checkin);
  if (!s.lastSeen) s.lastSeen = Date.now();
  s.tickets = Object.assign({ bc: 1, ds: 1 }, o.tickets);
  s.tower = Object.assign(defaultTowerState(), o.tower);
  s.pets = Object.assign(defaultPets(), o.pets);
  s.fashion = Object.assign(defaultFashion(), o.fashion);
  s.fashion.eq = Object.assign(defaultFashion().eq, o.fashion && o.fashion.eq);
  s.evDone = o.evDone || 0;
  s.master = migrateMaster(o.master);
  s.alt = {};
  if (o.alt && typeof o.alt === 'object') for (const c of Object.keys(CLASSES)) if (c !== s.cls && o.alt[c] && o.alt[c].skills) s.alt[c] = { skills: migrateSkills(o.alt[c].skills, c) };
  s.ccAt = Math.max(0, +o.ccAt || 0);
  s.shards = Math.max(0, Math.floor(+o.shards || 0));
  s.loot = migrateLoot(o.loot);
  s.skills = migrateSkills(o.skills, s.cls);
  // Save trước khi có nhiệm vụ chuyển chức: giữ bậc theo số Reset như cũ
  if (!(o.tier >= 1)) s.tier = s.resets >= 3 ? 3 : s.resets >= 1 ? 2 : 1;
  s.quest.tier = Object.assign({ step: 0, prog: 0 }, o.quest && o.quest.tier);
  // Save cũ (v1): chỉ số bản đồ theo danh sách 6 bản đồ cũ → đổi sang chỉ số mới theo id
  if (!(o.v >= 2) && o.map >= 0 && o.map < LEGACY_MAP_IDS.length) s.map = Math.max(0, mapIndexById(LEGACY_MAP_IDS[o.map]));
  if (!(s.map >= 0 && s.map < MAPS.length)) s.map = 0;
  s.v = SAVE_VERSION;
  return s;
}

export const exportCode = (s) => btoa(unescape(encodeURIComponent(JSON.stringify(s))));
export function importCode(code) {
  const o = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
  if (!isValidSave(o)) throw new Error('invalid');
  return migrate(o);
}
