// Chợ (mua bán giữa người chơi, kể cả khi người bán offline) + hộp thư + giao dịch trực tiếp.
// Mọi thay đổi đồ/Zen do máy chủ thực hiện (xem server/src/market.js); client chỉ hiển thị & gửi yêu cầu.
import { G } from '../../core/state.js';
import { log, on, EV } from '../../core/events.js';
import { esc, fmt } from '../../core/utils.js';
import { CFG } from '../../config/constants.js';
import { SLOT_NAMES, JEWELS, JEWEL_KEYS } from '../../config/items.js';
import { CLASSES } from '../../config/classes.js';
import { itemFull, itemColor, sellPrice } from '../../systems/items.js';
import { calcStats } from '../../systems/stats.js';
import { itemCell, itemCard, btn } from '../components.js';
import { art } from '../../render/art/index.js';
import { UI, $ } from '../dom.js';
import { saveGame } from '../../core/save.js';
import { ACC, loggedIn, apiReq, saveOp, apiBase } from '../../net/account.js';
import { NET, sendTrade } from '../../net/client.js';

const FEE = 0.05, TRADE_FEE = 0.02, MAX_LIST = 10;
export const MK = { tab: 'buy', cat: 'all', sort: 'new', page: 0, myCls: false, data: null, mine: null, mail: null, sel: null, pick: null, busy: false, msg: '', err: false };
const CATS = [['all', 'Tất cả'], ['weapon', 'Vũ khí'], ['helm', 'Mũ'], ['armor', 'Áo'], ['pants', 'Quần'], ['gloves', 'Găng'], ['boots', 'Giày'], ['wings', 'Cánh'], ['jewel', 'Ngọc']];
const SORTS = [['new', 'Mới nhất'], ['cheap', 'Rẻ nhất'], ['dear', 'Đắt nhất'], ['plus', 'Ép cao']];
const say = (m, err) => { MK.msg = m || ''; MK.err = !!err; };
const errOf = (e) => (e && e.message) || 'Có lỗi, thử lại nhé.';
const ago = (t) => { const m = (Date.now() - t) / 60000; return m < 1 ? 'vừa xong' : m < 60 ? Math.round(m) + ' phút trước' : m < 1440 ? Math.round(m / 60) + ' giờ trước' : Math.round(m / 1440) + ' ngày trước'; };
const left = (t) => { const h = (t - Date.now()) / 36e5; return h > 1 ? 'còn ' + Math.round(h) + ' giờ' : 'còn ' + Math.max(1, Math.round(h * 60)) + ' phút'; };
const jewelIcon = (k, n) => '<div class="cell jw" style="color:' + JEWELS[k].color + '"><span class="jwi">◆</span>' + (n ? '<small class="pl">×' + n + '</small>' : '') + '</div>';
export const goodsIcon = (g) => (g.items.length ? itemCell(g.items[0], { act: '', selId: null }) : jewelIcon(Object.keys(g.jewels)[0], Object.values(g.jewels)[0]));
export function goodsName(g) {
  if (g.items.length) { const it = g.items[0]; return '<b style="color:' + itemColor(it) + '">' + (it.exc ? '[HH] ' : '') + esc(itemFull(it)) + '</b>' + (it.slot === 'weapon' && it.cls ? ' <span class="muted">· ' + CLASSES[it.cls].name + '</span>' : ''); }
  const [k, n] = Object.entries(g.jewels)[0];
  return '<b style="color:' + JEWELS[k].color + '">' + n + ' × ' + JEWELS[k].name + '</b>';
}
const unitPrice = (L) => (L.goods.items.length ? '' : ' <span class="muted">(' + fmt(Math.round(L.price / Object.values(L.goods.jewels)[0])) + '/viên)</span>');

// ---------------- GỌI MÁY CHỦ ----------------
async function loadBrowse() {
  const q = 'cat=' + MK.cat + '&sort=' + MK.sort + '&page=' + MK.page + (MK.myCls ? '&cls=' + G.S.cls : '');
  MK.data = await apiReq('GET', '/api/market?' + q);
}
const loadMine = async () => { MK.mine = await apiReq('GET', '/api/market?mine=1'); };
const loadMail = async () => { MK.mail = (await apiReq('GET', '/api/mail')).rows; };

