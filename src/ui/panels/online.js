// Bảng Chat thế giới & Bảng xếp hạng (cần kết nối máy chủ)
import { on, EV } from '../../core/events.js';
import { esc, fmt } from '../../core/utils.js';
import { CLASSES } from '../../config/classes.js';
import { NET, sendChat, requestRank, connect, defaultUrl } from '../../net/client.js';
import { btn } from '../components.js';
import { UI, $ } from '../dom.js';

const offlineBox = () =>
  '<div class="tip" style="text-align:center">⚪ Chưa kết nối máy chủ.<div class="muted" style="margin:6px 0">Chat và Xếp hạng cần chơi trực tuyến. Vào <b>Cài đặt → Trực tuyến</b> để nhập địa chỉ máy chủ.</div>' +
  (NET.prefs.url || defaultUrl() ? btn('Kết nối ngay', 'netConnect', {}, { cls: 'green' }) : btn('Mở Cài đặt', 'open', { p: 'set' })) + '</div>';

const time = (ts) => { const d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
function chatList() {
  if (!NET.chat.length) return '<div class="muted" style="text-align:center;padding:20px">Chưa có tin nhắn nào. Hãy chào mọi người!</div>';
  return NET.chat.slice(-50).map((m) => m.sys
    ? '<div class="cm sys">📢 ' + esc(m.text) + '</div>'
    : '<div class="cm' + (m.id === NET.id ? ' me' : '') + '"><span class="ct">' + time(m.ts) + '</span> <b>' + esc(m.from) + '</b> <span class="muted">Lv' + m.lv + '</span>: ' + esc(m.text) + '</div>').join('');
}
function refreshChat() {
  const el = $('chatlist');
  if (!el) return;
  el.innerHTML = chatList();
  el.scrollTop = el.scrollHeight;
}
function doSend() {
  const inp = $('chatin');
  if (inp && sendChat(inp.value)) { inp.value = ''; inp.focus(); }
}

export const chatPanel = {
  id: 'chat',
  title: '💬 Chat thế giới',
  render() {
    if (NET.status !== 'online') return offlineBox();
    setTimeout(refreshChat, 0);
    return '<div class="muted" style="margin-bottom:6px">🟢 ' + NET.online + ' người đang trực tuyến · Giữ lịch sự, không spam.</div>' +
      '<div id="chatlist" class="chatlist"></div>' +
      '<div class="row" style="margin-top:8px;flex-wrap:nowrap"><input id="chatin" maxlength="120" placeholder="Nhập tin nhắn…" autocomplete="off">' + btn('Gửi', 'chatSend', {}, { cls: 'green' }) + '</div>';
  },
  actions: { chatSend: () => { doSend(); return { keep: true }; } },
};

const RANK_TABS = [
  ['level', '⭐ Cấp & Reset', (p) => (p.resets ? 'Reset ' + p.resets + ' · ' : '') + 'Cấp ' + p.lv],
  ['tower', '🗼 Tháp', (p) => 'Tầng ' + p.tower],
  ['power', '⚔️ Lực chiến', (p) => fmt(p.power)],
];
export const rankPanel = {
  id: 'rank',
  title: '🏆 Bảng xếp hạng',
  live: true,
  render() {
    if (NET.status !== 'online') return offlineBox();
    const tab = UI.rtab || 'level', R = NET.rank;
    if (!R || Date.now() - (UI.rankAsked || 0) > 10000) { UI.rankAsked = Date.now(); requestRank(); }
    const [, , val] = RANK_TABS.find((t) => t[0] === tab);
    const list = R ? R[tab] : null;
    return '<div class="tabs">' + RANK_TABS.map(([id, label]) => '<button class="tab' + (tab === id ? ' on' : '') + '" data-act="rtab" data-t="' + id + '">' + label + '</button>').join('') + '</div>' +
      (!list ? '<div class="muted" style="text-align:center;padding:20px">Đang tải…</div>'
        : !list.length ? '<div class="muted" style="text-align:center;padding:20px">Chưa có ai trong bảng này.</div>'
        : '<table class="st rank">' + list.map((p, i) => '<tr class="' + (p.id === NET.id ? 'me' : '') + '"><td class="rk">' + (['🥇', '🥈', '🥉'][i] || i + 1) + '</td><td><b>' + esc(p.name) + '</b> <span class="muted">' + (CLASSES[p.cls] ? CLASSES[p.cls].name : '') + '</span></td><td>' + val(p) + '</td></tr>').join('') + '</table>') +
      '<p class="muted" style="margin-top:8px">' + (R ? R.total + ' người chơi có tài khoản · chỉ số do máy chủ tính · cập nhật mỗi 10 giây' : '') + '</p>';
  },
  actions: { rtab: (d) => (UI.rtab = d.t) },
};

let inited = false;
export function initOnlinePanels() {
  if (inited) return;
  inited = true;
  on(EV.CHAT, () => { if (UI.panel === 'chat') refreshChat(); });
  document.addEventListener('keydown', (e) => { if (e.target && e.target.id === 'chatin' && e.key === 'Enter') { e.preventDefault(); doSend(); } });
}

export const netActions = { netConnect: () => { connect(); } };
