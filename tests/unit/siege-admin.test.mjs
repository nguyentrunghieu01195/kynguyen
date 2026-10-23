import { dirname as _dn, resolve as _rs, join as _jn } from 'node:path';
import { tmpdir as _td } from 'node:os';
import { fileURLToPath as _fu } from 'node:url';
import fs from 'node:fs'; import assert from 'node:assert';
const ROOT = _rs(_dn(_fu(import.meta.url)), '../..');
const realNow = Date.now; let T = Date.UTC(2026, 9, 21, 5, 0, 0); // Thứ tư 12:00 VN: đang mở đăng ký
Date.now = () => T;
const { createSiege } = await import(ROOT + '/server/src/siege.js');
const { SIEGE } = await import(ROOT + '/src/config/siege.js');

const names = { G1: 'Rong', G2: 'Ho', G3: 'Bao' }, gof = { L1: 'G1', L2: 'G2', L3: 'G3' };
const guilds = { guildIdOf: (a) => gof[a], nameOf: (g) => names[g], detail: () => ({ role: 'leader', lv: 3 }), memberIds: (g) => Object.keys(gof).filter((a) => gof[a] === g) };
const mk = (dir, extra = {}) => { const mails = [], refreshed = [], notes = []; const s = createSiege(dir, { guilds, store: { findByAccount: (a) => ({ name: 'user_' + a }) }, market: { mail: (a, t, g) => mails.push({ a, t, g }) }, gboss: { addLots() {} }, notify: (a, t) => notes.push(t), announce: (t) => notes.push(t), refresh: (g) => refreshed.push(g), ...extra }); return { s, mails, refreshed, notes }; };
const dir = fs.mkdtempSync(_jn(_td(), 'kng-test-sga-'));
let { s, mails, refreshed } = mk(dir);
const S = () => ({ zen: 9e6, name: 'x' });

// --- huỷ đăng ký: hoàn phí đúng người trả ---
s.register('L1', S()); s.register('L2', S());
assert.equal(s.adminView().reg.length, 2); assert.equal(s.adminView().reg[0].payer, 'user_L1', 'ghi người trả phí');
s.adminCancelReg('G1'); assert.equal(s.adminView().reg.length, 1);
let m = mails.find((x) => /Hoàn phí/.test(x.t)); assert.equal(m.a, 'L1'); assert.equal(m.g.zen, SIEGE.regFee);
assert.throws(() => s.adminCancelReg('G1'), /chưa đăng ký/);

// --- ép bắt đầu ---
const empty = mk(fs.mkdtempSync(_jn(_td(), 'kng-test-sgb-'))); assert.throws(() => empty.s.adminForceStart(), /Chưa có bang công/);
s.adminForceStart(); assert(s.brain.active(), 'trận đã bắt đầu dù ngoài giờ'); assert.equal(s.adminView().st.forced, true); assert.equal(s.brain.hasDefender(), false);
assert.throws(() => s.adminForceStart(), /đang diễn ra/);
s.tick(); assert(s.brain.active(), 'tick không tự kết thúc trận ép bắt đầu (ngoài lịch)');
assert.equal(s.entryFor({ guild: { id: 'G2' } }, () => 0).ok, true);
// quản trị huỷ đăng ký không dùng được khi đang đánh
assert.throws(() => s.adminCancelReg('G2'), /đang diễn ra/);

// --- huỷ trận: hoàn phí, không đổi chủ thành, người chơi được báo kết thúc ---
const before = mails.length; s.adminCancelBattle();
assert.equal(s.brain.active(), false); assert.equal(s.owner(), null);
const refund = mails.slice(before).filter((x) => /Hoàn phí/.test(x.t)); assert.deepEqual(refund.map((x) => x.a), ['L2'], 'hoàn phí bang đang đánh');
const res = s.takeResult(); assert.equal(res.cancelled, true); assert.equal(res.winner, null); assert.equal(s.takeResult(), null);
assert.deepEqual(s.adminView().reg, [], 'đặt lại danh sách đăng ký'); assert.throws(() => s.adminCancelBattle(), /Không có trận/);

// --- ép bắt đầu rồi hết giờ: kết thúc đúng 30 phút sau, kể cả ngoài lịch ---
s.register('L3', S()); s.adminForceStart(); T += 29 * 60000; s.tick(); assert(s.brain.active()); T += 2 * 60000; s.tick(); assert.equal(s.brain.active(), false, 'hết 30 phút thì chốt');
const r2 = s.takeResult(); assert.equal(r2.gateBroken, false); assert.equal(r2.winner, null, 'không có bang thủ và cổng chưa vỡ → chưa có chủ thành');

// --- đặt / gỡ chủ thành ---
s.adminSetOwner('G3'); assert.equal(s.ownerGid(), 'G3'); assert.deepEqual(refreshed, ['G3']);
s.adminSetOwner('G1'); assert.equal(s.ownerGid(), 'G1'); assert.deepEqual(refreshed.slice(1), ['G3', 'G1'], 'báo cập nhật cờ chủ thành cho bang cũ và mới');
s.adminSetOwner(null); assert.equal(s.ownerGid(), null); assert.throws(() => s.adminSetOwner('GX'), /Không tìm thấy bang/);

// --- khởi động lại giữa trận: hoàn phí + đặt lại đăng ký (chạy lại 2 lần không hoàn trùng) ---
const dir2 = fs.mkdtempSync(_jn(_td(), 'kng-test-sgc-'));
let a = mk(dir2); a.s.register('L1', S()); a.s.register('L2', S());
T = Date.UTC(2026, 9, 25, 13, 0, 5); a.s.tick(); assert(a.s.brain.active(), 'trận theo lịch bắt đầu'); a.s.flush(); // mô phỏng: máy chủ sập khi đang đánh
let b = mk(dir2); const refunds = b.mails.filter((x) => /Hoàn phí/.test(x.t)); assert.deepEqual(refunds.map((x) => x.a).sort(), ['L1', 'L2'], 'hoàn đủ phí cho cả hai bang'); assert.equal(refunds[0].g.zen, SIEGE.regFee);
assert.match(refunds[0].t, /khởi động lại/); assert.equal(b.s.brain.active(), false); assert.deepEqual(b.s.adminView().reg, []);
let c = mk(dir2); assert.equal(c.mails.filter((x) => /Hoàn phí/.test(x.t)).length, 0, 'khởi động lần nữa không hoàn trùng');
// trận kết thúc bình thường thì không có dấu "đang đánh" → khởi động lại không hoàn
const dir3 = fs.mkdtempSync(_jn(_td(), 'kng-test-sgd-'));
T = Date.UTC(2026, 9, 28, 5, 0); let d = mk(dir3); d.s.register('L1', S()); T = Date.UTC(2026, 10, 1, 13, 0, 5); d.s.tick(); assert(d.s.brain.active()); T = Date.UTC(2026, 10, 1, 13, 31); d.s.tick(); assert.equal(d.s.brain.active(), false); d.s.flush();
assert.equal(mk(dir3).mails.filter((x) => /Hoàn phí/.test(x.t)).length, 0, 'trận đã kết thúc thì không hoàn phí');
console.log('SIEGE ADMIN OK'); Date.now = realNow; process.exit(0);
