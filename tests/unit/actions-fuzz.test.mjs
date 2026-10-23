// Thử ném tham số độc hại vào mọi hành động của máy chủ: không được văng lỗi, không làm hỏng dữ liệu nhân vật.
import { dirname as _dn, resolve as _rs } from 'node:path';
import { fileURLToPath as _fu } from 'node:url';
const ROOT = _rs(_dn(_fu(import.meta.url)), '../..');
import assert from 'node:assert';
const { G } = await import(ROOT + '/src/core/state.js');
const { createCharacter } = await import(ROOT + '/src/systems/character.js');
const { calcStats } = await import(ROOT + '/src/systems/stats.js');
const { enterMap } = await import(ROOT + '/src/systems/world.js');
const { ACTIONS, runAction } = await import(ROOT + '/src/net/actions.js');

G.S = createCharacter('knight', 'T'); G.S.lv = 60; calcStats(); enterMap(0);
const before = JSON.stringify({ zen: G.S.zen, jewels: G.S.jewels });
let seed = 12345; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const WEIRD = [undefined, null, NaN, Infinity, -Infinity, -1, 0, 1, 2, 3, 999999999999, -999999999999, 1e308, 0.5, '', 'a', '__proto__', 'constructor', 'toString', '../../x', 'zen', '1; drop', {}, [], [1, 2], { n: 1 }, true, false, 'x'.repeat(5000), Symbol.iterator.toString()];
const pickW = () => WEIRD[Math.floor(rnd() * WEIRD.length)];
// hành động thay đổi bản đồ / sự kiện làm chậm và không liên quan tới kiểm tra tham số → bỏ qua
const SKIP = new Set(['wipe', 'doReset']);
let calls = 0, crashes = [];
for (const name of Object.keys(ACTIONS)) {
  if (SKIP.has(name)) continue;
  for (let k = 0; k < 60; k++) {
    const args = Array.from({ length: Math.floor(rnd() * 5) }, pickW);
    try { runAction(name, args); calls++; } catch (e) { crashes.push(name + '(' + JSON.stringify(args, (_, v) => (typeof v === 'number' && !Number.isFinite(v) ? String(v) : v)).slice(0, 80) + ') → ' + e.message); }
  }
}
// tên hành động độc hại
for (const n of ['__proto__', 'constructor', 'hasOwnProperty', 'toString', 'valueOf', '']) assert.deepEqual(runAction(n, []), { error: 'unknown' });
// tham số không phải mảng
for (const a of [null, 5, 'x', {}, { length: 9 }]) { try { runAction('move', a); } catch (e) { crashes.push('move(args=' + typeof a + ')'); } }

console.log('đã thử', calls, 'lệnh; số lệnh văng lỗi:', crashes.length); if (crashes.length) console.log(crashes.slice(0, 12).join('\n'));
// dữ liệu nhân vật vẫn hợp lệ
const S = G.S;
for (const k of ['zen', 'exp', 'lv', 'pts']) assert(Number.isFinite(S[k]) && S[k] >= 0, k + ' hợp lệ: ' + S[k]);
for (const k of ['bless', 'soul', 'chaos']) assert(Number.isInteger(S.jewels[k]) && S.jewels[k] >= 0, 'ngọc ' + k);
for (const [k, v] of Object.entries(S.stats)) assert(Number.isFinite(v) && v >= 0, 'chỉ số ' + k + '=' + v);
assert(Array.isArray(S.inv) && S.inv.every((it) => it && typeof it === 'object'), 'túi đồ');
assert.equal(crashes.length, 0, 'có hành động văng lỗi khi nhận tham số độc hại');
console.log('FUZZ OK'); process.exit(0);
