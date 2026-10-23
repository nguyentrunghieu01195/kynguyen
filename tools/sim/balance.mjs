// Mô phỏng cân bằng: cho bot tự cày bằng đúng logic game (không vẽ), đo thời gian, Zen, ngọc, số lần chết.
// Chạy:  node tools/sim/balance.mjs [class] [số giờ chơi tối đa] [số lần Reset mục tiêu]
//   vd:  node tools/sim/balance.mjs knight 80 3
// Bot chơi kiểu người chơi "chăm, không nạp": bật AUTO, cộng điểm theo class, mặc đồ tốt hơn, ép tới +9 (không ép mạo hiểm),
// làm cánh, mua thuốc, học/nâng kỹ năng khi dư Zen, lên bản đồ cao nhất phù hợp, Reset khi đủ cấp 300.
// Nhiệm vụ chuyển chức được coi là xong khi đủ Reset + đủ lễ vật (các bước săn quái/boss làm song song khi cày).
import { G } from '../../src/core/state.js';
import { on, EV } from '../../src/core/events.js';
import { MAPS } from '../../src/config/maps.js';
import { SLOTS } from '../../src/config/items.js';
import { PROGRESSION as PG } from '../../src/config/balance.js';
import { TIER_QUESTS, TIER_RESETS } from '../../src/config/skills.js';
import { createCharacter, addPoints, canEnterMap, canReset, doReset, resetCost } from '../../src/systems/character.js';
import { calcStats } from '../../src/systems/stats.js';
import { enterMap } from '../../src/systems/world.js';
import { update } from '../../src/systems/game.js';
import { itemPower, equip, sellJunk, sell } from '../../src/systems/items.js';
import { upgradeItem, upgradeInfo, hasMaterials, nextWingTier, craftWing } from '../../src/systems/upgrade.js';
import { buy } from '../../src/systems/shop.js';
import { initSkills, learnSkill, learnInfo, classSkills, rankOf } from '../../src/systems/skills.js';
import { enterTower } from '../../src/systems/tower.js';
import { enterEvent, initEvents } from '../../src/systems/events.js';

const cls = process.argv[2] || 'knight', MAX_H = +(process.argv[3] || 60), GOAL_RESETS = +(process.argv[4] || 3);
const DT = 0.05;
const SPLIT = { knight: { str: 0.5, agi: 0.2, vit: 0.3 }, wizard: { ene: 0.6, agi: 0.1, vit: 0.3 }, archer: { agi: 0.55, str: 0.2, vit: 0.25 } }[cls];

let t = 0, deaths = 0, zenEarned = 0;
const hh = (s) => (s / 3600).toFixed(1) + 'h';
on(EV.PLAYER_DIE, () => deaths++);
const KS = { n: 0, gap: 0, boss: 0 };
on(EV.KILL, (m) => { KS.n++; KS.gap += m.lv - G.S.lv; if (m.boss) KS.boss++; });
initSkills();
initEvents();

G.S = createCharacter(cls, 'Bot');
calcStats();
enterMap(0);
G.R.auto = true;

