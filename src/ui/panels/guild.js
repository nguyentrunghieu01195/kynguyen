// Bảng Bang hội: tìm / lập bang, thành viên, quyên góp, chat bang. Mọi luật do máy chủ quyết định (server/src/guilds.js).
import { G } from '../../core/state.js';
import { on, EV, log } from '../../core/events.js';
import { esc, fmt } from '../../core/utils.js';
import { act } from '../../net/actions.js';
import { GBOSS, gbossStatus } from '../../config/gboss.js';
import { gbossBlock } from '../../systems/gboss.js';
import { GUILD, GUILD_QUESTS, guildBuff } from '../../config/guild.js';
import { ensureGuildQ, guildQList, guildQDone, goalProgress } from '../../systems/quests.js';
import { JEWELS, JEWEL_KEYS } from '../../config/items.js';
import { CLASSES } from '../../config/classes.js';
import { btn } from '../components.js';
import { UI, $ } from '../dom.js';
import { saveGame } from '../../core/save.js';
import { loggedIn, apiBase } from '../../net/account.js';
import { NET } from '../../net/client.js';
import { GD, loadMine, loadList, createGuild, claimQuest, loadBoss, donate, guildOp, sendGuildChat } from '../../net/guild.js';

const GS = { tab: 'info', msg: '', err: false, busy: false, confirm: null };
const say = (m, err) => { GS.msg = m || ''; GS.err = !!err; };
const errOf = (e) => (e && e.message) || 'Có lỗi, thử lại nhé.';
const ROLE = { leader: '👑 Bang chủ', officer: '⭐ Phó bang', member: 'Thành viên' };
const time = (ts) => { const d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
const msgLine = () => (GS.msg ? '<div class="tip" style="color:' + (GS.err ? '#ff8a7a' : '#8f8') + '">' + esc(GS.msg) + '</div>' : '');
const tabBar = (tabs) => '<div class="tabs">' + tabs.map(([k, n]) => '<button class="tab' + (GS.tab === k ? ' on' : '') + '" data-act="gTab" data-t="' + k + '">' + n + '</button>').join('') + '</div>';
const mgr = () => GD.mine && (GD.mine.role === 'leader' || GD.mine.role === 'officer');

/** Chạy 1 thao tác gọi máy chủ, hiện kết quả */
async function run(fn, okMsg) {
  GS.busy = true;
  try { const r = await fn(); say(typeof okMsg === 'function' ? okMsg(r) : okMsg); GS.confirm = null; return r; }
  catch (e) { say(errOf(e), true); }
  finally { GS.busy = false; }
}
/** Thao tác huỷ diệt cần bấm 2 lần */
const twice = (key) => { if (GS.confirm !== key) { GS.confirm = key; say('Bấm lần nữa để xác nhận.', true); return false; } return true; };

// ---------------- CHƯA CÓ BANG ----------------
function renderNoGuild() {
  const rows = GD.list ? GD.list.rows : null;
  let h = tabBar([['list', '🏰 Tìm bang'], ['create', '➕ Lập bang']]) + msgLine();
  if (GS.tab === 'create') {
    return h + '<div class="tip">Lập bang cần <b>cấp ' + GUILD.createMinLv + '</b> và <b>' + fmt(GUILD.createCost) + ' Zen</b>. Tên bang ' + GUILD.nameMin + '–' + GUILD.nameMax + ' ký tự, không trùng.</div>' +
      '<div class="row" style="flex-wrap:nowrap"><input id="gname" maxlength="' + GUILD.nameMax + '" placeholder="Tên bang hội" autocomplete="off">' + btn('Lập bang', 'gCreate', {}, { cls: 'green', disabled: GS.busy }) + '</div>' +
      '<p class="muted" style="margin-top:8px">💰 ' + fmt(G.S.zen) + ' Zen · Cấp ' + G.S.lv + '</p>';
  }
  h += '<div class="row" style="flex-wrap:nowrap;margin-bottom:6px"><input id="gq" maxlength="' + GUILD.nameMax + '" placeholder="Tìm theo tên bang" value="' + esc(GD.q) + '" autocomplete="off">' + btn('Tìm', 'gSearch', {}, { cls: 'sm' }) + '</div>';
  if (!rows) return h + '<p class="muted">Đang tải…</p>';
  if (!rows.length) return h + '<p class="muted">Chưa có bang nào. Hãy là người đầu tiên lập bang!</p>';
  h += '<div class="mklist">' + rows.map((r) => '<div class="mkrow"><div class="mkinfo"><b>#' + r.rank + ' ' + esc(r.name) + '</b> <span class="muted">Cấp ' + r.lv + '</span>' +
    '<div class="muted">Bang chủ ' + esc(r.leader) + ' · ' + r.n + '/' + r.cap + ' người · ' + fmt(r.exp) + ' điểm</div></div>' +
    (r.applied ? btn('Rút đơn', 'gCancel', { id: r.id }, { cls: 'sm' }) : btn('Xin vào', 'gApply', { id: r.id }, { cls: 'sm green', disabled: r.n >= r.cap })) + '</div>').join('') + '</div>';
  const pages = Math.ceil(GD.list.total / GD.list.per);
  if (pages > 1) h += '<div class="row" style="justify-content:center;margin-top:8px">' + btn('◀', 'gPage', { d: -1 }, { cls: 'sm', disabled: GD.page <= 0 }) + '<span class="muted" style="align-self:center">' + (GD.page + 1) + '/' + pages + '</span>' + btn('▶', 'gPage', { d: 1 }, { cls: 'sm', disabled: GD.page >= pages - 1 }) + '</div>';
  return h;
}

// ---------------- ĐÃ CÓ BANG ----------------
function renderInfo(g) {
  const pct = g.next ? Math.min(100, Math.round(((g.exp - g.cur) / (g.next - g.cur)) * 100)) : 100, b = guildBuff(g.lv);
  const buffs = '⚔️ Sát thương +' + b.dmg + '% · ❤️ HP +' + b.hp + '% · 🛡 Phòng thủ +' + b.def + '%';
  let h = '<div class="tip"><b style="font-size:15px">🏰 ' + esc(g.name) + '</b> <span class="muted">· Cấp ' + g.lv + ' · ' + g.members.length + '/' + g.cap + ' người · Bang chủ ' + esc(g.leader) + '</span>' +
    '<div class="bar" style="margin:6px 0"><div style="width:' + pct + '%;background:linear-gradient(#e8c050,#8a6a10)"></div><span>' + (g.next ? fmt(g.exp) + ' / ' + fmt(g.next) + ' điểm' : 'Cấp tối đa · ' + fmt(g.exp) + ' điểm') + '</span></div>' +
    '<div>' + buffs + '</div></div>';
  h += '<div class="tip">📌 ' + (g.notice ? esc(g.notice) : '<span class="muted">Chưa có thông báo.</span>') + '</div>';
  if (mgr()) h += '<div class="row" style="flex-wrap:nowrap"><input id="gnotice" maxlength="120" placeholder="Sửa thông báo bang" value="' + esc(g.notice) + '" autocomplete="off">' + btn('Lưu', 'gNotice', {}, { cls: 'sm' }) + '</div>';
  h += '<p class="muted" style="margin-top:8px">Quyên Zen / ngọc ở tab <b>Quyên góp</b> để bang lên cấp — cấp càng cao, mọi thành viên càng mạnh. Bang đã đủ ' + g.cap + ' chỗ thì cần lên cấp để mở rộng.</p>';
  h += g.role === 'leader'
    ? (g.members.length > 1 ? '' : btn(GS.confirm === 'disband' ? '⚠ Bấm lần nữa để giải tán' : 'Giải tán bang', 'gDisband', {}, { cls: 'red' }))
    : btn(GS.confirm === 'leave' ? '⚠ Bấm lần nữa để rời bang' : 'Rời bang', 'gLeave', {}, { cls: 'red' });
  if (g.role === 'leader' && g.members.length > 1) h += '<p class="muted">Muốn rời bang, hãy nhượng chức bang chủ ở tab Thành viên. Chỉ giải tán được khi bang còn mình anh.</p>';
  return h;
}
function renderMembers(g) {
  const me = g.role;
  return '<div class="mklist">' + g.members.map((m) => {
    const mine = m.me;
    const acts = [];
    if (me === 'leader' && !mine) {
      acts.push(btn(m.role === 'officer' ? 'Hạ' : 'Phong phó', 'gRole', { acc: m.acc, role: m.role === 'officer' ? 'member' : 'officer' }, { cls: 'sm' }));
      acts.push(btn(GS.confirm === 'tr' + m.acc ? '⚠ Chắc chưa?' : 'Nhượng bang', 'gTransfer', { acc: m.acc }, { cls: 'sm' }));
    }
    if (!mine && (me === 'leader' || (me === 'officer' && m.role === 'member'))) acts.push(btn(GS.confirm === 'k' + m.acc ? '⚠ Chắc chưa?' : 'Đuổi', 'gKick', { acc: m.acc }, { cls: 'sm red' }));
    return '<div class="mkrow"><div class="mkinfo"><b>' + (m.online ? '🟢 ' : '⚪ ') + esc(m.name) + '</b> <span class="muted">' + (CLASSES[m.cls] ? CLASSES[m.cls].name : '') + ' · Cấp ' + m.lv + (m.resets ? ' · Reset ' + m.resets : '') + '</span>' +
      '<div class="muted">' + ROLE[m.role] + ' · Cống hiến ' + fmt(m.contrib) + '</div></div>' + acts.join('') + '</div>';
  }).join('') + '</div>';
}
function renderApps(g) {
  if (!g.apps.length) return '<p class="muted">Không có đơn xin vào nào.</p>';
  return '<div class="mklist">' + g.apps.map((a) => '<div class="mkrow"><div class="mkinfo"><b>' + esc(a.name) + '</b> <span class="muted">' + (CLASSES[a.cls] ? CLASSES[a.cls].name : '') + ' · Cấp ' + a.lv + '</span></div>' +
    btn('Nhận', 'gAccept', { acc: a.acc }, { cls: 'sm green' }) + btn('Từ chối', 'gReject', { acc: a.acc }, { cls: 'sm' }) + '</div>').join('') + '</div>';
}
const hms = (sec) => { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0'); };
const clock = (min) => String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
/** Dòng đếm ngược (cập nhật mỗi giây ở initGuildUi) */
const bossClock = () => { const st = gbossStatus(); return st.open ? 'còn ' + hms(st.secLeft) : 'mở sau ' + hms(st.secUntil); };
function renderBoss() {
  const B = GD.boss, st = gbossStatus(), block = st.open ? gbossBlock() : null, me = B && B.mine && B.mine.members.find((m) => m.me);
  let h = '<div class="tip">' + GBOSS.icon + ' <b>' + GBOSS.name + '</b> — mở lúc ' + GBOSS.starts.map(clock).join(' và ') + ' (giờ VN), mỗi đợt ' + GBOSS.windowMin + ' phút. Cả bang vào <b>chung một đấu trường</b> và cùng đánh một Boss rất trâu. ' +
    'Hết giờ, tổng sát thương của từng bang được xếp hạng — <b>quà xếp hạng đưa vào Đấu giá</b> cho những người đã tham gia. Trong trận có bảng xếp hạng các bang cập nhật liên tục.</div>';
  h += '<div class="tip">' + (st.open ? '🟢 <b>Đang mở</b>' : '⏳ <b>Chưa mở</b>') + ' · <b id="gbt">' + bossClock() + '</b>' + (st.open && me ? ' · Sát thương của anh: <b>' + fmt(me.dmg) + '</b>' : '') + '</div>';
  h += '<div class="row" style="gap:8px">' + (st.open ? btn('⚔ Vào đấu trường', 'gBossGo', {}, { cls: 'green', disabled: !!block || GS.busy }) : '') + btn('🔨 Đấu giá', 'gAuction', {}, { cls: '' }) + '</div>' + (block ? '<p class="warn">' + esc(block) + '</p>' : '');
  if (!B) return h + '<p class="muted">Đang tải…</p>';
  if (B.round.length) {
    h += '<h4>Xếp hạng đợt này</h4><table class="st rank">' + B.round.map((r) => '<tr class="' + (r.mine ? 'me' : '') + '"><td class="rk">' + (['🥇', '🥈', '🥉'][r.rank - 1] || r.rank) + '</td><td><b>' + esc(r.name) + '</b> <span class="muted">' + r.n + ' người</span></td><td>' + fmt(r.total) + '</td></tr>').join('') + '</table>';
    if (B.mine) h += '<h4>Bang của anh' + (B.mine.rank ? ' · hạng ' + B.mine.rank : '') + ' · ' + fmt(B.mine.total) + '</h4><div class="muted" style="margin-bottom:4px">Cần chiến đấu thực sự ≥ ' + hms(B.mine.minSec) + ' (mỗi giây có gây sát thương mới tính) để được nhận thưởng, chia tiền và đặt giá trong bang. ⚠ = chưa đủ.</div><table class="st rank">' + B.mine.members.map((m, i) => '<tr class="' + (m.me ? 'me' : '') + '"><td class="rk">' + (i + 1) + '</td><td>' + (m.ok ? '' : '⚠ ') + esc(m.name) + '</td><td>' + fmt(m.dmg) + ' <span class="muted">' + hms(m.sec) + '</span></td></tr>').join('') + '</table>';
  } else if (st.open) h += '<p class="muted" style="margin-top:8px">Chưa có bang nào ghi điểm đợt này. Hãy là người đầu tiên!</p>';
  if (B.last) {
    h += '<h4>Đợt trước (' + B.last.key.replace(/^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})$/, '$4:$5 $3/$2') + ')</h4>' +
      (B.last.mine ? '<div class="tip">Bang của anh: <b>hạng ' + B.last.mine.rank + '</b> · ' + fmt(B.last.mine.total) + ' sát thương · ' + B.last.mine.lots + ' phần quà đã vào đấu giá.</div>' : '') +
      '<table class="st rank">' + B.last.ranks.map((r) => '<tr class="' + (r.mine ? 'me' : '') + '"><td class="rk">' + (['🥇', '🥈', '🥉'][r.rank - 1] || r.rank) + '</td><td><b>' + esc(r.name) + '</b> <span class="muted">' + r.n + ' người · ' + r.lots + ' quà</span></td><td>' + fmt(r.total) + '</td></tr>').join('') + '</table>';
  }
  return h;
}
function renderQuests() {
  const D = ensureGuildQ();
  if (!D) return '<p class="muted">Chưa có bang.</p>';
  const list = guildQList(), nDone = list.filter((q) => D.claimed[q.id]).length;
  return '<div class="tip">Mỗi ngày 3 nhiệm vụ riêng. Mỗi nhiệm vụ: <b>+' + GUILD_QUESTS.pts + ' điểm cống hiến</b> cho bang và Zen cho anh. Nhận đủ cả bộ: thêm <b>+' + GUILD_QUESTS.allBonus + ' điểm</b>. Đổi mới lúc 0 giờ. (' + nDone + '/' + list.length + ')</div>' +
    '<div class="mklist">' + list.map((q) => {
      const [a, n] = goalProgress(q.goal, D.prog[q.id] || 0), ok = guildQDone(q), got = !!D.claimed[q.id], pct = Math.round((a / n) * 100);
      return '<div class="mkrow"><div class="mkinfo"><b>' + esc(q.title) + '</b><div class="muted">' + esc(q.desc) + ' · ' + fmt(a) + '/' + fmt(n) + '</div>' +
        '<div class="bar" style="height:8px"><div style="width:' + pct + '%;background:linear-gradient(#e8c050,#8a6a10)"></div></div></div>' +
        (got ? '<span class="muted">✔ Đã nhận</span>' : btn('Nhận', 'gQuest', { id: q.id }, { cls: 'sm green', disabled: !ok || GS.busy })) + '</div>';
    }).join('') + '</div>';
}
function renderDonate() {
  return '<div class="tip">Quyên góp để tăng <b>điểm cống hiến</b>: ' + fmt(GUILD.zenPerPt) + ' Zen = 1 điểm · ' +
    JEWEL_KEYS.map((k) => '<span style="color:' + JEWELS[k].color + '">' + JEWELS[k].short + ' = ' + fmt(GUILD.jewelPts[k]) + '</span>').join(' · ') + '. Quyên góp không lấy lại được.</div>' +
    '<div class="row" style="flex-wrap:nowrap;margin-bottom:6px"><span style="min-width:64px">💰 Zen</span><input id="dzen" type="number" min="0" inputmode="numeric" placeholder="0" style="flex:1"></div>' +
    JEWEL_KEYS.map((k) => '<div class="row" style="flex-wrap:nowrap;margin-bottom:6px"><span style="min-width:64px;color:' + JEWELS[k].color + '">◆ ' + JEWELS[k].short + ' <small class="muted">/' + (G.S.jewels[k] || 0) + '</small></span><input id="dj_' + k + '" type="number" min="0" inputmode="numeric" placeholder="0" style="flex:1"></div>').join('') +
    btn('Quyên góp', 'gDonate', {}, { cls: 'green', disabled: GS.busy }) + '<p class="muted" style="margin-top:8px">Đang có ' + fmt(G.S.zen) + ' Zen.</p>';
}
const chatHtml = () => (GD.chat.length ? GD.chat.slice(-40).map((m) => '<div class="cm"><span class="ct">' + time(m.ts) + '</span> <b>' + esc(m.from) + '</b>: ' + esc(m.text) + '</div>').join('') : '<div class="muted" style="text-align:center;padding:20px">Chưa có tin nhắn trong bang.</div>');
function refreshChat() { const el = $('gchatlist'); if (el) { el.innerHTML = chatHtml(); el.scrollTop = el.scrollHeight; } }
function renderChat() {
  setTimeout(refreshChat, 0);
  if (NET.status !== 'online') return '<div class="tip">Cần kết nối máy chủ để chat bang.</div>';
  return '<div id="gchatlist" class="chatlist"></div><div class="row" style="margin-top:8px;flex-wrap:nowrap"><input id="gchatin" maxlength="120" placeholder="Nhắn cho cả bang…" autocomplete="off">' + btn('Gửi', 'gChatSend', {}, { cls: 'green' }) + '</div>';
}

