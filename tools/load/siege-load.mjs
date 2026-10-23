// Thử tải Công Thành Chiến: N người chơi (chia đều 4 bang) cùng vào một trận, tất cả bật AUTO đánh nhau + đánh cổng.
// Chạy:  node tools/load/siege-load.mjs [số người = 100] [giây đo = 60]
// Cần: cd server && npm install. Máy chủ được tự dựng với LOAD_TEST=1 SIEGE_TEST=1 trên cổng 8796, dữ liệu tạm.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(path.join(ROOT, 'server/package.json'));
const WebSocket = require('ws');
const N = +process.argv[2] || 100, SECS = +process.argv[3] || 60, PORT = 8796, BASE = 'http://localhost:' + PORT;
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'kng-load-'));
let srv;
const start = () => new Promise((res) => { srv = spawn('node', [path.join(ROOT, 'server/src/index.js')], { env: { ...process.env, PORT, DATA_DIR: DATA, LOAD_TEST: '1', SIEGE_TEST: '1', SIEGE_MIN_ACTIVE_SEC: '3' }, stdio: ['ignore', 'pipe', 'inherit'] }); srv.stdout.on('data', (d) => { if (String(d).includes('server:')) res(); }); });
const stop = () => new Promise((res) => { srv.on('exit', res); srv.kill('SIGTERM'); });
const http = async (m, p, tok, body) => (await fetch(BASE + p, { method: m, headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined })).json();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const connect = (tok, extra) => new Promise((res) => {
  const ws = new WebSocket('ws://localhost:' + PORT + '/ws'); const st = { ws, bytes: 0, msgs: 0, state: false, by: {}, evb: 0, snapMobs: 0, snaps: 0 }; let seq = 1; const cbs = new Map();
  ws.on('message', (d) => { st.bytes += d.length; st.msgs++; const m = JSON.parse(d); st.by[m.t] = (st.by[m.t] || 0) + d.length; if (m.t === 'snap') { st.snaps++; st.snapMobs += m.s.mobs.length; if (m.s.ev) st.evb += JSON.stringify(m.s.ev).length; } if (m.t === 'state') st.state = true; if (m.t === 'ar' && cbs.has(m.i)) { cbs.get(m.i)(m); cbs.delete(m.i); } });
  st.act = (a, ...args) => new Promise((r) => { const i = seq++; cbs.set(i, r); ws.send(JSON.stringify({ t: 'act', i, a, args })); setTimeout(() => { cbs.delete(i); r(null); }, 8000); });
  ws.on('open', () => ws.send(JSON.stringify({ t: 'hello', auth: tok, look: { cls: 'knight' }, stats: {}, ...extra })));
  const iv = setInterval(() => { if (st.state) { clearInterval(iv); res(st); } }, 50);
});

console.log('Dựng máy chủ + ' + N + ' tài khoản…');
await start();
const toks = [], classes = ['knight', 'wizard', 'archer'];
for (let i = 0; i < N; i++) { const r = await http('POST', '/api/register', null, { user: 'ld' + i, pass: 'matkhau123' }); toks.push(r.token); const c = await connect(r.token, { create: { cls: classes[i % 3], name: 'P' + i } }); await wait(60); c.ws.close(); }
await wait(800); await stop();
for (const f of fs.readdirSync(path.join(DATA, 'saves'))) { const p = path.join(DATA, 'saves', f), j = JSON.parse(fs.readFileSync(p)); const d = j.data || j; d.lv = 120; d.zen = 50e6; fs.writeFileSync(p, JSON.stringify(j)); }
await start();
const cs = []; for (const t of toks) cs.push(await connect(t, { play: true }));
const per = Math.ceil(N / 4), gids = [];
for (let g = 0; g < 4; g++) { const lead = g * per; if (lead >= N) break; gids.push((await http('POST', '/api/guild/create', toks[lead], { name: 'Bang' + g })).guild.id); }
for (let i = 0; i < N; i++) { const g = Math.floor(i / per); if (i === g * per) continue; await http('POST', '/api/guild/apply', toks[i], { id: gids[g] }); }
for (let g = 0; g < gids.length; g++) { const d = (await http('GET', '/api/guild', toks[g * per])).guild; for (const a of d.apps) await http('POST', '/api/guild/accept', toks[g * per], { acc: a.acc }); }
await wait(1500);
await http('POST', '/api/siege/_debug', toks[0], { def: gids[0], att: gids.slice(1), sec: SECS + 120, gateHp: 9e9 });
let entered = 0; for (let i = 0; i < N; i++) { const r = await cs[i].act('enterSiege'); if (r && r.r) entered++; }
for (const c of cs) await c.act('auto');
console.log('Đã vào trận:', entered + '/' + N + ' người. Đo ' + SECS + ' giây…');
const base = cs.reduce((a, c) => a + c.bytes, 0), wire0 = cs.reduce((a, c) => a + c.ws._socket.bytesRead, 0), samples = []; let peak = 0; for (const c of cs) { c.by = {}; c.evb = 0; c.snapMobs = 0; c.snaps = 0; }
for (let s = 0; s < SECS; s += 5) { await wait(5000); const h = await (await fetch(BASE + '/health')).json(); samples.push(h.host.tickMs); peak = Math.max(peak, h.host.tickMs); process.stdout.write('  t=' + (s + 5) + 's tickMs=' + h.host.tickMs + ' (ngân sách ' + h.host.budgetMs + ')\n'); }
const bytes = cs.reduce((a, c) => a + c.bytes, 0) - base, avg = samples.reduce((a, b) => a + b, 0) / samples.length;
const wire = cs.reduce((a, c) => a + c.ws._socket.bytesRead, 0) - wire0, agg = {}; let evb = 0, sm = 0, sn = 0; for (const c of cs) { for (const [k, v] of Object.entries(c.by)) agg[k] = (agg[k] || 0) + v; evb += c.evb; sm += c.snapMobs; sn += c.snaps; }
console.log('\nDung lượng theo loại tin (KB/giây mỗi người, chưa nén):', Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => k + '=' + (v / SECS / N / 1024).toFixed(1)).join(' · '), '| riêng phần ev trong snap:', (evb / SECS / N / 1024).toFixed(1), '| quái/snapshot TB:', (sm / Math.max(1, sn)).toFixed(1));
console.log('Trên đường truyền thật (đã nén WebSocket): ~' + (wire / SECS / N / 1024).toFixed(1) + ' KB/giây mỗi người → tổng ' + (wire / SECS / 1024 / 1024 * 8).toFixed(1) + ' Mbit/s');
console.log('\nKẾT QUẢ ' + N + ' người cùng 1 trận: tickMs trung bình ' + avg.toFixed(1) + ' · đỉnh ' + peak.toFixed(1) + ' / 50 ms · mạng ~' + (bytes / SECS / N / 1024).toFixed(1) + ' KB/giây mỗi người (chưa nén)');
const mem = process.memoryUsage().rss;
cs.forEach((c) => c.ws.close()); await stop(); fs.rmSync(DATA, { recursive: true, force: true }); void mem; process.exit(0);