/** Nhận toàn bộ thư (Zen, ngọc, đồ). quiet = tự nhận khi có thư mới */
export async function claimMail(quiet = false) {
  if (!loggedIn() || !G.S) return null;
  try {
    const j = await saveOp('/api/mail/claim', {});
    if (!j.delta) { if (j.claimed) log('📬 Đã nhận ' + j.claimed + ' thư.', '#8fd0ff'); if (j.left) log('📬 Túi đồ đầy — còn ' + j.left + ' thư chưa nhận được.', '#ffb070'); return j; }
    const dl = j.delta, parts = [];
    if (dl.zen) parts.push(fmt(dl.zen) + ' Zen');
    for (const [k, n] of Object.entries(dl.jewels)) if (n) parts.push(n + ' ' + JEWELS[k].name);
    if (dl.add.length) parts.push(dl.add.length + ' món đồ');
    if (parts.length) log('📬 Nhận từ hộp thư: ' + parts.join(', ') + '.', '#8fd0ff');
    if (j.left) log('📬 Túi đồ đầy — còn ' + j.left + ' thư chưa nhận được, dọn túi rồi mở Chợ → Hộp thư.', '#ffb070');
    if (dl.add.length) calcStats();
    return j;
  } catch (e) { if (!quiet) throw e; return null; }
}

// ---------------- VẼ ----------------
function needLogin() {
  return '<div class="tip">⚖️ <b>Chợ & giao dịch</b> cần <b>tài khoản</b> và kết nối máy chủ — để đồ đạc được máy chủ giữ an toàn, không mất khi đổi máy.</div>' +
    (!apiBase() ? '<p class="muted">Game đang mở không qua máy chủ. Mở game bằng địa chỉ máy chủ, hoặc nhập địa chỉ máy chủ khi đăng nhập.</p>' : '') +
    btn('Đăng nhập / Đăng ký', 'mkToStart', {}, { cls: 'green' });
}
const tabs = () => '<div class="tabs">' + [['buy', '🛒 Mua'], ['sell', '💰 Bán'], ['mail', '📬 Hộp thư'], ['trade', '🤝 Giao dịch']]
  .map(([k, n]) => '<button class="tab' + (MK.tab === k ? ' on' : '') + '" data-act="mkTab" data-t="' + k + '">' + n + '</button>').join('') + '</div>';
const msgLine = () => (MK.msg ? '<div class="tip" style="color:' + (MK.err ? '#ff8a7a' : '#8f8') + '">' + esc(MK.msg) + '</div>' : '');