function renderGuild(g) {
  const tabs = [['info', 'Thông tin'], ['members', 'Thành viên'], ['boss', GBOSS.icon + ' Boss'], ['quest', 'Nhiệm vụ'], ['donate', 'Quyên góp'], ['chat', 'Chat']];
  if (mgr()) tabs.splice(2, 0, ['apps', 'Đơn' + (g.apps.length ? ' (' + g.apps.length + ')' : '')]);
  if (!tabs.some((t) => t[0] === GS.tab)) GS.tab = 'info';
  const body = { info: renderInfo, members: renderMembers, apps: renderApps, donate: renderDonate, quest: renderQuests, boss: renderBoss, chat: renderChat }[GS.tab](g);
  return tabBar(tabs) + (GS.tab === 'chat' ? '' : msgLine()) + body;
}

function needLogin() {
  return '<div class="tip">🏰 <b>Bang hội</b> cần <b>tài khoản</b> và kết nối máy chủ.</div>' +
    (!apiBase() ? '<p class="muted">Game đang mở không qua máy chủ.</p>' : '') + btn('Đăng nhập / Đăng ký', 'gToStart', {}, { cls: 'green' });
}

/** Tải dữ liệu bang (và danh sách nếu chưa có bang) */
async function refresh() {
  try {
    await loadMine();
    if (!GD.mine) { if (!['list', 'create'].includes(GS.tab)) GS.tab = 'list'; await loadList(); }
    else if (['list', 'create'].includes(GS.tab)) GS.tab = 'info';
    if (GD.mine && GS.tab === 'boss') await loadBoss();
  } catch (e) { say(errOf(e), true); }
}
/** Thao tác xong → tải lại cho đúng trạng thái (vd. vừa vào bang / bị đuổi) */
const after = async (r) => { if (r !== undefined && !GD.mine) { GS.tab = 'list'; try { await loadList(); } catch (e) { /* bỏ qua */ } } else if (GD.mine && ['list', 'create'].includes(GS.tab)) GS.tab = 'info'; };
const val = (id) => { const el = $(id); return el ? el.value : ''; };

