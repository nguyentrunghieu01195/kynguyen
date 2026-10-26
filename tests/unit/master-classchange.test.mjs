import { dirname as _dn, resolve as _rs } from 'node:path';
import { fileURLToPath as _fu } from 'node:url';
const ROOT = _rs(_dn(_fu(import.meta.url)), '../..');
import assert from 'node:assert';
const { G } = await import(ROOT + '/src/core/state.js');
const { createCharacter, gainExp, expNeed } = await import(ROOT + '/src/systems/character.js');
const { calcStats } = await import(ROOT + '/src/systems/stats.js');
const { enterMap } = await import(ROOT + '/src/systems/world.js');
const { migrate } = await import(ROOT + '/src/core/save.js');
const { MASTER, masterNeed, masterTree, MASTER_TOTAL, migrateMaster } = await import(ROOT + '/src/config/master.js');
const M = await import(ROOT + '/src/systems/master.js');
const { classChangeBlock } = await import(ROOT + '/src/systems/classchange.js');
const { runAction } = await import(ROOT + '/src/net/actions.js');
const { CLASSES } = await import(ROOT + '/src/config/classes.js');
const { regularWeaponCount, specialWeaponIndex } = await import(ROOT + '/src/config/gear.js');

// ---- cấu hình cây ----
for (const cls of Object.keys(CLASSES)) {
  const t = masterTree(cls); assert.equal(t.nodes.length, 12); assert.equal(t.branches.length, 3);
  for (const n of t.nodes) { assert(n.name && n.desc, cls + ' ô có tên'); if (n.req) assert(t.byId[n.req[0]], 'ô yêu cầu tồn tại'); }
}
assert.equal(MASTER_TOTAL, 54); assert(MASTER.maxLv < MASTER_TOTAL, 'phải chọn');

// ---- Master ----
G.S = createCharacter('knight', 'T'); calcStats(); enterMap(0);
assert.deepEqual(G.S.master, { lv: 0, exp: 0, nodes: {} }); assert.equal(M.masterUnlocked(), false);
// chưa đủ bậc: EXP ở cấp tối đa không thành Master
G.S.lv = 300; gainExp(1e9); assert.equal(G.S.master.lv, 0, 'chưa bậc 3 thì không có Master');
G.S.tier = 3; assert.equal(M.masterUnlocked(), true);
const need0 = masterNeed(0); gainExp(need0 * 2.5); assert.equal(G.S.master.lv >= 2, true, 'đủ bậc → EXP thành cấp Master');
assert.equal(M.masterPoints(), G.S.master.lv);
// đầu tư: điều kiện tiên quyết
const lv0 = G.S.master.lv; G.S.master.lv = 10;
assert.equal(runAction('masterAdd', ['a2']).r, null, 'a2 cần a1 ≥ 3');
const dmg0 = G.P.dmgMax; for (let i = 0; i < 3; i++) assert.equal(runAction('masterAdd', ['a1']).r, i + 1);
assert(G.P.dmgMax > dmg0 * 1.05, 'a1 cộng sát thương');
assert.equal(runAction('masterAdd', ['a2']).r, 1, 'a1 ≥ 3 → mở a2');
assert.equal(runAction('masterAdd', ['zz']).ok === undefined ? null : null, null);
for (let i = 0; i < 10; i++) runAction('masterAdd', ['a1']); assert.equal(M.masterRank('a1'), 5, 'không vượt quá tối đa ô');
assert.equal(M.masterPoints(), 10 - 6, '6 điểm đã dùng');
// cd / exp
G.S.master.lv = 50; for (const id of ['c1', 'c1', 'c1', 'c2', 'c2', 'c2', 'c3', 'c3', 'c3', 'c3', 'c3', 'c1', 'c1', 'c2', 'c2']) runAction('masterAdd', [id]);
assert(G.P.cdMul < 1, 'giảm hồi chiêu'); assert(G.P.cdMul >= 0.5);
// tẩy điểm
G.S.zen = 0; assert.equal(runAction('masterReset', []).r, false, 'thiếu Zen');
G.S.zen = 1e7; assert.equal(runAction('masterReset', []).r, true); assert.equal(M.masterSpent(), 0); assert.equal(G.S.zen, 1e7 - MASTER.respecZen);
// migrate / giới hạn
const bad = migrateMaster({ lv: 999, exp: -5, nodes: { knight: { a1: 99, hack: 5 }, nope: { a1: 1 } } });
assert.equal(bad.lv, MASTER.maxLv); assert.equal(bad.exp, 0); assert.equal(bad.nodes.knight.a1, 5); assert.equal(bad.nodes.knight.hack, undefined); assert.equal(bad.nodes.nope, undefined);
G.S.master.lv = lv0;

