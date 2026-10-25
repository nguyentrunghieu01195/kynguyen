// Quản lý bảng: đăng ký, mở/đóng, vẽ lại sau mỗi hành động.
// Thêm bảng mới: tạo file trong thư mục này rồi thêm vào mảng PANEL_LIST.
import { G } from '../../core/state.js';
import { saveGame } from '../../core/save.js';
import { $, UI } from '../dom.js';
import { NET } from '../../net/client.js';
import character from './character.js';
import inventory from './inventory.js';
import upgrade from './upgrade.js';
import worldmap from './worldmap.js';
import shop from './shop.js';
import reset from './reset.js';
import settings from './settings.js';
import quests from './quests.js';
import offline from './offline.js';
import { eventsPanel, resultPanel } from './events.js';
import { towerResultPanel } from './tower.js';
import { chatPanel, rankPanel } from './online.js';
import fashion from './fashion.js';
import pets from './pets.js';
import skills from './skills.js';
import master from './master.js';
import classchange from './classchange.js';
import divine from './divine.js';
import lootPanel from './loot.js';
import { bigMapPanel } from '../minimap.js';
import { cloudPanel } from './cloud.js';
import { marketPanel, initMarket } from './market.js';
import { guildPanel, initGuildUi } from './guild.js';
import { auctionPanel, initAuctionUi } from './auction.js';
import { tradePanel, onTradeEvent, TR } from './trade.js';
import { on, EV } from '../../core/events.js';

const PANEL_LIST = [character, inventory, upgrade, worldmap, shop, reset, settings, quests, offline, eventsPanel, resultPanel, towerResultPanel, chatPanel, rankPanel, fashion, pets, skills, master, classchange, divine, lootPanel, bigMapPanel, cloudPanel, marketPanel, tradePanel, guildPanel, auctionPanel];
export const PANELS = Object.fromEntries(PANEL_LIST.map((p) => [p.id, p]));

export function initTradeUi() {
  initMarket(() => renderPanel());
  initGuildUi(() => renderPanel());
  initAuctionUi(() => renderPanel());
  on(EV.TRADE, (kind, m) => onTradeEvent(kind, m, openPanel, renderPanel));
}

export function openPanel(id) {
  UI.panel = id;
  if (id === 'chat') NET.unread = 0;
  if (G.R) G.R.panel = id;
  if (id !== 'set') UI.wipeConfirm = false;
  $('panel').classList.remove('hidden');
  renderPanel();
  // bảng cần tải dữ liệu từ máy chủ khi mở (vd. Chợ)
  const r = PANELS[id].onOpen && PANELS[id].onOpen();
  if (r && typeof r.then === 'function') r.then(() => { if (UI.panel === id) renderPanel(); });
}

export function closePanel() {
  if (UI.panel === 'trade') TR.result = null;
  UI.panel = null;
  if (G.R) G.R.panel = null;
  $('panel').classList.add('hidden');
  if (G.R) G.R.saveOk = saveGame();
}

export const togglePanel = (id) => (UI.panel === id ? closePanel() : openPanel(id));

export function renderPanel() {
  if (!UI.panel) return;
  const p = PANELS[UI.panel], body = $('panel-body'), scroll = body.scrollTop;
  $('panel-title').textContent = p.title;
  body.innerHTML = p.render();
  body.scrollTop = scroll;
}

/** Tìm hành động trong bảng đang mở. Trả về true nếu đã xử lý. */
export function runPanelAction(name, data) {
  const p = UI.panel && PANELS[UI.panel];
  if (!p || !p.actions[name]) return false;
  const res = p.actions[name](data);
  if (res && typeof res.then === 'function') { // hành động bất đồng bộ (gọi máy chủ): xử lý kết quả khi xong
    res.then((r) => { if (UI.panel !== p.id) return; if (r && r.close) closePanel(); else if (r && r.open) openPanel(r.open); else if (!(r && r.keep)) renderPanel(); });
    renderPanel();
    return true;
  }
  if (res && res.keep) { /* giữ nguyên nội dung (vd. ô nhập chat) */ }
  else if (res && res.close) closePanel();
  else if (res && res.open) openPanel(res.open);
  else renderPanel();
  return true;
}
