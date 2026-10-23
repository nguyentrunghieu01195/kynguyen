// Kết nối trực tuyến. Game vẫn chơi được bình thường khi không có máy chủ.
// Hiện tại máy chủ chỉ đồng bộ: hiện diện trên bản đồ, chat, thông báo, xếp hạng.
// Chiến đấu & đồ đạc vẫn chạy trên máy người chơi (bước sau sẽ chuyển lên server).
import { G } from '../core/state.js';
import { on, emit, EV, log } from '../core/events.js';
import { esc } from '../core/utils.js';
import { SLOTS } from '../config/items.js';
import { itemFull } from '../systems/items.js';
import { ACC } from './account.js';

const PREFS_KEY = 'kng_net', TOKEN_KEY = 'kng_net_token';
const loadPrefs = () => { try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch (e) { return {}; } };
const savePrefs = (p) => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch (e) { /* bỏ qua */ } };
const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } };
const setToken = (t) => { try { localStorage.setItem(TOKEN_KEY, t); } catch (e) { /* bỏ qua */ } };

/** Địa chỉ mặc định: cùng máy chủ đang phục vụ trang game */
export const defaultUrl = () => (location.protocol.startsWith('http') ? (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws' : '');

export const NET = {
  status: 'off',        // off | connecting | online
  id: null, name: null, online: 0,
  players: new Map(),   // người chơi khác cùng phòng: id -> { name, lv, look, x, y, sx, sy, face, moving }
  chat: [], rank: null,
  room: undefined,
  prefs: { url: '', auto: false },
};

let ws = null, retry = 0, retryTimer = null, manualClose = false;
let moveT = 0, statsT = 0, lastLookSig = '', lastStatsSig = '', lastSent = null;

const send = (m) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); };
export const sendRaw = send;
const EXTRA = {};
/** Thêm bộ xử lý tin nhắn từ máy chủ (dùng cho chế độ máy chủ — net/remote.js) */
export const registerRecv = (h) => Object.assign(EXTRA, h);
const setStatus = (s) => { NET.status = s; G.online = s === 'online'; emit(EV.NET); };

// ---------------- DỮ LIỆU GỬI LÊN ----------------
import { lookOf, powerOf } from './look.js';
export { lookOf, powerOf };
const statsOf = () => ({ lv: G.S.lv, resets: G.S.resets, tower: (G.S.tower && G.S.tower.best) || 0, power: powerOf(G.P) });

// ---------------- KẾT NỐI ----------------
let connOpts = {};
export const setConnectOpts = (o) => { connOpts = o || {}; };
/** opts.play = vào game bằng tài khoản (máy chủ chạy game); opts.create = { cls, name } tạo nhân vật mới */
export function connect(url, opts) {
  if (opts) connOpts = opts;
  url = url || NET.prefs.url || defaultUrl();
  if (!url || (!G.S && !connOpts.play)) return false;
  disconnect(true);
  manualClose = false;
  NET.prefs.url = url; savePrefs(NET.prefs);
  setStatus('connecting');
  try { ws = new WebSocket(url); } catch (e) { setStatus('off'); log('Địa chỉ máy chủ không hợp lệ.', '#f88'); return false; }
  ws.onopen = () => {
    retry = 0;
    if (connOpts.play) send({ t: 'hello', token: getToken(), auth: ACC.token || undefined, play: true, create: connOpts.create });
    else send({ t: 'hello', token: getToken(), auth: ACC.token || undefined, name: G.S.name, look: lookOf(G.S), stats: statsOf() });
  };
  ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (er) { return; } const h = RECV[m.t] || EXTRA[m.t]; if (h) h(m); };
  ws.onclose = (ev) => {
    const was = NET.status;
    if (ev && (ev.code === 4003 || ev.code === 4004 || ev.code === 4001)) manualClose = true; // bị khoá / bị quản trị ngắt → không tự kết nối lại
    ws = null; NET.players.clear(); NET.room = undefined; setStatus('off');
    if (manualClose) return;
    if (was === 'online') log('Mất kết nối máy chủ — đang thử kết nối lại…', '#f88');
    retryTimer = setTimeout(() => connect(url), Math.min(connOpts.play ? 8000 : 30000, 1500 * 2 ** retry++));
  };
  return true;
}
export function disconnect(silent) {
  manualClose = true;
  clearTimeout(retryTimer);
  if (ws) { try { ws.close(); } catch (e) { /* bỏ qua */ } ws = null; }
  NET.players.clear(); NET.room = undefined;
  if (!silent) setStatus('off');
}
export function setAuto(v) { NET.prefs.auto = !!v; savePrefs(NET.prefs); }

