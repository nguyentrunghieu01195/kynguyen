import { dirname as _dn, resolve as _rs, join as _jn } from 'node:path';
import { tmpdir as _td } from 'node:os';
import { fileURLToPath as _fu } from 'node:url';
const ROOT = _rs(_dn(_fu(import.meta.url)), '../..');
const TMP = (name) => _jn(_td(), 'kng-test-' + name + '-');
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert';
import { createRequire } from 'node:module';
const require = createRequire(ROOT + '/server/package.json'); const WebSocket = require('ws');

const DATA = fs.mkdtempSync(TMP('e2e2')), PORT = 8798, B = 'http://localhost:' + PORT, TS = path.join(DATA, 'ts');
const setTime = (ms) => fs.writeFileSync(TS, String(ms - Date.now()));
fs.writeFileSync(TS, '0');
const base = new Date(); const t0 = Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), 5, 1, 0); // 12:01 VN
let srv; const start = () => new Promise((res) => { srv = spawn('node', ['--require', ROOT + '/tests/helpers/timeshift.cjs', ROOT + '/server/src/index.js'], { env: { ...process.env, PORT, DATA_DIR: DATA, TS_FILE: TS, GBOSS_MIN_ACTIVE_SEC: '5' }, stdio: ['ignore', 'pipe', 'inherit'] }); srv.stdout.on('data', (d) => { if (String(d).includes('server:')) res(); }); });
const stop = () => new Promise((res) => { srv.on('exit', res); srv.kill('SIGTERM'); });
const http = async (m, p, tok, body) => { const r = await fetch(B + p, { method: m, headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, j: await r.json() }; };
const play = (tok, extra) => new Promise((res) => { const ws = new WebSocket('ws://localhost:' + PORT + '/ws'); const got = []; let seq = 1; const cbs = new Map(); ws.on('message', (d) => { const m = JSON.parse(d); got.push(m); if (m.t === 'ar' && cbs.has(m.i)) { cbs.get(m.i)(m); cbs.delete(m.i); } }); ws.on('open', () => ws.send(JSON.stringify({ t: 'hello', auth: tok, look: { cls: 'knight' }, stats: {}, ...extra }))); const act = (a, ...args) => new Promise((r) => { const i = seq++; cbs.set(i, r); ws.send(JSON.stringify({ t: 'act', i, a, args })); }); const iv = setInterval(() => { if (got.some((m) => m.t === 'state')) { clearInterval(iv); res({ ws, got, act }); } }, 50); });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const lastEv = (c) => { const x = c.got.filter((m) => m.t === 'snap' && m.s.ev && m.s.ev.id === 'gboss').pop(); return x && x.s.ev; };
const lastBoss = (c) => { const x = c.got.filter((m) => m.t === 'snap' && m.s.mobs.some((o) => o.boss)).pop(); return x && x.s.mobs.find((o) => o.boss); };
await start(); setTime(t0);
const reg = async (u) => (await http('POST', '/api/register', null, { user: u, pass: 'matkhau123' })).j;
const A = await reg('gbA'), Bb = await reg('gbB'), C = await reg('gbC');
for (const [t, n] of [[A.token, 'Anh'], [Bb.token, 'Binh'], [C.token, 'Cuong']]) { const c = await play(t, { create: { cls: 'knight', name: n } }); await wait(300); c.ws.close(); }
await wait(500); await stop();
for (const f of fs.readdirSync(path.join(DATA, 'saves'))) { const p = path.join(DATA, 'saves', f), j = JSON.parse(fs.readFileSync(p)); const d = j.data || j; d.lv = 80; d.zen = 50e6; fs.writeFileSync(p, JSON.stringify(j)); }
await start();
const ca = await play(A.token, { play: true }), cb = await play(Bb.token, { play: true }), cc = await play(C.token, { play: true });
const g1 = (await http('POST', '/api/guild/create', A.token, { name: 'Rong' })).j.guild.id; const g2 = (await http('POST', '/api/guild/create', C.token, { name: 'Ho' })).j.guild.id;
await http('POST', '/api/guild/apply', Bb.token, { id: g1 }); await http('POST', '/api/guild/accept', A.token, { acc: (await http('GET', '/api/guild', A.token)).j.guild.apps[0].acc });
await wait(500);
const mark = [ca, cb, cc].map((c) => c.got.length); assert.equal((await ca.act('enterGBoss')).r, true); assert.equal((await cb.act('enterGBoss')).r, true); assert.equal((await cc.act('enterGBoss')).r, true);
await ca.act('auto'); await cb.act('auto'); await cc.act('auto');
await wait(12000);
// cùng bang thấy nhau, khác bang không thấy
const seen = (c, name) => c.got.slice(mark[[ca, cb, cc].indexOf(c)]).some((m) => (m.t === 'pjoin' && m.p.name === name) || (m.t === 'snapshot' && m.players.some((p) => p.name === name)));
assert(seen(ca, 'Binh') && seen(cb, 'Anh'), 'cùng bang thấy nhau'); assert(!seen(ca, 'Cuong') && !seen(cc, 'Anh'), 'khác bang không thấy nhau');
const foreignFx = (c) => c.got.slice(mark[[ca, cb, cc].indexOf(c)]).filter((m) => m.t === 'snap').flatMap((m) => m.s.fx).filter((f) => f.foreign);
assert(foreignFx(cb).length > 0 && foreignFx(ca).length > 0, 'đồng đội thấy đòn đánh của nhau: ' + foreignFx(cb).length); assert.equal(foreignFx(cc).length, 0, 'bang khác không thấy');
console.log('fx đồng đội nhận được: B', foreignFx(cb).length, 'C', foreignFx(cc).length, 'loại', [...new Set(foreignFx(cb).map((f) => f.k))]);
const ea = lastEv(ca), ec = lastEv(cc); assert(ea.dmg > 0 && ec.dmg > 0, 'AUTO gây sát thương'); console.log('dmg A', Math.floor(ea.dmg), 'C', Math.floor(ec.dmg));
const bA = lastBoss(ca), bC = lastBoss(cc); assert(bA && bC, 'có boss'); console.log('boss A tại', bA.x, bA.y, '| boss C tại', bC.x, bC.y);
const hurtA = ca.got.filter((m) => m.t === 'snap' && m.ev && m.ev.some((e) => e[0] === 'playerHit')).length; console.log('lần bị boss đánh (A):', hurtA); assert(hurtA > 0, 'boss đánh người chơi');
assert(ea.board && ea.board.top.length === 2 && ea.board.rank && ea.board.sec > 0 && ea.board.minSec === 5, 'bảng xếp hạng trong trận: ' + JSON.stringify(ea.board)); console.log('board', JSON.stringify(ea.board));
// HTTP: xếp hạng đợt
let g = (await http('GET', '/api/gboss', A.token)).j; assert(g.round.length === 2 && g.round.every((r) => r.total > 0)); console.log('round', g.round.map((r) => r.name + ':' + r.total));
const totalA = g.round.find((r) => r.name === 'Rong').total, totalC = g.round.find((r) => r.name === 'Ho').total;
// hết giờ: tất cả bị đẩy ra, chốt kết quả
setTime(t0 + 13 * 60000 + 59000); await wait(300); setTime(t0 + 14 * 60000 + 3000); await wait(3000);
assert(!(lastEv(ca) && !lastEv(ca).over && ca.got.filter((m) => m.t === 'snap').pop().s.ev), 'đã ra khỏi đấu trường');
setTime(t0 + 14 * 60000 + 20000); await wait(4500);
g = (await http('GET', '/api/gboss', A.token)).j; assert.equal(g.round.length, 0); assert.equal(g.last.ranks.length, 2); console.log('last', g.last.ranks.map((r) => r.rank + '.' + r.name + ' ' + r.total + ' lots ' + r.lots));
assert(g.last.ranks[0].total >= g.last.ranks[1].total);
let lots = (await http('GET', '/api/auction?scope=guild', A.token)).j; const mine = g.last.mine.lots; assert.equal(lots.lots.length, mine); assert(lots.lots.every((l) => l.canBid));
assert.equal((await ca.act('enterGBoss')).r, false, 'cổng đóng');
const L = lots.lots[0]; const r = await http('POST', '/api/auction/bid', Bb.token, { id: L.id, amount: L.next }); assert.equal(r.s, 200, JSON.stringify(r.j));
assert.equal((await http('POST', '/api/auction/bid', C.token, { id: L.id, amount: L.next * 2 })).s, 403, 'khác bang không đặt được');
setTime(t0 + 14 * 60000 + 20000 + 15 * 60000 + 5000); await wait(4500);
const w = (await http('GET', '/api/auction?scope=world', C.token)).j; console.log('đấu giá thế giới:', w.lots.length, 'lô'); assert(w.lots.length >= 1);
assert((await http('POST', '/api/auction/bid', C.token, { id: w.lots[0].id, amount: w.lots[0].next })).s === 200, 'thế giới ai cũng đặt được');
console.log('E2E2 OK'); ca.ws.close(); cb.ws.close(); cc.ws.close(); await stop(); process.exit(0);
