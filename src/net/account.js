// Tài khoản & lưu game trên máy chủ (đám mây).
// - Đăng ký / đăng nhập qua HTTP API của máy chủ game (server/src/index.js → /api/*)
// - Bản lưu vẫn ghi vào máy (localStorage, ô riêng theo tài khoản) và được đẩy lên máy chủ định kỳ.
// - Mỗi lần lưu thành công máy chủ tăng "rev". Thiết bị nào lưu với rev cũ → xung đột → hỏi người chơi giữ bản nào.
import { G } from '../core/state.js';
import { emit, EV, log } from '../core/events.js';
import { esc } from '../core/utils.js';
import { saveGame, setSaveSlot } from '../core/save.js';
import { NET } from './client.js';
import { isRemote } from './actions.js';

const ACC_KEY = 'kng_acc';
const load = () => { try { return JSON.parse(localStorage.getItem(ACC_KEY)) || {}; } catch (e) { return {}; } };
const persist = () => { try { localStorage.setItem(ACC_KEY, JSON.stringify({ user: ACC.user, token: ACC.token, rev: ACC.rev, base: ACC.base })); } catch (e) { /* bỏ qua */ } };

export const ACC = {
  user: null, token: null,
  rev: 0,                 // rev của bản lưu trên máy chủ mà máy này đang dựa vào
  base: '',               // địa chỉ máy chủ (http/https) nếu người chơi tự nhập
  status: 'guest',        // guest | idle | saving | synced | offline | conflict | expired
  lastSync: 0, conflict: null, error: '',
};
export const loggedIn = () => !!(ACC.user && ACC.token);

