// =====================================================================
//  MÁY CHỦ KỶ NGUYÊN HUYỀN THOẠI
//  - HTTP: phục vụ file game (dist/: index.html, PWA), /health, /api/rank
//  - API tài khoản: /api/register, /api/login, /api/logout, /api/me, /api/save (GET/PUT), /api/password
//  - WebSocket /ws: tài khoản khách, phòng theo bản đồ, đồng bộ vị trí,
//    chat thế giới, thông báo hệ thống, bảng xếp hạng
// =====================================================================
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { createStore } from './store.js';
import { createAccounts, AuthError } from './accounts.js';
import { createBackups } from './backup.js';
import { createHost } from './host.js';
import { createMarket, TradeError, MARKET, cleanGoods, goodsText, takeGoods as takeGoodsFn } from './market.js';
import { createGuilds } from './guilds.js';
import { createGBoss } from './gboss.js';
import { createSiege } from './siege.js';
import { CASTLE } from '../../src/config/siege.js';
import { claimGuildQ } from '../../src/systems/quests.js';
import crypto from 'node:crypto';
import { LIMITS, CLASSES, cleanName, cleanText, cleanLook, cleanStats, cleanRoom, cleanPos, ANNOUNCE, buildRank } from './protocol.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PORT = +process.env.PORT || 8787;
const DIST = process.env.DIST_DIR || path.join(ROOT, 'dist');
const DATA = process.env.DATA_DIR || path.join(ROOT, 'server', 'data');
const store = createStore(DATA);
const accounts = createAccounts(DATA);
const market = createMarket(DATA, accounts);
const guilds = createGuilds(DATA, { store });
guilds.setNotify((accId) => host.refreshGuild(accId));
guilds.setOnline((accId) => !!host.get(accId));
market.setNotify((accId) => { const c = host.get(accId); if (c) setTimeout(() => host.autoClaim(c), 0); for (const s of sessions.values()) if (s.p && s.p.acc === accId) out(s.ws, { t: 'mail' }); });
const gboss = createGBoss(DATA, {
  guilds, store, market,
  notify: (accIds, text) => { const set = new Set(accIds); for (const s of sessions.values()) if (s.p && set.has(s.p.acc)) out(s.ws, { t: 'sys', text, private: true, info: true }); },
  announce: (text) => toAll({ t: 'sys', text }),
});
const siege = createSiege(DATA, {
  guilds, store, market, gboss,
  notify: (accIds, text) => { const set = new Set(accIds); for (const s of sessions.values()) if (s.p && set.has(s.p.acc)) out(s.ws, { t: 'sys', text, private: true, info: true }); },
  announce: (text) => toAll({ t: 'sys', text }),
  onResult: (r) => { for (const t of r.teams) guilds.refresh(t.gid); },
  refresh: (gid) => guilds.refresh(gid),
});
guilds.setCastle((gid) => siege.ownerGid() === gid);
market.setTax((fee) => { const g = siege.ownerGid(); if (g) guilds.addFund(g, Math.floor(fee * CASTLE.taxShare)); }); // thuế chợ → quỹ bang giữ thành
// Máy chủ chạy game cho người chơi có tài khoản (gắn hàm gửi/hiện diện ở dưới khi đã có sessions/rooms)
const host = createHost({
  accounts, store, market, guilds, gboss, siege,
  send: (s, msg) => out(s.ws, msg),
  onPresence(s, d) {
    if (d.look) { s.look = cleanLook(d.look); if (s.room) toRoom(s.room, { t: 'plook', id: s.p.id, look: s.look }, s); return; }
    const pos = cleanPos(d.pos);
    if (d.room !== s.room) { joinRoom(s, d.room, pos); return; }
    if (!s.pos || Math.abs(pos.x - s.pos.x) > 0.04 || Math.abs(pos.y - s.pos.y) > 0.04 || pos.mv !== s.pos.mv || pos.f !== s.pos.f) { s.pos = pos; s.dirty = true; }
  },
  announceAll(kind, data, who) { const f = ANNOUNCE[kind]; if (f) toAll({ t: 'sys', text: f(data || {}, who) }); },
});
const backups = createBackups(DATA, { accounts, store, market, guilds, gboss, siege, everyHours: +process.env.BACKUP_HOURS || 24, keep: +process.env.BACKUP_KEEP || 14 });
const ADMIN_RAW = process.env.ADMIN_PASSWORD || '';
const ADMIN_WEAK = ADMIN_RAW && (ADMIN_RAW.length < 10 || ADMIN_RAW === 'doi-mat-khau-nay');
const ADMIN_PASSWORD = ADMIN_WEAK ? '' : ADMIN_RAW;
if (ADMIN_WEAK) console.warn('[admin] ADMIN_PASSWORD quá ngắn (< 10 ký tự) hoặc chưa đổi mật khẩu mẫu → tắt trang quản trị.');
const ADMIN_HTML = path.join(__dirname, '..', 'admin', 'index.html');

