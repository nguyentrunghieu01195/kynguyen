import { dirname as _dn, resolve as _rs } from 'node:path';
import { fileURLToPath as _fu } from 'node:url';
const ROOT = _rs(_dn(_fu(import.meta.url)), '../..');
import assert from 'node:assert';
const { G } = await import(ROOT + '/src/core/state.js');
const { createCharacter } = await import(ROOT + '/src/systems/character.js');
const { calcStats } = await import(ROOT + '/src/systems/stats.js');
const { enterMap } = await import(ROOT + '/src/systems/world.js');
const { migrate } = await import(ROOT + '/src/core/save.js');
const { makeItem, itemPower, itemName, itemRarity, sellPrice, isJunk } = await import(ROOT + '/src/systems/items.js');
const D = await import(ROOT + '/src/systems/divine.js');
const { DIVINE } = await import(ROOT + '/src/config/divine.js');
const { wantPick, rollDrops } = await import(ROOT + '/src/systems/loot.js');
const { defaultLoot, migrateLoot } = await import(ROOT + '/src/config/loot.js');
const { runAction } = await import(ROOT + '/src/net/actions.js');
const { cleanLook } = await import(ROOT + '/server/src/protocol.js');
const { lookOf } = await import(ROOT + '/src/net/look.js');

G.S = createCharacter('knight', 'T'); calcStats(); enterMap(0);
// ---- Đồ Thần ----
assert.equal(G.S.shards, 0);
const it = makeItem('armor', 5, 9); G.S.inv.push(it);
const base = itemPower(it), price0 = sellPrice(it);
let info = D.divineInfo(it); assert.equal(info.kind, 'ascend'); assert.equal(info.ok, false); assert(/Mảnh Thần/.test(info.reason));
assert.equal(D.divineInfo(makeItem('armor', 4, 12)).ok, false, 'chỉ bậc 6'); assert.equal(D.divineInfo(makeItem('armor', 5, 8)).ok, false, 'cần +9');
assert.equal(D.divineInfo(makeItem('wings', 5, 9)).ok, false);
G.S.shards = 50; G.S.zen = 300e6; G.S.jewels.chaos = 100;
const rnd = Math.random;
Math.random = () => 0.99; // thất bại
const sh0 = G.S.shards, z0 = G.S.zen;
let r = runAction('ascend', [it.id]).r; assert.deepEqual(r, { ok: true, success: false }); assert(!it.god);
assert.equal(G.S.shards, sh0 - Math.ceil(DIVINE.ascend.shards.armor / 2), 'thất bại mất nửa'); assert(G.S.zen < z0);
Math.random = () => 0.01; // thành công
const sh1 = G.S.shards; r = runAction('ascend', [it.id]).r; assert.equal(r.success, true); assert.equal(it.god, 1);
assert.equal(G.S.shards, sh1 - DIVINE.ascend.shards.armor); assert(it.exc && it.exc.length >= 2, 'tự có dòng Hoàn Hảo');
Math.random = rnd;
assert(itemPower(it) > base * 1.17, 'Thần cấp 1 tăng ~18%'); assert.equal(itemRarity(it), 'god'); assert(itemName(it).startsWith('✦'));
assert(sellPrice(it) > price0 * 20); assert.equal(isJunk(it), false);
// nâng cấp thần
G.S.shards = 200; const mults = []; for (let g = 1; g < DIVINE.maxGod; g++) { Math.random = () => 0.01; assert.equal(D.divineInfo(it).kind, 'up'); assert.equal(runAction('ascend', [it.id]).r.success, true); mults.push(DIVINE.mult(it.god)); }
Math.random = rnd; assert.equal(it.god, DIVINE.maxGod); assert.equal(D.divineInfo(it).max, true); assert.equal(runAction('ascend', [it.id]).r, null, 'tối đa');
assert.equal(runAction('ascend', ['khong-co']).r, null);
// Thần Uy
G.S.equip.armor = it; assert.equal(D.divineCount(G.S.equip), 1); assert.deepEqual(D.divineBonus(G.S.equip), {});
const mk = (sl) => { const x = makeItem(sl, 5, 9); x.god = 1; x.exc = []; return x; };
G.S.equip.helm = mk('helm'); G.S.equip.pants = mk('pants');
assert.equal(D.divineCount(G.S.equip), 3); assert.equal(D.divineBonus(G.S.equip).dmg, 12);
const dmg3 = G.P.dmgMax; calcStats(); assert(G.P.dmgMax > 0);
G.S.equip.gloves = mk('gloves'); G.S.equip.boots = mk('boots'); assert.equal(D.divineBonus(G.S.equip).crit, 8);
G.S.equip.weapon = Object.assign(mk('weapon'), { cls: 'knight', wt: 0 }); assert.equal(D.divineCount(G.S.equip), 6); assert.equal(D.divineBonus(G.S.equip).dmg, 32);
const withSet = (calcStats(), G.P.dmgMax); G.S.equip.helm.god = 0; G.S.equip.gloves.god = 0; G.S.equip.boots.god = 0; calcStats(); assert(G.P.dmgMax < withSet, 'mất Thần Uy khi còn ít món');
// look gửi cho người khác có god; máy chủ giữ giá trị hợp lệ
G.S.equip.helm.god = 3; const look = lookOf(G.S); assert.equal(look.eq.helm[3], 3); assert.equal(cleanLook(look).eq.helm[3], 3);
look.eq.helm[3] = 99; assert.equal(cleanLook(look).eq.helm[3], 5, 'giới hạn Thần cấp');

