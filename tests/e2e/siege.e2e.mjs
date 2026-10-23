import { dirname as _dn, resolve as _rs, join as _jn } from 'node:path';
import { tmpdir as _td } from 'node:os';
import { fileURLToPath as _fu } from 'node:url';
const ROOT = _rs(_dn(_fu(import.meta.url)), '../..');
const TMP = (name) => _jn(_td(), 'kng-test-' + name + '-');
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert';
import { createRequire } from 'node:module';
const require = createRequire(ROOT + '/server/package.json'); const WebSocket = require('ws');
const DATA = fs.mkdtempSync(TMP('e2e3')), PORT = 8797, B = 'http://localhost:' + PORT;
let srv; const start = () => new Promise((res) => { srv = spawn('node', [ROOT + '/server/src/index.js'], { env: { ...process.env, PORT, DATA_DIR: DATA, SIEGE_TEST: '1', SIEGE_MIN_ACTIVE_SEC: '3' }, stdio: ['ignore', 'pipe', 'inherit'] }); srv.stdout.on('data', (d) => { if (String(d).includes('server:')) res(); }); });
const stop = () => new Promise((res) => { srv.on('exit', res); srv.kill('SIGTERM'); });
const http = async (m, p, tok, body) => { const r = await fetch(B + p, { method: m, headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, j: await r.json() }; };
const play = (tok, extra) => new Promise((res) => { const ws = new WebSocket('ws://localhost:' + PORT + '/ws'); const got = []; let seq = 1; const cbs = new Map(); ws.on('message', (d) => { const m = JSON.parse(d); got.push(m); if (m.t === 'ar' && cbs.has(m.i)) { cbs.get(m.i)(m); cbs.delete(m.i); } }); ws.on('open', () => ws.send(JSON.stringify({ t: 'hello', auth: tok, look: { cls: 'knight' }, stats: {}, ...extra }))); const act = (a, ...args) => new Promise((r) => { const i = seq++; cbs.set(i, r); ws.send(JSON.stringify({ t: 'act', i, a, args })); }); const iv = setInterval(() => { if (got.some((m) => m.t === 'state')) { clearInterval(iv); res({ ws, got, act }); } }, 50); });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const lastEv = (c) => { const x = c.got.filter((m) => m.t === 'snap' && m.s.ev && m.s.ev.id === 'siege').pop(); return x && x.s.ev; };
const lastMobs = (c) => { const x = c.got.filter((m) => m.t === 'snap').pop(); return x ? x.s.mobs : []; };
await start();
const reg = async (u) => (await http('POST', '/api/register', null, { user: u, pass: 'matkhau123' })).j;
const toks = []; for (const u of ['sgA', 'sgB', 'sgC']) toks.push((await reg(u)).token);
for (const [t, n] of [[toks[0], 'Anh'], [toks[1], 'Binh'], [toks[2], 'Cuong']]) { const c = await play(t, { create: { cls: 'knight', name: n } }); await wait(300); c.ws.close(); }
await wait(500); await stop();
for (const f of fs.readdirSync(path.join(DATA, 'saves'))) { const p = path.join(DATA, 'saves', f), j = JSON.parse(fs.readFileSync(p)); const d = j.data || j; d.lv = 80; d.zen = 50e6; fs.writeFileSync(p, JSON.stringify(j)); }
await start();
const cs = []; for (const t of toks) cs.push(await play(t, { play: true }));
const names = ['Than', 'Long', 'Ho']; const gids = [];
for (let i = 0; i < 3; i++) gids.push((await http('POST', '/api/guild/create', toks[i], { name: names[i] })).j.guild.id);
await wait(500);
// ===== Trận 1: PvP giữa 2 bang công, thành chưa có chủ =====
assert.equal((await cs[0].act('enterSiege')).r, false, 'chưa có trận');
await http('POST', '/api/siege/_debug', toks[0], { def: null, att: [gids[1], gids[2]], sec: 120, gateHp: 400 });
assert.equal((await cs[0].act('enterSiege')).r, false, 'bang Than không tham gia');
assert.equal((await cs[1].act('enterSiege')).r, true); assert.equal((await cs[2].act('enterSiege')).r, true);
await cs[1].act('auto'); await cs[2].act('auto');
await wait(25000);
const e1 = lastEv(cs[1]), e2 = lastEv(cs[2]); assert(e1 && e2, 'có sự kiện siege');
const enemies1 = lastMobs(cs[1]).filter((m) => m.pvp), enemies2 = lastMobs(cs[2]).filter((m) => m.pvp);
console.log('B thấy địch:', enemies1.map((m) => m.name + ' hp ' + Math.round(m.hp) + '/' + Math.round(m.maxHp)), '| dmgOut B', Math.floor(e1.dmgOut), 'C', Math.floor(e2.dmgOut));
assert(e1.dmgOut > 0 || e2.dmgOut > 0, 'có PvP');
const hurt = (c) => c.got.filter((m) => m.t === 'snap' && m.ev && m.ev.some((e) => e[0] === 'playerHit')).length;
console.log('lần trúng đòn: B', hurt(cs[1]), 'C', hurt(cs[2]), '| gate B:', JSON.stringify(e1.gateInfo));
assert(hurt(cs[1]) + hurt(cs[2]) > 0, 'người bị đánh mất máu');
console.log('board', JSON.stringify(e1.board));
// ===== cổng vỡ → chiếm ngai =====
let gate = lastEv(cs[1]).gateInfo; console.log('cổng', gate && Math.round(gate.hp), '/', gate && gate.max, 'open', gate && gate.open);
await wait(15000);
gate = lastEv(cs[1]).gateInfo; console.log('cổng sau', gate && Math.round(gate.hp), 'open', gate && gate.open);
// ===== B vào Ngai Vàng (C chỉ AUTO): chiếm ngai sau 10s, cộng giờ giữ =====
const pos = (c) => { const x = c.got.filter((m) => m.t === 'snap').pop(); return x && x.s.p ? [x.s.p.x, x.s.p.y, x.s.p.hp, x.s.p.dead] : null; };
console.log('B trước', JSON.stringify(pos(cs[1])));
const a1 = await cs[1].act('auto'); const mv = await cs[1].act('move', 20, 20, true); console.log('auto', JSON.stringify(a1.r), 'move', JSON.stringify(mv.r));
for (let k = 0; k < 5; k++) { await wait(2000); console.log('B', JSON.stringify(pos(cs[1])), 'auto?', lastEv(cs[1]) && 1); }
let holder = null; for (let i = 0; i < 40 && !holder; i++) { await wait(1000); const b = lastEv(cs[1]).board; holder = b.teams.find((t) => t.holder); }
const bd = lastEv(cs[1]).board; console.log('chủ ngai:', holder && holder.name, 'board', JSON.stringify(bd.teams));
assert(holder && holder.name === 'Long', 'B (bang Long) chiếm ngai');
await wait(6000); const b2 = lastEv(cs[1]).board.teams.find((t) => t.name === 'Long'); assert(b2.hold >= 4, 'giờ giữ tăng: ' + b2.hold);
// ===== hết giờ (120s) → kết quả =====
let st; for (let i = 0; i < 120; i++) { await wait(1000); st = (await http('GET', '/api/siege', toks[1])).j; if (st.owner) break; }
console.log('chủ thành:', JSON.stringify(st.owner), '| lịch sử:', JSON.stringify(st.history[0]));
assert.equal(st.owner.name, 'Long'); assert.equal(st.history[0].winner.name, 'Long'); assert.equal(st.history[0].gateBroken, true);
await wait(1500);
const castle = cs[1].got.filter((m) => m.s && m.s.guild).map((m) => m.s.guild).pop(); assert(castle && castle.castle === true, 'S.guild.castle của người thắng: ' + JSON.stringify(castle));
const castleC = cs[2].got.filter((m) => m.s && m.s.guild).map((m) => m.s.guild).pop(); assert(!castleC || !castleC.castle);
const endEv = cs[1].got.filter((m) => m.t === 'snap' && m.ev && m.ev.some((e) => e[0] === 'siegeEnd')).length; assert(endEv > 0, 'nhận sự kiện kết thúc');
// quà bang thắng: 3 vũ khí đặc biệt vào đấu giá bang Long (chỉ người đủ điều kiện), bang Ho không có
const lotsB = (await http('GET', '/api/auction?scope=guild', toks[1])).j.lots; console.log('lô đấu giá bang Long:', lotsB.map((l) => l.goods.items[0] && l.goods.items[0].cls + ' wt' + l.goods.items[0].wt + ' +' + l.goods.items[0].plus + ' khởi điểm ' + l.start).join(' | '));
assert.equal(lotsB.length, 3, '3 vũ khí đặc biệt'); assert(lotsB.every((l) => l.goods.items[0].slot === 'weapon' && l.goods.items[0].exc && l.canBid));
assert.equal((await http('GET', '/api/auction?scope=guild', toks[2])).j.lots.length, 0, 'bang thua không có quà');
assert(lotsB.some((l) => l.goods.items[0].cls === 'knight' && l.goods.items[0].wt === 4), 'kiếm đặc biệt là loại số 4');
// quỹ bang + phát quỹ (thêm trực tiếp bằng API thử nghiệm không có → kiểm tra quỹ ban đầu = 0 và chặn phát khi trống)
const gd = (await http('GET', '/api/guild', toks[1])).j.guild; assert.equal(gd.castle, true); assert.equal(gd.fund, 0);
assert.equal((await http('POST', '/api/guild/fund', toks[1], {})).s, 400, 'quỹ trống không phát được');
await wait(5500); const left = cs[1].got.filter((m) => m.t === 'snap').pop().s.ev; assert(!left || left.id !== 'siege', 'đã ra khỏi đấu trường');
console.log('E2E3 OK'); cs.forEach((c) => c.ws.close()); await stop(); process.exit(0);