// ---------------- HTTP ----------------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Max-Age': '86400' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/admin/')) return await adminApi(req, res, url);
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (url.pathname === '/admin' || url.pathname === '/admin/') return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(ADMIN_HTML), { 'X-Robots-Tag': 'noindex', 'X-Frame-Options': 'DENY' });
    if (url.pathname === '/health') return send(res, 200, 'application/json', JSON.stringify({ ok: true, online: sessions.size, accounts: accounts.count(), host: host.load() }));
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'text/plain', 'Method not allowed');
    return serveStatic(res, url.pathname);
  } catch (e) {
    console.error('http', url.pathname, e);
    send(res, 500, 'application/json', JSON.stringify({ error: 'server', message: 'Lỗi máy chủ.' }));
  }
});
function send(res, code, type, body, extra) { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-cache', ...extra }); res.end(body); }

/** File tĩnh trong dist/ (index.html, manifest, service worker, icon). Không cho đi ra ngoài thư mục. */
function serveStatic(res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const f = path.normalize(path.join(DIST, rel));
  if (!f.startsWith(path.normalize(DIST + path.sep))) return send(res, 403, 'text/plain', 'Forbidden');
  if (!fs.existsSync(f) || !fs.statSync(f).isFile()) {
    if (rel === '/index.html') return send(res, 503, 'text/plain; charset=utf-8', 'Chưa build game. Chạy "npm run build" ở thư mục gốc.');
    return send(res, 404, 'text/plain', 'Not found');
  }
  const ext = path.extname(f), long = ext === '.png' || ext === '.ico';
  send(res, 200, MIME[ext] || 'application/octet-stream', fs.readFileSync(f), { 'Cache-Control': long ? 'public, max-age=604800' : 'no-cache', ...(rel === '/sw.js' ? { 'Service-Worker-Allowed': '/' } : {}) });
}

// ---------------- API TÀI KHOẢN ----------------
const json = (res, code, obj) => send(res, code, 'application/json; charset=utf-8', JSON.stringify(obj), CORS);
function readBody(req, max) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > max) { reject(new AuthError('too_big', 'Dữ liệu quá lớn.', 413)); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch (e) { reject(new AuthError('bad_json', 'Dữ liệu không hợp lệ.')); } });
    req.on('error', reject);
  });
}
// Giới hạn số lần thử đăng nhập/đăng ký theo IP (chống dò mật khẩu)
const hits = new Map();
function limited(key, max, windowMs) {
  if (process.env.LOAD_TEST) return false; // chỉ để thử tải (bỏ giới hạn tần suất)
  const now = Date.now(), h = hits.get(key) || { n: 0, at: now };
  if (now - h.at > windowMs) { h.n = 0; h.at = now; }
  h.n++; hits.set(key, h);
  return h.n > max;
}
setInterval(() => { const now = Date.now(); for (const [k, h] of hits) if (now - h.at > 15 * 60000) hits.delete(k); }, 60000);
const ipOf = (req) => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
const bearer = (req) => { const a = req.headers.authorization || ''; return a.startsWith('Bearer ') ? a.slice(7) : null; };
const validSave = (d) => d && typeof d === 'object' && !Array.isArray(d) && CLASSES.includes(d.cls) && typeof d.name === 'string';

