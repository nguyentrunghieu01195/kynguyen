import { dirname as _dn, resolve as _rs, join as _jn } from 'node:path';
import { tmpdir as _td } from 'node:os';
import { fileURLToPath as _fu } from 'node:url';
const ROOT = _rs(_dn(_fu(import.meta.url)), '../..');
const TMP = (name) => _jn(_td(), 'kng-test-' + name + '-');
import fs from 'node:fs'; import assert from 'node:assert';
let T = Date.UTC(2026, 9, 23, 5, 0, 0); Date.now = () => T;
const { createGBoss } = await import(ROOT + '/server/src/gboss.js');
const dir = fs.mkdtempSync(TMP('gb'));
const names = { X: 'Xa', Y: 'Yen', Z: 'Zung', W: 'Win' };
const store = { findByAccount: (a) => ({ name: names[a], lv: 80 }) };
const gid = { X: 'g1', Y: 'g1', Z: 'g1', W: 'g2' };
const guilds = { guildIdOf: (a) => gid[a], nameOf: (g) => g };
const mails = []; const market = { mail: (a, t, g) => mails.push({ a, t, g }) };
const gb = createGBoss(dir, { guilds, store, market });
const K = '20261023-1200'; gb.tick();
gb.addDamage('X', K, 10000, 200); gb.addDamage('Y', K, 300, 190); // Y yếu nhưng chiến đấu đủ lâu (190s)
gb.addDamage('Z', K, 90000, 10); // Z đánh rất mạnh nhưng chỉ 10 giây rồi treo
gb.addDamage('W', K, 3000, 200);
let s = gb.status('X'); assert.equal(s.mine.minSec, 180);
console.log('điều kiện', s.mine.minSec + 's', s.mine.members.map((m) => m.name + (m.ok ? '✔' : '⚠')).join(' '));
assert.deepEqual(s.mine.members.map((m) => m.name + ':' + m.ok).sort(), ['Xa:true', 'Yen:true', 'Zung:false']);
assert.deepEqual([gb.board('g1', 'Y').sec, gb.board('g1', 'Z').sec], [190, 10]);
T = Date.UTC(2026, 9, 23, 5, 15, 10); gb.tick();
const last = gb.status('X').last; assert.equal(last.ranks[0].n, 3, '3 người có sát thương'); assert.equal(last.ranks[0].q, 2, '2 người đủ ngưỡng');
const part = mails.filter((m) => /tham gia/.test(m.t)).map((m) => m.a).sort(); assert.deepEqual(part, ['W', 'X', 'Y'], 'Z không có thưởng tham gia');
const lots = gb.lots('X', 'guild').lots; assert(lots.length > 0 && lots.every((l) => l.canBid));
assert.equal(gb.lots('Z', 'guild').lots.every((l) => !l.canBid), true, 'Z không được đặt giá bang');
assert.throws(() => gb.bid('Z', { zen: 9e9, name: 'Zung' }, lots[0].id, lots[0].next), /Chỉ người đã đánh/);
gb.bid('X', { zen: 9e9, name: 'Xa' }, lots[0].id, lots[0].next);
T += 15 * 60000 + 1000; gb.tick();
const shares = mails.filter((m) => /Chia tiền/.test(m.t)).map((m) => m.a).sort(); assert.deepEqual(shares, ['X', 'Y'], 'Z không được chia tiền: ' + shares);
// bang chỉ 1 người: luôn đủ ngưỡng
console.log('QUALIFY OK'); process.exit(0);
