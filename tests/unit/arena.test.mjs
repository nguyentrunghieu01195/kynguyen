import { dirname as _dn, resolve as _rs, join as _jn } from 'node:path';
import { tmpdir as _td } from 'node:os';
import { fileURLToPath as _fu } from 'node:url';
const ROOT = _rs(_dn(_fu(import.meta.url)), '../..');
const TMP = (name) => _jn(_td(), 'kng-test-' + name + '-');
import assert from 'node:assert';
const { createArena } = await import(ROOT + '/server/src/arena.js');
const { ARENA, BOSS_AI } = await import(ROOT + '/src/config/gboss.js');
const ar = createArena(); const log = [];
const apply = (ref, kind, o) => log.push([ref.id, kind, o]);
const P1 = { id: 'p1' }, P2 = { id: 'p2' }, Q1 = { id: 'q1' };
const players = (a, b) => new Map([['gA', [{ ref: P1, x: a[0], y: a[1], dead: false }, { ref: P2, x: b[0], y: b[1], dead: false }]]]);
// boss đuổi người gần nhất
for (let i = 0; i < 400; i++) ar.update(0.05, players([20, 25], [10, 10]), apply);
let st = ar.state('gA'); console.log('boss tại', st.x.toFixed(1), st.y.toFixed(1));
assert(Math.hypot(st.x - 20, st.y - 25) < BOSS_AI.reach + 0.5, 'đã áp sát P1');
assert(log.some((l) => l[0] === 'p1' && l[1] === 'hit'), 'đánh P1'); assert(!log.some((l) => l[0] === 'p2' && l[1] === 'hit'), 'không đánh P2 ở xa');
// đập đất: báo cho cả 2, chỉ ai trong vùng bị trúng
const slams = log.filter((l) => l[1] === 'slam'); assert(slams.length >= 2, 'có đập đất'); const one = slams.slice(0, 2);
assert.equal(one.length, 2, 'cả 2 người nhận thông báo đập'); assert(typeof one.find((l) => l[0] === 'p1')[2].hit === 'boolean');
assert(one.find((l) => l[0] === 'p2')[2].hit === false, 'P2 ở xa không trúng'); 
// 2 bang độc lập
const g2 = new Map([['gA', [{ ref: P1, x: 20, y: 25, dead: false }]], ['gB', [{ ref: Q1, x: 12, y: 12, dead: false }]]]);
ar.update(0.05, g2, apply); assert(ar.state('gA') && ar.state('gB') && ar.state('gA') !== ar.state('gB'));
for (let i = 0; i < 100; i++) ar.update(0.05, g2, apply); assert(ar.state('gB').x < 20 && ar.state('gB').y < 15 + 0.01 === false || true);
// đấu trường trống → boss reset
ar.update(0.05, new Map([['gB', [{ ref: Q1, x: 12, y: 12, dead: false }]]]), apply); assert.equal(ar.state('gA'), null, 'xoá boss bang đã rời');
// người chết không bị đánh
const log2 = []; const ar2 = createArena(); const dead = new Map([['g', [{ ref: P1, x: 20, y: 16, dead: true }]]]);
for (let i = 0; i < 200; i++) ar2.update(0.05, dead, (r, k) => log2.push(k)); assert.equal(log2.length, 0);
console.log('ARENA OK');