async function api(req, res, url) {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
  const route = req.method + ' ' + url.pathname, ip = ipOf(req);
  if (route === 'GET /api/rank') return json(res, 200, rank());
  if (route === 'POST /api/register' || route === 'POST /api/login') {
    if (limited('auth:' + ip, 20, 10 * 60000)) return json(res, 429, { error: 'rate', message: 'Thử quá nhiều lần, chờ vài phút rồi thử lại.' });
    const b = await readBody(req, 4096);
    if (route === 'POST /api/login' && limited('user:' + String(b.user).toLowerCase(), 8, 10 * 60000)) return json(res, 429, { error: 'rate', message: 'Tài khoản này bị khoá tạm 10 phút vì nhập sai nhiều lần.' });
    try {
      const { acc, token } = route === 'POST /api/register' ? accounts.register(b.user, b.pass, req.headers['user-agent']) : accounts.login(b.user, b.pass, req.headers['user-agent']);
      return json(res, 200, { token, ...accounts.info(acc) });
    } catch (e) { if (e instanceof AuthError) return json(res, e.status, { error: e.code, message: e.message }); throw e; }
  }
  // Các API còn lại cần đăng nhập
  const token = bearer(req), acc = accounts.auth(token);
  if (!acc) return json(res, 401, { error: 'auth', message: 'Phiên đăng nhập đã hết hạn, hãy đăng nhập lại.' });
  try {
    switch (route) {
      case 'GET /api/me': return json(res, 200, accounts.info(acc));
      case 'POST /api/logout': accounts.logout(token); return json(res, 200, { ok: true });
      case 'GET /api/save': { const sv = accounts.getSave(acc); return json(res, 200, sv || { rev: acc.rev, data: null }); }
      case 'DELETE /api/save': if (host.get(acc.id)) return json(res, 409, { error: 'playing', message: 'Đang trong game — xoá nhân vật trong Cài đặt.' }); return json(res, 200, accounts.deleteSave(acc));
      case 'PUT /api/save': case 'POST /api/save':
        // Máy chủ giữ & tính toàn bộ nhân vật — không nhận bản lưu từ máy người chơi (chống sửa dữ liệu)
        return json(res, 403, { error: 'server_owned', message: 'Nhân vật được máy chủ lưu tự động, không cần gửi bản lưu.' });
      // ---- CHỢ & HỘP THƯ ----
      case 'GET /api/market': {
        const q = url.searchParams;
        return json(res, 200, market.browse(acc, { cat: q.get('cat'), sort: q.get('sort'), page: +q.get('page') || 0, cls: q.get('cls'), minTier: q.has('minTier') ? +q.get('minTier') : -1, mine: q.get('mine') === '1' }));
      }
      case 'GET /api/market/history': return json(res, 200, { rows: market.salesOf(acc.id).map((x) => ({ at: x.at, price: x.price, fee: x.fee, sold: x.seller === acc.id })) });
      case 'POST /api/market/list': return await saveOp(req, res, acc, (d, b) => market.list(acc, d, b));
      case 'POST /api/market/buy': return await saveOp(req, res, acc, (d, b) => market.buy(acc, d, String(b.id || '')));
      case 'POST /api/market/cancel': { const b = await readBody(req, 2048); market.cancel(acc, String(b.id || '')); return json(res, 200, { ok: true }); }
      case 'GET /api/mail': return json(res, 200, { rows: market.mailOf(acc) });
      case 'POST /api/mail/claim': return await saveOp(req, res, acc, (d) => market.claim(acc, d));
      case 'POST /api/trade/lock': return await saveOp(req, res, acc, (d, b) => tradeLock(acc, d, b));
      // ---- bang hội ----
      case 'GET /api/guild': return json(res, 200, { guild: guilds.detail(acc.id) });
      case 'GET /api/guild/list': return json(res, 200, guilds.list(acc.id, { page: +url.searchParams.get('page') || 0, q: url.searchParams.get('q') || '' }));
      case 'GET /api/siege': return json(res, 200, siege.status(acc.id));
      case 'POST /api/siege/register': return await saveOp(req, res, acc, (S) => siege.register(acc.id, S));
      case 'POST /api/siege/_debug': { // chỉ khi bật SIEGE_TEST=1 (thử nghiệm)
        if (!process.env.SIEGE_TEST) return json(res, 404, { error: 'not_found' });
        const b = await readBody(req, 2048);
        siege.debugStart(b.def || null, Array.isArray(b.att) ? b.att : [], +b.sec || 0, +b.gateHp || 0);
        return json(res, 200, { ok: true });
      }
      case 'POST /api/guild/fund': { // bang chủ phát quỹ bang (thuế chợ) chia đều cho thành viên qua thư
        const r = guilds.takeFund(acc.id), share = Math.floor(r.amount / r.ids.length);
        for (const a of r.ids) market.mail(a, '🏯 Chia quỹ bang giữ thành: ' + share.toLocaleString('vi-VN') + ' Zen.', { items: [], jewels: {}, zen: share });
        guilds.addFund(r.gid, r.amount - share * r.ids.length);
        return json(res, 200, { ok: true, amount: r.amount, share, guild: guilds.detail(acc.id) });
      }
      case 'GET /api/gboss': return json(res, 200, gboss.status(acc.id));
      case 'GET /api/auction': return json(res, 200, gboss.lots(acc.id, url.searchParams.get('scope') === 'world' ? 'world' : 'guild'));
      case 'POST /api/auction/bid': return await saveOp(req, res, acc, (S, b) => gboss.bid(acc.id, S, String(b.id || ''), b.amount));
      case 'POST /api/guild/create': return await saveOp(req, res, acc, (S, b) => guilds.create(acc.id, S, b.name));
      case 'POST /api/guild/quest': return await saveOp(req, res, acc, (S, b) => {
        if (!guilds.guildIdOf(acc.id)) throw new TradeError('Anh chưa vào bang hội nào.');
        const r = claimGuildQ(String(b.id || ''));
        if (!r) throw new TradeError('Nhiệm vụ chưa hoàn thành hoặc đã nhận.');
        return { ...guilds.addPts(acc.id, S, r.pts), all: r.all };
      });
      case 'POST /api/guild/donate': return await saveOp(req, res, acc, (S, b) => guilds.donate(acc.id, S, b));
      case 'POST /api/guild/apply': case 'POST /api/guild/cancel': case 'POST /api/guild/accept': case 'POST /api/guild/reject': case 'POST /api/guild/kick':
      case 'POST /api/guild/role': case 'POST /api/guild/transfer': case 'POST /api/guild/leave': case 'POST /api/guild/disband': case 'POST /api/guild/notice': {
        if (limited('g:' + acc.id, 40, 60000)) return json(res, 429, { error: 'rate', message: 'Thao tác quá nhanh, chờ một chút.' });
        const b = await readBody(req, 2048), who = String(b.acc || ''), op = url.pathname.slice('/api/guild/'.length);
        switch (op) {
          case 'apply': guilds.apply(acc.id, String(b.id || '')); break;
          case 'cancel': guilds.cancelApp(acc.id, String(b.id || '')); break;
          case 'accept': guilds.accept(acc.id, who); break;
          case 'reject': guilds.reject(acc.id, who); break;
          case 'kick': guilds.kick(acc.id, who); break;
          case 'role': guilds.setRole(acc.id, who, String(b.role || '')); break;
          case 'transfer': guilds.transfer(acc.id, who); break;
          case 'leave': guilds.leave(acc.id); break;
          case 'disband': guilds.disband(acc.id); break;
          case 'notice': guilds.setNotice(acc.id, b.text); break;
        }
        return json(res, 200, { ok: true, guild: guilds.detail(acc.id) });
      }
      case 'POST /api/password': {
        const b = await readBody(req, 4096);
        accounts.changePassword(acc, b.old, b.pass, token);
        return json(res, 200, { ok: true });
      }
    }
  } catch (e) {
    if (e instanceof AuthError) return json(res, e.status, { error: e.code, message: e.message });
    if (e instanceof TradeError) return json(res, e.status, { error: 'trade', message: e.message });
    throw e;
  }
  return json(res, 404, { error: 'not_found' });
}

/**
 * Thao tác có sửa bản lưu: client gửi bản lưu hiện tại + rev. Đúng rev → chạy fn(d) (có thể ném TradeError, khi đó
 * chưa có gì thay đổi) → lưu bản mới (rev+1) → trả về { rev, delta, ... } để client áp dụng y hệt.
 */
async function saveOp(req, res, acc, fn) {
  if (limited('op:' + acc.id, 60, 60000)) return json(res, 429, { error: 'rate', message: 'Thao tác quá nhanh, chờ một chút.' });
  const b = await readBody(req, 16 * 1024);
  if (!host.get(acc.id)) return json(res, 409, { error: 'not_playing', message: 'Hãy vào game rồi thử lại.' });
  // chạy trên nhân vật thật đang chơi trên máy chủ — không nhận dữ liệu nhân vật từ máy người chơi
  const { r, patch } = host.withAcc(acc.id, (S) => fn(S, b));
  const { delta, ...rest } = r || {};
  return json(res, 200, { ok: true, ...rest, s: patch });
}