/** Địa chỉ HTTP của máy chủ: tự nhập → theo địa chỉ WebSocket đã lưu → chính trang đang mở */
export function apiBase() {
  if (ACC.base) return ACC.base.replace(/\/+$/, '');
  const u = NET.prefs && NET.prefs.url;
  if (u && /^wss?:\/\//.test(u)) return u.replace(/^ws/, 'http').replace(/\/ws\/?$/, '');
  return location.protocol.startsWith('http') ? location.origin : '';
}
/** Chuẩn hoá địa chỉ người chơi nhập: "game.vd.com" → "https://game.vd.com" */
export function setServer(addr) {
  addr = String(addr || '').trim();
  if (addr && !/^https?:\/\//i.test(addr)) addr = (/^(localhost|127\.|192\.168\.|10\.)/.test(addr) ? 'http://' : 'https://') + addr;
  ACC.base = addr.replace(/\/ws\/?$/, '').replace(/\/+$/, '');
  if (ACC.base && NET.prefs) { NET.prefs.url = ACC.base.replace(/^http/, 'ws') + '/ws'; NET.prefs.auto = true; try { localStorage.setItem('kng_net', JSON.stringify(NET.prefs)); } catch (e) { /* bỏ qua */ } }
  persist();
}

async function req(method, path, body, opts = {}) {
  const base = apiBase();
  if (!base) throw { status: 0, message: 'Chưa có địa chỉ máy chủ. Hãy nhập địa chỉ máy chủ game.' };
  let r;
  try {
    r = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(ACC.token ? { Authorization: 'Bearer ' + ACC.token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      keepalive: !!opts.keepalive,
    });
  } catch (e) { throw { status: 0, message: 'Không kết nối được máy chủ. Kiểm tra mạng hoặc địa chỉ máy chủ.' }; }
  let j = {};
  try { j = await r.json(); } catch (e) { /* không phải JSON */ }
  if (!r.ok) {
    if (r.status === 401 && ACC.token && path !== '/api/login') { ACC.status = 'expired'; emit(EV.NET); }
    if (!j.error) throw { status: r.status, noServer: true, message: 'Địa chỉ này không có máy chủ game (' + r.status + '). Hãy nhập đúng địa chỉ máy chủ.' };
    throw { status: r.status, message: j.message || 'Lỗi máy chủ (' + r.status + ').', ...j };
  }
  return j;
}

function setSession(j) {
  ACC.user = j.user; ACC.token = j.token; ACC.rev = 0; ACC.status = 'idle'; ACC.error = '';
  setSaveSlot(ACC.user);
  persist(); emit(EV.NET);
}
export async function register(user, pass) { setSession(await req('POST', '/api/register', { user, pass })); }
export async function login(user, pass) { setSession(await req('POST', '/api/login', { user, pass })); }
export async function logout() {
  try { if (G.S) await pushSave(); } catch (e) { /* vẫn đăng xuất */ }
  try { await req('POST', '/api/logout'); } catch (e) { /* bỏ qua */ }
  ACC.user = ACC.token = null; ACC.rev = 0; ACC.status = 'guest';
  setSaveSlot(null); persist(); emit(EV.NET);
}
export const changePassword = (old, pass) => req('POST', '/api/password', { old, pass });

/** Tải bản lưu trên máy chủ: { rev, data } (data = null nếu chưa có nhân vật) */
export const fetchSave = () => req('GET', '/api/save');

let inFlight = false;
/** Đẩy bản lưu hiện tại lên máy chủ. force = ghi đè dù có xung đột */
export async function pushSave(force = false, opts = {}) {
  if (isRemote()) return true; // chế độ máy chủ: máy chủ tự lưu
  if (!loggedIn() || !G.S || inFlight || (ACC.status === 'conflict' && !force) || ACC.status === 'expired') return false;
  inFlight = true;
  saveGame(); // G.S.lastSeen cập nhật trước khi gửi
  ACC.status = 'saving'; emit(EV.NET);
  try {
    const j = await req('PUT', '/api/save', { data: G.S, rev: ACC.rev, force }, opts);
    ACC.rev = j.rev; ACC.lastSync = Date.now(); ACC.status = 'synced'; ACC.conflict = null; ACC.error = '';
    persist();
    return true;
  } catch (e) {
    if (e.status === 409) { ACC.status = 'conflict'; ACC.conflict = e; onConflict && onConflict(e); }
    else if (e.status === 401) ACC.status = 'expired';
    else { ACC.status = 'offline'; ACC.error = e.message; }
    return false;
  } finally { inFlight = false; emit(EV.NET); }
}
export const apiReq = (method, path, body) => req(method, path, body);

/** Áp dụng thay đổi do máy chủ trả về (chợ, hộp thư, giao dịch) lên nhân vật đang chơi */
export function applyDelta(S, dl) {
  if (!dl) return;
  S.zen = (S.zen || 0) + (dl.zen || 0);
  for (const [k, n] of Object.entries(dl.jewels || {})) S.jewels[k] = (S.jewels[k] || 0) + n;
  if (dl.remove && dl.remove.length) { const rm = new Set(dl.remove); S.inv = S.inv.filter((x) => !rm.has(x.id)); }
  for (const it of dl.add || []) S.inv.push(it);
}

/**
 * Thao tác có sửa bản lưu trên máy chủ (đăng bán, mua, nhận thư, khoá giao dịch):
 * gửi bản lưu hiện tại + rev, máy chủ kiểm tra & trả delta → áp dụng lên G.S. Không chạy song song với lưu định kỳ.
 */
export async function saveOp(path, body) {
  if (!loggedIn() || !G.S) throw { status: 0, message: 'Cần đăng nhập tài khoản.' };
  if (isRemote()) { // máy chủ chạy trên nhân vật thật, trả về phần bản lưu thay đổi
    const j = await req('POST', path, body);
    if (j.s) { for (const k in j.s) G.S[k] = j.s[k]; }
    emit(EV.NET);
    return j;
  }
  if (ACC.status === 'conflict') throw { status: 409, message: 'Tài khoản đang xung đột lưu, hãy xử lý trước.' };
  for (let i = 0; inFlight && i < 50; i++) await new Promise((r) => setTimeout(r, 100));
  if (inFlight) throw { status: 0, message: 'Đang bận lưu, thử lại sau.' };
  inFlight = true;
  saveGame();
  try {
    const j = await req('POST', path, { ...body, data: G.S, rev: ACC.rev });
    ACC.rev = j.rev; ACC.lastSync = Date.now(); ACC.status = 'synced'; persist();
    applyDelta(G.S, j.delta);
    saveGame();
    return j;
  } catch (e) {
    if (e.status === 409 && e.conflict) { ACC.status = 'conflict'; ACC.conflict = e; onConflict && onConflict(e); }
    throw e;
  } finally { inFlight = false; emit(EV.NET); }
}

export async function deleteCloudSave() {
  const j = await req('DELETE', '/api/save');
  ACC.rev = j.rev; persist();
}

/**
 * Chọn bản lưu khi vào game bằng tài khoản:
 * - máy chủ có bản mới hơn (rev khác rev máy này đã biết) → dùng bản máy chủ
 * - rev giống nhau và máy này còn bản lưu → dùng bản trên máy (có thể chứa tiến độ chưa kịp đẩy lên)
 * - không kết nối được máy chủ → dùng bản trên máy (đồng bộ sau)
 * Trả về { save, source: 'cloud'|'local'|null, offline }
 */
export async function resolveSave(localRaw) {
  try {
    const j = await fetchSave();
    if (!j.data) { ACC.rev = j.rev || 0; persist(); return { save: localRaw && ACC.rev === 0 ? localRaw : null, source: localRaw && ACC.rev === 0 ? 'local' : null }; }
    if (localRaw && j.rev === ACC.rev && (localRaw.lastSeen || 0) >= (j.data.lastSeen || 0)) return { save: localRaw, source: 'local' };
    ACC.rev = j.rev; persist();
    return { save: j.data, source: 'cloud' };
  } catch (e) {
    if (e.status === 401) throw e;
    ACC.status = 'offline'; ACC.error = e.message;
    return { save: localRaw, source: localRaw ? 'local' : null, offline: true };
  }
}

// ---------------- ĐỒNG BỘ ĐỊNH KỲ ----------------
let syncT = 20, onConflict = null;
export const setConflictHandler = (f) => (onConflict = f);
/** Gọi mỗi khung hình khi đang chơi */
export function cloudTick(dt) {
  if (isRemote()) return;
  if (!loggedIn() || !G.S) return;
  if ((syncT -= dt) > 0) return;
  syncT = ACC.status === 'offline' ? 90 : 45;
  pushSave();
}
/** Rời trang / ẩn ứng dụng: đẩy lên ngay (keepalive để kịp gửi khi đóng tab) */
export function flushCloud() {
  if (isRemote()) return;
  if (!loggedIn() || !G.S) return;
  const small = JSON.stringify(G.S).length < 60000;
  pushSave(false, { keepalive: small });
}

export const statusText = () => (isRemote() ? '🛡 Nhân vật đang chạy và được lưu trên máy chủ (chống gian lận).' : '') || ({
  guest: 'Chơi không tài khoản — chỉ lưu trên máy này.',
  idle: '☁️ Đã đăng nhập.',
  saving: '☁️ Đang lưu lên máy chủ…',
  synced: '☁️ Đã lưu lên máy chủ lúc ' + new Date(ACC.lastSync).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
  offline: '⚠ Chưa lưu lên máy chủ được (' + esc(ACC.error || 'mất mạng') + '). Tiến độ vẫn lưu trên máy, sẽ thử lại.',
  conflict: '⚠ Tài khoản vừa được lưu từ thiết bị khác.',
  expired: '⚠ Phiên đăng nhập hết hạn — hãy đăng nhập lại để lưu lên máy chủ.',
})[ACC.status] || '';

export function initAccount() {
  const a = load();
  ACC.base = a.base || '';
  if (a.user && a.token) { ACC.user = a.user; ACC.token = a.token; ACC.rev = a.rev || 0; ACC.status = 'idle'; setSaveSlot(a.user); }
  if (ACC.base && NET.prefs && !NET.prefs.url) NET.prefs.url = ACC.base.replace(/^http/, 'ws') + '/ws';
}
export const logSync = (ok) => ACC.status !== 'conflict' && log(ok ? '☁️ Đã lưu nhân vật lên máy chủ.' : '⚠ Chưa lưu lên máy chủ được, sẽ thử lại sau.', ok ? '#8f8' : '#f88');