function renderBuy() {
  const D = MK.data;
  let h = '<div class="chips">' + CATS.map(([k, n]) => '<button class="chip' + (MK.cat === k ? ' on' : '') + '" data-act="mkCat" data-c="' + k + '">' + n + '</button>').join('') + '</div>' +
    '<div class="row" style="margin:6px 0;flex-wrap:wrap;gap:6px">' + SORTS.map(([k, n]) => btn(n, 'mkSort', { s: k }, { cls: 'sm ' + (MK.sort === k ? 'green' : '') })).join('') +
    '<label class="row" style="margin-left:auto"><input type="checkbox" data-act="mkMyCls" ' + (MK.myCls ? 'checked' : '') + '> Vũ khí hợp lớp</label></div>';
  if (!D) return h + '<p class="muted">Đang tải chợ…</p>';
  if (D.recent && Object.keys(D.recent).length) h += '<div class="muted" style="margin-bottom:6px">Giá ngọc gần đây: ' + Object.entries(D.recent).map(([k, v]) => '<span style="color:' + JEWELS[k].color + '">' + JEWELS[k].short + ' ~' + fmt(v) + '</span>').join(' · ') + '</div>';
  const sel = MK.sel && D.rows.find((L) => L.id === MK.sel);
  if (sel) {
    const can = G.S.zen >= sel.price && !sel.mine;
    h += (sel.goods.items.length ? itemCard({ it: sel.goods.items[0], src: 'market' }, '') : '<div class="tip">' + goodsName(sel.goods) + '</div>') +
      '<div class="tip">Người bán: <b>' + esc(sel.seller) + '</b> · ' + left(sel.exp) + '<br>Giá: <b class="zen">' + fmt(sel.price) + ' Zen</b>' + unitPrice(sel) + ' · Anh có ' + fmt(G.S.zen) + '</div>' +
      '<div class="row" style="gap:8px">' + (sel.mine ? '<span class="muted">Hàng của anh</span>' : btn(MK.confirmBuy === sel.id ? 'Bấm lần nữa để MUA' : 'Mua ' + fmt(sel.price) + ' Zen', 'mkBuy', { id: sel.id }, { cls: 'green', disabled: !can || MK.busy })) + btn('Đóng', 'mkUnsel', {}, { cls: 'sm' }) + '</div>' +
      (!can && !sel.mine ? '<p class="warn">Không đủ Zen.</p>' : '');
  }
  if (!D.rows.length) return h + '<p class="muted" style="margin-top:8px">Chưa có ai bán món nào trong mục này.</p>';
  h += '<div class="mklist">' + D.rows.map((L) => '<div class="mkrow' + (MK.sel === L.id ? ' sel' : '') + '" data-act="mkSel" data-id="' + L.id + '">' + goodsIcon(L.goods) +
    '<div class="mkinfo">' + goodsName(L.goods) + '<div class="muted">' + esc(L.seller) + ' · ' + ago(L.at) + '</div></div><div class="mkprice">' + fmt(L.price) + '<small>Zen</small></div></div>').join('') + '</div>';
  const pages = Math.max(1, Math.ceil(D.total / D.per));
  if (pages > 1) h += '<div class="row" style="justify-content:space-between;margin-top:8px">' + btn('‹ Trước', 'mkPage', { d: -1 }, { cls: 'sm', disabled: D.page <= 0 }) + '<span class="muted">Trang ' + (D.page + 1) + '/' + pages + '</span>' + btn('Sau ›', 'mkPage', { d: 1 }, { cls: 'sm', disabled: D.page >= pages - 1 }) + '</div>';
  return h;
}

function renderSell() {
  const S = G.S, P = MK.pick;
  let h = '';
  if (P) {
    const it = P.id && S.inv.find((x) => x.id === P.id);
    if (P.id && !it) MK.pick = null;
    else {
      h += it ? itemCard({ it, src: 'market' }, '') : '<div class="tip"><b style="color:' + JEWELS[P.j].color + '">' + JEWELS[P.j].name + '</b> · anh có ' + (S.jewels[P.j] || 0) + ' viên</div>';
      h += '<div class="tip"><div class="row" style="gap:8px;flex-wrap:nowrap">' + (P.j ? '<input id="mkn" type="number" inputmode="numeric" min="1" max="' + (S.jewels[P.j] || 0) + '" value="' + Math.min(S.jewels[P.j] || 0, P.n || 1) + '" style="width:70px" placeholder="Số viên">' : '') +
        '<input id="mkprice" type="number" inputmode="numeric" min="100" step="100" value="' + (P.price || '') + '" placeholder="Giá bán (Zen)' + (P.j ? ' cho cả lô' : '') + '" style="flex:1"></div>' +
        '<p class="muted" style="margin-top:6px">Phí chợ ' + FEE * 100 + '% trừ khi bán được. Treo tối đa 48 giờ, hết hạn thì đồ về hộp thư.' + (it ? ' Bán cho cửa hàng: ' + fmt(sellPrice(it)) + ' Zen.' : '') + '</p>' +
        '<div class="row" style="gap:8px">' + btn('Đăng bán', 'mkList', {}, { cls: 'green', disabled: MK.busy }) + btn('Bỏ chọn', 'mkUnpick', {}, { cls: 'sm' }) + '</div></div>';
    }
  } else h += '<div class="tip muted">Chọn món đồ trong túi hoặc loại ngọc muốn bán. Đồ đang mặc phải tháo ra trước.</div>';
  h += '<h4>Ngọc</h4><div class="row" style="gap:6px;flex-wrap:wrap">' + JEWEL_KEYS.map((k) => btn('◆ ' + JEWELS[k].short + ' (' + (S.jewels[k] || 0) + ')', 'mkPickJ', { k }, { cls: 'sm', disabled: !(S.jewels[k] > 0) })).join('') + '</div>';
  h += '<h4>Túi đồ (' + S.inv.length + '/' + CFG.INV_SIZE + ')</h4>' + (S.inv.length ? '<div class="grid">' + S.inv.map((it) => itemCell(it, { act: 'mkPick', selId: P && P.id })).join('') + '</div>' : '<p class="muted">Túi đồ trống.</p>');
  const M = MK.mine;
  h += '<h4>Đang bán (' + (M ? M.total : '…') + '/' + MAX_LIST + ')</h4>';
  if (M && M.rows.length) h += '<div class="mklist">' + M.rows.map((L) => '<div class="mkrow">' + goodsIcon(L.goods) + '<div class="mkinfo">' + goodsName(L.goods) + '<div class="muted">' + fmt(L.price) + ' Zen · ' + left(L.exp) + '</div></div>' + btn('Huỷ', 'mkCancel', { id: L.id }, { cls: 'sm red', disabled: MK.busy }) + '</div>').join('') + '</div>';
  else if (M) h += '<p class="muted">Chưa đăng bán món nào.</p>';
  return h;
}

