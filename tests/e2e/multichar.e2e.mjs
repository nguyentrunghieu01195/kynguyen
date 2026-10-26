import { dirname as _dn, resolve as _rs, join as _jn } from 'node:path';
import { tmpdir as _td } from 'node:os';
import { fileURLToPath as _fu } from 'node:url';
const ROOT = _rs(_dn(_fu(import.meta.url)), '../..');
const TMP = (name) => _jn(_td(), 'kng-test-' + name + '-');
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert';
import { createRequire } from 'node:module';
const require = createRequire(ROOT + '/server/package.json'); const WebSocket = require('ws');
const DATA = fs.mkdtempSync(TMP('e2emulti')), PORT = 8806, B = 'http://localhost:' + PORT;
let srv; const start = () => new Promise((res) => { srv = spawn('node', [ROOT + '/server/src/index.js'], { env: { ...process.env, PORT, DATA_DIR: DATA }, stdio: ['ignore', 'pipe', 'inherit'] }); srv.stdout.on('data', (d) => { if (String(d).includes('server:')) res(); }); });
const stop = () => new Promise((res) => { srv.on('exit', res); srv.kill('SIGTERM'); });
const http = async (m, p, tok, body, ch) => { const r = await fetch(B + p, { method: m, headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}), ...(ch ? { 'X-Char': ch } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, j: await r.json() }; };
const play = (tok, extra) => new Promise((res) => { const ws = new WebSocket('ws://localhost:' + PORT + '/ws'); const got = []; let seq = 1; const cbs = new Map(); ws.on('message', (d) => { const m = JSON.parse(d); got.push(m); if (m.t === 'ar' && cbs.has(m.i)) { cbs.get(m.i)(m); cbs.delete(m.i); } }); ws.on('open', () => ws.send(JSON.stringify({ t: 'hello', auth: tok, look: { cls: 'knight' }, stats: {}, ...extra }))); const act = (a, ...args) => new Promise((r) => { const i = seq++; cbs.set(i, r); ws.send(JSON.stringify({ t: 'act', i, a, args })); }); const iv = setInterval(() => { if (got.some((m) => m.t === 'state')) { clearInterval(iv); res({ ws, got, act }); } }, 50); });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const merged = (c) => { const o = {}; for (const m of c.got) if (m.t === 'state') Object.assign(o, m.s); else if ((m.t === 'st' || m.t === 'ar') && m.s) Object.assign(o, m.s); return o; };
await start();
const A = (await http('POST', '/api/register', null, { user: 'multichar', pass: 'matkhau123' })).j; assert(A.token, 'register');
const mk = async (cls, name) => { const c = await play(A.token, { create: { cls, name } }); await wait(300); const w = c.got.find((m) => m.t === 'welcome'); c.ws.close(); await wait(300); return w.char; };
const id1 = await mk('knight', 'Mot'), id2 = await mk('wizard', 'Hai'), id3 = await mk('lord', 'Ba');
assert(id1 && id2 && id3 && new Set([id1, id2, id3]).size === 3, 'mỗi nhân vật một id');
let me = (await http('GET', '/api/me', A.token)).j; assert.deepEqual(me.chars.map((c) => c.cls), ['knight', 'wizard', 'lord']); assert.equal(me.maxChars, 5);
// vào đúng nhân vật được chọn
for (const [id, cls] of [[id2, 'wizard'], [id1, 'knight'], [id3, 'lord']]) { const c = await play(A.token, { play: true, char: id }); await wait(300); assert.equal(merged(c).cls, cls, 'vào ' + cls); c.ws.close(); await wait(300); }
// API HTTP theo nhân vật (X-Char)
assert.equal((await http('GET', '/api/save', A.token, null, id2)).j.data.cls, 'wizard');
assert.equal((await http('GET', '/api/save', A.token, null, 'deadbeefdeadbeef')).s, 401);
// đủ 5 thì chặn
await mk('archer', 'Bon'); await mk('gladiator', 'Nam');
{ const err = await new Promise((res) => { const ws = new WebSocket('ws://localhost:' + PORT + '/ws'); ws.on('message', (d) => { const m = JSON.parse(d); if (m.t === 'playerr') res(m); }); ws.on('open', () => ws.send(JSON.stringify({ t: 'hello', auth: A.token, look: { cls: 'knight' }, stats: {}, create: { cls: 'knight', name: 'Sau' } }))); setTimeout(() => res(null), 3000); }); assert(err && err.code === 'chars_full', 'báo đã đủ nhân vật'); }
await wait(300); me = (await http('GET', '/api/me', A.token)).j; assert.equal(me.chars.length, 5, 'không quá 5 nhân vật');
// xoá nhân vật phụ
{ const c = await play(A.token, { play: true, char: id2 }); await wait(300); c.ws.send(JSON.stringify({ t: 'wipe' })); await wait(500); c.ws.close(); }
me = (await http('GET', '/api/me', A.token)).j; assert.equal(me.chars.length, 4); assert(!me.chars.some((c) => c.id === id2), 'đã xoá nhân vật Hai');
await wait(300); await stop();
console.log('E2E-MULTI OK'); process.exit(0);