export const guildPanel = {
  id: 'guild',
  title: '🏰 Bang hội',
  onOpen: () => { say(''); GS.confirm = null; GD.onChat = () => { if (UI.panel === 'guild' && GS.tab === 'chat') refreshChat(); }; return loggedIn() ? refresh() : null; },
  render() {
    if (!loggedIn() || !G.S) return needLogin();
    if (!GD.loaded) return '<p class="muted">Đang tải…</p>' + msgLine();
    return GD.mine ? renderGuild(GD.mine) : renderNoGuild();
  },
  actions: {
    gToStart: () => { saveGame(); UI.noSave = true; location.reload(); },
    gTab: (d) => { GS.tab = d.t; GS.confirm = null; say(''); if (d.t === 'list') return loadList().catch(() => {}); if (d.t === 'boss') return loadBoss().catch((e) => say(errOf(e), true)); },
    gBossGo: async () => { const ok = await act('enterGBoss'); return ok ? { close: true } : undefined; },
    gAuction: () => ({ open: 'auction' }),
    gSearch: () => { GD.q = val('gq').trim(); GD.page = 0; return loadList().catch((e) => say(errOf(e), true)); },
    gPage: (d) => { GD.page = Math.max(0, GD.page + +d.d); return loadList().catch((e) => say(errOf(e), true)); },
    gCreate: async () => { const r = await run(() => createGuild(val('gname')), '🏰 Đã lập bang!'); await after(r); },
    gApply: async (d) => { await run(() => guildOp('apply', { id: d.id }), 'Đã gửi đơn. Chờ bang chủ hoặc phó bang duyệt.'); await loadList().catch(() => {}); },
    gCancel: async (d) => { await run(() => guildOp('cancel', { id: d.id }), 'Đã rút đơn.'); await loadList().catch(() => {}); },
    gAccept: async (d) => { await run(() => guildOp('accept', { acc: d.acc }), '✔ Đã nhận thành viên.'); },
    gReject: async (d) => { await run(() => guildOp('reject', { acc: d.acc }), 'Đã từ chối.'); },
    gKick: async (d) => { if (!twice('k' + d.acc)) return; await run(() => guildOp('kick', { acc: d.acc }), 'Đã mời khỏi bang.'); },
    gRole: async (d) => { await run(() => guildOp('role', { acc: d.acc, role: d.role }), 'Đã đổi chức vụ.'); },
    gTransfer: async (d) => { if (!twice('tr' + d.acc)) return; await run(() => guildOp('transfer', { acc: d.acc }), 'Đã nhượng chức bang chủ.'); },
    gLeave: async () => { if (!twice('leave')) return; const r = await run(() => guildOp('leave', {}), 'Đã rời bang.'); await after(r); },
    gDisband: async () => { if (!twice('disband')) return; const r = await run(() => guildOp('disband', {}), 'Đã giải tán bang.'); await after(r); },
    gNotice: async () => { await run(() => guildOp('notice', { text: val('gnotice') }), 'Đã lưu thông báo.'); },
    gDonate: async () => {
      const jewels = {}; for (const k of JEWEL_KEYS) jewels[k] = Math.floor(+val('dj_' + k)) || 0;
      await run(() => donate(Math.floor(+val('dzen')) || 0, jewels), (j) => 'Cảm ơn! +' + fmt(j.pts) + ' điểm cống hiến' + (j.levelUp ? ' — bang lên cấp ' + j.levelUp + '!' : '.'));
    },
    gQuest: async (d) => { await run(() => claimQuest(d.id), (j) => '✔ +' + fmt(j.pts) + ' điểm cống hiến cho bang' + (j.all ? ' (đủ bộ!)' : '') + (j.levelUp ? ' — bang lên cấp ' + j.levelUp + '!' : '.')); },
    gChatSend: () => { const el = $('gchatin'); if (el && sendGuildChat(el.value)) { el.value = ''; el.focus(); } return { keep: true }; },
  },
};

/** Enter để gửi chat bang */
export function initGuildUi(rerender) {
  // đếm ngược Boss bang mỗi giây (không vẽ lại cả bảng để không mất ô nhập) + làm mới bảng xếp hạng mỗi 10 giây
  setInterval(() => {
    if (UI.panel !== 'guild' || GS.tab !== 'boss') return;
    const el = $('gbt'); if (el) el.textContent = bossClock();
    if (Date.now() - GD.bossAt > 10000 && !GS.busy) { GD.bossAt = Date.now(); loadBoss().then(() => { if (UI.panel === 'guild' && GS.tab === 'boss') rerender(); }).catch(() => {}); }
  }, 1000);
  on(EV.GBOSS_END, (r) => { if (r) log(GBOSS.icon + ' Boss bang: anh đã gây <b>' + fmt(r.dmg) + '</b> sát thương. Mở 🏰 Bang hội → Boss để xem xếp hạng.', '#ffd54a'); });
  document.addEventListener('keydown', (e) => { if (e.target && e.target.id === 'gchatin' && e.key === 'Enter') { e.preventDefault(); guildPanel.actions.gChatSend(); } });
}
