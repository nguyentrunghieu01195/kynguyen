import { dirname as _dn, resolve as _rs } from 'node:path';
import { fileURLToPath as _fu } from 'node:url';
const ROOT = _rs(_dn(_fu(import.meta.url)), '../..');
import assert from 'node:assert';
const { G } = await import(ROOT + '/src/core/state.js');
const { createCharacter } = await import(ROOT + '/src/systems/character.js');
const { calcStats } = await import(ROOT + '/src/systems/stats.js');
const W = await import(ROOT + '/src/systems/world.js');
const { updateMonsters } = await import(ROOT + '/src/systems/monsters.js');
const { killMob } = await import(ROOT + '/src/systems/combat.js');
const { NIGHTMARE } = await import(ROOT + '/src/config/nightmare.js');
const { MONSTER, mitigate } = await import(ROOT + '/src/config/balance.js');

G.S = createCharacter('knight', 'T'); G.S.lv = 300; G.S.tier = 3; calcStats();
// chưa đủ Reset / bản đồ thấp → không xuất hiện
W.enterMap(9); G.S.resets = NIGHTMARE.minResets - 1; for (let i = 0; i < 200; i++) updateMonsters(1); assert.equal(G.R.nm, null, 'chưa đủ Reset');
G.S.resets = NIGHTMARE.minResets; W.enterMap(0); for (let i = 0; i < 200; i++) updateMonsters(1); assert(!G.R.nm, 'bản đồ thấp không có');
// đủ điều kiện → xuất hiện sau firstSec
W.enterMap(9); G.S.resets = NIGHTMARE.minResets; calcStats(); G.R.nmT = undefined;
for (let i = 0; i < NIGHTMARE.firstSec + 5 && !G.R.nm; i++) updateMonsters(1); assert(G.R.nm && G.R.nm.nightmare && G.R.nm.boss, 'xuất hiện sau ' + NIGHTMARE.firstSec + 's');
const nm = G.R.nm; assert(G.R.mobs.includes(nm));
// chỉ số thích nghi: mạnh lên theo sức mạnh người chơi, và theo số Reset
G.R.mobs = G.R.mobs.filter((m) => m !== nm); G.R.nm = null;
const a = W.spawnNightmare(), hpA = a.maxHp; G.R.mobs = G.R.mobs.filter((m) => m !== a);
G.S.stats.str += 3000; calcStats(); const b = W.spawnNightmare(); assert(b.maxHp > hpA * 2, 'máu boss tăng theo sát thương người chơi'); G.R.mobs = G.R.mobs.filter((m) => m !== b);
const hpB = b.maxHp; G.S.resets += 10; calcStats(); const c = W.spawnNightmare(); assert(c.maxHp > hpB * 1.4, 'máu boss tăng theo số Reset'); G.R.mobs = G.R.mobs.filter((m) => m !== c);
// sát thương mỗi đòn (sau giáp) ≈ hitPct · HP người chơi
const P = G.P, per = mitigate(c.dmg, P.def) * (1 - P.abs / 100) * (1 - P.guard / 100); const ratio = per / P.maxHp;
assert(ratio > NIGHTMARE.hitPct * 0.8 && ratio < NIGHTMARE.hitPct * NIGHTMARE.hitCap * 1.2, 'đòn đánh ≈ ' + (ratio * 100).toFixed(1) + '% HP');
// rút lui nếu không hạ được; hẹn lại lần sau
G.R.nm = c; G.R.mobs.push(c); c.life = 0.5; updateMonsters(1); assert.equal(G.R.nm, null); assert.equal(G.R.nmT, NIGHTMARE.respawnSec); assert(!G.R.mobs.includes(c));
// hạ boss → rơi thưởng lớn
const d = W.spawnNightmare(); G.R.nm = d; G.R.drops.length = 0; killMob(d);
assert.equal(G.R.nm, null); assert.equal(G.R.nmT, NIGHTMARE.respawnSec);
const k = (x) => G.R.drops.filter((q) => q.kind === x); assert(k('shard').length === 1 && k('shard')[0].val >= 1, 'rơi Mảnh Thần');
assert(k('jewel').length >= 3 * 3, 'rơi nhiều ngọc'); const items = k('item'); assert.equal(items.length, NIGHTMARE.drop.items);
for (const q of items) { assert(q.val.plus >= NIGHTMARE.drop.plusMin && q.val.plus <= NIGHTMARE.drop.plusMax, 'đồ đã ép +9..12'); assert(q.val.exc && q.val.exc.length >= 2, 'có dòng Hoàn Hảo'); }
// không áp cho sự kiện
G.R.event = { id: 'x' }; G.R.nm = null; G.R.nmT = 0; updateMonsters(1); assert.equal(G.R.nm, null, 'không xuất hiện trong sự kiện'); G.R.event = null;
console.log('Hỗn Mang Chi Vương OK');
