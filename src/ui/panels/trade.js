// Giao dịch trực tiếp giữa 2 người chơi online (cùng bản đồ).
// Mời → đồng ý → chọn đồ/ngọc/Zen (bên kia thấy ngay) → 🔒 Khoá (máy chủ giữ đồ, không sửa được nữa)
// → khi CẢ HAI đã khoá mới bấm ✔ Xác nhận → máy chủ chuyển đồ vào hộp thư mỗi bên (tự nhận).
import { G } from '../../core/state.js';
import { log } from '../../core/events.js';
import { esc, fmt } from '../../core/utils.js';
import { JEWELS, JEWEL_KEYS } from '../../config/items.js';
import { calcStats } from '../../systems/stats.js';
import { itemCell, itemCard, btn } from '../components.js';
import { UI, $ } from '../dom.js';
import { saveOp } from '../../net/account.js';
import { NET, sendTrade } from '../../net/client.js';

const MAX_ITEMS = 8;
export const TR = { items: [], jewels: {}, zen: 0, view: null, busy: false, msg: '', result: null };
const goodsOf = () => ({ items: G.S.inv.filter((it) => TR.items.includes(it.id)), jewels: { ...TR.jewels }, zen: TR.zen });
const pushOffer = () => NET.trade && sendTrade('toffer', { id: NET.trade.id, goods: goodsOf() });
export const resetDraft = () => { TR.items = []; TR.jewels = {}; TR.zen = 0; TR.view = null; TR.msg = ''; };

function goodsBox(g, mine, locked) {
  const items = g.items.length ? '<div class="grid">' + g.items.map((it) => itemCell(it, { act: mine && !locked ? 'trRemove' : 'trView', selId: TR.view })).join('') + '</div>' : '';
  const jw = JEWEL_KEYS.filter((k) => g.jewels[k]).map((k) => '<span style="color:' + JEWELS[k].color + '">◆ ' + g.jewels[k] + ' ' + JEWELS[k].short + '</span>').join(' · ');
  const zen = g.zen ? '<span class="zen">💰 ' + fmt(g.zen) + ' Zen</span>' : '';
  return items + (jw || zen ? '<div style="margin-top:6px">' + [jw, zen].filter(Boolean).join(' · ') + '</div>' : '') + (!items && !jw && !zen ? '<p class="muted">Chưa đưa gì.</p>' : '');
}
const badge = (s) => (s.conf ? '<span class="tag ok">✔ Đã xác nhận</span>' : s.locked ? '<span class="tag lock">🔒 Đã khoá</span>' : '<span class="tag">Đang chọn…</span>');

