import { dirname as _dn, resolve as _rs, join as _jn } from 'node:path';
import { tmpdir as _td } from 'node:os';
import { fileURLToPath as _fu } from 'node:url';
const ROOT = _rs(_dn(_fu(import.meta.url)), '../..');
const TMP = (name) => _jn(_td(), 'kng-test-' + name + '-');
import fs from 'node:fs'; import assert from 'node:assert';
const realNow = Date.now; let T = Date.UTC(2026, 9, 21, 5, 0, 0); // Thứ tư 21/10/2026 12:00 VN
Date.now = () => T;
const { createSiege } = await import(ROOT + '/server/src/siege.js');
const { createBrain } = await import(ROOT + '/server/src/siegebrain.js');
const { SIEGE } = await import(ROOT + '/src/config/siege.js');
// ===== bộ não =====
{
  const b = createBrain();
  b.start([{ gid: 'D', name: 'Thu', role: 'def' }, { gid: 'A', name: 'Cong1', role: 'att' }, { gid: 'B', name: 'Cong2', role: 'att' }], 600, 1000);
  assert.deepEqual([b.teamOf('D').slot, b.teamOf('A').slot, b.teamOf('B').slot], [0, 1, 2]);
  assert.equal(b.gateHit('D', 500), false); assert.equal(b.gate().hp, 1000, 'bang thủ không đánh được cổng nhà');
  assert.equal(b.gateHit('A', 600), false); assert.equal(b.gateHit('B', 600), true); assert.equal(b.gate().open, true);
  const at = (gid, x, y, dead = false) => ({ gid, x, y, dead }), th = SIEGE.throne;
  // đứng trên ngai một mình 10s mới chiếm
  for (let i = 0; i < 9; i++) b.step(1, [at('A', th.x, th.y)]); assert.equal(b.board().teams.find((t) => t.holder), undefined, 'chưa đủ 10s');
  let ev = b.step(1.2, [at('A', th.x, th.y)]); assert.equal(ev[0].type, 'throne'); assert.equal(b.board().teams.find((t) => t.holder).name, 'Cong1');
  // giành giật: 2 bang cùng đứng → không ai chiếm, giờ giữ của chủ ngai vẫn chạy
  const h0 = b.board().teams.find((t) => t.name === 'Cong1').hold;
  for (let i = 0; i < 20; i++) b.step(1, [at('A', th.x, th.y), at('B', th.x + 1, th.y)]); assert.equal(b.board().teams.find((t) => t.holder).name, 'Cong1', 'giữ nguyên khi giành giật');
  assert(b.board().teams.find((t) => t.name === 'Cong1').hold > h0, 'chủ ngai vẫn tích giờ');
  // người chết không tính; B một mình 10s → cướp ngai
  for (let i = 0; i < 12; i++) b.step(1, [at('A', th.x, th.y, true), at('B', th.x, th.y)]); assert.equal(b.board().teams.find((t) => t.holder).name, 'Cong2');
  b.kill('B', 'A'); assert.equal(b.board().teams.find((t) => t.name === 'Cong2').kills, 1);
  { const r0 = JSON.parse(JSON.stringify(b.board())); assert.equal(r0.teams.find((t) => t.holder).name, 'Cong2'); assert(r0.teams.find((t) => t.name === 'Cong1').hold > r0.teams.find((t) => t.name === 'Cong2').hold, 'Cong1 đang dẫn tổng giờ giữ'); }
  for (let i = 0; i < 40; i++) b.step(1, [at('B', th.x, th.y)]); // Cong2 giữ thêm 40s → vượt tổng giờ
  const r = b.finish(); assert.equal(r.winner, 'Cong2', 'bang giữ ngai lâu nhất thắng'); assert.equal(r.gateBroken, true);
  // cổng chưa vỡ → bang thủ thắng; không thủ → không ai
  b.start([{ gid: 'D', name: 'Thu', role: 'def' }, { gid: 'A', name: 'Cong1', role: 'att' }], 60, 1000); assert.equal(b.finish().winner, 'Thu');
  b.start([{ gid: 'A', name: 'Cong1', role: 'att' }], 60, 1000); assert.equal(b.finish().winner, null);
  // ngai chỉ chiếm được sau khi cổng vỡ
  b.start([{ gid: 'A', name: 'Cong1', role: 'att' }], 600, 1000); for (let i = 0; i < 30; i++) b.step(1, [at('A', th.x, th.y)]); assert.equal(b.board().teams[0].hold, 0, 'cổng chưa vỡ thì không chiếm ngai');
  // hết giờ
  b.start([{ gid: 'A', name: 'Cong1', role: 'att' }], 5, 1000); for (let i = 0; i < 6; i++) b.step(1, []); assert.equal(b.active(), false);
  console.log('BRAIN OK');
}
// ===== quản lý theo tuần =====
const dir = fs.mkdtempSync(TMP('sg'));
const names = { G1: 'Rong', G2: 'Ho', G3: 'Bao', G4: 'Su', G5: 'Voi' }, roles = { L1: 'leader', O1: 'officer', M1: 'member', L2: 'leader', L3: 'leader', L4: 'leader', L5: 'leader' };
const gof = { L1: 'G1', O1: 'G1', M1: 'G1', L2: 'G2', L3: 'G3', L4: 'G4', L5: 'G5' };
const sent = []; let owner = null;
const guilds = { guildIdOf: (a) => gof[a], nameOf: (g) => names[g], detail: (a) => ({ role: roles[a], lv: 3 }), memberIds: (g) => Object.keys(gof).filter((a) => gof[a] === g) };
const lots = [], mails = [];
const siege = createSiege(dir, { guilds, store: {}, market: { mail: (a, t, g) => mails.push({ a, t, g }) }, gboss: { addLots: (o) => lots.push(o) }, notify: (a, t) => sent.push(['n', t]), announce: (t) => sent.push(['all', t]) });
const S = (zen) => ({ zen, name: 'x' });
assert.equal(siege.status('L1').st.phase, 'reg');
assert.throws(() => siege.register('M1', S(9e6)), /bang chủ và phó/);
assert.throws(() => siege.register('L1', S(10)), /phí đăng ký/);
const s1 = S(9e6); siege.register('L1', s1); assert.equal(s1.zen, 9e6 - SIEGE.regFee, 'trừ phí');
assert.throws(() => siege.register('O1', S(9e6)), /đăng ký rồi/);
siege.register('L2', S(9e6)); siege.register('L3', S(9e6)); assert.throws(() => siege.register('L4', S(9e6)), /đủ 3 bang/);
assert.equal(siege.status('L1').mine.registered, true); assert.equal(siege.status('L4').mine.canRegister, true);
// Chủ nhật 19:45 → đã đóng đăng ký
T = Date.UTC(2026, 9, 25, 12, 45); assert.equal(siege.status('L4').st.phase, 'closed'); assert.throws(() => siege.register('L4', S(9e6)), /đóng đăng ký/);
// 20:00 → trận tự bắt đầu: 3 bang công (thành chưa có chủ)
T = Date.UTC(2026, 9, 25, 13, 0, 5); siege.tick(); assert(siege.brain.active(), 'trận bắt đầu'); assert.equal(siege.brain.hasDefender(), false);
assert.deepEqual([siege.brain.teamOf('G1').slot, siege.brain.teamOf('G2').slot, siege.brain.teamOf('G3').slot], [1, 2, 3]);
assert(sent.some((s) => /CÔNG THÀNH CHIẾN bắt đầu/.test(s[1])));
const entry = siege.entryFor({ guild: { id: 'G1' } }, () => 0); assert.equal(entry.ok, true); assert.equal(entry.team.slot, 1);
assert.match(siege.entryFor({ guild: { id: 'G4' } }, () => 0).err, /không tham gia/); assert.match(siege.entryFor({ guild: { id: 'G1' } }, () => 25).err, /đủ 25/);
// G2 hạ cổng + chiếm ngai (mô phỏng), có 2 người đủ điều kiện
siege.report('P1', 'G2', 400, 80); siege.report('P2', 'G2', 350, 70); siege.report('P3', 'G2', 20, 90); siege.report('P4', 'G1', 500, 60);
siege.brain.gateHit('G2', 1e9); const th = SIEGE.throne; for (let i = 0; i < 20; i++) siege.brain.step(1, [{ gid: 'G2', x: th.x, y: th.y, dead: false }]);
// 20:31 → kết thúc
T = Date.UTC(2026, 9, 25, 13, 31); siege.tick();
const res = siege.takeResult(); assert.equal(res.winner, 'Ho'); assert.equal(res.changed, true); assert.equal(siege.owner().name, 'Ho'); assert.equal(siege.ownerGid(), 'G2');
assert.equal(lots.length, 1); assert.equal(lots[0].gid, 'G2'); assert.deepEqual(lots[0].accs, ['P1', 'P2'], 'chỉ người chiến đấu đủ 5 phút'); assert.equal(lots[0].specs.length, 3);
assert(lots[0].specs.every((s) => s.item.special && s.item.slot === 'weapon' && s.start > 0));
const part = mails.filter((m) => /Thưởng công thành/.test(m.t)); assert.equal(part.length, 3, 'P1,P2 (thắng) + P4 (tham gia)');
assert.equal(part.find((m) => m.a === 'P1').g.zen, 80 * 3000 * 2, 'bang thắng ×2'); assert.equal(part.find((m) => m.a === 'P4').g.zen, 60 * 3000);
assert.equal(siege.takeResult(), null, 'kết quả trả 1 lần');
// tuần sau: Ho là chủ thành (tự động thủ), không đăng ký lại; Rong đăng ký công
T = Date.UTC(2026, 9, 26, 5, 0); const st2 = siege.status('L2'); assert.equal(st2.st.phase, 'reg'); assert.equal(st2.mine.isOwner, true); assert.equal(st2.mine.canRegister, false);
assert.throws(() => siege.register('L2', S(9e6)), /đang giữ thành/); siege.tick(); assert.deepEqual(siege.status('L1').reg, [], 'danh sách đăng ký đặt lại cho tuần mới');
siege.register('L1', S(9e6));
T = Date.UTC(2026, 10, 1, 13, 0, 10); siege.tick(); assert(siege.brain.active()); assert.equal(siege.brain.hasDefender(), true); assert.equal(siege.brain.teamOf('G2').role, 'def'); assert.equal(siege.brain.teamOf('G2').slot, 0);
// lưu & nạp lại
siege.flush(); const again = createSiege(dir, { guilds, store: {}, market: {}, gboss: {} }); assert.equal(again.ownerGid(), 'G2'); assert.equal(again.status('L1').history.length, 1);
// bang chủ thành giải tán → mất thành
names.G2 = undefined; again.tick(); assert.equal(again.ownerGid(), null);
console.log('SIEGE META OK'); Date.now = realNow; process.exit(0);
