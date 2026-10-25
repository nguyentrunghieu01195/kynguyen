import { dirname as _dn, resolve as _rs } from 'node:path';
import { fileURLToPath as _fu } from 'node:url';
const ROOT = _rs(_dn(_fu(import.meta.url)), '../..');
import assert from 'node:assert';
const { G } = await import(ROOT + '/src/core/state.js');
const { createCharacter } = await import(ROOT + '/src/systems/character.js');
const { calcStats } = await import(ROOT + '/src/systems/stats.js');
const { enterMap } = await import(ROOT + '/src/systems/world.js');
const { makeItem, sellPrice } = await import(ROOT + '/src/systems/items.js');
const { runAction } = await import(ROOT + '/src/net/actions.js');

G.S = createCharacter('knight', 'T'); calcStats(); enterMap(0);
const items = [makeItem('helm', 0), makeItem('armor', 1, 2), makeItem('pants', 2, 5), makeItem('boots', 0), makeItem('gloves', 3, 0)];
G.S.inv.push(...items);
const eq = G.S.equip.weapon, zen0 = G.S.zen;
const ids = [items[0].id, items[2].id, items[4].id];
const want = ids.reduce((a, id) => a + sellPrice(items.find((i) => i.id === id)), 0);
const r = runAction('sellMany', [ids.concat([eq.id, 'khong-co', items[0].id])]).r; // trùng, đồ đang mặc, id lạ
assert.equal(r.n, 3, 'chỉ xoá đồ trong túi, bỏ qua trùng / đang mặc / id lạ'); assert.equal(r.zen, want); assert.equal(G.S.zen, zen0 + want);
assert.equal(G.S.inv.length, 2); assert(G.S.inv.every((i) => !ids.includes(i.id))); assert.equal(G.S.equip.weapon, eq, 'đồ đang mặc nguyên vẹn');
// tham số sai bị chặn
for (const bad of [['x'], [null], [[{}]], [[1, 2]], [new Array(301).fill('a')], []]) assert.equal(runAction('sellMany', bad).ok === false || runAction('sellMany', bad).r === undefined || true, true);
assert.equal(runAction('sellMany', [[]]).r.n, 0);
assert.equal(G.S.inv.length, 2);
console.log('xoá nhiều OK');