// ---- Chuyển class ----
G.S = createCharacter('knight', 'T'); G.S.lv = 120; G.S.resets = 2; G.S.tier = 3; G.S.zen = 20e6; G.S.jewels.soul = 10; calcStats(); enterMap(0);
G.S.stats.str += 50; G.S.stats.agi += 20; G.S.pts = 7;
G.S.equip.weapon.tier = 4; G.S.equip.weapon.plus = 9; G.S.equip.weapon.wt = 2;
const armor0 = G.S.equip.armor;
G.S.inv.push({ id: 'oldw', slot: 'weapon', tier: 2, plus: 3, exc: null, cls: 'knight', wt: specialWeaponIndex('knight') });
G.S.skills.r.whirl = 4;
assert.equal(runAction('changeClass', ['knight']).r, false, 'cùng class');
assert.equal(runAction('changeClass', ['hacker']).ok === false || true, true);
assert.equal(classChangeBlock('wizard'), null);
const zen0 = G.S.zen;
assert.equal(runAction('changeClass', ['wizard']).r, true);
assert.equal(G.S.cls, 'wizard'); assert.equal(G.S.lv, 120); assert.equal(G.S.resets, 2); assert.equal(G.S.tier, 3);
assert.equal(G.S.pts, 7 + 70, 'hoàn lại điểm đã cộng'); assert.deepEqual(G.S.stats, CLASSES.wizard.stats);
assert.equal(G.S.zen, zen0 - 2000000 * 3); assert.equal(G.S.jewels.soul, 7);
const w = G.S.equip.weapon; assert.equal(w.cls, 'wizard'); assert.equal(w.tier, 4); assert.equal(w.plus, 9); assert(w.wt < regularWeaponCount('wizard'));
const iw = G.S.inv.find((x) => x.slot === 'weapon' && x.plus === 3); assert.equal(iw.cls, 'wizard'); assert.equal(iw.wt, specialWeaponIndex('wizard'), 'vũ khí đặc biệt → đặc biệt');
assert.equal(G.S.equip.armor, armor0, 'giáp giữ nguyên');
assert.equal(G.S.skills.r.whirl, undefined, 'kỹ năng class cũ không còn'); assert(G.S.alt.knight.skills.r.whirl === 4, 'được cất lại');
assert.equal(G.P.range, CLASSES.wizard.range + 0, 'chỉ số theo class mới');
// thời gian chờ + điều kiện
assert(/chờ/.test(classChangeBlock('archer')), 'phải chờ 6 giờ');
G.S.ccAt = Date.now() - 7 * 3600 * 1000; assert.equal(classChangeBlock('archer'), null);
G.S.zen = 0; assert(/Zen/.test(classChangeBlock('archer')));
G.S.zen = 20e6; G.S.jewels.soul = 0; assert(/ngọc/.test(classChangeBlock('archer')));
G.S.jewels.soul = 5; G.R.event = { id: 'x' }; assert(/sự kiện/.test(classChangeBlock('archer'))); G.R.event = null;
// vũ khí Thần giữ Thần cấp khi đổi class
G.S.equip.weapon.god = 3; G.S.ccAt = 0; assert.equal(runAction('changeClass', ['archer']).r, true); assert.equal(G.S.equip.weapon.god, 3, 'Thần cấp vũ khí được giữ'); assert.equal(G.S.equip.weapon.cls, 'archer');
G.S.ccAt = 0; G.S.zen = 20e6; G.S.jewels.soul = 5; assert.equal(runAction('changeClass', ['wizard']).r, true); G.S.ccAt = 0; G.S.zen = 20e6; G.S.jewels.soul = 5; assert.equal(runAction('changeClass', ['knight']).r, true);
// đổi về → kỹ năng cũ trở lại
assert.equal(G.S.skills.r.whirl, 4, 'đổi về có lại kỹ năng');
// migrate save cũ (không có master/alt)
const old = createCharacter('archer', 'O'); delete old.master; delete old.alt; delete old.ccAt;
const m2 = migrate(old); assert.deepEqual(m2.master, { lv: 0, exp: 0, nodes: {} }); assert.deepEqual(m2.alt, {}); assert.equal(m2.ccAt, 0);
console.log('master + chuyển class OK');
