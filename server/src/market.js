// Chợ & giao dịch trực tiếp — mọi thay đổi đồ đạc/Zen đều do máy chủ thực hiện trên bản lưu của tài khoản.
//
// Nguyên tắc chống mất đồ / nhân bản đồ:
//  - Mỗi thao tác (đăng bán, mua, nhận thư, khoá giao dịch) gửi kèm bản lưu hiện tại + rev. Sai rev → từ chối (409).
//  - Máy chủ kiểm tra vật phẩm có thật trong bản lưu, lấy ra, lưu lại (rev+1) rồi trả "delta" để máy người chơi áp dụng y hệt.
//  - Đồ / Zen gửi tới người khác luôn đi qua HỘP THƯ của người nhận (người nhận có thể đang offline),
//    người nhận bấm nhận (hoặc game tự nhận) → lại là một thao tác có rev như trên.
//  - Đồ đang treo chợ / đang khoá trong giao dịch được giữ ở máy chủ (market.json). Máy chủ tắt giữa chừng → bật lại tự trả về hộp thư.
import fs from 'node:fs';
import { own } from './guard.js';
import path from 'node:path';
import crypto from 'node:crypto';

export const MARKET = {
  fee: 0.05,                 // phí chợ: trừ 5% tiền bán được
  tradeFee: 0.02,            // phí giao dịch trực tiếp: 2% số Zen chuyển
  listHours: 48,             // đăng bán tối đa 48 giờ
  maxListings: 10,           // mỗi tài khoản tối đa 10 món đang bán
  minPrice: 100, maxPrice: 2e9,
  invSize: 40,
  maxMail: 200,
  maxTradeItems: 8,
  jewels: ['bless', 'soul', 'chaos'],
  slots: ['weapon', 'helm', 'armor', 'pants', 'gloves', 'boots', 'wings'],
};
const SLOT_NAME = { weapon: 'Vũ khí', helm: 'Mũ', armor: 'Áo', pants: 'Quần', gloves: 'Găng', boots: 'Giày', wings: 'Cánh' };
const JEWEL_NAME = { bless: 'Ngọc Ước Nguyện', soul: 'Ngọc Linh Hồn', chaos: 'Ngọc Hỗn Nguyên' };

export class TradeError extends Error { constructor(msg, status = 400) { super(msg); this.status = status; } }
const nid = () => crypto.randomBytes(6).toString('hex');
const int = (v) => (Number.isFinite(+v) ? Math.floor(+v) : NaN);

/** Làm sạch 1 vật phẩm: chỉ giữ các trường game dùng, giới hạn giá trị. null nếu không hợp lệ */
export function cleanItem(it) {
  if (!it || typeof it !== 'object' || !MARKET.slots.includes(it.slot)) return null;
  const tier = int(it.tier), plus = int(it.plus || 0);
  if (!(tier >= 0 && tier <= 9) || !(plus >= 0 && plus <= 15)) return null;
  const out = { id: String(it.id || '').slice(0, 24), slot: it.slot, tier, plus, exc: null };
  if (Array.isArray(it.exc)) out.exc = it.exc.slice(0, 6).filter((o) => o && typeof o.k === 'string').map((o) => ({ k: o.k.slice(0, 16), v: Math.max(0, Math.min(1000, +o.v || 0)) }));
  if (out.exc && !out.exc.length) out.exc = null;
  if (it.slot === 'weapon') { out.cls = ['knight', 'wizard', 'archer'].includes(it.cls) ? it.cls : 'knight'; out.wt = Math.max(0, Math.min(9, int(it.wt) || 0)); }
  else if (it.slot !== 'wings') out.line = Math.max(0, Math.min(3, int(it.line) || 0));
  return out;
}
/** Gói hàng: { items:[item], jewels:{k:n}, zen } đã làm sạch */
export function cleanGoods(g) {
  const out = { items: [], jewels: {}, zen: 0 };
  if (!g || typeof g !== 'object') return out;
  if (Array.isArray(g.items)) for (const it of g.items.slice(0, MARKET.maxTradeItems)) { const c = cleanItem(it); if (c) out.items.push(c); }
  for (const k of MARKET.jewels) { const n = int(g.jewels && g.jewels[k]); if (n > 0) out.jewels[k] = Math.min(n, 99999); }
  const z = int(g.zen); if (z > 0) out.zen = Math.min(z, MARKET.maxPrice);
  return out;
}
const emptyGoods = (g) => !g.items.length && !Object.keys(g.jewels).length && !g.zen;