// ---------------- QUẢN TRỊ ----------------
// Bật bằng biến môi trường ADMIN_PASSWORD. Trang quản trị: /admin
const adminTokens = new Map(); // token -> hết hạn
const ADMIN_TTL = 12 * 36e5;
const sameSecret = (a, b) => { const x = crypto.createHash('sha256').update(String(a)).digest(), y = crypto.createHash('sha256').update(String(b)).digest(); return crypto.timingSafeEqual(x, y); };
const onlineOf = (accId) => [...sessions.values()].filter((s) => s.p && s.p.acc === accId);
const kick = (list, text) => { for (const s of list) { out(s.ws, { t: 'sys', text, private: true }); s.ws.close(4003, 'kicked'); } };
function accRow(a) {
  return { id: a.id, user: a.user, created: a.created, lastLogin: a.lastLogin, saveAt: a.saveAt, summary: a.summary, banned: !!a.banned, banReason: a.banReason || '', online: onlineOf(a.id).length > 0 };
}
function accDetail(a) {
  const sv = accounts.getSave(a), d = sv && sv.data, p = store.findByAccount(a.id);
  const eq = d && d.equip ? Object.values(d.equip).filter(Boolean).map((it) => ({ slot: it.slot, tier: it.tier, plus: it.plus, exc: !!it.exc })) : [];
  return {
    ...accRow(a), sessions: accounts.sessionCount(a), rev: a.rev,
    save: d ? { name: d.name, cls: d.cls, lv: d.lv, resets: d.resets, tier: d.tier, zen: d.zen, jewels: d.jewels, kills: d.kills, map: d.map, tower: d.tower && d.tower.best, inv: (d.inv || []).length, equip: eq, bytes: JSON.stringify(d).length } : null,
    profile: p ? { id: p.id, name: p.name, lv: p.lv, resets: p.resets, tower: p.tower, power: p.power, lastSeen: p.lastSeen } : null,
  };
}
async function adminApi(req, res, url) {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
  if (!ADMIN_PASSWORD) return json(res, 503, { error: 'disabled', message: ADMIN_WEAK ? 'Mật khẩu quản trị quá yếu hoặc chưa đổi mật khẩu mẫu. Đặt ADMIN_PASSWORD ít nhất 10 ký tự rồi khởi động lại.' : 'Chưa bật quản trị. Đặt biến môi trường ADMIN_PASSWORD (ít nhất 10 ký tự) rồi khởi động lại máy chủ.' });
  const route = req.method + ' ' + url.pathname, ip = ipOf(req);
  if (route === 'POST /api/admin/login') {
    if (limited('admin:' + ip, 10, 10 * 60000)) return json(res, 429, { error: 'rate', message: 'Thử quá nhiều lần, chờ 10 phút.' });
    const b = await readBody(req, 2048);
    if (!sameSecret(b.pass || '', ADMIN_PASSWORD)) return json(res, 401, { error: 'wrong', message: 'Sai mật khẩu quản trị.' });
    const t = crypto.randomBytes(32).toString('hex');
    adminTokens.set(t, Date.now() + ADMIN_TTL);
    console.log('[admin] đăng nhập từ ' + ip);
    return json(res, 200, { token: t });
  }
  const t = bearer(req), exp = t && adminTokens.get(t);
  if (!exp || exp < Date.now()) { if (t) adminTokens.delete(t); return json(res, 401, { error: 'auth', message: 'Phiên quản trị hết hạn, đăng nhập lại.' }); }
  try {
    if (route === 'POST /api/admin/logout') { adminTokens.delete(t); return json(res, 200, { ok: true }); }
    if (route === 'GET /api/admin/stats') {
      const all = accounts.list(), day = Date.now() - 864e5, week = Date.now() - 7 * 864e5;
      return json(res, 200, {
        accounts: all.length, withChar: all.filter((a) => a.summary).length, banned: all.filter((a) => a.banned).length,
        active1d: all.filter((a) => a.lastLogin > day || a.saveAt > day).length, active7d: all.filter((a) => a.lastLogin > week || a.saveAt > week).length,
        profiles: store.all().length, online: [...sessions.values()].filter((s) => s.p).length,
        market: market.adminStats(), guilds: guilds.stats(), gboss: gboss.stats(), siege: siege.stats(), trades: trades.size, host: host.load(), backups: backups.list(), backupEvery: +process.env.BACKUP_HOURS || 24, backupKeep: +process.env.BACKUP_KEEP || 14, uptime: Math.round(process.uptime()),
      });
    }
    if (route === 'GET /api/admin/accounts') {
      const q = (url.searchParams.get('q') || '').toLowerCase().trim(), sort = url.searchParams.get('sort') || 'recent';
      let list = accounts.list();
      if (q) list = list.filter((a) => a.ul.includes(q) || (a.summary && a.summary.name.toLowerCase().includes(q)) || a.id === q);
      const key = { recent: (a) => -(Math.max(a.lastLogin || 0, a.saveAt || 0)), level: (a) => -((a.summary ? a.summary.resets * 1000 + a.summary.lv : 0)), created: (a) => -a.created }[sort] || ((a) => 0);
      list.sort((a, b) => key(a) - key(b));
      const page = Math.max(0, +url.searchParams.get('page') || 0), per = 30;
      return json(res, 200, { total: list.length, page, per, rows: list.slice(page * per, page * per + per).map(accRow) });
    }
    if (route === 'GET /api/admin/online') {
      return json(res, 200, { rows: [...sessions.values()].filter((s) => s.p).map((s) => ({ pid: s.p.id, name: s.p.name, lv: s.p.lv, resets: s.p.resets, acc: s.p.acc ? (accounts.get(s.p.acc) || {}).user : null, room: s.room })) });
    }
    // ---- Công thành chiến ----
    if (route === 'GET /api/admin/siege') return json(res, 200, siege.adminView());
    if (route === 'POST /api/admin/siege/cancel-reg') { const b = await readBody(req, 2048); siege.adminCancelReg(String(b.gid || '')); return json(res, 200, siege.adminView()); }
    if (route === 'POST /api/admin/siege/start') { siege.adminForceStart(); return json(res, 200, siege.adminView()); }
    if (route === 'POST /api/admin/siege/cancel-battle') { siege.adminCancelBattle(); return json(res, 200, siege.adminView()); }
    if (route === 'POST /api/admin/siege/owner') {
      const b = await readBody(req, 2048), name = cleanText(b.name, 20);
      const gid = name ? guilds.idByName(name) : null;
      if (name && !gid) return json(res, 404, { error: 'not_found', message: 'Không tìm thấy bang tên "' + name + '".' });
      siege.adminSetOwner(gid); return json(res, 200, siege.adminView());
    }
    if (route === 'POST /api/admin/backup') return json(res, 200, { name: backups.run('manual'), list: backups.list() });
    if (route === 'POST /api/admin/announce') {
      const b = await readBody(req, 4096), text = cleanText(b.text, 200);
      if (!text) return json(res, 400, { error: 'empty', message: 'Nội dung trống.' });
      toAll({ t: 'sys', text: '📣 [Quản trị] ' + text });
      return json(res, 200, { ok: true, sent: sessions.size });
    }
    let m = url.pathname.match(/^\/api\/admin\/backup\/(kng-\d{8}-\d{6}\.json\.gz)$/);
    if (m && req.method === 'GET') {
      const f = backups.filePath(m[1]);
      if (!f) return json(res, 404, { error: 'not_found' });
      res.writeHead(200, { 'Content-Type': 'application/gzip', 'Content-Disposition': 'attachment; filename="' + m[1] + '"' });
      return res.end(fs.readFileSync(f));
    }
    m = url.pathname.match(/^\/api\/admin\/player\/([0-9a-f]{12})\/(ban|unban|kick)$/);
    if (m && req.method === 'POST') { // hồ sơ trực tuyến (kể cả khách không tài khoản)
      const p = store.get(m[1]);
      if (!p) return json(res, 404, { error: 'not_found', message: 'Không tìm thấy người chơi.' });
      const b = await readBody(req, 2048), list = [...sessions.values()].filter((s) => s.p === p);
      if (m[2] === 'kick') { kick(list, 'Anh đã bị quản trị ngắt kết nối.'); return json(res, 200, { ok: true }); }
      store.update(p, { banned: m[2] === 'ban', banReason: m[2] === 'ban' ? cleanText(b.reason, 120) : '' });
      if (m[2] === 'ban') kick(list, 'Nhân vật đã bị khoá.');
      rankCache = null;
      return json(res, 200, { ok: true });
    }
    m = url.pathname.match(/^\/api\/admin\/account\/([0-9a-f]{16})(?:\/([a-z-]+))?$/);
    if (m) {
      const a = accounts.get(m[1]);
      if (!a) return json(res, 404, { error: 'not_found', message: 'Không tìm thấy tài khoản.' });
      const act = m[2] || '';
      if (req.method === 'GET' && !act) return json(res, 200, accDetail(a));
      if (req.method === 'GET' && act === 'save') {
        const sv = accounts.getSave(a);
        if (!sv) return json(res, 404, { error: 'no_save', message: 'Tài khoản chưa có nhân vật.' });
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="' + a.user + '-save.json"' });
        return res.end(JSON.stringify(sv.data, null, 1));
      }
      if (req.method === 'POST') {
        const b = await readBody(req, 4096);
        if (act === 'password') { accounts.setPassword(a, String(b.pass || '')); kick(onlineOf(a.id), 'Mật khẩu tài khoản đã được đặt lại.'); console.log('[admin] đặt lại mật khẩu ' + a.user); return json(res, 200, { ok: true }); }
        if (act === 'gift') { // quà / đền bù: gửi vào hộp thư (tự nhận nếu đang chơi)
          const g = cleanGoods({ zen: b.zen, jewels: b.jewels, items: b.items });
          if (market.emptyGoods(g)) return json(res, 400, { error: 'empty', message: 'Chưa nhập quà.' });
          market.mail(a.id, '🎁 Quà từ quản trị' + (b.note ? ': ' + cleanText(b.note, 80) : '') + ' — ' + goodsText(g) + '.', g);
          console.log('[admin] tặng ' + a.user + ': ' + goodsText(g));
          return json(res, 200, { ok: true });
        }
        if (act === 'logout-all') { accounts.logoutAll(a); kick(onlineOf(a.id), 'Tài khoản đã bị đăng xuất khỏi mọi thiết bị.'); return json(res, 200, { ok: true }); }
        if (act === 'ban' || act === 'unban') {
          const ban = act === 'ban', reason = cleanText(b.reason, 120);
          accounts.setBanned(a, ban, reason);
          const p = store.findByAccount(a.id);
          if (p) store.update(p, { banned: ban, banReason: ban ? reason : '' });
          if (ban) kick(onlineOf(a.id), 'Tài khoản đã bị khoá' + (reason ? ': ' + reason : '') + '.');
          rankCache = null;
          console.log('[admin] ' + (ban ? 'khoá ' : 'mở khoá ') + a.user + (reason ? ' — ' + reason : ''));
          return json(res, 200, accDetail(a));
        }
      }
    }
  } catch (e) {
    if (e instanceof AuthError) return json(res, e.status, { error: e.code, message: e.message });
    if (e instanceof TradeError) return json(res, e.status, { error: 'admin', message: e.message });
    throw e;
  }
  return json(res, 404, { error: 'not_found' });
}