// ---------------- NHẬN TỪ MÁY CHỦ ----------------
const toRemote = (p) => ({ ...p, sx: p.x, sy: p.y, face: p.f || 1, moving: !!p.mv });
const RECV = {
  welcome(m) {
    NET.id = m.id; NET.name = m.name; NET.online = m.online; setToken(m.token);
    NET.chat = m.chat || [];
    setStatus('online');
    log('🟢 Đã kết nối máy chủ — ' + m.online + ' người đang trực tuyến.', '#8f8');
    if (G.S && !m.play && m.name !== G.S.name) log('Tên <b>' + esc(G.S.name) + '</b> đã có người dùng, trên máy chủ anh hiển thị là <b>' + esc(m.name) + '</b>.', '#ffb070');
    lastLookSig = ''; lastStatsSig = '';
  },
  online(m) { NET.online = m.n; },
  snapshot(m) { NET.players.clear(); for (const p of m.players) if (p.id !== NET.id) NET.players.set(p.id, toRemote(p)); },
  pjoin(m) { if (m.p.id !== NET.id) NET.players.set(m.p.id, toRemote(m.p)); },
  pleave(m) { NET.players.delete(m.id); },
  plook(m) { const p = NET.players.get(m.id); if (p) p.look = m.look; },
  moves(m) {
    for (const u of m.list) {
      if (u.id === NET.id) continue;
      const p = NET.players.get(u.id);
      if (!p) continue;
      if (Math.hypot(u.x - p.x, u.y - p.y) > 6) { p.x = u.x; p.y = u.y; } // nhảy xa (hồi sinh) → đặt thẳng
      p.sx = u.x; p.sy = u.y; p.tx = u.tx; p.ty = u.ty; p.face = u.f; p.moving = u.mv;
    }
  },
  chat(m) {
    NET.chat.push(m); if (NET.chat.length > 50) NET.chat.shift();
    if (m.id !== NET.id) NET.unread = (NET.unread || 0) + 1;
    log('<span style="color:#7fe0ff">[Thế giới] ' + esc(m.from) + ':</span> ' + esc(m.text), '#e8f8ff');
    emit(EV.CHAT, m);
  },
  sys(m) { if (m.info) { log(esc(m.text), '#9fd0ff'); return; } log((m.private ? '' : '📢 ') + esc(m.text), m.private ? '#f88' : '#ffd54a'); if (!m.private) { NET.chat.push({ sys: true, text: m.text, ts: Date.now() }); emit(EV.CHAT, m); } },
  rank(m) { NET.rank = m.rank; emit(EV.NET); },
  // ---- giao dịch trực tiếp ----
  tinvite(m) { NET.tradeInvite = { id: m.id, from: m.from, at: Date.now() }; emit(EV.TRADE, 'invite'); },
  tstate(m) { NET.trade = { id: m.id, me: m.me, sides: m.sides }; NET.tradeInvite = null; emit(EV.TRADE, 'state'); },
  tclosed(m) {
    const was = NET.trade && NET.trade.id === m.id;
    if (NET.tradeInvite && NET.tradeInvite.id === m.id) NET.tradeInvite = null;
    if (was || m.done) NET.trade = null;
    log((m.done ? '🤝 ' : '✖ ') + esc(m.reason), m.done ? '#8f8' : '#ffb070');
    emit(EV.TRADE, 'closed', m);
  },
  mail() { emit(EV.MAIL); },
  pong() {},
};