// ---------------- THAO TÁC TRÊN BẢN LƯU ----------------
/** Lấy hàng ra khỏi bản lưu (đồ phải nằm trong túi, không phải đồ đang mặc). Trả về delta âm */
export function takeGoods(d, goods) {
  d.inv = Array.isArray(d.inv) ? d.inv : [];
  d.jewels = d.jewels || {};
  const taken = { items: [], jewels: {}, zen: 0 }, delta = { zen: 0, jewels: {}, add: [], remove: [] };
  const ids = new Set();
  for (const g of goods.items) {
    if (ids.has(g.id)) throw new TradeError('Vật phẩm bị chọn trùng.');
    ids.add(g.id);
    const i = d.inv.findIndex((x) => x && x.id === g.id);
    if (i < 0) throw new TradeError('Không thấy vật phẩm trong túi đồ (có thể đã bán hoặc đang mặc).');
    const c = cleanItem(d.inv[i]);
    if (!c) throw new TradeError('Vật phẩm không hợp lệ.');
    taken.items.push(c);
  }
  for (const [k, n] of Object.entries(goods.jewels)) if ((d.jewels[k] | 0) < n) throw new TradeError('Không đủ ' + JEWEL_NAME[k] + '.');
  if (goods.zen && (d.zen || 0) < goods.zen) throw new TradeError('Không đủ Zen.');
  // đủ điều kiện → mới trừ thật
  d.inv = d.inv.filter((x) => !(x && ids.has(x.id)));
  for (const [k, n] of Object.entries(goods.jewels)) { d.jewels[k] -= n; taken.jewels[k] = n; delta.jewels[k] = -n; }
  if (goods.zen) { d.zen -= goods.zen; taken.zen = goods.zen; delta.zen = -goods.zen; }
  delta.remove = [...ids];
  return { taken, delta };
}
/** Cho hàng vào bản lưu. Đồ không vừa túi thì trả lại phần còn dư */
export function giveGoods(d, goods) {
  d.inv = Array.isArray(d.inv) ? d.inv : [];
  d.jewels = d.jewels || {};
  const delta = { zen: 0, jewels: {}, add: [], remove: [] }, left = { items: [], jewels: {}, zen: 0 };
  for (const it of goods.items) {
    if (d.inv.length >= MARKET.invSize) { left.items.push(it); continue; }
    const c = { ...cleanItem(it), id: 'm' + nid() }; // id mới, tránh trùng trong túi người nhận
    d.inv.push(c); delta.add.push(c);
  }
  for (const [k, n] of Object.entries(goods.jewels)) { d.jewels[k] = (d.jewels[k] | 0) + n; delta.jewels[k] = n; }
  if (goods.zen) { d.zen = (d.zen || 0) + goods.zen; delta.zen = goods.zen; }
  return { delta, left };
}
const mergeDelta = (a, b) => {
  const o = { zen: a.zen + b.zen, jewels: { ...a.jewels }, add: [...a.add, ...b.add], remove: [...a.remove, ...b.remove] };
  for (const [k, n] of Object.entries(b.jewels)) o.jewels[k] = (o.jewels[k] || 0) + n;
  return o;
};
export const goodsText = (g) => [...g.items.map((it) => SLOT_NAME[it.slot] + (it.slot === 'wings' ? ' cấp ' + it.tier : ' bậc ' + (it.tier + 1)) + (it.plus ? ' +' + it.plus : '') + (it.exc ? ' (Hoàn Hảo)' : '')), ...Object.entries(g.jewels).map(([k, n]) => n + ' ' + JEWEL_NAME[k]), ...(g.zen ? [g.zen.toLocaleString('vi-VN') + ' Zen'] : [])].join(', ');

