import { dirname as _dn, resolve as _rs, join as _jn } from 'node:path';
import { tmpdir as _td } from 'node:os';
import { fileURLToPath as _fu } from 'node:url';
const ROOT = _rs(_dn(_fu(import.meta.url)), '../..');
const TMP = (name) => _jn(_td(), 'kng-test-' + name + '-');
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert';
import { createRequire } from 'node:module';
const require = createRequire(ROOT + '/server/package.json'); const WebSocket = require('ws');
const DATA = fs.mkdtempSync(TMP('e2e')), PORT = 8799, B = 'http://localhost:' + PORT;
let srv; const start = () => new Promise((res) => { srv = spawn('node', [ROOT + '/server/src/index.js'], { env: { ...process.env, PORT, DATA_DIR: DATA }, stdio: ['ignore', 'pipe', 'inherit'] }); srv.stdout.on('data', (d) => { if (String(d).includes('server:')) res(); }); });
const stop = () => new Promise((res) => { srv.on('exit', res); srv.kill('SIGTERM'); });
const http = async (m, p, tok, body) => { const r = await fetch(B + p, { method: m, headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, j: await r.json() }; };
const play = (tok, extra) => new Promise((res) => { const ws = new WebSocket('ws://localhost:' + PORT + '/ws'); const got = []; ws.on('message', (d) => { const m = JSON.parse(d); got.push(m); }); ws.on('open', () => ws.send(JSON.stringify({ t: 'hello', auth: tok, look: { cls: 'knight' }, stats: {}, ...extra }))); const iv = setInterval(() => { if (got.some((m) => m.t === 'state')) { clearInterval(iv); res({ ws, got }); } }, 50); });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await start();
const A = (await http('POST', '/api/register', null, { user: 'anhtest', pass: 'matkhau123' })).j, Bb = (await http('POST', '/api/register', null, { user: 'binhtest', pass: 'matkhau123' })).j;
assert(A.token && Bb.token, 'register');
for (const [t, n] of [[A.token, 'Anh'], [Bb.token, 'Binh']]) { const c = await play(t, { create: { cls: 'knight', name: n } }); await wait(300); c.ws.close(); }
await wait(500); await stop();
for (const f of fs.readdirSync(path.join(DATA, 'saves'))) { const p = path.join(DATA, 'saves', f), j = JSON.parse(fs.readFileSync(p)); const d = j.data || j; d.lv = 60; d.zen = 10e6; d.jewels = { bless: 5, soul: 5, chaos: 5 }; const n = new Date(), pad = (x) => String(x).padStart(2, '0'); d.quest.gq = { date: n.getFullYear() + '-' + pad(n.getMonth() + 1) + '-' + pad(n.getDate()), ids: ['kill', 'boss', 'jewel'], prog: { kill: 200, boss: 1, jewel: 3 }, claimed: {} }; fs.writeFileSync(p, JSON.stringify(j)); }
await start();
const ca = await play(A.token, { play: true }), cb = await play(Bb.token, { play: true });
const stateA = ca.got.find((m) => m.t === 'state').s; assert.equal(stateA.lv, 60, 'lv60 loaded'); assert.equal(stateA.guild, null);
let r = await http('POST', '/api/guild/create', A.token, { name: 'Rong Than' }); assert.equal(r.s, 200, JSON.stringify(r.j)); assert.equal(r.j.guild.role, 'leader');
await wait(300); let st = ca.got.filter((m) => m.t === 'st' || m.t === 'ar').map((m) => m.s).filter((s) => s && s.guild); assert(st.length && st[st.length - 1].guild.name === 'Rong Than', 'A nhận S.guild qua đồng bộ');
const gid = r.j.guild.id;
r = await http('POST', '/api/guild/apply', Bb.token, { id: gid }); assert.equal(r.s, 200, JSON.stringify(r.j));
r = await http('POST', '/api/guild/accept', Bb.token, { acc: 'x' }); assert.equal(r.s, 400, 'B chưa có bang');
const apps = (await http('GET', '/api/guild', A.token)).j.guild.apps; assert.equal(apps.length, 1);
r = await http('POST', '/api/guild/accept', A.token, { acc: apps[0].acc }); assert.equal(r.s, 200, JSON.stringify(r.j));
await wait(300); const bg = cb.got.filter((m) => m.s && m.s.guild).map((m) => m.s.guild).pop(); assert.equal(bg && bg.name, 'Rong Than', 'B được đồng bộ vào bang');
r = await http('POST', '/api/guild/donate', Bb.token, { zen: 600000, jewels: { soul: 2 } }); assert.equal(r.s, 200, JSON.stringify(r.j)); assert.equal(r.j.pts, 1600); assert.equal(r.j.levelUp, 2);
await wait(300); const ga = ca.got.filter((m) => m.s && m.s.guild).map((m) => m.s.guild).pop(); assert.equal(ga.lv, 2, 'A thấy bang lên cấp 2');
r = await http('POST', '/api/guild/quest', A.token, { id: 'jewel' }); assert.equal(r.s, 400, 'chưa đủ tiến độ'); 
r = await http('POST', '/api/guild/quest', A.token, { id: 'kill' }); assert.equal(r.s, 200, JSON.stringify(r.j)); assert.equal(r.j.pts, 30);
r = await http('POST', '/api/guild/quest', A.token, { id: 'kill' }); assert.equal(r.s, 400, 'đã nhận rồi');
r = await http('POST', '/api/guild/quest', A.token, { id: 'upgrade' }); assert.equal(r.s, 400, 'không nằm trong bộ hôm nay');
r = await http('POST', '/api/guild/quest', A.token, { id: 'boss' }); assert.equal(r.s, 200); assert.equal(r.j.pts, 30);
const me = (await http('GET', '/api/guild', A.token)).j.guild.members.find((m) => m.me); assert.equal(me.contrib, 60);
// chat bang
cb.ws.send(JSON.stringify({ t: 'gchat', text: 'chao ca bang' })); await wait(300);
assert(ca.got.some((m) => m.t === 'gchat' && m.text === 'chao ca bang'), 'A nhận chat bang');
// người ngoài không vào được chat; xin vào bang khác
r = await http('GET', '/api/guild/list', A.token); assert.equal(r.j.rows[0].name, 'Rong Than');
r = await http('POST', '/api/guild/kick', A.token, { acc: apps[0].acc }); assert.equal(r.s, 200);
await wait(300); const out = cb.got.filter((m) => m.s && 'guild' in m.s).map((m) => m.s.guild).pop(); assert.equal(out, null, 'B bị đuổi → S.guild null');
console.log('E2E OK'); ca.ws.close(); cb.ws.close(); await stop(); process.exit(0);