export const tradePanel = {
  id: 'trade',
  title: '🤝 Giao dịch',
  render() {
    if (TR.result) return '<div class="tip">' + esc(TR.result) + '</div>' + btn('Đóng', 'close', {}, { cls: 'green' });
    const inv = NET.tradeInvite;
    if (!NET.trade && inv) return '<div class="tip"><b>' + esc(inv.from.name) + '</b> (cấp ' + inv.from.lv + ') muốn giao dịch với anh.</div>' +
      '<div class="row" style="gap:8px">' + btn('Đồng ý', 'trAccept', {}, { cls: 'green' }) + btn('Từ chối', 'trDecline', {}, { cls: 'red' }) + '</div>';
    const T = NET.trade;
    if (!T) return '<p class="muted">Không có giao dịch nào. Mời người chơi ở Chợ → Giao dịch.</p>' + btn('Đóng', 'close', {});
    const me = T.sides[T.me], ot = T.sides[1 - T.me], both = me.locked && ot.locked;
    const myGoods = me.locked ? me.offer : goodsOf();
    let h = (TR.msg ? '<div class="tip" style="color:#ff8a7a">' + esc(TR.msg) + '</div>' : '');
    const vit = TR.view && [...(ot.offer.items || []), ...myGoods.items].find((x) => x.id === TR.view);
    if (vit) h += itemCard({ it: vit, src: 'market' }, '');
    h += '<div class="trbox"><div class="trhead"><b>' + esc(ot.name) + '</b> đưa ' + badge(ot) + '</div>' + goodsBox(ot.offer, false) + '</div>';
    h += '<div class="trbox mine"><div class="trhead"><b>Anh</b> đưa ' + badge(me) + '</div>' + goodsBox(myGoods, true, me.locked) + '</div>';
    if (!me.locked) {
      h += '<h4>Chọn đồ trong túi (tối đa ' + MAX_ITEMS + ')</h4>' + (G.S.inv.length ? '<div class="grid">' + G.S.inv.filter((it) => !TR.items.includes(it.id)).map((it) => itemCell(it, { act: 'trAdd', selId: null })).join('') + '</div>' : '<p class="muted">Túi đồ trống.</p>') +
        '<h4>Ngọc & Zen</h4><div class="row" style="gap:6px;flex-wrap:wrap">' +
        JEWEL_KEYS.map((k) => '<label class="trjw" style="color:' + JEWELS[k].color + '">◆ ' + JEWELS[k].short + ' <input id="trj_' + k + '" type="number" inputmode="numeric" min="0" max="' + (G.S.jewels[k] || 0) + '" value="' + (TR.jewels[k] || 0) + '"><small>/' + (G.S.jewels[k] || 0) + '</small></label>').join('') +
        '<label class="trjw">💰 Zen <input id="trzen" type="number" inputmode="numeric" min="0" value="' + (TR.zen || 0) + '" style="width:110px"></label>' + btn('Cập nhật', 'trSetJ', {}, { cls: 'sm' }) + '</div>';
    }
    h += '<div class="row" style="gap:8px;margin-top:12px;flex-wrap:wrap">' +
      (!me.locked ? btn('🔒 Khoá đồ', 'trLock', {}, { cls: 'green', disabled: TR.busy }) : !both ? '<span class="muted">Chờ ' + esc(ot.name) + ' khoá đồ…</span>' : !me.conf ? btn('✔ Xác nhận giao dịch', 'trConfirm', {}, { cls: 'green' }) : '<span class="muted">Chờ ' + esc(ot.name) + ' xác nhận…</span>') +
      btn('Huỷ', 'trCancel', {}, { cls: 'red' }) + '</div>' +
      '<p class="muted" style="margin-top:8px">Đã khoá thì không đổi được đồ nữa. Kiểm tra kỹ đồ của bên kia trước khi xác nhận. Phí 2% trên Zen chuyển.</p>';
    return h;
  },
  actions: {
    trAccept: () => { if (NET.tradeInvite) sendTrade('tanswer', { id: NET.tradeInvite.id, ok: true }); resetDraft(); },
    trDecline: () => { if (NET.tradeInvite) sendTrade('tanswer', { id: NET.tradeInvite.id, ok: false }); NET.tradeInvite = null; return { close: true }; },
    trAdd: (d) => { if (TR.items.length >= MAX_ITEMS) { TR.msg = 'Tối đa ' + MAX_ITEMS + ' món mỗi lần.'; return; } TR.items.push(d.id); TR.msg = ''; pushOffer(); },
    trRemove: (d) => { TR.items = TR.items.filter((x) => x !== d.id); pushOffer(); },
    trView: (d) => { TR.view = TR.view === d.id ? null : d.id; },
    trSetJ: () => {
      for (const k of JEWEL_KEYS) { const n = Math.max(0, Math.min(G.S.jewels[k] || 0, Math.floor(+$('trj_' + k).value || 0))); if (n) TR.jewels[k] = n; else delete TR.jewels[k]; }
      TR.zen = Math.max(0, Math.min(G.S.zen, Math.floor(+$('trzen').value || 0)));
      pushOffer();
    },
    trLock: async () => {
      const T = NET.trade;
      if (!T) return;
      TR.busy = true; TR.msg = '';
      try { await saveOp('/api/trade/lock', { id: T.id, goods: goodsOf() }); TR.items = []; calcStats(); }
      catch (e) { TR.msg = (e && e.message) || 'Không khoá được.'; }
      TR.busy = false;
    },
    trConfirm: () => { if (NET.trade) sendTrade('tconfirm', { id: NET.trade.id }); },
    trCancel: () => { if (NET.trade) sendTrade('tcancel', { id: NET.trade.id }); },
  },
};

/** Nối sự kiện giao dịch: lời mời mở bảng, kết thúc hiện kết quả */
export function onTradeEvent(kind, m, openPanel, renderPanel) {
  if (kind === 'invite') {
    TR.result = null;
    log('🤝 <b>' + esc(NET.tradeInvite.from.name) + '</b> mời anh giao dịch.', '#9fd0ff');
    if (!G.R || !G.R.event) openPanel('trade');
  } else if (kind === 'state') {
    TR.result = null;
    if (UI.panel !== 'trade') openPanel('trade'); else renderPanel();
  } else if (kind === 'closed') {
    resetDraft();
    TR.result = (m && m.reason) || 'Giao dịch đã kết thúc.';
    if (UI.panel === 'trade') renderPanel();
  }
}