function renderMail() {
  const L = MK.mail;
  let h = '<div class="row" style="gap:8px;margin-bottom:8px">' + btn('Nhận tất cả', 'mkClaim', {}, { cls: 'green', disabled: MK.busy || !(L && L.length) }) + '<span class="muted">Tiền bán đồ, đồ đã mua, đồ giao dịch, đồ hết hạn bán đều về đây.</span></div>';
  if (!L) return h + '<p class="muted">Đang tải…</p>';
  if (!L.length) return h + '<p class="muted">Hộp thư trống.</p>';
  return h + L.map((m) => '<div class="tip"><div class="muted">' + ago(m.at) + '</div>' + esc(m.text) + '</div>').join('');
}

function renderTradeTab() {
  if (NET.status !== 'online') return '<div class="tip">Giao dịch trực tiếp cần <b>kết nối máy chủ</b> (Cài đặt → Trực tuyến).</div>';
  if (NET.trade) return '<div class="tip">Anh đang trong một giao dịch.</div>' + btn('Mở giao dịch', 'mkOpenTrade', {}, { cls: 'green' });
  const list = [...NET.players.values()];
  let h = '<div class="tip">Mời người chơi <b>cùng bản đồ</b> để đổi đồ, ngọc, Zen trực tiếp. Hai bên khoá rồi xác nhận thì đồ mới chuyển (phí ' + TRADE_FEE * 100 + '% trên Zen chuyển).</div>';
  if (!list.length) return h + '<p class="muted">Không có người chơi nào khác trên bản đồ này.</p>';
  return h + '<div class="mklist">' + list.map((p) => '<div class="mkrow"><div class="mkinfo"><b>' + esc(p.name) + '</b><div class="muted">Cấp ' + p.lv + (p.resets ? ' · Reset ' + p.resets : '') + '</div></div>' + btn('Mời giao dịch', 'mkInvite', { pid: p.id }, { cls: 'sm green' }) + '</div>').join('') + '</div>';
}

