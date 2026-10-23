import { G } from '../core/state.js';
import { POTION, SHOP } from '../config/balance.js';
import { emit, EV } from '../core/events.js';
import { TICKETS } from '../config/events.js';

export const SHOP_ITEMS = {
  hp: { name: '❤️ Bình Máu', desc: 'Hồi 35% HP (tự dùng khi HP dưới 45%)', price: () => POTION.price(G.S.lv, 'hp'), qty: [10, 50, 200], give: (n) => (G.S.pot.hp += n) },
  mp: { name: '💧 Bình Mana', desc: 'Hồi 40% MP (tự dùng khi MP dưới 25%)', price: () => POTION.price(G.S.lv, 'mp'), qty: [10, 50, 200], give: (n) => (G.S.pot.mp += n) },
  ticketBc: { name: '🏰 ' + TICKETS.bc.name, desc: 'Vào sự kiện Huyết Lâu 1 lần', price: () => TICKETS.bc.price(G.S.lv), qty: [1, 3], give: (n) => (G.S.tickets.bc += n) },
  ticketDs: { name: '😈 ' + TICKETS.ds.name, desc: 'Vào sự kiện Quảng Trường Quỷ 1 lần', price: () => TICKETS.ds.price(G.S.lv), qty: [1, 3], give: (n) => (G.S.tickets.ds += n) },
  charm: { name: '🛡️ Bùa Bảo Hộ', desc: 'Giữ nguyên món đồ khi ép thất bại', price: () => SHOP.charmPrice, qty: [1, 5], give: (n) => (G.S.charm += n) },
};

export function buy(key, n) {
  const item = SHOP_ITEMS[key];
  if (!item) return false;
  const cost = item.price() * n;
  if (G.S.zen < cost) return false;
  G.S.zen -= cost;
  item.give(n);
  emit(EV.BUY, key, n);
  return true;
}
