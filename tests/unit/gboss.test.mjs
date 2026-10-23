import { dirname as _dn, resolve as _rs, join as _jn } from 'node:path';
import { tmpdir as _td } from 'node:os';
import { fileURLToPath as _fu } from 'node:url';
const ROOT = _rs(_dn(_fu(import.meta.url)), '../..');
const TMP = (name) => _jn(_td(), 'kng-test-' + name + '-');
import fs from 'node:fs'; import assert from 'node:assert';
const { gbossStatus } = await import(ROOT + '/src/config/gboss.js');
const realNow = Date.now; let T = Date.UTC(2026, 9, 23, 5, 0, 0); // 12:00 VN ngày 23/10/2026
Date.now = () => T;
const { createGBoss } = await import(ROOT + '/server/src/gboss.js');
const dir = fs.mkdtempSync(TMP('gb'));
const profiles = { A: { name: 'An', lv: 60 }, B: { name: 'Binh', lv: 70 }, C: { name: 'Cuong', lv: 80 }, D: { name: 'Dung', lv: 50 } };
const store = { findByAccount: (a) => profiles[a] };
const gid = { A: 'g1', B: 'g1', C: 'g2', D: null };
const guilds = { guildIdOf: (a) => gid[a], nameOf: (g) => ({ g1: 'Rong', g2: 'Ho' }[g]) };
const mails = []; const market = { mail: (a, t, g) => mails.push({ a, t, g }) };
const notes = []; const gb = createGBoss(dir, { guilds, store, market, notify: (a, t) => notes.push([a, t]), announce: (t) => notes.push(['all', t]) });

// lịch
let st = gbossStatus(T); assert(st.open && st.secLeft === 900 && st.key === '20261023-1200', JSON.stringify(st));
st = gbossStatus(T + 16 * 60000); assert(!st.open && st.secUntil === (8 * 3600 - 16 * 60), 'next 20:00: ' + st.secUntil);
st = gbossStatus(Date.UTC(2026, 9, 23, 13, 5)); assert(st.open && st.key === '20261023-2000', 'tối');
st = gbossStatus(Date.UTC(2026, 9, 23, 16, 59)); assert(!st.open && st.nextAt === Date.UTC(2026, 9, 24, 5, 0), 'sang ngày'); // 23:59 VN → 12:00 mai