// ---------------- TRẠNG THÁI ----------------
const sessions = new Map();   // ws -> session
const rooms = new Map();      // room -> Set<session>
const chatLog = [];           // lịch sử chat gần nhất
let rankCache = null, rankAt = 0;
const rank = () => { if (!rankCache || Date.now() - rankAt > 10000) { rankCache = buildRank(store.all().filter((p) => !p.banned && p.acc)); rankAt = Date.now(); } return rankCache; }; // chỉ tài khoản (máy chủ tự tính chỉ số); khách tự báo chỉ số nên không xếp hạng

const out = (ws, msg) => { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); };
const toAll = (msg) => { const s = JSON.stringify(msg); for (const ws of sessions.keys()) if (ws.readyState === 1) ws.send(s); };
const toRoom = (room, msg, except) => { const set = rooms.get(room); if (!set) return; const s = JSON.stringify(msg); for (const ss of set) if (ss !== except && ss.ws.readyState === 1) ss.ws.send(s); };

/** Thông tin công khai của 1 người chơi (gửi cho người khác) */
const pub = (s) => ({ id: s.p.id, name: s.p.name, lv: s.p.lv, resets: s.p.resets, look: s.look, ...s.pos });

function joinRoom(s, room, pos) {
  if (s.room === room) return;
  if (s.trade) cancelTradeOf(s, s.p ? s.p.name + ' đã rời bản đồ.' : 'Giao dịch bị huỷ.');
  if (s.room) { rooms.get(s.room)?.delete(s); toRoom(s.room, { t: 'pleave', id: s.p.id }); }
  s.room = room;
  if (pos) s.pos = pos;
  if (!room) return;
  if (!rooms.has(room)) rooms.set(room, new Set());
  const set = rooms.get(room);
  out(s.ws, { t: 'snapshot', room, players: [...set].map(pub) });
  set.add(s);
  toRoom(room, { t: 'pjoin', p: pub(s) }, s);
}

