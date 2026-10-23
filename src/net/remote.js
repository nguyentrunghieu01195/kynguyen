// =====================================================================
//  CHẾ ĐỘ MÁY CHỦ (chơi bằng tài khoản) — máy người chơi chỉ hiển thị
// =====================================================================
// Máy chủ chạy luật chơi; ở đây chỉ: gửi lệnh (act) → nhận bản lưu (S), hình ảnh thế giới (R) và sự kiện để vẽ/phát âm thanh.
import { G } from '../core/state.js';
import { emit, on, EV, BUS, log } from '../core/events.js';
import { calcStats } from '../systems/stats.js';
import { setRemote } from './actions.js';
import { buildRuntime, applySnapshot, applyState, unpackArg } from './sync.js';
import { NET, connect, disconnect, registerRecv, sendRaw, setConnectOpts } from './client.js';

export const REMOTE = { on: false, ready: false, status: 'off', kicked: null, error: null, offline: null };
let readyMsg = null, pending = new Map(), seq = 1, onReady = null, onStatus = () => {}, onWiped = null;

const setStatus = (st, extra = {}) => { REMOTE.status = st; Object.assign(REMOTE, extra); onStatus(REMOTE); };

function sendAct(name, args) {
  return new Promise((resolve) => {
    if (NET.status !== 'online') { log('⚠ Mất kết nối máy chủ — chưa thực hiện được.', '#f88'); resolve(null); return; }
    const i = seq++;
    const timer = setTimeout(() => { pending.delete(i); resolve(null); }, 8000);
    pending.set(i, (r) => { clearTimeout(timer); resolve(r); });
    sendRaw({ t: 'act', i, a: name, args });
  });
}

function playEvents(list) {
  if (!list) return;
  for (const [ev, ...args] of list) emit(ev, ...args.map((a) => unpackArg(G.R, a)));
}
function patchState(p) { if (p && G.S) { applyState(G.S, p); calcStats(); } }

registerRecv({
  state(m) {
    G.S = m.s;
    calcStats();
    REMOTE.offline = m.offline || null;
    const first = !REMOTE.ready;
    REMOTE.ready = true;
    setStatus('playing', { kicked: null, error: null });
    setConnectOpts({ play: true }); // kết nối lại sau này: vào tiếp nhân vật (không tạo mới nữa)
    if (first) readyMsg = m; // gọi onReady khi đã có bản đồ (tin 'rt' đến ngay sau)
  },
  st(m) { patchState(m.s); },
  rt(m) {
    buildRuntime(m.rt);
    if (readyMsg && onReady) { const r = readyMsg; readyMsg = null; onReady(r); }
  },
  snap(m) { if (G.R && G.R.remote) { applySnapshot(G.R, m.s); playEvents(m.ev); } },
  ar(m) {
    patchState(m.s);
    playEvents(m.ev);
    const f = m.i && pending.get(m.i);
    if (f) { pending.delete(m.i); f(m.err ? null : m.r); }
  },
  kicked(m) { REMOTE.kicked = m.message || 'Bị ngắt kết nối.'; disconnect(true); setStatus('kicked'); },
  playerr(m) { REMOTE.error = m; setStatus('error'); },
  wiped() { if (onWiped) onWiped(); },
});

/**
 * Vào game bằng tài khoản. create = { cls, name } nếu tạo nhân vật mới.
 * handlers: onReady(msg) khi nhận nhân vật lần đầu; onStatus(REMOTE) khi trạng thái kết nối đổi.
 */
export function startRemote(create, handlers = {}) {
  REMOTE.on = true; REMOTE.ready = false;
  onReady = handlers.onReady || null;
  onStatus = handlers.onStatus || (() => {});
  BUS.viewOnly = true;          // luật chơi (nhiệm vụ, mở khoá…) để máy chủ tính
  G.online = true;
  setRemote(sendAct);
  setStatus('connecting');
  const ok = connect(null, { play: true, create });
  if (!ok) setStatus('error', { error: { message: 'Chưa có địa chỉ máy chủ.' } });
  return ok;
}
/** Chiếm lại phiên chơi (sau khi bị đá vì vào ở máy khác) */
export function reclaim() { REMOTE.kicked = null; setStatus('connecting'); connect(null, { play: true }); }
export function requestWipe(cb) { onWiped = cb; sendRaw({ t: 'wipe' }); }
export function remoteNetStatus(st) {
  if (!REMOTE.on) return;
  if (st === 'online') { if (REMOTE.status !== 'playing') setStatus('connecting'); }
  else if (REMOTE.status === 'playing') setStatus('reconnecting');
  if (st !== 'online') { for (const f of pending.values()) f(null); pending.clear(); }
}
on(EV.NET, () => remoteNetStatus(NET.status));
