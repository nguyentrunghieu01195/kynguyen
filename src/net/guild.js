// Bang hội — phía máy người chơi: gọi API máy chủ + nhận chat bang. Mọi luật do máy chủ quyết định (server/src/guilds.js).
import { esc } from '../core/utils.js';
import { log } from '../core/events.js';
import { apiReq, saveOp } from './account.js';
import { registerRecv, sendRaw } from './client.js';

export const GD = {
  mine: null,          // chi tiết bang của mình (null = chưa vào bang)
  loaded: false,
  list: null,          // danh sách bang đang xem
  page: 0, q: '',
  chat: [],
  boss: null, bossAt: 0,
  siege: null, siegeAt: 0,   // trạng thái Công thành chiến từ máy chủ   // trạng thái Boss bang từ máy chủ
  auction: { guild: null, world: null },
  onChat: null,        // giao diện đăng ký để vẽ lại khi có tin mới
};

registerRecv({
  gchat(m) {
    GD.chat.push(m); if (GD.chat.length > 50) GD.chat.shift();
    log('<span style="color:#9fe08f">[Bang] ' + esc(m.from) + ':</span> ' + esc(m.text), '#e8ffe0');
    if (GD.onChat) GD.onChat(m);
  },
});

const take = (j) => { GD.mine = j.guild || null; if (GD.mine) GD.chat = GD.mine.chat || GD.chat; else GD.chat = []; GD.loaded = true; return j; };

export const loadMine = async () => take(await apiReq('GET', '/api/guild'));
export const loadList = async () => { GD.list = await apiReq('GET', '/api/guild/list?page=' + GD.page + '&q=' + encodeURIComponent(GD.q)); GD.page = GD.list.page; };
export const createGuild = async (name) => take(await saveOp('/api/guild/create', { name }));
export const loadBoss = async () => { GD.boss = await apiReq('GET', '/api/gboss'); GD.bossAt = Date.now(); };
export const loadSiege = async () => { GD.siege = await apiReq('GET', '/api/siege'); GD.siegeAt = Date.now(); };
export const registerSiege = async () => saveOp('/api/siege/register', {});
export const distributeFund = async () => take(await apiReq('POST', '/api/guild/fund', {}));
export const loadAuction = async (scope) => { GD.auction[scope] = await apiReq('GET', '/api/auction?scope=' + scope); };
export const bidLot = async (id, amount) => saveOp('/api/auction/bid', { id, amount });
export const claimQuest = async (id) => take(await saveOp('/api/guild/quest', { id }));
export const donate = async (zen, jewels) => take(await saveOp('/api/guild/donate', { zen, jewels }));
/** Các thao tác còn lại: apply | cancel | accept | reject | kick | role | transfer | leave | disband | notice */
export const guildOp = async (op, body) => take(await apiReq('POST', '/api/guild/' + op, body));
export const sendGuildChat = (text) => { text = String(text || '').trim(); if (!text) return false; sendRaw({ t: 'gchat', text }); return true; };