// ---------------- GỬI ĐỊNH KỲ (gọi mỗi khung hình) ----------------
export function netTick(dt) {
  // Nội suy vị trí người chơi khác cho mượt
  for (const p of NET.players.values()) {
    const k = Math.min(1, dt * 8);
    p.x += (p.sx - p.x) * k; p.y += (p.sy - p.y) * k;
    p.t = (p.t || 0) + dt;
  }
  if (NET.status !== 'online' || !G.R || connOpts.play) return; // chế độ máy chủ: máy chủ tự biết vị trí / ngoại hình
  const R = G.R, p = R.p;
  const room = R.event ? null : 'm' + R.mapIndex;
  if (room !== NET.room) { NET.room = room; NET.players.clear(); send({ t: 'room', room, x: p.x, y: p.y, f: p.face }); lastSent = null; }
  if ((moveT -= dt) <= 0 && room) {
    moveT = 0.2;
    const cur = { x: +p.x.toFixed(2), y: +p.y.toFixed(2), f: p.face, mv: p.moving };
    if (!lastSent || Math.abs(cur.x - lastSent.x) > 0.04 || Math.abs(cur.y - lastSent.y) > 0.04 || cur.mv !== lastSent.mv || cur.f !== lastSent.f) {
      send({ t: 'move', ...cur, tp: lastSent && Math.hypot(cur.x - lastSent.x, cur.y - lastSent.y) > 5 });
      lastSent = cur;
    }
  }
  if ((statsT -= dt) <= 0) {
    statsT = 5;
    const look = lookOf(G.S), lsig = JSON.stringify(look);
    if (lsig !== lastLookSig) { lastLookSig = lsig; send({ t: 'look', look }); }
    const st = statsOf(), ssig = JSON.stringify(st);
    if (ssig !== lastStatsSig) { lastStatsSig = ssig; send({ t: 'stats', ...st }); }
  }
}

export const sendChat = (text) => { text = String(text || '').trim(); if (!text) return false; send({ t: 'chat', text }); return true; };
export const requestRank = () => send({ t: 'rank' });
/** Giao dịch trực tiếp: tinvite {pid} · tanswer {id, ok} · toffer {id, goods} · tconfirm {id} · tcancel {id} */
export const sendTrade = (t, data) => { if (NET.status !== 'online') return false; send({ t, ...data }); return true; };
const announce = (kind, data) => NET.status === 'online' && send({ t: 'ann', kind, data });

// ---------------- KHỞI TẠO ----------------
let inited = false;
export function initNet() {
  if (inited) return;
  inited = true;
  NET.prefs = { url: '', auto: location.protocol.startsWith('http'), ...loadPrefs() };
  // Báo thành tích nổi bật cho cả máy chủ
  on(EV.UPGRADE, (outcome, it) => { if (outcome === 'success' && it.plus >= 9) announce('upgrade', { item: itemFull(it) }); });
  on(EV.CRAFT, (ok, tier) => { if (ok && tier >= 2) announce('wings', { name: G.S.equip.wings ? itemFull(G.S.equip.wings) : '' }); });
  on(EV.TOWER_FLOOR, (n, first) => { if (first && n % 5 === 0) announce('tower', { floor: n }); });
  on(EV.KILL, (m) => { if (m.boss && !m.event) announce('boss', { boss: m.name }); });
  on(EV.RESET, (n) => announce('reset', { n }));
  on(EV.EVENT, (id, ok) => { if (ok) announce('event', { id }); });
}

/** Gọi khi vào game: tự kết nối nếu được bật */
export function autoConnect() { if (NET.prefs.auto && (NET.prefs.url || defaultUrl())) connect(); }