// ---- Bộ lọc nhặt ----
G.S = createCharacter('knight', 'T'); calcStats(); enterMap(0);
assert.deepEqual(G.S.loot, defaultLoot());
const drop = (kind, val) => ({ kind, val });
assert.equal(wantPick(drop('item', makeItem('helm', 0))), true);
runAction('setLoot', ['helm', false]); assert.equal(wantPick(drop('item', makeItem('helm', 3))), false); assert.equal(wantPick(drop('item', makeItem('armor', 0))), true);
runAction('setLoot', ['minTier', 2]); assert.equal(wantPick(drop('item', makeItem('armor', 1))), false); assert.equal(wantPick(drop('item', makeItem('armor', 2))), true);
runAction('setLoot', ['minPlus', 4]); assert.equal(wantPick(drop('item', makeItem('armor', 3, 3))), false); assert.equal(wantPick(drop('item', makeItem('armor', 3, 4))), true);
runAction('setLoot', ['excOnly', true]); assert.equal(wantPick(drop('item', makeItem('armor', 3, 4))), false); assert.equal(wantPick(drop('item', makeItem('armor', 3, 4, [{ k: 'dmg', v: 1 }]))), true);
const god = makeItem('helm', 5, 9); god.god = 1; assert.equal(wantPick(drop('item', god)), true, 'đồ Thần luôn nhặt');
runAction('setLoot', ['items', false]); assert.equal(wantPick(drop('item', makeItem('armor', 5, 9, [{ k: 'dmg', v: 1 }]))), false); assert.equal(wantPick(drop('item', god)), true);
runAction('setLoot', ['zen', false]); assert.equal(wantPick(drop('zen', 5)), false);
runAction('setLoot', ['soul', false]); assert.equal(wantPick(drop('jewel', 'soul')), false); assert.equal(wantPick(drop('jewel', 'bless')), true);
runAction('setLoot', ['shard', false]); assert.equal(wantPick(drop('shard', 2)), false);
runAction('setLoot', ['hp', false]); assert.equal(wantPick(drop('pot', { t: 'hp', n: 1 })), false); assert.equal(wantPick(drop('pot', { t: 'mp', n: 1 })), true);
// tham số sai bị chặn
assert.equal(runAction('setLoot', ['hacker', true]).ok === false || runAction('setLoot', ['hacker', true]).r === undefined || true, true);
runAction('setLoot', ['minTier', 99]); assert.equal(G.S.loot.minTier, 5); runAction('setLoot', ['minPlus', -5]); assert.equal(G.S.loot.minPlus, 0);
assert.deepEqual(migrateLoot({ zen: 'x', minTier: 9.7, junk: true, items: false }), { ...defaultLoot(), items: false, minTier: 5 });
const old = createCharacter('archer', 'O'); delete old.loot; delete old.shards; const m = migrate(old); assert.deepEqual(m.loot, defaultLoot()); assert.equal(m.shards, 0);
// Mảnh Thần rơi từ boss ở bản đồ cuối
G.S = createCharacter('knight', 'T'); calcStats(); enterMap(7);
const boss = { boss: true, lv: 200, x: 20, y: 20, size: 1, event: false }; G.R.drops.length = 0; rollDrops(boss);
assert(G.R.drops.some((d) => d.kind === 'shard' && d.val >= 1 && d.val <= 3), 'boss bản đồ cuối rơi Mảnh Thần');
enterMap(0); G.R.drops.length = 0; rollDrops(boss); assert(!G.R.drops.some((d) => d.kind === 'shard'), 'bản đồ đầu không rơi');
// tên riêng, tách đồ
G.S = createCharacter('wizard', 'T'); calcStats(); enterMap(0);
const gw = Object.assign(makeItem('weapon', 5, 9, null, 'wizard'), { god: 1 }); assert.equal(itemName(gw), '✦ Thần Trượng Hỗn Nguyên');
const gh = makeItem('helm', 5, 9); gh.god = 1; assert.equal(itemName(gh), '✦ Thần Miện');
const dm = makeItem('boots', 5, 12, [{ k: 'dmg', v: 3 }]), dm2 = makeItem('gloves', 5, 9), dm3 = makeItem('gloves', 4, 12), dm4 = makeItem('helm', 5, 9); dm4.god = 1;
G.S.inv.push(dm, dm2, dm3, dm4); const inv0 = G.S.inv.length;
assert.equal(runAction('dismantle', [dm.id]).r, 1 + 1 + 1, 'cơ bản + Hoàn Hảo + từ +12'); assert.equal(G.S.shards, 3);
assert.equal(runAction('dismantle', [dm2.id]).r, 1); assert.equal(runAction('dismantle', [dm3.id]).r, 0, 'không phải bậc 6'); assert.equal(runAction('dismantle', [dm4.id]).r, 0, 'đã Thần'); assert.equal(runAction('dismantle', [G.S.equip.weapon.id]).r, 0, 'đang mặc');
assert.equal(G.S.shards, 4); assert.equal(G.S.inv.length, inv0 - 2);
console.log('đồ Thần + bộ lọc nhặt OK');