export const marketPanel = {
  id: 'market',
  title: '⚖️ Chợ',
  onOpen: () => { say(''); return loggedIn() ? refresh() : null; },
  render() {
    if (!loggedIn()) return needLogin();
    const body = { buy: renderBuy, sell: renderSell, mail: renderMail, trade: renderTradeTab }[MK.tab]();
    return tabs() + msgLine() + body + '<p class="muted" style="margin-top:10px">💰 ' + fmt(G.S.zen) + ' Zen · ' + JEWEL_KEYS.map((k) => '<span style="color:' + JEWELS[k].color + '">◆' + (G.S.jewels[k] || 0) + '</span>').join(' ') + '</p>';
  },
  actions: {
    mkToStart: () => { saveGame(); UI.noSave = true; location.reload(); },
    mkTab: (d) => { MK.tab = d.t; say(''); return refresh(); },
    mkCat: (d) => { MK.cat = d.c; MK.page = 0; MK.sel = null; return refresh(); },
    mkSort: (d) => { MK.sort = d.s; MK.page = 0; return refresh(); },
    mkMyCls: () => { MK.myCls = !MK.myCls; MK.page = 0; return refresh(); },
    mkPage: (d) => { MK.page = Math.max(0, MK.page + +d.d); MK.sel = null; return refresh(); },
    mkSel: (d) => { MK.sel = MK.sel === d.id ? null : d.id; MK.confirmBuy = null; },
    mkUnsel: () => { MK.sel = null; },
    mkBuy: async (d) => {
      if (MK.confirmBuy !== d.id) { MK.confirmBuy = d.id; return; }
      MK.busy = true; MK.confirmBuy = null;
      try { await saveOp('/api/market/buy', { id: d.id }); say('✔ Mua thành công! Đồ đã về hộp thư và được nhận tự động.'); MK.sel = null; await claimMail(true); }
      catch (e) { say(errOf(e), true); }
      MK.busy = false;
      return refresh();
    },
    mkPick: (d) => { MK.pick = MK.pick && MK.pick.id === d.id ? null : { id: d.id }; },
    mkPickJ: (d) => { MK.pick = { j: d.k, n: 1 }; },
    mkUnpick: () => { MK.pick = null; },
    mkList: async () => {
      const P = MK.pick, price = Math.floor(+$('mkprice').value), n = P.j ? Math.floor(+$('mkn').value) : 0;
      if (!(price >= 100)) { say('Nhập giá bán (ít nhất 100 Zen).', true); return; }
      if (P.j && !(n >= 1 && n <= (G.S.jewels[P.j] || 0))) { say('Số ngọc không hợp lệ.', true); return; }
      MK.busy = true;
      try {
        await saveOp('/api/market/list', P.j ? { jewel: P.j, n, price } : { itemId: P.id, price });
        say('✔ Đã đăng bán. Khi có người mua, tiền (trừ phí ' + FEE * 100 + '%) về hộp thư.'); MK.pick = null; calcStats();
      } catch (e) { say(errOf(e), true); }
      MK.busy = false;
      return refresh();
    },
    mkCancel: async (d) => {
      MK.busy = true;
      try { await apiReq('POST', '/api/market/cancel', { id: d.id }); await claimMail(true); say('✔ Đã huỷ bán, đồ đã về túi.'); }
      catch (e) { say(errOf(e), true); }
      MK.busy = false;
      return refresh();
    },
    mkClaim: async () => {
      MK.busy = true;
      try { const j = await claimMail(); say(j && j.left ? 'Túi đầy, còn ' + j.left + ' thư chưa nhận.' : '✔ Đã nhận hết.'); }
      catch (e) { say(errOf(e), true); }
      MK.busy = false;
      return refresh();
    },
    mkInvite: (d) => { sendTrade('tinvite', { pid: d.pid }); say('Đã gửi lời mời, chờ người kia đồng ý…'); },
    mkOpenTrade: () => ({ open: 'trade' }),
  },
};

async function refresh() {
  try {
    if (MK.tab === 'buy') await loadBrowse();
    else if (MK.tab === 'sell') await loadMine();
    else if (MK.tab === 'mail') await loadMail();
  } catch (e) { say(errOf(e), true); }
}

/** Mở chợ ở tab bán với món đồ chọn sẵn (từ Túi đồ) */
export function openSellItem(id) { MK.tab = 'sell'; MK.pick = { id }; say(''); }

export function initMarket(renderIfOpen) {
  // có thư mới (bán được hàng, nhận đồ giao dịch…) → tự nhận
  on(EV.MAIL, async () => { await claimMail(true); if (UI.panel === 'market') { if (MK.tab === 'mail') await loadMail(); renderIfOpen(); } });
}
