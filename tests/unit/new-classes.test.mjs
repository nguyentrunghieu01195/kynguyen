import { dirname as _dn, resolve as _rs } from 'node:path';
import { fileURLToPath as _fu } from 'node:url';
const ROOT = _rs(_dn(_fu(import.meta.url)), '../..');
import assert from 'node:assert';
const { G } = await import(ROOT + '/src/core/state.js');
const { createCharacter } = await import(ROOT + '/src/systems/character.js');
const { calcStats } = await import(ROOT + '/src/systems/stats.js');
const W = await import(ROOT + '/src/systems/world.js');
const Sk = await import(ROOT + '/src/systems/skills.js');
const { CLASSES, STAT_FORMULA } = await import(ROOT + '/src/config/classes.js');
const { SKILL_LIST, CLASS_TIERS, SKILLS_BY_ID } = await import(ROOT + '/src/config/skills.js');
const { WEAPON_TYPES, regularWeaponCount, specialWeaponIndex } = await import(ROOT + '/src/config/gear.js');
const { WEAPON_NAMES } = await import(ROOT + '/src/config/items.js');
const { masterTree } = await import(ROOT + '/src/config/master.js');
const { DIVINE_NAMES } = await import(ROOT + '/src/config/divine.js');
const { itemName, makeItem } = await import(ROOT + '/src/systems/items.js');
const { migrate } = await import(ROOT + '/src/core/save.js');
const { runAction } = await import(ROOT + '/src/net/actions.js');
const { siegeRewardSpecs } = await import(ROOT + '/src/config/siege.js');
const { CLASSES: SERVER_CLASSES, cleanLook } = await import(ROOT + '/server/src/protocol.js');

assert.deepEqual(Object.keys(CLASSES).sort(), ['archer', 'gladiator', 'knight', 'lord', 'wizard']); assert.deepEqual([...SERVER_CLASSES].sort(), Object.keys(CLASSES).sort());
for (const cls of ['lord', 'gladiator']) {
  const c = CLASSES[cls]; assert(c.name && c.desc && c.stats && c.range > 0 && c.atkSpd > 0 && ['melee', 'fire', 'arrow'].includes(c.attack));
  assert(STAT_FORMULA[cls]); assert.equal(CLASS_TIERS[cls].length, 3);
  assert.equal(SKILL_LIST[cls].length, 8); for (const sk of SKILL_LIST[cls]) { assert(SKILLS_BY_ID[sk.id], sk.id); assert(sk.name && sk.desc && sk.icon); }
  assert.equal(WEAPON_NAMES[cls].length, 6); const wt = WEAPON_TYPES[cls]; assert(wt.length >= 4 && specialWeaponIndex(cls) >= 0 && regularWeaponCount(cls) === wt.length - 1); for (const w of wt) assert(w.id && w.name && w.desc && w.mods);
  const t = masterTree(cls); assert.equal(t.nodes.length, 12); assert(DIVINE_NAMES.weapon[cls]);
  assert(siegeRewardSpecs((x) => x).some((s) => s.item.cls === cls), 'có vũ khí công thành cho ' + cls);
  assert.equal(cleanLook({ cls, eq: {} }).cls, cls, 'máy chủ chấp nhận class');
}
// toàn bộ kỹ năng chủ động / buff dùng được, không làm hỏng chỉ số
for (const cls of ['lord', 'gladiator']) {
  G.S = createCharacter(cls, 'T'); G.S.lv = 150; G.S.tier = 3; G.S.zen = 1e9; for (const sk of SKILL_LIST[cls]) G.S.skills.r[sk.id] = 3; calcStats(); W.enterMap(3);
  for (const k of ['str', 'agi', 'vit', 'ene']) assert(G.S.stats[k] > 0);
  for (const key of Object.keys(G.P)) if (typeof G.P[key] === 'number') assert(Number.isFinite(G.P[key]), key + ' hợp lệ');
  assert(G.P.dmgMax > 0 && G.P.maxHp > 0 && G.P.maxMp > 0);
  const R = G.R, p = R.p; p.hp = 1e9; p.mp = 1e9;
  for (const sk of SKILL_LIST[cls].filter((s) => s.type !== 'passive')) {
    R.mobs.length = 0; for (let i = 0; i < 6; i++) { const m = W.createMob(R.M.mobs[0], 90, p.x + 1 + i * 0.4, p.y + (i % 2), {}); m.hp = m.maxHp = 1e6; } p.cds = {}; p.gcd = 0; p.target = R.mobs[0];
    const hp0 = R.mobs.reduce((a, m) => a + m.hp, 0); const ok = Sk.castSkillId(sk.id, true); assert.equal(ok, true, sk.id + ' dùng được');
    for (let i = 0; i < 60; i++) { p.cds = {}; const upd = (await import(ROOT + '/src/systems/game.js')).update; upd(0.05); }
    if (sk.type === 'active') assert(R.mobs.reduce((a, m) => a + Math.max(0, m.hp), 0) < hp0, sk.id + ' gây sát thương');
    else assert(p.buffs[sk.id] || G.S.skills.r[sk.id], sk.id + ' buff');
    for (const key of Object.keys(G.P)) if (typeof G.P[key] === 'number') assert(Number.isFinite(G.P[key]), sk.id + ': ' + key);
  }
}
// vũ khí khởi đầu đúng class, tên đúng
for (const cls of ['lord', 'gladiator']) { G.S = createCharacter(cls, 'T'); assert.equal(G.S.equip.weapon.cls, cls); assert.equal(itemName(G.S.equip.weapon), WEAPON_NAMES[cls][0]); }
// đổi qua lại giữa cả 5 class: chỉ số hợp lệ, vũ khí đúng class
G.S = createCharacter('knight', 'T'); G.S.lv = 120; G.S.zen = 1e10; G.S.jewels.soul = 100; calcStats(); W.enterMap(0);
for (const to of ['lord', 'gladiator', 'wizard', 'lord', 'archer', 'gladiator', 'knight']) { G.S.ccAt = 0; assert.equal(runAction('changeClass', [to]).r, true, 'đổi sang ' + to); assert.equal(G.S.cls, to); assert.equal(G.S.equip.weapon.cls, to); assert(G.P.dmgMax > 0 && Number.isFinite(G.P.maxMp)); assert(G.S.skills.bar.every((id) => !id || SKILL_LIST[to].some((s) => s.id === id)), 'thanh kỹ năng đúng class'); }
// save cũ / lưu: class mới được giữ
const sv = createCharacter('gladiator', 'G'); const m = migrate(JSON.parse(JSON.stringify(sv))); assert.equal(m.cls, 'gladiator'); assert(m.skills.r.flameblade >= 1); assert.equal(m.equip.weapon.cls, 'gladiator');
console.log('Chúa Tể + Đấu Sĩ OK');
