// HUD: thanh máu/mana, EXP, nút kỹ năng, boss, nhật ký, thông báo giữa màn hình.
import { G, inSafe } from '../core/state.js';
import { on, EV } from '../core/events.js';
import { fmt, dist } from '../core/utils.js';
import { CLASSES } from '../config/classes.js';
import { JEWELS, JEWEL_KEYS } from '../config/items.js';
import { PROGRESSION } from '../config/balance.js';
import { expNeed, isMaxLevel } from '../systems/character.js';
import { SKILLS_BY_ID } from '../config/skills.js';
import { mpCost, cdOf, tierName, hasLearnable } from '../systems/skills.js';
import { refreshSkillBar, skillIconHTML } from './icons.js';
import { $, UI } from './dom.js';
import { NET } from '../net/client.js';
import { EVENTS } from '../config/events.js';
import { eventStatus } from '../systems/events.js';
import { mmss } from './panels/events.js';
import { currentMain, mainDone, goalProgress, hasClaimable, dailyList, dailyDone, ensureDaily, currentTierStep, tierStepDone } from '../systems/quests.js';

let annTimer = null;
const noticed = {};
function announce(msg) {
  const e = $('center-msg');
  e.textContent = msg;
  e.style.opacity = 1;
  clearTimeout(annTimer);
  annTimer = setTimeout(() => (e.style.opacity = 0), 1800);
}

function log(msg, col) {
  const L = $('log'), d = document.createElement('div');
  d.innerHTML = msg;
  if (col) d.style.color = col;
  L.appendChild(d);
  while (L.children.length > 6) L.removeChild(L.firstChild);
  setTimeout(() => { d.style.opacity = 0; setTimeout(() => d.remove(), 700); }, 8000);
}

export function initHud() {
  on(EV.LOG, log);
  on(EV.ANNOUNCE, announce);
}

export function showHud() {
  $('start').classList.add('hidden');
  $('hud').classList.remove('hidden');
}