// --- quyết định của bot (chạy mỗi 5 giây chơi) ---
const score = (it) => (it.slot === 'wings' ? it.tier * 100 : itemPower(it)) * (it.exc ? 1.15 : 1);
function manage() {
  const S = G.S;
  // cộng điểm
  if (S.pts > 0) { const n = S.pts; for (const k in SPLIT) addPoints(k, Math.floor(n * SPLIT[k])); if (S.pts) addPoints(Object.keys(SPLIT)[0], S.pts); }
  // mặc đồ tốt hơn
  for (const it of S.inv.slice()) {
    if (it.slot === 'weapon' && it.cls && it.cls !== cls) continue;
    const cur = S.equip[it.slot];
    if (!cur || score(it) > score(cur) * 1.02) equip(it.id);
  }
  // bán đồ
  sellJunk();
  if (S.inv.length > 30) for (const it of S.inv.slice(0, S.inv.length - 20)) sell(it.id);
  // ép đồ tới +9 (an toàn) — để dành ngọc cho lễ vật chuyển chức nếu đang làm
  const tn = (S.tier || 1) + 1, tNeed = tn <= 3 && S.resets >= TIER_RESETS[tn - 1] ? TIER_QUESTS[tn].at(-1).goal.need : null;
  const saving = tNeed && Object.entries(tNeed).some(([k, n]) => k !== 'zen' && (S.jewels[k] || 0) < n);
  for (const sl of saving ? [] : SLOTS) {
    const it = S.equip[sl];
    if (!it || sl === 'wings') continue;
    let g = 0;
    while (it.plus < 9 && g++ < 20) { const inf = upgradeInfo(it); if (!inf || !hasMaterials(inf.need, inf.zen)) break; upgradeItem(it.id, false); }
  }
  // cánh
  if (nextWingTier()) craftWing();
  // thuốc
  if (S.pot.hp < 60) buy('hp', 50);
  if (S.pot.mp < 40) buy('mp', 50);
  // kỹ năng: học mới trước, rồi nâng cấp rẻ nhất, giữ lại tiền Reset
  const ntr = (S.tier || 1) + 1, tierZen = ntr <= 3 && S.resets >= TIER_RESETS[ntr - 1] ? TIER_QUESTS[ntr].at(-1).goal.need.zen : 0;
  const reserve = resetCost() * 1.1 + 200000 + tierZen;
  for (const sk of classSkills()) if (!rankOf(sk.id) && learnInfo(sk).ok && S.zen - learnInfo(sk).zen > reserve) learnSkill(sk.id);
  for (let g = 0; g < 10; g++) {
    const c = classSkills().filter((sk) => rankOf(sk.id) && learnInfo(sk).ok).sort((a, b) => learnInfo(a).zen - learnInfo(b).zen)[0];
    if (!c || S.zen - learnInfo(c).zen < reserve) break;
    learnSkill(c.id);
  }
  // chuyển chức (đủ Reset + lễ vật)
  const nt = (S.tier || 1) + 1;
  if (nt <= 3 && S.resets >= TIER_RESETS[nt - 1]) {
    const need = TIER_QUESTS[nt].at(-1).goal.need, lvNeed = TIER_QUESTS[nt][0].goal.n;
    const ok = S.lv >= lvNeed && (nt < 3 || S.tower.best >= 40) && Object.entries(need).every(([k, n]) => (k === 'zen' ? S.zen : S.jewels[k]) >= n);
    if (ok) { for (const [k, n] of Object.entries(need)) { if (k === 'zen') S.zen -= n; else S.jewels[k] -= n; } S.tier = nt; calcStats(); report('⭐ Lên bậc ' + nt); }
  }
  // bản đồ
  if (!G.R.event) {
    let best = 0;
    for (let i = 0; i < MAPS.length; i++) if (canEnterMap(i) && MAPS[i].lv[0] <= S.lv) best = i;
    if (best !== G.R.mapIndex) { enterMap(best); G.R.auto = true; }
  }
  // reset
  const tierPending = nt <= 3 && S.resets >= TIER_RESETS[nt - 1]; // ưu tiên làm xong chuyển chức trước khi Reset tiếp
  if (canReset() && !tierPending) { const mi = doReset(); enterMap(mi); G.R.auto = true; report('🔄 Reset ' + S.resets); runTower(); runEvents('sau Reset ' + S.resets); lvMarks.clear(); }
}

// --- chơi thử 2 sự kiện (bỏ qua giờ mở cổng) ---
let evRes = null;
on(EV.EVENT, (id, ok) => (evRes = ok));
function runEvents(tag) {
  const S = G.S, out = [];
  for (const id of ['bc', 'ds']) {
    S.eventTest = true; S.tickets[id] = (S.tickets[id] || 0) + 1; evRes = null;
    const zen0 = S.zen, lv0 = S.lv, d0 = deaths;
    if (!enterEvent(id)) { out.push(id + ': không vào được'); continue; }
    G.R.auto = true;
    let tt = 0;
    let ph = '';
    while (G.R.event && tt < 1200) { const E = G.R.event; if (!E.over) ph = E.phase + (E.id === 'bc' ? ' ' + E.kills + '/' + E.def.killQuota : ' đợt ' + (E.wave + 1) + ' điểm ' + E.score); update(DT); tt += DT; manageLite(); }
    if (G.R.event) { out.push(id + ': kẹt'); enterMap(S.map); }
    out.push(id + (evRes ? ' ✔' : ' ✘ [' + ph + ']') + ' ' + Math.round(tt / 60) + 'p' + (deaths > d0 ? ' chết ' + (deaths - d0) : '') + (S.lv > lv0 ? ' +' + (S.lv - lv0) + 'cấp' : ''));
    if (!G.R.event && G.R.mapIndex !== S.map) enterMap(S.map);
    G.R.auto = true;
  }
  console.log('   ⚔ Sự kiện (' + tag + '): ' + out.join(' · '));
}
function manageLite() { const S = G.S; if (S.pot.hp < 20) buy('hp', 50); if (S.pot.mp < 20) buy('mp', 50); }

