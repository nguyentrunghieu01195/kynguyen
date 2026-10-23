// Boss Bang Hội + Đấu giá quà xếp hạng (dữ liệu: gboss.json).
//
// Vòng đời một đợt (12:00 / 20:00 giờ VN, mở 15 phút — xem src/config/gboss.js):
//   mở cổng → thành viên bang đánh Boss (sát thương lượt tốt nhất của mỗi người, do máy chủ tính) → đóng cổng
//   → xếp hạng bang → mỗi phần quà thành 1 PHIÊN ĐẤU GIÁ:
//        giai đoạn 'guild' (15 phút): chỉ người của bang đó đã đánh Boss được đặt giá; tiền thu được chia đều cho những người đã đánh
//        không ai đặt giá → giai đoạn 'world' (30 phút): ai cũng đặt giá; tiền thu được bị thu hồi khỏi game (hút Zen)
//        vẫn không ai đặt → quà gửi cho người gây sát thương cao nhất của bang đó
// Tiền đặt giá bị trừ ngay trên nhân vật (escrow); bị vượt giá thì hoàn qua hộp thư. Mọi thứ nhận qua hộp thư.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { GBOSS, gbossStatus, rewardsForRank, AUCTION, nextBid } from '../../src/config/gboss.js';
import { makeItem, rollExc } from '../../src/systems/items.js';
import { WEAPON_TYPES, LINE_B_CHANCE, specialWeaponIndex } from '../../src/config/gear.js';
import { DROP_SLOTS } from '../../src/config/items.js';
import { TradeError, cleanItem, goodsText } from './market.js';

const nid = () => crypto.randomBytes(5).toString('hex');
const bad = (msg, status = 400) => new TradeError(msg, status);
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const CLASSES = ['knight', 'wizard', 'archer'];
const emptyGoods = () => ({ items: [], jewels: {}, zen: 0 });

/** Tạo món đồ cho 1 phần quà: loại đồ ngẫu nhiên, vũ khí thuộc lớp ngẫu nhiên */
function lotItem(spec) {
  const slot = spec.slot || DROP_SLOTS[rint(0, DROP_SLOTS.length - 1)], cls = spec.cls || CLASSES[rint(0, 2)];
  const extra = slot === 'weapon' ? { wt: spec.special ? specialWeaponIndex(cls) : rint(0, WEAPON_TYPES[cls].filter((w) => !w.special).length - 1) } : { line: Math.random() < LINE_B_CHANCE ? 1 : 0 };
  return cleanItem(makeItem(slot, spec.tier, spec.plus || 0, spec.exc ? rollExc(slot, spec.exc) : null, cls, extra));
}

const MIN_SEC = +process.env.GBOSS_MIN_ACTIVE_SEC || GBOSS.minActiveSec; // biến môi trường chỉ dùng để thử nghiệm