function leave(s) {
  clearTimeout(s.helloTimer);
  host.leave(s);
  if (s.trade) cancelTradeOf(s, (s.p ? s.p.name : 'Người chơi') + ' đã thoát game.');
  sessions.delete(s.ws);
  if (!s.p) return;
  joinRoom(s, null);
  store.update(s.p, {});
  toAll({ t: 'online', n: sessions.size });
}


// ---------------- GIAO DỊCH TRỰC TIẾP ----------------
// Mời → chấp nhận → mỗi bên chọn đồ/ngọc/Zen (xem trước) → KHOÁ (máy chủ giữ đồ) → cả hai XÁC NHẬN → đồ sang hộp thư bên kia.
const trades = new Map(); // id -> { id, s:[sA,sB], offer:[g,g], locked:[f,f], conf:[f,f], state:'invite'|'open', at }
const TRADE_INVITE_MS = 30000, TRADE_OPEN_MS = 5 * 60000;
const tSide = (T, s) => T.s.indexOf(s);
function tradeState(T) {
  T.s.forEach((s, i) => out(s.ws, { t: 'tstate', id: T.id, me: i, sides: T.s.map((x, j) => ({ name: x.p.name, lv: x.p.lv, offer: T.offer[j], locked: T.locked[j], conf: T.conf[j] })) }));
}
function tradeClose(T, reason, done = false) {
  if (!trades.has(T.id)) return;
  trades.delete(T.id);
  const esc = market.escrowTake(T.id);
  if (!done) esc.forEach((e) => { if (e && !market.emptyGoods(e.goods)) market.mail(e.acc, 'Giao dịch bị huỷ — trả lại: ' + goodsText(e.goods) + '.', e.goods); });
  for (const s of T.s) { if (s.trade === T.id) s.trade = null; out(s.ws, { t: 'tclosed', id: T.id, reason, done }); }
}
function tradeExecute(T) {
  const esc = market.escrowTake(T.id);
  for (let i = 0; i < 2; i++) {
    const from = esc[i], to = esc[1 - i];
    if (!from || !to) continue;
    const g = { ...from.goods, items: from.goods.items.slice(), jewels: { ...from.goods.jewels } };
    const fee = Math.floor((g.zen || 0) * MARKET.tradeFee);
    g.zen = (g.zen || 0) - fee;
    const text = 'Giao dịch với ' + T.s[i].p.name + ' thành công — nhận: ' + (goodsText(g) || 'không có gì') + (fee ? ' (phí 2%: ' + fee.toLocaleString('vi-VN') + ' Zen)' : '') + '.';
    market.mail(to.acc, text, g);
  }
  console.log('[trade] ' + T.s[0].p.name + ' ⇄ ' + T.s[1].p.name + ': ' + (goodsText(esc[0].goods) || '—') + ' ⇄ ' + (goodsText(esc[1].goods) || '—'));
  tradeClose(T, 'Giao dịch thành công!', true);
}
/** HTTP /api/trade/lock: lấy đồ của bên này khỏi bản lưu, giữ ở máy chủ */
function tradeLock(acc, d, b) {
  const T = trades.get(String(b.id || ''));
  if (!T || T.state !== 'open') throw new TradeError('Giao dịch đã kết thúc.', 410);
  const i = T.s.findIndex((s) => s.p && s.p.acc === acc.id);
  if (i < 0) throw new TradeError('Anh không ở trong giao dịch này.', 403);
  if (T.locked[i]) throw new TradeError('Anh đã khoá rồi.');
  const goods = cleanGoods(b.goods);
  const { taken, delta } = takeGoodsSafe(d, goods);
  market.escrowPut(T.id, i, acc.id, taken);
  T.offer[i] = taken; T.locked[i] = true; T.conf = [false, false];
  tradeState(T);
  return { delta };
}
const takeGoodsSafe = (d, g) => { if (g.items.length + Object.keys(g.jewels).length === 0 && !g.zen) return { taken: g, delta: { zen: 0, jewels: {}, add: [], remove: [] } }; return takeGoodsFn(d, g); };
setInterval(() => {
  const now = Date.now();
  for (const T of trades.values()) if (now - T.at > (T.state === 'invite' ? TRADE_INVITE_MS : TRADE_OPEN_MS)) tradeClose(T, T.state === 'invite' ? 'Lời mời đã hết hạn.' : 'Giao dịch quá lâu, đã tự huỷ.');
}, 5000);
const TRADE_HANDLERS = {
  tinvite(s, m) {
    if (!s.p.acc) return out(s.ws, { t: 'sys', text: 'Cần đăng nhập tài khoản để giao dịch.', private: true });
    if (s.trade) return out(s.ws, { t: 'sys', text: 'Anh đang trong một giao dịch khác.', private: true });
    const o = [...sessions.values()].find((x) => x.p && x.p.id === m.pid);
    if (!o || o === s) return out(s.ws, { t: 'sys', text: 'Người chơi này không còn online.', private: true });
    if (!o.p.acc) return out(s.ws, { t: 'sys', text: o.p.name + ' chưa đăng nhập tài khoản nên chưa giao dịch được.', private: true });
    if (o.p.acc === s.p.acc) return;
    if (!s.room || o.room !== s.room) return out(s.ws, { t: 'sys', text: 'Cần đứng cùng bản đồ để giao dịch.', private: true });
    if (o.trade) return out(s.ws, { t: 'sys', text: o.p.name + ' đang bận giao dịch khác.', private: true });
    const T = { id: crypto.randomBytes(6).toString('hex'), s: [s, o], offer: [cleanGoods(), cleanGoods()], locked: [false, false], conf: [false, false], state: 'invite', at: Date.now() };
    trades.set(T.id, T); s.trade = T.id;
    out(o.ws, { t: 'tinvite', id: T.id, from: { name: s.p.name, lv: s.p.lv } });
    out(s.ws, { t: 'sys', text: 'Đã gửi lời mời giao dịch tới ' + o.p.name + '.', private: true, info: true });
  },
  tanswer(s, m) {
    const T = trades.get(m.id);
    if (!T || T.state !== 'invite' || T.s[1] !== s) return;
    if (!m.ok) return tradeClose(T, s.p.name + ' đã từ chối giao dịch.');
    if (s.trade) return tradeClose(T, s.p.name + ' đang bận.');
    T.state = 'open'; T.at = Date.now(); s.trade = T.id;
    tradeState(T);
  },
  toffer(s, m) {
    const T = trades.get(m.id), i = T ? tSide(T, s) : -1;
    if (i < 0 || T.state !== 'open' || T.locked[i]) return;
    T.offer[i] = cleanGoods(m.goods); T.conf = [false, false];
    tradeState(T);
  },
  tconfirm(s, m) {
    const T = trades.get(m.id), i = T ? tSide(T, s) : -1;
    if (i < 0 || !T.locked[0] || !T.locked[1]) return;
    T.conf[i] = true;
    if (T.conf[0] && T.conf[1]) tradeExecute(T); else tradeState(T);
  },
  tcancel(s, m) { const T = trades.get(m.id); if (T && tSide(T, s) >= 0) tradeClose(T, s.p.name + ' đã huỷ giao dịch.'); },
};
const cancelTradeOf = (s, why) => { const T = s.trade && trades.get(s.trade); if (T) tradeClose(T, why); };

