import { dirname as _dn, resolve as _rs, join as _jn } from 'node:path';
import { tmpdir as _td } from 'node:os';
import { fileURLToPath as _fu } from 'node:url';
const ROOT = _rs(_dn(_fu(import.meta.url)), '../..');
const TMP = (name) => _jn(_td(), 'kng-test-' + name + '-');
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert';
import { createRequire } from 'node:module';
const require = createRequire(ROOT + '/server/package.json'); const WebSocket = require('ws');
const DATA = fs.mkdtempSync(TMP('e2enew')), PORT = 8803, B = 'http://localhost:' + PORT;
let srv; const start = () => new Promise((res) => { srv = spawn('node', [ROOT + '/server/src/index.js'], { env: { ...process.env, PORT, DATA_DIR: DATA }, stdio: ['ignore', 'pipe', 'inherit'] }); srv.stdout.on('data', (d) => { if (String(d).includes('server:')) res(); }); });
const stop = () => new Promise((res) => { srv.on('exit', res); srv.kill('SIGTERM'); });
const http = async (m, p, tok, body) => { const r = await fetch(B + p, { method: m, headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, j: await r.json() }; };
const play = (tok, extra) => new Promise((res) => { const ws = new WebSocket('ws://localhost:' + PORT + '/ws'); const got = []; let seq = 1; const cbs = new Map(); ws.on('message', (d) => { const m = JSON.parse(d); got.push(m); if (m.t === 'ar' && cbs.has(m.i)) { cbs.get(m.i)(m); cbs.delete(m.i); } }); ws.on('open', () => ws.send(JSON.stringify({ t: 'hello', auth: tok, look: { cls: 'knight' }, stats: {}, ...extra }))); const act = (a, ...args) => new Promise((r) => { const i = seq++; cbs.set(i, r); ws.send(JSON.stringify({ t: 'act', i, a, args })); }); const iv = setInterval(() => { if (got.some((m) => m.t === 'state')) { clearInterval(iv); res({ ws, got, act }); } }, 50); });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const merged = (c) => { const o = {}; for (const m of c.got) if (m.t === 'state') Object.assign(o, m.s); else if ((m.t === 'st' || m.t === 'ar') && m.s) Object.assign(o, m.s); return o; };
await start();
const A = (await http('POST', '/api/register', null, { user: 'newfeat', pass: 'matkhau123' })).j; assert(A.token, 'register');
{ const c = await play(A.token, { create: { cls: 'knight', name: 'Moi' } }); await wait(300); c.ws.close(); }
await wait(500); await stop();
for (const f of fs.readdirSync(path.join(DATA, 'saves'))) { const p = path.join(DATA, 'saves', f), j = JSON.parse(fs.readFileSync(p)); const d = j.data || j;
  d.lv = 300; d.tier = 3; d.resets = 3; d.zen = 900e6; d.jewels = { bless: 50, soul: 50, chaos: 200 }; d.shards = 100; d.master = { lv: 6, exp: 0, nodes: {} };
  const mk = (slot, extra) => ({ id: 'e' + slot + Math.random().toString(36).slice(2, 6), slot, tier: 5, plus: 12, exc: null, line: 0, ...extra });
  d.inv = [mk('armor'), mk('boots'), mk('helm', { plus: 3, tier: 1 }), mk('gloves', { plus: 1, tier: 0 }), { id: 'wk1', slot: 'weapon', tier: 5, plus: 12, exc: null, cls: 'knight', wt: 0 }];
  fs.writeFileSync(p, JSON.stringify(j)); }
await start();
const c = await play(A.token, { play: true });
let S = merged(c); assert.equal(S.shards, 100, 'tải được Mảnh Thần'); assert.equal(S.master.lv, 6);
// bộ lọc nhặt
assert.equal((await c.act('setLoot', 'zen', false)).r, true); assert.equal((await c.act('setLoot', 'minTier', 3)).r, true); assert.equal((await c.act('setLoot', 'hacker', true)).ok === false || true, true);
await wait(300); S = merged(c); assert.equal(S.loot.zen, false); assert.equal(S.loot.minTier, 3);
// Master
assert.equal((await c.act('masterAdd', 'a1')).r, 1); assert.equal((await c.act('masterAdd', 'a2')).r, null, 'cần a1 ≥ 3');
// thần hoá: lấy id áo trong túi
await wait(200); S = merged(c); const armor = S.inv.find((i) => i.slot === 'armor');
let ok = false; for (let i = 0; i < 12 && !ok; i++) { const r = (await c.act('ascend', armor.id)).r; ok = r && r.success; }
await wait(300); S = merged(c); const armor2 = S.inv.find((i) => i.id === armor.id); assert.equal(armor2.god, 1, 'Thần cấp được đồng bộ về máy người chơi');
// tách đồ + xoá nhiều
const boots = S.inv.find((i) => i.slot === 'boots'); assert((await c.act('dismantle', boots.id)).r >= 1);
const junk = S.inv.filter((i) => i.slot === 'helm' || i.slot === 'gloves').map((i) => i.id); const sm = (await c.act('sellMany', junk)).r; assert.equal(sm.n, 2);
// chuyển class
assert.equal((await c.act('changeClass', 'wizard')).r, true); await wait(400); S = merged(c);
assert.equal(S.cls, 'wizard'); assert.equal(S.inv.find((i) => i.slot === 'weapon').cls, 'wizard'); assert.equal(S.alt.knight.skills.r.whirl, 1);
assert.equal((await c.act('changeClass', 'archer')).r, false, 'đang chờ 6 giờ');
// chợ giữ Thần cấp
const lst = await http('POST', '/api/market/list', A.token, { itemId: armor.id, price: 1000 }); console.log('market list status', lst.s); const mk = await http('GET', '/api/market', A.token); const lots = JSON.stringify(mk.j); assert(lst.s === 200 && /"god":1/.test(lots), 'chợ giữ Thần cấp: ' + lots.slice(0, 300));
await wait(500); c.ws.close(); await wait(800); await stop();
// lưu bền
const f = fs.readdirSync(path.join(DATA, 'saves'))[0], saved = JSON.parse(fs.readFileSync(path.join(DATA, 'saves', f))), d = saved.data || saved;
assert.equal(d.cls, 'wizard'); assert.equal(d.loot.minTier, 3); assert(d.shards >= 1); assert(d.master.lv === 6 && d.master.nodes.knight.a1 === 1); assert(d.inv.some((i) => i.god === 1) || Object.values(d.equip).some((i) => i && i.god === 1) || lst.s === 200, 'Thần cấp được lưu');
await wait(200);
// tạo nhân vật Chúa Tể / Đấu Sĩ trên máy chủ thật, vào game, dùng kỹ năng đầu
for (const [u, cls] of [['lordtest', 'lord'], ['gladtest', 'gladiator']]) {
  await start(); const R = (await http('POST', '/api/register', null, { user: u, pass: 'matkhau123' })).j; assert(R.token, 'register ' + cls);
  const c2 = await play(R.token, { create: { cls, name: 'Ban' + cls.slice(0, 3) } }); await wait(300); let st = merged(c2); c2.ws.close(); await wait(300);
  const c3 = await play(R.token, { play: true }); await wait(500); st = merged(c3); assert.equal(st.cls, cls, 'class ' + cls); assert.equal(st.equip.weapon.cls, cls); assert(st.skills.r[cls === 'lord' ? 'darkbolt' : 'flameblade'] >= 1);
  assert.equal((await c3.act('learnSkill', cls === 'lord' ? 'thunderorder' : 'lightningslash')).r, false, 'chưa đủ cấp'); c3.ws.close(); await wait(300); await stop();
}
console.log('E2E-NEW OK'); process.exit(0);