export function createGBoss(dir, { guilds, store, market, notify = () => {}, announce = () => {} }) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'gboss.json');
  let data = { round: null, last: null, lots: {} };
  try { data = Object.assign(data, JSON.parse(fs.readFileSync(file, 'utf8'))); } catch (e) { /* file mới */ }
  let dirty = false, timer = null;
  const flush = () => { if (!dirty) return; dirty = false; const tmp = file + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(data)); fs.renameSync(tmp, file); };
  const touch = () => { dirty = true; if (!timer) timer = setTimeout(() => { timer = null; flush(); }, 1000); };
  const nameOf = (accId) => (store.findByAccount(accId) || {}).name || '???';
  const fmtZ = (n) => n.toLocaleString('vi-VN');

  // ---------------- ĐỢT BOSS ----------------
  function ensureRound(st) {
    if (data.round && data.round.key === st.key) return data.round;
    if (data.round) finalize();
    data.round = { key: st.key, startAt: st.startAt, endAt: st.endAt, guilds: {}, accGuild: {} };
    touch();
    return data.round;
  }

  /** Máy chủ báo sát thương mới của 1 người (do máy chủ tính trên nhân vật thật; chỉ cộng dồn) */
  function addDamage(accId, key, delta, sec = 0) {
    const now = Date.now(), st = gbossStatus(now);
    let R = data.round;
    if (st.open && st.key === key) R = ensureRound(st);
    else if (!R || R.key !== key || now > R.endAt + GBOSS.graceMs) return false;
    const gid = guilds.guildIdOf(accId), dmg = Math.max(0, Math.min(1e12, Math.floor(+delta || 0)));
    if (!gid || !dmg || (R.accGuild[accId] && R.accGuild[accId] !== gid)) return false;
    const G = (R.guilds[gid] ||= { name: guilds.nameOf(gid) || '???', total: 0, members: {} });
    const m = (G.members[accId] ||= { name: nameOf(accId), dmg: 0, lv: 1 });
    const p = store.findByAccount(accId); if (p) { m.name = p.name; m.lv = p.lv || 1; }
    R.accGuild[accId] = gid;
    m.dmg += dmg; G.total += dmg; m.sec = (m.sec || 0) + Math.max(0, Math.min(GBOSS.windowMin * 60, sec)); touch();
    return true;
  }
  /** Bảng xếp hạng bang của đợt đang diễn ra (cho HUD trong trận): top 3 + hạng / điểm của bang gid */
  function board(gid, accId) {
    const R = data.round;
    if (!R) return { top: [], rank: null, total: 0, sec: 0, minSec: MIN_SEC };
    const list = rankList(R), pos = list.findIndex(([g]) => g === gid);
    return { top: list.slice(0, 3).map(([, g]) => ({ name: g.name, total: g.total })), rank: pos < 0 ? null : pos + 1, total: pos < 0 ? 0 : list[pos][1].total, sec: pos < 0 ? 0 : Math.floor(((list[pos][1].members[accId] || {}).sec) || 0), minSec: MIN_SEC };
  }

  /** Đủ điều kiện tham gia: đã chiến đấu thực sự (có gây sát thương) ít nhất MIN_SEC giây */
  const qualifies = (m) => m.dmg > 0 && (m.sec || 0) >= MIN_SEC;
  const rankList = (R) => Object.entries(R.guilds).filter(([, g]) => g.total > 0).sort((a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]));

  function finalize() {
    const R = data.round;
    data.round = null;
    if (!R) return;
    const ranked = rankList(R), now = Date.now();
    const last = { key: R.key, at: now, ranks: [] };
    ranked.forEach(([gid, g], i) => {
      const rank = i + 1, all = Object.entries(g.members).filter(([, m]) => m.dmg > 0), members = all.filter(([, m]) => qualifies(m)).sort((a, b) => b[1].dmg - a[1].dmg); // chỉ người đủ ngưỡng mới có quà
      const accs = members.map(([a]) => a), specs = rewardsForRank(rank);
      last.ranks.push({ gid, name: g.name, total: g.total, n: all.length, q: accs.length, rank, lots: specs.length, members: members.slice(0, 15).map(([, m]) => ({ name: m.name, dmg: m.dmg })) });
      for (const spec of specs) {
        const goods = emptyGoods();
        if (spec.item) { const it = lotItem(spec.item); if (it) goods.items.push(it); }
        if (spec.jewels) for (const [k, n] of Object.entries(spec.jewels)) if (n > 0) goods.jewels[k] = n;
        const lot = { id: nid(), round: R.key, gid, gname: g.name, rank, goods, start: spec.start, diy: spec.diy, stage: 'guild', status: 'active', createdAt: now, endAt: now + AUCTION.guildMin * 60000, bid: null, eligible: accs, split: accs, mvp: accs[0] };
        data.lots[lot.id] = lot;
      }
      // thưởng tham gia: mọi người đã đánh
      for (const [a, m] of members) {
        const r = GBOSS.participation(m.lv || 1);
        market.mail(a, GBOSS.icon + ' Thưởng tham gia Boss bang (bang ' + g.name + ' hạng ' + rank + ').', { items: [], jewels: { bless: r.bless || 0 }, zen: r.zen || 0 });
      }
      if (specs.length) notify(accs, GBOSS.icon + ' Bang ' + g.name + ' đứng hạng ' + rank + ' Boss bang! Có ' + specs.length + ' phần quà đang đấu giá — mở 🔨 Đấu giá (còn ' + AUCTION.guildMin + ' phút trong bang).');
    });
    data.last = last;
    trim();
    touch();
    if (ranked.length) announce(GBOSS.icon + ' Boss bang kết thúc! Hạng 1: ' + ranked[0][1].name + ' (' + fmtZ(ranked[0][1].total) + ' sát thương)' + (ranked[1] ? ' · Hạng 2: ' + ranked[1][1].name : '') + (ranked[2] ? ' · Hạng 3: ' + ranked[2][1].name : ''));
  }

  // ---------------- ĐẤU GIÁ ----------------
  function trim() {
    const done = Object.values(data.lots).filter((l) => l.status === 'done').sort((a, b) => b.doneAt - a.doneAt);
    for (const l of done.slice(AUCTION.maxLots)) delete data.lots[l.id];
  }
  const finish = (lot, result) => { lot.status = 'done'; lot.doneAt = Date.now(); lot.result = result; touch(); };

  function resolve(lot) {
    const text = goodsText(lot.goods), now = Date.now();
    if (lot.bid) {
      const b = lot.bid;
      market.mail(b.acc, '🔨 Thắng đấu giá ' + text + ' với giá ' + fmtZ(b.amount) + ' Zen!', lot.goods);
      notify([b.acc], '🔨 Anh thắng đấu giá ' + text + ' với giá ' + fmtZ(b.amount) + ' Zen! Đồ đã gửi vào hộp thư.');
      if (lot.stage === 'guild' && lot.split.length) { // tiền thu được chia đều cho những người đã đánh Boss của bang
        const share = Math.floor(b.amount / lot.split.length);
        if (share > 0) for (const a of lot.split) market.mail(a, '🔨 Chia tiền đấu giá ' + text + ' (' + fmtZ(b.amount) + ' Zen / ' + lot.split.length + ' người).', { items: [], jewels: {}, zen: share });
      }
      finish(lot, { winner: b.name, amount: b.amount, stage: lot.stage });
    } else if (lot.stage === 'guild') {
      lot.stage = 'world'; lot.endAt = now + AUCTION.worldMin * 60000; touch(); // ra đấu giá thế giới
    } else {
      market.mail(lot.mvp, '🔨 Phần quà không ai đấu giá, gửi tặng người gây sát thương cao nhất bang: ' + text + '.', lot.goods);
      finish(lot, { winner: null, stage: 'world' });
    }
  }

  function tick() {
    const now = Date.now(), st = gbossStatus(now);
    try {
      if (st.open) ensureRound(st);
      else if (data.round && now >= data.round.endAt + GBOSS.graceMs) finalize();
      for (const lot of Object.values(data.lots)) if (lot.status === 'active' && lot.endAt <= now) resolve(lot);
    } catch (e) { console.error('[gboss] tick', e); }
  }
  setTimeout(tick, 1000);
  setInterval(tick, 3000).unref();

  /** Tạo các phiên đấu giá bang từ danh sách quà (dùng cho xếp hạng Boss và quà công thành). accs = người đủ điều kiện */
  function addLots({ gid, gname, rank = 0, specs, accs, mvp }) {
    const now = Date.now(), ids = [];
    for (const spec of specs) {
      const goods = emptyGoods();
      if (spec.item) { const it = lotItem(spec.item); if (it) goods.items.push(it); }
      if (spec.jewels) for (const [k, n] of Object.entries(spec.jewels)) if (n > 0) goods.jewels[k] = n;
      const lot = { id: nid(), round: 'extra', gid, gname, rank, goods, start: spec.start, diy: spec.diy, stage: 'guild', status: 'active', createdAt: now, endAt: now + AUCTION.guildMin * 60000, bid: null, eligible: accs, split: accs, mvp: mvp || accs[0] };
      data.lots[lot.id] = lot; ids.push(lot.id);
    }
    trim(); touch();
    return ids;
  }

  const pubLot = (lot, accId, myGid) => ({
    id: lot.id, gid: lot.gid, gname: lot.gname, rank: lot.rank, goods: lot.goods, start: lot.start, diy: lot.diy || 0, stage: lot.stage, status: lot.status, endAt: lot.endAt,
    bid: lot.bid ? { name: lot.bid.name, amount: lot.bid.amount, mine: lot.bid.acc === accId } : null, next: nextBid(lot),
    canBid: lot.status === 'active' && (lot.stage === 'world' || (lot.eligible.includes(accId))) , result: lot.result || null, ownGuild: lot.gid === myGid,
  });

  return {
    flush, dump: () => data, tick, addDamage, board, addLots,
    /** Trạng thái Boss bang cho người chơi */
    status(accId) {
      const st = gbossStatus(), R = data.round, myGid = guilds.guildIdOf(accId);
      const cur = R ? rankList(R) : [];
      const view = (list) => list.slice(0, 10).map(([gid, g], i) => ({ rank: i + 1, gid, name: g.name, total: g.total, n: Object.keys(g.members).length, mine: gid === myGid }));
      let mine = null;
      if (R && myGid && R.guilds[myGid]) {
        const G = R.guilds[myGid], pos = cur.findIndex(([gid]) => gid === myGid);
        mine = { rank: pos < 0 ? null : pos + 1, total: G.total, minSec: MIN_SEC, members: Object.entries(G.members).sort((a, b) => b[1].dmg - a[1].dmg).slice(0, 20).map(([a, m]) => ({ name: m.name, dmg: m.dmg, sec: Math.floor(m.sec || 0), me: a === accId, ok: qualifies(m) })) };
      }
      const last = data.last && { key: data.last.key, at: data.last.at, ranks: data.last.ranks.slice(0, 10).map((r) => ({ rank: r.rank, name: r.name, total: r.total, n: r.n, q: r.q, lots: r.lots, mine: r.gid === myGid })), mine: data.last.ranks.find((r) => r.gid === myGid) || null };
      return { st: { open: st.open, key: st.key, secLeft: st.secLeft, secUntil: st.secUntil, nextAt: st.nextAt, endAt: st.endAt }, round: R ? view(cur) : [], mine, last, now: Date.now() };
    },
    /** Danh sách phiên đấu giá: scope 'guild' (bang của mình) | 'world' */
    lots(accId, scope) {
      const myGid = guilds.guildIdOf(accId), now = Date.now();
      const all = Object.values(data.lots);
      const act = all.filter((l) => l.status === 'active' && (scope === 'world' ? l.stage === 'world' : l.stage === 'guild' && l.gid === myGid)).sort((a, b) => a.endAt - b.endAt);
      const done = all.filter((l) => l.status === 'done' && (scope === 'world' ? l.result && l.result.stage === 'world' : l.gid === myGid)).sort((a, b) => b.doneAt - a.doneAt).slice(0, 10);
      return { now, lots: act.map((l) => pubLot(l, accId, myGid)), done: done.map((l) => pubLot(l, accId, myGid)) };
    },
    /** Đặt giá: trừ Zen trên nhân vật S (escrow); hoàn tiền người bị vượt qua hộp thư */
    bid(accId, S, id, rawAmount) {
      const lot = data.lots[id], amount = Math.floor(+rawAmount);
      if (!lot || lot.status !== 'active') throw bad('Phiên đấu giá này đã kết thúc.', 410);
      if (lot.endAt <= Date.now()) throw bad('Phiên đấu giá vừa hết giờ.', 410);
      if (lot.stage === 'guild' && !lot.eligible.includes(accId)) throw bad('Chỉ người đã đánh Boss của bang ' + lot.gname + ' mới được đặt giá.', 403);
      if (!Number.isFinite(amount) || amount > AUCTION.maxPrice) throw bad('Giá không hợp lệ.');
      if (amount < nextBid(lot)) throw bad('Cần trả tối thiểu ' + fmtZ(nextBid(lot)) + ' Zen.');
      const prev = lot.bid, mine = prev && prev.acc === accId, need = mine ? amount - prev.amount : amount;
      if ((S.zen || 0) < need) throw bad('Không đủ Zen.');
      S.zen -= need;
      if (prev && !mine) market.mail(prev.acc, '🔨 Anh bị trả giá cao hơn cho ' + goodsText(lot.goods) + ' — hoàn lại ' + fmtZ(prev.amount) + ' Zen.', { items: [], jewels: {}, zen: prev.amount });
      const now = Date.now();
      lot.bid = { acc: accId, name: String(S.name || nameOf(accId)).slice(0, 20), amount, at: now };
      // chống đặt giá phút chót: đặt khi sắp hết giờ thì cộng thêm thời gian (tối đa AUCTION.snipeMaxMin phút)
      let extended = false;
      if (lot.endAt - now < AUCTION.snipeSec * 1000) {
        const cap = (lot.baseEnd || (lot.baseEnd = lot.endAt)) + AUCTION.snipeMaxMin * 60000, to = Math.min(cap, now + AUCTION.snipeExtendSec * 1000);
        if (to > lot.endAt) { lot.endAt = to; extended = true; }
      }
      if (prev && !mine) notify([prev.acc], '🔨 Anh bị ' + lot.bid.name + ' trả giá cao hơn cho ' + goodsText(lot.goods) + ' (' + fmtZ(amount) + ' Zen). Zen đã hoàn lại — mở 🔨 Đấu giá để đặt đè.');
      touch();
      return { lot: pubLot(lot, accId, guilds.guildIdOf(accId)), extended };
    },
    stats: () => ({ active: Object.values(data.lots).filter((l) => l.status === 'active').length, lots: Object.keys(data.lots).length }),
  };
}