export function updateHud() {
  const S = G.S, P = G.P, R = G.R, p = R.p;
  $('pname').textContent = S.name + ' · ' + tierName();
  $('plv').textContent = 'Cấp ' + S.lv + (S.resets ? ' · Reset ' + S.resets : '') + (isMaxLevel() ? ' · TỐI ĐA' : ' · ' + ((100 * S.exp) / expNeed(S.lv)).toFixed(1) + '%') + (S.pts ? ' · ⬆' + S.pts : '');
  $('hpf').style.width = (100 * Math.max(0, p.hp)) / P.maxHp + '%';
  $('hpf').parentElement.classList.toggle('low', p.hp > 0 && p.hp < P.maxHp * 0.3); // máu thấp: thanh nhấp nháy đỏ
  $('hpt').textContent = fmt(Math.max(0, p.hp)) + ' / ' + fmt(P.maxHp);
  $('mpf').style.width = (100 * p.mp) / P.maxMp + '%';
  $('mpt').textContent = fmt(p.mp) + ' / ' + fmt(P.maxMp);
  $('mapname').textContent = R.M.name + (inSafe(p) ? ' · An toàn' : '');
  const zn = (R.map.zones || []).reduce((b, z) => (!b || Math.hypot(z.x - p.x, z.y - p.y) < Math.hypot(b.x - p.x, b.y - p.y) ? z : b), null);
  $('mmcoord').textContent = inSafe(p) ? 'Thị trấn' : zn ? zn.name + ' · Lv' + zn.lv[0] + '–' + zn.lv[1] : Math.round(p.x) + ', ' + Math.round(p.y);
  $('zen').textContent = '💰 ' + fmt(S.zen) + ' Zen';
  $('jewels').innerHTML = JEWEL_KEYS.map((k) => '<span style="color:' + JEWELS[k].color + '">◆' + S.jewels[k] + '</span>').join(' ');

  const ep = isMaxLevel() ? 100 : (100 * S.exp) / expNeed(S.lv);
  $('expf').style.width = ep + '%';
  $('expt').textContent = isMaxLevel() ? 'CẤP TỐI ĐA ' + PROGRESSION.resetLevel + ' — HÃY RESET' : 'EXP ' + ep.toFixed(2) + '%';
  $('cntHp').textContent = S.pot.hp;
  $('cntMp').textContent = S.pot.mp;
  $('btnAuto').classList.toggle('on', R.auto);

  // Thanh kỹ năng: hồi chiêu / thiếu MP
  refreshSkillBar();
  S.skills.bar.forEach((id, i) => {
    const btnEl = $('sk' + i), cd = btnEl.querySelector('.cd');
    if (!id) { cd.classList.add('hidden'); btnEl.classList.remove('nompc'); return; }
    const sk = SKILLS_BY_ID[id], t = p.cds[id] || 0, noMp = p.mp < mpCost(sk);
    btnEl.classList.toggle('nompc', noMp && t <= 0);
    if (t > 0) { cd.classList.remove('hidden', 'nomp'); cd.textContent = t >= 10 ? Math.ceil(t) : t.toFixed(1); cd.style.setProperty('--p', (1 - t / cdOf(sk)).toFixed(3)); }
    else if (noMp) { cd.classList.remove('hidden'); cd.classList.add('nomp'); cd.textContent = ''; }
    else cd.classList.add('hidden');
  });
  // Buff đang có hiệu lực
  const bk = Object.keys(p.buffs).map((id) => id + Math.ceil(p.buffs[id].t)).join();
  if (bk !== UI.buffKey) {
    UI.buffKey = bk;
    $('buffs').innerHTML = Object.keys(p.buffs).map((id) => '<div class="bf" title="' + SKILLS_BY_ID[id].name + '">' + skillIconHTML(id) + '<small>' + Math.ceil(p.buffs[id].t) + '</small></div>').join('');
  }
  if ((UI.kdotT = (UI.kdotT || 0) - 1) <= 0) { UI.kdotT = 30; $('kdot').classList.toggle('hidden', !hasLearnable()); }

  // Sự kiện: HUD trong trận + báo khi cổng mở
  const E = R.event, eb = $('evbox'), qb = $('questbox');
  eb.classList.toggle('hidden', !E);
  qb.classList.toggle('hidden', !!E);
  if (E && E.handler) {
    const h = E.handler.hud();
    $('evname').textContent = h.name;
    $('evtime').textContent = typeof h.time === 'number' ? '⏱ ' + mmss(h.time) : h.time;
    $('evinfo').textContent = h.info;
  } else if (E) {
    $('evname').textContent = E.def.icon + ' ' + E.def.name;
    $('evtime').textContent = '⏱ ' + mmss(Math.max(0, E.def.timeLimit - E.t));
    $('evinfo').textContent = E.over ? 'Đang tổng kết…'
      : E.id === 'bc' ? (E.phase === 'clear' ? 'Hạ quái: ' + E.kills + ' / ' + E.def.killQuota + ' để phá phép bảo hộ' : E.phase === 'gate' ? 'Phá Cổng Thành!' : 'Hạ ' + E.def.boss.name + '!')
      : 'Đợt ' + (E.wave + 1) + ' / ' + E.def.waves.length + ' · Điểm: ' + E.score;
  }
  let evReady = false;
  for (const def of Object.values(EVENTS)) {
    const st = eventStatus(def), can = st.open && S.lv >= def.minLevel && S.tickets[def.ticket] > 0;
    if (can) evReady = true;
    if (st.open && S.lv >= def.minLevel) {
      const now = new Date(), key = now.getHours() + ':' + Math.floor(now.getMinutes() / 15);
      if (noticed[def.id] !== key) {
        noticed[def.id] = key;
        log(def.icon + ' <b>' + def.name + '</b> đã mở cổng! Vào bảng <b>Sự kiện</b> (còn ' + mmss(st.secLeft) + ').', '#ffb070');
      }
    }
  }
  $('edot').classList.toggle('hidden', !evReady || !!E);

  // Trạng thái trực tuyến
  const ns = $('netst');
  ns.textContent = NET.status === 'online' ? '🟢 ' + NET.online + ' online' + (NET.players.size ? ' · ' + NET.players.size + ' ở đây' : '') : NET.status === 'connecting' ? '🟡 Đang kết nối…' : '⚪ Ngoại tuyến';
  ns.classList.toggle('on', NET.status === 'online');
  $('cdot').classList.toggle('hidden', !(NET.unread > 0) || UI.panel === 'chat');

  // Theo dõi nhiệm vụ
  const q = currentMain(), tq = !q && currentTierStep();
  qb.dataset.tab = q ? 'main' : tq ? 'tier' : 'daily';
  if (E) { /* ẩn khi đang trong sự kiện */ }
  else if (q) {
    const [a, n] = goalProgress(q.goal, S.quest.mainProg), ok = mainDone();
    $('qtitle').textContent = '📜 ' + q.title;
    $('qprog').textContent = ok ? '✔ Hoàn thành — chạm để nhận thưởng' : q.goal.type === 'level' || q.goal.type === 'towerBest' || (q.goal.n > 1 && !['map', 'plus', 'wings'].includes(q.goal.type)) ? 'Tiến độ: ' + a + ' / ' + n : q.desc;
    qb.classList.toggle('ready', ok);
  } else if (tq) {
    const [a, n] = goalProgress(tq.goal, S.quest.tier.prog), ok = tierStepDone();
    $('qtitle').textContent = '🌟 Chuyển chức: ' + tq.title;
    $('qprog').textContent = ok ? '✔ Hoàn thành — chạm để tiếp tục' : tq.goal.type === 'deliver' ? 'Lễ vật: ' + a + ' / ' + n + ' loại đã đủ' : 'Tiến độ: ' + a + ' / ' + n;
    qb.classList.toggle('ready', ok);
  } else {
    const D = ensureDaily(), left = dailyList().filter((d) => !D.claimed[d.id]).length;
    $('qtitle').textContent = '📅 Nhiệm vụ hằng ngày';
    $('qprog').textContent = left ? 'Còn ' + left + ' nhiệm vụ hôm nay' : 'Đã xong tất cả hôm nay ✓';
    qb.classList.toggle('ready', dailyList().some((d) => !D.claimed[d.id] && dailyDone(d)));
  }
  $('qdot').classList.toggle('hidden', !hasClaimable());

  const b = R.boss, bb = $('bossbox');
  if (b && b.hp > 0 && dist(b, p) < 16) {
    bb.classList.remove('hidden');
    $('bossname').textContent = 'BOSS ' + b.name + ' · Lv' + b.lv;
    $('bossf').style.width = (100 * b.hp) / b.maxHp + '%';
    $('bosst').textContent = fmt(b.hp) + ' / ' + fmt(b.maxHp);
  } else bb.classList.add('hidden');
}
