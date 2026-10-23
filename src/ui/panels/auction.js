// Bảng Đấu giá: quà xếp hạng Boss bang. Giai đoạn 1 (15 phút) chỉ người đã đánh Boss của bang được đặt giá; không ai đặt thì ra Thế giới (30 phút, ai cũng đặt được).
// Luật & dữ liệu do máy chủ quyết định (server/src/gboss.js).
import { G } from '../../core/state.js';
import { esc, fmt } from '../../core/utils.js';
import { AUCTION } from '../../config/gboss.js';
import { itemCard, btn } from '../components.js';
import { goodsIcon, goodsName } from './market.js';
import { UI, $ } from '../dom.js';
import { saveGame } from '../../core/save.js';
import { loggedIn } from '../../net/account.js';
import { GD, loadAuction, bidLot } from '../../net/guild.js';
import { calcStats } from '../../systems/stats.js';

const AU = { tab: 'guild', msg: '', err: false, busy: false, sel: null, loadedAt: { guild: 0, world: 0 } };
const say = (m, err) => { AU.msg = m || ''; AU.err = !!err; };
const errOf = (e) => (e && e.message) || 'Có lỗi, thử lại nhé.';
const mmss = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const tabs = () => '<div class="tabs">' + [['guild', '🏰 Đấu giá bang'], ['world', '🌍 Đấu giá thế giới']].map(([k, n]) => '<button class="tab' + (AU.tab === k ? ' on' : '') + '" data-act="auTab" data-t="' + k + '">' + n + '</button>').join('') + '</div>';
const msgLine = () => (AU.msg ? '<div class="tip" style="color:' + (AU.err ? '#ff8a7a' : '#8f8') + '">' + esc(AU.msg) + '</div>' : '');
/** Đồng hồ máy chủ → máy này (để đếm ngược đúng dù lệch giờ) */
const skew = (D) => (D ? D.now - D.at : 0);

async function load(scope) { await loadAuction(scope); GD.auction[scope].at = Date.now(); AU.loadedAt[scope] = Date.now(); }

function lotRow(l, D) {
  const sel = AU.sel === l.id, endsIn = l.endAt - (Date.now() + skew(D));
  let h = '<div class="mkrow' + (sel ? ' sel' : '') + '" data-act="auSel" data-id="' + l.id + '">' + goodsIcon(l.goods) +
    '<div class="mkinfo">' + goodsName(l.goods) + '<div class="muted">Bang ' + esc(l.gname) + ' · hạng ' + l.rank + ' · ⏱ <span data-end="' + l.endAt + '" data-skew="' + skew(D) + '">' + mmss(endsIn) + '</span></div>' +
    (l.diy ? '<div class="muted">Tự kiếm / tự ép ≈ ' + fmt(l.diy) + ' Zen</div>' : '') + '<div class="muted">' + (l.bid ? (l.bid.mine ? '<b style="color:#8f8">Anh đang dẫn đầu</b>' : 'Cao nhất: ' + esc(l.bid.name)) + ' · ' + fmt(l.bid.amount) : 'Khởi điểm ' + fmt(l.start)) + ' Zen</div></div>' +
    '<div class="mkprice">' + fmt(l.next) + '<small>tối thiểu</small></div></div>';
  if (sel) {
    h += (l.goods.items.length ? itemCard({ it: l.goods.items[0], src: 'market' }, '') : '') +
      '<div class="tip">' + (l.canBid
        ? '<div class="row" style="gap:8px;flex-wrap:nowrap"><input id="auAmt" type="number" inputmode="numeric" min="' + l.next + '" value="' + l.next + '" style="flex:1" placeholder="Giá của anh (Zen)">' + btn('Đặt giá', 'auBid', { id: l.id }, { cls: 'green', disabled: AU.busy }) + '</div>' +
          '<p class="muted" style="margin-top:6px">Mỗi lần phải cao hơn giá hiện tại ≥ ' + AUCTION.minRaise * 100 + '%. Đặt giá khi còn dưới ' + AUCTION.snipeSec + ' giây sẽ được cộng thêm ' + AUCTION.snipeExtendSec + ' giây. Zen bị giữ ngay khi đặt, bị trả giá cao hơn thì hoàn lại qua hộp thư. Anh có ' + fmt(G.S.zen) + ' Zen.' +
          (l.stage === 'guild' ? ' Tiền thắng đấu giá trong bang được chia đều cho những người đã đánh Boss.' : ' Đấu giá thế giới: tiền không chia cho ai.') + '</p>'
        : '<span class="muted">' + (l.stage === 'guild' ? 'Chỉ người đã đánh Boss của bang này được đặt giá.' : 'Phiên đã kết thúc.') + '</span>') + '</div>';
  }
  return h;
}
function doneRow(l) {
  const r = l.result;
  return '<div class="mkrow">' + goodsIcon(l.goods) + '<div class="mkinfo">' + goodsName(l.goods) + '<div class="muted">Bang ' + esc(l.gname) + ' · ' + (r && r.winner ? '🔨 ' + esc(r.winner) + ' thắng ' + fmt(r.amount) + ' Zen' : 'Không ai đặt — tặng người đánh nhiều nhất bang') + '</div></div></div>';
}