gb.tick(); T += 60000;
const K = '20261023-1200';
assert(gb.addDamage('A', K, 600, 200)); assert(gb.addDamage('A', K, 400, 200)); assert(gb.addDamage('B', K, 2000, 200)); assert(gb.addDamage('C', K, 2500, 200));
assert(!gb.addDamage('D', K, 9999), 'không bang'); assert(!gb.addDamage('A', 'sai', 5), 'sai khoá'); assert(!gb.addDamage('A', K, 0, 200));
assert.deepEqual(gb.board('g1', 'B'), { top: [{ name: 'Rong', total: 3000 }, { name: 'Ho', total: 2500 }], rank: 1, total: 3000, sec: 200, minSec: 180 });
assert.equal(gb.board('g2').rank, 2);
let s = gb.status('A'); assert.equal(s.round[0].name, 'Rong'); assert.equal(s.round[0].total, 3000); assert.equal(s.mine.rank, 1); assert.equal(s.mine.members[0].dmg, 2000); assert.equal(s.mine.members.find((m) => m.me).dmg, 1000);
// đóng cổng + chốt
T = Date.UTC(2026, 9, 23, 5, 15, 3); gb.tick(); assert(gb.status('A').round.length, 'chưa chốt trong thời gian ân hạn');
T = Date.UTC(2026, 9, 23, 5, 15, 10); gb.tick(); s = gb.status('A'); assert.equal(s.round.length, 0); assert.equal(s.last.ranks[0].name, 'Rong');
assert.equal(s.last.ranks[0].lots, 4); assert.equal(s.last.ranks[1].lots, 3);
assert(!gb.addDamage('A', K, 99999, 200), 'quá hạn');
assert.equal(mails.filter((m) => /tham gia/.test(m.t)).length, 3, 'thưởng tham gia 3 người');
let lots = gb.lots('A', 'guild'); assert.equal(lots.lots.length, 4); assert(lots.lots.every((l) => l.canBid && l.stage === 'guild'));
assert.equal(gb.lots('D', 'guild').lots.length, 0); assert.equal(gb.lots('A', 'world').lots.length, 0);
assert.equal(gb.lots('C', 'guild').lots.length, 3);
// đặt giá
const L0 = lots.lots[0]; const Sb = { zen: 5e6, name: 'Binh' };
assert.throws(() => gb.bid('C', { zen: 9e9 }, L0.id, 5e6), /Chỉ người đã đánh/);
assert.throws(() => gb.bid('B', Sb, L0.id, 10), /tối thiểu/);
assert.throws(() => gb.bid('B', { zen: 5 }, L0.id, L0.start), /Không đủ Zen/);
gb.bid('B', Sb, L0.id, L0.start); assert.equal(Sb.zen, 5e6 - L0.start);
const Sa = { zen: 9e6, name: 'An' }; assert.throws(() => gb.bid('A', Sa, L0.id, L0.start), /tối thiểu/);
const next = Math.ceil(L0.start * 1.05); gb.bid('A', Sa, L0.id, next);
assert(mails.some((m) => m.a === 'B' && /hoàn lại/.test(m.t) && m.g.zen === L0.start), 'hoàn tiền người bị vượt');
assert(notes.some((n) => Array.isArray(n[0]) && n[0][0] === 'B' && /trả giá cao hơn/.test(n[1])), 'báo người bị vượt');
gb.bid('A', Sa, L0.id, Math.ceil(next * 1.05)); // tự nâng giá: chỉ trừ phần chênh
assert.equal(Sa.zen, 9e6 - Math.ceil(next * 1.05));
// chống đặt giá phút chót
{ const lotsNow = gb.lots('A', 'guild').lots; const L1 = lotsNow[1]; const endBefore = L1.endAt;
  T = endBefore - 20000; const r1 = gb.bid('A', { zen: 9e8, name: 'An' }, L1.id, L1.start); assert(r1.extended, 'có cộng giờ');
  const L1b = gb.lots('A', 'guild').lots.find((l) => l.id === L1.id); assert.equal(L1b.endAt, T + 30000, 'cộng 30s');
  // đặt liên tục: không vượt trần 10 phút
  let t = T; for (let i = 0; i < 40; i++) { t = gb.lots('A', 'guild').lots.find((l) => l.id === L1.id).endAt - 5000; T = t; const cur = gb.lots('A', 'guild').lots.find((l) => l.id === L1.id); gb.bid(i % 2 ? 'A' : 'B', { zen: 9e8, name: 'x' }, L1.id, cur.next); }
  const fin = gb.lots('A', 'guild').lots.find((l) => l.id === L1.id).endAt; assert(fin <= endBefore + 10 * 60000 + 1, 'trần cộng giờ: ' + (fin - endBefore)); console.log('cộng giờ tối đa', Math.round((fin - endBefore) / 1000), 's');
  T = endBefore - 20000 + 0; }
// hết 15 phút trong bang
T += 15 * 60000 + 1000; gb.tick();
const win = mails.find((m) => /Thắng đấu giá/.test(m.t)); assert.equal(win.a, 'A'); assert(win.g.items.length || Object.keys(win.g.jewels).length);
const shares = mails.filter((m) => /Chia tiền/.test(m.t)); assert.equal(shares.length, 4, 'hai phiên thắng, mỗi phiên chia 2 người'); assert.equal(shares[0].g.zen, Math.floor(Math.ceil(next * 1.05) / 2));
// các lô không ai đặt → ra thế giới
let w = gb.lots('D', 'world'); assert.equal(w.lots.length, 5);
assert(w.lots.every((l) => l.stage === 'world' && l.canBid));
assert.equal(gb.lots('A', 'guild').lots.length, 0, 'trong bang không còn');
const W0 = w.lots[0]; const Sd = { zen: 9e8, name: 'Dung' };
gb.bid('D', Sd, W0.id, W0.start); // người ngoài bang đặt được
T += 30 * 60000 + 1000; gb.tick();
assert(mails.some((m) => m.a === 'D' && /Thắng đấu giá/.test(m.t)), 'D thắng thế giới');
assert(mails.filter((m) => /không ai đấu giá/.test(m.t)).length === 4, 'lô vô chủ gửi MVP: ' + mails.filter((m) => /không ai đấu giá/.test(m.t)).length);
assert(mails.filter((m) => /không ai đấu giá/.test(m.t)).every((m) => ['B', 'C'].includes(m.a)), 'MVP là B (g1) hoặc C (g2)');
assert.equal(gb.lots('D', 'world').lots.length, 0);
gb.flush(); const gb2 = createGBoss(dir, { guilds, store, market }); assert(gb2.lots('A', 'guild').done.length >= 1, 'lưu & nạp lại');
console.log('GBOSS OK, mails', mails.length); Date.now = realNow; process.exit(0);
