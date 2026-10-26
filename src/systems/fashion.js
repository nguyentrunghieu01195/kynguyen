// Thời trang: mở khóa, mua, mặc. Chỉ đổi ngoại hình, không ảnh hưởng chỉ số.
import { G } from '../core/state.js';
import { on, EV, log, announce, sysOn } from '../core/events.js';
import { fmt } from '../core/utils.js';
import { FASHION, FASHION_BY_ID, FASHION_SLOTS } from '../config/fashion.js';

export const defaultFashion = () => ({ owned: [], eq: { outfit: null, head: null, aura: null }, show: true });

/** [hiện tại, cần] cho điều kiện mở khóa */
export function unlockProgress(f) {
  const S = G.S, u = f.unlock;
  switch (u.type) {
    case 'checkin': return [S.quest ? S.quest.checkin.count : 0, u.n];
    case 'tower': return [S.tower ? S.tower.best : 0, u.n];
    case 'events': return [S.evDone || 0, u.n];
    case 'reset': return [S.resets, u.n];
    case 'kills': return [S.kills || 0, u.n];
    case 'master': return [S.master ? S.master.lv : 0, u.n];
    case 'nm': return [S.nmKills || 0, u.n];
    case 'god': return [[...Object.values(S.equip || {}), ...(S.inv || [])].filter((it) => it && it.god > 0).length, u.n];
    default: return [0, 1];
  }
}
export const unlockText = (f) => {
  const u = f.unlock, [a, b] = unlockProgress(f);
  return { shop: 'Mua bằng ' + fmt(u.zen) + ' Zen', checkin: 'Điểm danh ' + Math.min(a, b) + '/' + b + ' ngày', tower: 'Vượt tầng ' + b + ' Tháp Vô Tận (kỷ lục ' + a + ')',
    events: 'Hoàn thành sự kiện ' + Math.min(a, b) + '/' + b + ' lần', reset: 'Reset ' + Math.min(a, b) + '/' + b + ' lần', kills: 'Hạ ' + fmt(Math.min(a, b)) + '/' + fmt(b) + ' quái', master: 'Đạt Master ' + Math.min(a, b) + '/' + b, nm: 'Hạ Hỗn Mang Chi Vương ' + Math.min(a, b) + '/' + b + ' lần', god: 'Sở hữu ' + Math.min(a, b) + '/' + b + ' món đồ Thần' }[u.type];
};
export const owns = (id) => G.S.fashion.owned.includes(id);

/** Tự mở khóa các món đủ điều kiện */
export function checkUnlocks(silent) {
  const S = G.S;
  if (!S || !S.fashion) return;
  for (const f of FASHION) {
    if (f.unlock.type === 'shop' || owns(f.id)) continue;
    const [a, b] = unlockProgress(f);
    if (a >= b) {
      S.fashion.owned.push(f.id);
      if (!silent) { announce('👗 Mở khóa thời trang: ' + f.name + '!'); log('👗 Mở khóa <b>' + f.name + '</b> (' + FASHION_SLOTS[f.slot] + '). Vào <b>Nhân vật → Thời trang</b> để mặc.', '#ffb8f0'); }
    }
  }
}

export function buyFashion(id) {
  const S = G.S, f = FASHION_BY_ID[id];
  if (!f || f.unlock.type !== 'shop' || owns(id) || S.zen < f.unlock.zen) return false;
  S.zen -= f.unlock.zen;
  S.fashion.owned.push(id);
  return true;
}

/** Mặc / cởi 1 món */
export function toggleFashion(id) {
  const f = FASHION_BY_ID[id], E = G.S.fashion.eq;
  if (!f || !owns(id)) return false;
  E[f.slot] = E[f.slot] === id ? null : id;
  return true;
}

/** Ngoại hình thời trang đang hiển thị: { outfit, head, aura } (id hoặc null) */
export function fashionLook(S) {
  if (!S.fashion || !S.fashion.show) return null;
  return S.fashion.eq;
}

let inited = false;
export function initFashion() {
  if (inited) return;
  inited = true;
  sysOn(EV.EVENT, (id, ok) => { if (ok && G.S) { G.S.evDone = (G.S.evDone || 0) + 1; checkUnlocks(); } });
  sysOn(EV.QUEST, () => checkUnlocks());
  sysOn(EV.TOWER_FLOOR, () => checkUnlocks());
  sysOn(EV.RESET, () => checkUnlocks());
  sysOn(EV.KILL, () => { if (G.S && G.S.kills % 250 === 0) checkUnlocks(); });
}