export const auctionPanel = {
  id: 'auction',
  title: '🔨 Đấu giá',
  onOpen: () => { say(''); AU.sel = null; return loggedIn() ? load(AU.tab).catch((e) => say(errOf(e), true)) : null; },
  render() {
    if (!loggedIn() || !G.S) return '<div class="tip">🔨 Đấu giá cần <b>tài khoản</b> và kết nối máy chủ.</div>';
    const D = GD.auction[AU.tab];
    let h = tabs() + '<div class="tip muted">' + (AU.tab === 'guild'
      ? 'Quà xếp hạng Boss bang: ' + AUCTION.guildMin + ' phút đầu chỉ người đã đánh Boss của bang đó được đặt giá. Không ai đặt → ra đấu giá thế giới.'
      : 'Quà không ai đặt trong bang. Ai cũng được đặt giá (' + AUCTION.worldMin + ' phút). Không ai đặt tiếp thì quà tặng người đánh nhiều nhất bang.') + '</div>' + msgLine();
    if (!D) return h + '<p class="muted">Đang tải…</p>';
    h += D.lots.length ? '<div class="mklist">' + D.lots.map((l) => lotRow(l, D)).join('') + '</div>' : '<p class="muted" style="margin:10px 0">Chưa có phiên đấu giá nào đang mở. Quà xuất hiện sau mỗi đợt Boss bang (12:00 và 20:00).</p>';
    if (D.done.length) h += '<h4>Vừa kết thúc</h4><div class="mklist">' + D.done.map(doneRow).join('') + '</div>';
    return h;
  },
  actions: {
    auTab: (d) => { AU.tab = d.t; AU.sel = null; say(''); return load(d.t).catch((e) => say(errOf(e), true)); },
    auSel: (d) => { AU.sel = AU.sel === d.id ? null : d.id; },
    auBid: async (d) => {
      const amount = Math.floor(+($('auAmt') || {}).value);
      AU.busy = true;
      try { const j = await bidLot(d.id, amount); calcStats(); say('✔ Đã đặt giá ' + fmt(amount) + ' Zen.' + (j.extended ? ' Phiên được cộng thêm ' + AUCTION.snipeExtendSec + ' giây.' : '')); await load(AU.tab); }
      catch (e) { say(errOf(e), true); try { await load(AU.tab); } catch (e2) { /* bỏ qua */ } }
      AU.busy = false;
    },
  },
};

/** Đếm ngược từng phiên mỗi giây (không vẽ lại cả bảng để không mất ô nhập) + làm mới danh sách định kỳ */
export function initAuctionUi(rerender) {
  setInterval(() => {
    if (UI.panel !== 'auction') return;
    const now = Date.now();
    for (const el of document.querySelectorAll('[data-end]')) el.textContent = mmss(+el.dataset.end - (now + +el.dataset.skew));
    if (now - AU.loadedAt[AU.tab] > 15000 && !AU.busy) load(AU.tab).then(() => { const a = document.activeElement; if (!(a && a.id === 'auAmt')) rerender(); }).catch(() => {});
  }, 1000);
}