// --- leo tháp thử sức (1 lượt) sau mỗi lần Reset ---
function runTower() {
  const S = G.S;
  S.tower.date = null; S.tower.used = 0;
  if (!enterTower()) return;
  let endR = null; const off = on(EV.TOWER_END, (r) => (endR = r));
  G.R.auto = true;
  let tt = 0;
  let dumped = 0;
  while (G.R.event && tt < 3600) { update(DT); tt += DT;
    const E = G.R.event; if (process.env.SIMDBG && E && !E.over && E.state === 'fight' && E.ft > E.limit - 0.1 && dumped++ < 2) { const p = G.R.p; console.log('     timeout dbg p', p.x.toFixed(1), p.y.toFixed(1), 'tgt', p.target && p.target.name, 'tx', p.tx, 'auto', G.R.auto, 'manual', G.R.manualT.toFixed(1)); for (const m of G.R.mobs) console.log('       ', m.name, m.x.toFixed(1), m.y.toFixed(1), 'hp', Math.round(m.hp) + '/' + Math.round(m.maxHp), 'ret', m.ret, 'angry', m.angry, 'ign', m.ignoreT && (m.ignoreT - G.R.time).toFixed(0), 'ranged', !!m.ranged); } }
  console.log('   🗼 Tháp: kỷ lục tầng ' + S.tower.best + ' (' + Math.round(tt / 60) + ' phút' + (endR ? ', dừng ở tầng ' + endR.reached + ' do ' + endR.reason : '') + ')');
  if (typeof off === 'function') off();
  if (!G.R.event) { enterMap(S.map); G.R.auto = true; }
}

const lvMarks = new Set();
let lastZen = 0;
function report(tag) {
  const _ks = { ...KS }; KS.n = 0; KS.gap = 0;
  const S = G.S, P = G.P;
  console.log(
    hh(t).padStart(6) + ' ' + tag.padEnd(14) + ' lv' + String(S.lv).padStart(3) + ' R' + S.resets + ' B' + (S.tier || 1) + ' map' + G.R.mapIndex +
    ' | ST ' + Math.round(P.dmgMax) + ' PT ' + Math.round(P.def) + ' HP ' + P.maxHp +
    ' | Zen ' + (S.zen / 1e6).toFixed(1) + 'M (đã kiếm ' + (zenEarned / 1e6).toFixed(1) + 'M) ngọc ' + S.jewels.bless + '/' + S.jewels.soul + '/' + S.jewels.chaos +
    ' | đồ +' + Math.max(...SLOTS.filter((s) => S.equip[s] && s !== 'wings').map((s) => S.equip[s].plus)) + ' cánh' + (S.equip.wings ? S.equip.wings.tier : 0) +
    ' | KN ' + classSkills().map((s) => rankOf(s.id)).join(',') + ' | chết ' + deaths + ' | quái ' + S.kills + ' (lệch cấp TB ' + (_ks.n ? (_ks.gap / _ks.n).toFixed(1) : 0) + ', boss ' + _ks.boss + ')',
  );
}

const MARKS = [50, 100, 150, 200, 250, 300];
let mt = 0, prevZen = G.S.zen;
console.log('Mô phỏng ' + cls + ' · EXP x' + G.S.expRate + ' · tối đa ' + MAX_H + 'h · mục tiêu Reset ' + GOAL_RESETS);
while (t < MAX_H * 3600 && G.S.resets < GOAL_RESETS + 1) {
  update(DT);
  t += DT; mt += DT;
  if (G.S.zen > prevZen) zenEarned += G.S.zen - prevZen;
  prevZen = G.S.zen;
  if (mt >= 5) { mt = 0; manage(); prevZen = G.S.zen; }
  if (process.env.SIMDBG && Math.floor(t / 1800) !== Math.floor((t - DT) / 1800)) { const p = G.R.p; console.log('   · ' + hh(t), 'lv', G.S.lv, 'map', G.R.mapIndex, 'kills', G.S.kills, 'chết', deaths, 'pos', p.x.toFixed(0), p.y.toFixed(0), 'tgt', p.target ? p.target.name + p.target.lv : '-', 'tx', p.tx != null ? p.tx.toFixed(0) + ',' + p.ty.toFixed(0) : '-', 'stuck', (p.stuck || 0).toFixed(1), 'hp', Math.round(p.hp) + '/' + G.P.maxHp); }
  for (const m of MARKS) if (G.S.lv >= m && !lvMarks.has(m)) { lvMarks.add(m); report('cấp ' + m); if (G.S.resets === 0 && (m === 50 || m === 150 || m === 250)) runEvents('cấp ' + m); if (m === 250) runTower(); }
  if (G.S.resets >= GOAL_RESETS && G.S.lv >= 160 && (G.S.tier || 1) >= 3) break;
}
report('KẾT THÚC');
runTower();