// ---------------- XỬ LÝ TIN NHẮN ----------------
const HANDLERS = {
  hello(s, m) {
    if (s.p) return;
    // Đã đăng nhập tài khoản → hồ sơ trực tuyến gắn với tài khoản (đổi máy vẫn giữ tên & xếp hạng)
    const acc = accounts.auth(m.auth);
    let p = acc ? store.findByAccount(acc.id) || store.findByToken(m.token) : store.findByToken(m.token);
    const byTok = store.findByToken(m.token);
    if (byTok && byTok.banned && !(acc && byTok.acc && byTok.acc !== acc.id)) p = byTok; // máy này đang dùng hồ sơ bị khoá → giữ để chặn
    else if (p && p.acc && (!acc || p.acc !== acc.id)) p = null; // hồ sơ của tài khoản khác
    // Chơi bằng tài khoản (máy chủ chạy game): tên lấy từ hồ sơ / nhân vật trên máy chủ, không theo máy người chơi
    const play = !!(m.play || m.create);
    if (play && !acc) { out(s.ws, { t: 'playerr', code: 'auth', message: 'Phiên đăng nhập đã hết hạn, hãy đăng nhập lại.' }); return s.ws.close(4001, 'auth'); }
    let name = cleanName(play ? (m.create ? m.create.name : p ? p.name : (accounts.getSave(acc) || { data: {} }).data.name) : m.name);
    if (!p || p.name !== name) {
      // Tên trùng với người khác → thêm số
      let base = name, k = 2;
      while (store.nameTaken(name, p && p.id)) name = (base.slice(0, LIMITS.nameLen - 2) + k++).slice(0, LIMITS.nameLen);
    }
    const fields = { name, cls: CLASSES.includes(m.look?.cls) ? m.look.cls : 'knight', ...cleanStats(m.stats), ...(acc ? { acc: acc.id } : {}) };
    if (p && p.banned) { out(s.ws, { t: 'sys', text: 'Nhân vật này đã bị khoá' + (p.banReason ? ': ' + p.banReason : '') + '.', private: true }); return s.ws.close(4003, 'banned'); }
    if (p) store.update(p, fields); else p = store.create(fields);
    s.p = p;
    s.look = cleanLook(m.look);
    clearTimeout(s.helloTimer);
    out(s.ws, { t: 'welcome', id: p.id, token: p.token, name: p.name, online: sessions.size, chat: chatLog.slice(-20), play });
    toAll({ t: 'online', n: sessions.size });
    if (play) {
      try { host.join(s, acc, m.create ? { cls: m.create.cls, name: p.name } : null); }
      catch (e) { out(s.ws, { t: 'playerr', code: e.code || 'error', message: e.message || 'Không vào được game.' }); if (!e.code) console.error('[host] join', e); }
    }
  },
  act(s, m) { host.action(s, m); },
  wipe(s) {
    const c = s.ctx; if (!c) return;
    host.leave(s, true);
    accounts.deleteSave(c.acc);
    out(s.ws, { t: 'wiped' });
  },
  room(s, m) { if (s.ctx) return; joinRoom(s, cleanRoom(m.room), cleanPos(m)); },
  move(s, m) { if (s.ctx) return;
    if (!s.room) return;
    const pos = cleanPos(m), now = Date.now(), dt = Math.max(0.05, (now - (s.moveAt || now)) / 1000);
    // Chống dịch chuyển bất thường: nhảy quá xa so với tốc độ tối đa thì bỏ qua (trừ khi hồi sinh về thị trấn)
    const jump = s.pos ? Math.hypot(pos.x - s.pos.x, pos.y - s.pos.y) : 0;
    if (s.pos && jump > LIMITS.maxSpeed * dt + 1 && !m.tp) return;
    s.pos = pos; s.moveAt = now; s.dirty = true;
  },
  look(s, m) { if (s.ctx) return; s.look = cleanLook(m.look); toRoom(s.room, { t: 'plook', id: s.p.id, look: s.look }, s); },
  stats(s, m) { if (s.ctx) return; store.update(s.p, cleanStats(m)); },
  chat(s, m) {
    const now = Date.now(), text = cleanText(m.text, LIMITS.chatLen);
    if (!text) return;
    if (now - (s.chatAt || 0) < LIMITS.chatCooldownMs) return out(s.ws, { t: 'sys', text: 'Bạn chat quá nhanh, chờ một chút nhé.', private: true });
    s.chatAt = now;
    const msg = { t: 'chat', id: s.p.id, from: s.p.name, cls: s.p.cls, lv: s.p.lv, text, ts: now };
    chatLog.push(msg); if (chatLog.length > LIMITS.chatHistory) chatLog.shift();
    toAll(msg);
  },
  ann(s, m) {
    if (s.ctx) return; // chế độ máy chủ: thông báo do máy chủ tự phát
    const f = ANNOUNCE[m.kind], now = Date.now();
    if (!f || now - (s.annAt || 0) < LIMITS.annCooldownMs) return;
    s.annAt = now;
    toAll({ t: 'sys', text: f(m.data || {}, s.p.name) });
  },
  gchat(s, m) {
    const acc = s.p.acc, gid = acc && guilds.guildIdOf(acc), text = cleanText(m.text, LIMITS.chatLen), now = Date.now();
    if (!gid || !text) return;
    if (now - (s.gchatAt || 0) < LIMITS.chatCooldownMs) return out(s.ws, { t: 'sys', text: 'Bạn chat quá nhanh, chờ một chút nhé.', private: true });
    s.gchatAt = now;
    const msg = { t: 'gchat', from: s.p.name, text, ts: now };
    guilds.chatPush(gid, msg);
    const ids = new Set(guilds.memberIds(gid));
    for (const o of sessions.values()) if (o.p && ids.has(o.p.acc)) out(o.ws, msg);
  },
  rank(s) { out(s.ws, { t: 'rank', rank: rank() }); },
  ping(s) { out(s.ws, { t: 'pong' }); },
  ...TRADE_HANDLERS,
};

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: LIMITS.msgBytes, perMessageDeflate: { threshold: 256, zlibDeflateOptions: { level: 3 } } }); // nén tin nhắn: giảm ~70% dung lượng mạng
wss.on('connection', (ws) => {
  const s = { ws, p: null, room: null, pos: null, look: null };
  sessions.set(ws, s);
  s.helloTimer = setTimeout(() => ws.close(4001, 'hello timeout'), LIMITS.helloTimeoutMs);
  ws.on('message', (buf) => {
    let m;
    try { m = JSON.parse(buf); } catch (e) { return; }
    const h = HANDLERS[m && m.t];
    if (!h || (!s.p && m.t !== 'hello')) return;
    try { h(s, m); } catch (e) { console.error('handler', m.t, e); }
  });
  ws.on('close', () => leave(s));
  ws.on('error', () => {});
});

// Gửi vị trí theo lô 10 lần/giây cho từng phòng
setInterval(() => {
  for (const [room, set] of rooms) {
    const list = [];
    for (const s of set) if (s.dirty) { s.dirty = false; list.push({ id: s.p.id, ...s.pos }); }
    if (list.length) toRoom(room, { t: 'moves', list });
  }
}, 100);

// Ngắt kết nối "chết" (mạng rớt mà không báo)
setInterval(() => { for (const ws of sessions.keys()) { if (ws.isAlive === false) { ws.terminate(); continue; } ws.isAlive = false; ws.ping(); } }, 30000);
wss.on('connection', (ws) => { ws.isAlive = true; ws.on('pong', () => (ws.isAlive = true)); });

const shutdown = () => { host.flushAll(); for (const T of [...trades.values()]) tradeClose(T, 'Máy chủ đang khởi động lại.'); store.flush(); accounts.flush(); market.flush(); guilds.flush(); gboss.flush(); siege.flush(); process.exit(0); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.listen(PORT, () => console.log('Kỷ Nguyên Huyền Thoại server: http://localhost:' + PORT + '  (WebSocket /ws)'));