// ---------------- KHO DỮ LIỆU CHỢ ----------------
export function createMarket(dir, accounts) {
  const file = path.join(dir, 'market.json');
  let data = { listings: {}, sales: [], escrow: {} };
  try { data = Object.assign(data, JSON.parse(fs.readFileSync(file, 'utf8'))); } catch (e) { /* file mới */ }
  let dirty = false, timer = null;
  const flush = () => { if (!dirty) return; dirty = false; const tmp = file + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(data)); fs.renameSync(tmp, file); };
  const touch = () => { dirty = true; if (!timer) timer = setTimeout(() => { timer = null; flush(); }, 1000); };
  let notify = () => {}; // gắn từ index.js: báo người chơi online có thư mới
  let taxHook = () => {}; // gắn từ index.js: một phần phí chợ chuyển vào quỹ bang giữ thành

  function mail(accId, text, goods) {
    const acc = accounts.get(accId);
    if (!acc) return;
    acc.mail = acc.mail || [];
    acc.mail.push({ id: nid(), at: Date.now(), text, goods });
    accounts.touch();
    notify(accId);
  }

  // Máy chủ tắt giữa lúc giao dịch → trả đồ đang khoá về hộp thư
  for (const [tid, e] of Object.entries(data.escrow)) {
    for (const side of e) if (side && !emptyGoods(side.goods)) mail(side.acc, 'Giao dịch bị huỷ do máy chủ khởi động lại — trả lại đồ của anh.', side.goods);
    delete data.escrow[tid];
  }
  touch();

  // Hết hạn đăng bán → trả về hộp thư
  function sweep() {
    const now = Date.now();
    for (const L of Object.values(data.listings)) if (L.exp <= now) { delete data.listings[L.id]; mail(L.seller, 'Hết hạn đăng bán, trả lại: ' + goodsText(L.goods) + '.', L.goods); touch(); }
  }
  setInterval(sweep, 60000).unref();

  const pubListing = (L, me) => ({ id: L.id, seller: L.sellerName, goods: L.goods, price: L.price, at: L.at, exp: L.exp, mine: L.seller === me });
  const catOf = (L) => (L.goods.items.length ? L.goods.items[0].slot : 'jewel');

  return {
    setNotify: (f) => (notify = f),
    setTax: (f) => (taxHook = f),
    mail, flush,
    dump: () => data,
    /** Danh sách đang bán (lọc / sắp xếp / phân trang) */
    browse(acc, q) {
      sweep();
      let list = Object.values(data.listings);
      if (q.mine) list = list.filter((L) => L.seller === acc.id);
      else {
        if (q.cat && q.cat !== 'all') list = list.filter((L) => catOf(L) === q.cat);
        if (q.cls) list = list.filter((L) => !L.goods.items.length || L.goods.items[0].slot !== 'weapon' || L.goods.items[0].cls === q.cls);
        if (q.minTier >= 0) list = list.filter((L) => !L.goods.items.length || L.goods.items[0].tier >= q.minTier);
      }
      const unit = (L) => (L.goods.items.length ? L.price : L.price / Object.values(L.goods.jewels)[0]);
      const sorts = { new: (a, b) => b.at - a.at, cheap: (a, b) => unit(a) - unit(b), dear: (a, b) => unit(b) - unit(a), plus: (a, b) => ((b.goods.items[0] || {}).plus || 0) - ((a.goods.items[0] || {}).plus || 0) };
      list.sort(sorts[q.sort] || sorts.new);
      const per = 20, page = Math.max(0, q.page | 0);
      // giá ngọc gần đây (trung bình 20 lần bán gần nhất) để người chơi tham khảo
      const recent = {};
      for (const k of MARKET.jewels) { const s = data.sales.filter((x) => x.jewel === k).slice(-20); if (s.length) recent[k] = Math.round(s.reduce((t, x) => t + x.unit, 0) / s.length); }
      return { total: list.length, page, per, rows: list.slice(page * per, page * per + per).map((L) => pubListing(L, acc.id)), recent, mine: Object.values(data.listings).filter((L) => L.seller === acc.id).length, fee: MARKET.fee, maxListings: MARKET.maxListings };
    },
    /** Đăng bán: lấy hàng khỏi bản lưu (d) và treo lên chợ */
    list(acc, d, body) {
      sweep();
      if (Object.values(data.listings).filter((L) => L.seller === acc.id).length >= MARKET.maxListings) throw new TradeError('Mỗi tài khoản chỉ đăng bán tối đa ' + MARKET.maxListings + ' món cùng lúc.');
      const price = int(body.price);
      if (!(price >= MARKET.minPrice && price <= MARKET.maxPrice)) throw new TradeError('Giá bán từ ' + MARKET.minPrice + ' đến 2 tỷ Zen.');
      let goods;
      if (body.itemId) goods = { items: [{ id: String(body.itemId) }], jewels: {}, zen: 0 };
      else if (MARKET.jewels.includes(body.jewel) && int(body.n) > 0) goods = { items: [], jewels: { [body.jewel]: Math.min(int(body.n), 9999) }, zen: 0 };
      else throw new TradeError('Chọn vật phẩm hoặc ngọc để bán.');
      const { taken, delta } = takeGoods(d, goods);
      const L = { id: nid(), seller: acc.id, sellerName: String(d.name || acc.user).slice(0, 20), goods: taken, price, at: Date.now(), exp: Date.now() + MARKET.listHours * 36e5 };
      data.listings[L.id] = L; touch();
      return { delta, listing: pubListing(L, acc.id) };
    },
    /** Huỷ bán → hàng về hộp thư */
    cancel(acc, id) {
      const L = own(data.listings, id);
      if (!L || L.seller !== acc.id) throw new TradeError('Không tìm thấy món hàng của anh.', 404);
      delete own(data.listings, id); touch();
      mail(acc.id, 'Đã huỷ bán, trả lại: ' + goodsText(L.goods) + '.', L.goods);
    },
    /** Mua: trừ Zen người mua (d), hàng về hộp thư người mua, tiền (trừ phí) về hộp thư người bán */
    buy(acc, d, id) {
      sweep();
      const L = own(data.listings, id);
      if (!L) throw new TradeError('Món hàng này vừa được người khác mua hoặc đã gỡ.', 410);
      if (L.seller === acc.id) throw new TradeError('Không thể mua hàng của chính mình.');
      const { delta } = takeGoods(d, { items: [], jewels: {}, zen: L.price });
      delete own(data.listings, id);
      const fee = Math.floor(L.price * MARKET.fee), got = L.price - fee;
      taxHook(fee); // thuế chợ: lấy từ phí chợ, người bán vẫn nhận đúng L.price − fee
      const buyer = String(d.name || acc.user).slice(0, 20);
      mail(L.seller, 'Đã bán ' + goodsText(L.goods) + ' cho ' + buyer + ' giá ' + L.price.toLocaleString('vi-VN') + ' Zen (phí chợ ' + fee.toLocaleString('vi-VN') + ').', { items: [], jewels: {}, zen: got });
      mail(acc.id, 'Đã mua ' + goodsText(L.goods) + ' của ' + L.sellerName + ' giá ' + L.price.toLocaleString('vi-VN') + ' Zen.', L.goods);
      const jk = Object.keys(L.goods.jewels)[0];
      data.sales.push({ at: Date.now(), price: L.price, fee, jewel: L.goods.items.length ? null : jk, unit: L.goods.items.length ? L.price : L.price / L.goods.jewels[jk], seller: L.seller, buyer: acc.id });
      if (data.sales.length > 2000) data.sales.splice(0, data.sales.length - 2000);
      touch();
      return { delta };
    },
    /** Nhận thư: cho hàng vào bản lưu; đồ không vừa túi thì giữ lại trong thư */
    claim(acc, d) {
      acc.mail = acc.mail || [];
      let delta = { zen: 0, jewels: {}, add: [], remove: [] }, n = 0;
      const keep = [];
      for (const m of acc.mail) {
        const { delta: dl, left } = giveGoods(d, m.goods);
        delta = mergeDelta(delta, dl);
        if (!emptyGoods(left)) keep.push({ ...m, goods: left }); else n++;
      }
      acc.mail = keep; accounts.touch();
      return { delta, claimed: n, left: keep.length };
    },
    mailOf: (acc) => (acc.mail || []).map((m) => ({ id: m.id, at: m.at, text: m.text, goods: m.goods })),
    // ---- giao dịch trực tiếp: đồ khoá được giữ ở đây ----
    escrowPut(tid, slot, accId, goods) { (data.escrow[tid] ||= [null, null])[slot] = { acc: accId, goods }; touch(); },
    escrowTake(tid) { const e = data.escrow[tid]; delete data.escrow[tid]; touch(); return e || [null, null]; },
    adminStats: () => ({ listings: Object.keys(data.listings).length, sales24h: data.sales.filter((s) => s.at > Date.now() - 864e5).length, fees24h: data.sales.filter((s) => s.at > Date.now() - 864e5).reduce((t, s) => t + s.fee, 0) }),
    salesOf: (accId) => data.sales.filter((s) => s.seller === accId || s.buyer === accId).slice(-50),
    cleanGoods, emptyGoods,
  };
}
