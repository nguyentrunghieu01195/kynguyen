// Mô phỏng người chơi (bot) chạy game không giao diện, đo tiến trình theo giờ chơi để cân bằng.
// Dùng: node tools/sim.mjs [class=knight] [giờ=24] [seed=1]
// Bot: AUTO đánh quái, học / nâng kỹ năng, cộng điểm, mặc đồ tốt nhất, ép đồ tới +9 (+12 khi dư ngọc), chế cánh, Reset khi đủ,
// tự đổi bản đồ theo tỉ lệ chết, đầu tư cây Master, thần hoá đồ Thiên Thần. Giả định người chơi làm xong nhiệm vụ chuyển chức ngay khi đủ Reset.
import { dirname as _dn, resolve as _rs } from 'node:path';
import { fileURLToPath as _fu } from 'node:url';
const ROOT = _rs(_dn(_fu(import.meta.url)), '..');
const [cls = 'knight', hours = '24', seed = '1'] = process.argv.slice(2);
let s = +seed; const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
Math.random = rnd; // lặp lại được
const { G } = await import(ROOT + '/src/core/state.js');
const { createCharacter, canEnterMap, mapReq, canReset, autoLevel } = await import(ROOT + '/src/systems/character.js');
const { calcStats } = await import(ROOT + '/src/systems/stats.js');
const { enterMap } = await import(ROOT + '/src/systems/world.js');
const { update } = await import(ROOT + '/src/systems/game.js');
const { runAction } = await import(ROOT + '/src/net/actions.js');
const { MAPS } = await import(ROOT + '/src/config/maps.js');
const { itemPower, isJunk, weaponType } = await import(ROOT + '/src/systems/items.js');
const { upgradeInfo, hasMaterials } = await import(ROOT + '/src/systems/upgrade.js');
const { classSkills, learnInfo, rankOf } = await import(ROOT + '/src/systems/skills.js');
const { masterTree } = await import(ROOT + '/src/config/master.js');
const { masterPoints } = await import(ROOT + '/src/systems/master.js');
const { divineInfo } = await import(ROOT + '/src/systems/divine.js');
const { TIER_RESETS } = await import(ROOT + '/src/config/skills.js');
const { SLOTS } = await import(ROOT + '/src/config/items.js');
const { WEAPON_TYPES } = await import(ROOT + '/src/config/gear.js');
const { petFx } = await import(ROOT + '/src/config/pets.js');

G.S = createCharacter(cls, 'Bot'); calcStats(); enterMap(0); G.R.auto = true;
const MAINS = { knight: { str: 0.5, vit: 0.35, agi: 0.15 }, wizard: { ene: 0.6, vit: 0.3, agi: 0.1 }, archer: { agi: 0.45, str: 0.3, vit: 0.25 } };
const MAIN_OF = () => MAINS[G.S.cls];
const stat = { deaths: 0, kills: 0, shards: 0, goodDrops: 0, godItems: 0, breaks: 0, upOK: 0, upFail: 0, mexp: 0 };
G.R.p.hp = G.P.maxHp;
const { on, EV } = await import(ROOT + '/src/core/events.js');
on(EV.PLAYER_DIE, () => { stat.deaths++; if (G.R.nm) stat.nmDeaths = (stat.nmDeaths || 0) + 1; });
on(EV.KILL, (m) => { if (m && m.nightmare) stat.nmKills = (stat.nmKills || 0) + 1; });
on(EV.UPGRADE, (o) => { if (o === 'break') stat.breaks++; else if (o === 'success') stat.upOK++; else stat.upFail++; });
const logs = [];
const t_now = () => T.t;
const T = { lastCC: 0, t: 0, lastDeath: 0, mapAdj: 0 };

function manage() {
  const S = G.S, R = G.R;
  // đổi bản đồ: chọn map cao nhất vào được, mà cấp quái ≤ cấp tương đương + 25; tụt nếu chết nhiều
  const al = autoLevel();
  let best = 0; for (let i = 0; i < MAPS.length; i++) if (canEnterMap(i) && MAPS[i].lv[0] <= al + 5) best = i;
  best = Math.max(0, best - T.mapAdj);
  if (best !== S.map && !R.event) enterMap(best);
  // điểm chỉ số
  if (S.pts > 0) { const MAIN = MAIN_OF(); let left = S.pts; for (const k in MAIN) { const n = Math.floor(S.pts * MAIN[k]); if (n > 0) { runAction('addPoints', [k, n]); left -= n; } } if (left > 0) runAction('addPoints', ['str', left]); }
  // kỹ năng: học / nâng mọi thứ có thể (rẻ trước)
  for (let round = 0; round < 6; round++) {
    const c = classSkills().map((sk) => ({ sk, i: learnInfo(sk) })).filter((x) => x.i.ok).sort((a, b) => a.i.zen - b.i.zen)[0];
    if (!c) break; runAction('learnSkill', [c.sk.id]);
  }
  const bar = S.skills.bar; classSkills().filter((sk) => sk.type !== 'passive' && rankOf(sk.id)).forEach((sk) => { if (!bar.includes(sk.id)) { const e = bar.indexOf(null); if (e >= 0) runAction('setSlot', [e, sk.id]); } });
  // mặc đồ tốt nhất
  for (const it of [...S.inv]) {
    if (it.slot === 'wings') { if (!S.equip.wings || it.tier > S.equip.wings.tier) runAction('equip', [it.id]); continue; }
    if (it.slot === 'weapon' && (it.cls || S.cls) !== S.cls) continue;
    const cur = S.equip[it.slot], sc = (x) => x.tier * 100 + Math.min(x.plus, 9) * 8 + (x.exc ? 10 : 0) + (x.god || 0) * 500; // người chơi chuộng bậc cao vì còn ép tiếp được
    if (!cur || sc(it) > sc(cur)) runAction('equip', [it.id]);
  }
  // dọn đồ: bán đồ thường, giữ +4 / hoàn hảo; tách đồ Thiên Thần +9 thừa
  if (S.inv.length > 30) runAction('sellJunk', []);
  for (const it of [...S.inv]) if (it.slot !== 'wings' && it.tier === 5 && it.plus >= 9 && !it.god && S.shards < 80) runAction('dismantle', [it.id]);
  // ép đồ: tới +9 an toàn; tới +12 nếu dư ngọc
  const cap = (S.jewels.chaos >= 6 && S.jewels.soul >= 6 && S.jewels.bless >= 6) ? 12 : 9;
  for (let g = 0; g < 8; g++) {
    const cand = SLOTS.filter((sl) => sl !== 'wings' && S.equip[sl] && S.equip[sl].plus < cap).map((sl) => S.equip[sl]).sort((a, b) => a.plus - b.plus)[0]; if (!cand) break;
    const inf = upgradeInfo(cand); if (!inf || !hasMaterials(inf.need, inf.zen)) break; runAction('upgrade', [cand.id, S.charm > 0]);
  }
  // cánh
  if (S.zen > 1e6) runAction('craftWing', []);
  // đồ Thần
  for (const sl of ['weapon', 'armor', 'helm', 'pants', 'gloves', 'boots']) { const it = S.equip[sl]; if (it && divineInfo(it).ok) runAction('ascend', [it.id]); }
  // Master
  if (masterPoints(S) > 0) { const t = masterTree(S.cls); for (let g = 0; g < 50 && masterPoints(S) > 0; g++) { let ok = false; for (const n of t.nodes) { if (runAction('masterAdd', [n.id]).r) { ok = true; break; } } if (!ok) break; } }
  // chuyển class định kỳ (CC=1) + kiểm tra bất biến
  if (process.env.CC && t_now() - T.lastCC > 6.2 * 3600 && !R.event) { S.zen = Math.max(S.zen, 4e8); S.jewels.soul = Math.max(S.jewels.soul, 3); S.ccAt = 0; const to = { knight: 'wizard', wizard: 'archer', archer: 'knight' }[S.cls]; if (runAction('changeClass', [to]).r) { T.lastCC = t_now(); T.ccN = (T.ccN || 0) + 1; } }
  { const bad = []; const w = S.equip.weapon; if (w && (w.cls || S.cls) !== S.cls) bad.push('vũ khí sai class ' + w.cls); for (const id of S.skills.bar) if (id && !classSkills().some((k) => k.id === id)) bad.push('ô kỹ năng sai class ' + id); for (const [k, v] of Object.entries(G.P)) if (typeof v === 'number' && !Number.isFinite(v)) bad.push('P.' + k + ' không hợp lệ'); if (S.inv.some((it) => it.slot === 'weapon' && (it.cls || S.cls) !== S.cls && it.cls !== S.cls && !Object.values(S.alt || {}).length)) bad.push('vũ khí trong túi sai class'); if (bad.length && !T.badRep) { T.badRep = 1; console.log('!! BẤT BIẾN SAI', JSON.stringify(bad), 'class', S.cls); } }
  // Reset
  const farm = process.env.MASTER_FARM && S.tier >= 3 && S.master.lv < +process.env.MASTER_FARM; // chế độ cày Master: đứng ở cấp tối đa không Reset
  if (canReset() && !farm) { runAction('doReset', []); T.mapAdj = 0; }
  const need = TIER_RESETS[(S.tier || 1)]; if (need !== undefined && S.resets >= need && S.tier < 3) S.tier++;
  // bình máu / mana: người chơi thật luôn mua đủ (bot cũ không mua nên chết oan)
  for (const k of ['hp', 'mp']) if (S.pot[k] < 60) runAction('buy', [k, 50]);
  // pet: mua pet bán được nếu dư tiền
  if (S.pets.list.length < 1 && S.zen > 6e6) runAction('petBuy', ['fox']);
}

const total = +hours * 3600, dt = 0.05; let nextM = 0, nextRep = 3600;
const t0 = Date.now(); let lastKills = 0, win = [];
const row = (h) => { const S = G.S; return [h + 'h', 'lv ' + S.lv, 'R' + S.resets, 'B' + S.tier, 'M' + (S.master ? S.master.lv : 0), 'map ' + S.map, 'zen ' + Math.round(S.zen / 1e3) + 'K', 'jw ' + S.jewels.bless + '/' + S.jewels.soul + '/' + S.jewels.chaos, 'sh ' + S.shards, 'kills ' + S.kills, 'dmg ' + Math.round(G.P.dmgMax), 'hp ' + G.P.maxHp, 'mp ' + G.P.maxMp, 'chết ' + stat.deaths, 'gần' + T.mapAdj].join(' | '); };
let deathsAtStart = 0;
for (let t = 0; t < total; t += dt) {
  G.R.auto = true; const hadNm = !!G.R.nm; update(dt); T.t = t; if (!hadNm && G.R.nm) stat.nmSpawns = (stat.nmSpawns || 0) + 1;
  { const nm = G.R.nm, p = G.R.p; if (nm) { nm._eng = nm._eng || p.target === nm; nm._last = { d: Math.round(Math.hypot(nm.x - p.x, nm.y - p.y)), hp: Math.round(p.hp / G.P.maxHp * 100), pot: G.S.pot.hp, ig: nm.ignoreT > G.R.time, mt: Math.round(G.R.manualT), tv: G.R.travel, life: Math.round(nm.life) }; T.lastNm = nm; } else if (T.lastNm) { const n = T.lastNm; T.lastNm = null; if (n.hp > 0) { (stat.noEng = stat.noEng || []).push((n._eng ? 'E' : '-') + JSON.stringify(n._last)); } } }
  { const nm = G.R.nm, p = G.R.p; if (nm && p.target === nm) { const f = T.fight || (T.fight = { t0: t, min: 1, hits: 0 }); f.min = Math.min(f.min, p.hp / G.P.maxHp); } else if (T.fight) { const f = T.fight; T.fight = null; (stat.fights = stat.fights || []).push(+(t - f.t0).toFixed(0) + 's/' + Math.round(f.min * 100) + '%'); } }

  if (process.env.NMTEST && G.S.resets >= 10 && !globalThis.__nmDone && G.S.map === 9) { // thử một trận Hỗn Mang Chi Vương đối đầu trực tiếp
    globalThis.__nmDone = 1; const R = G.R, p = R.p, W = await import(ROOT + '/src/systems/world.js'); R.mobs.length = 0; const nm = W.spawnNightmare(); nm.x = p.x + 2; nm.y = p.y; R.nm = nm; p.hp = G.P.maxHp;
    console.log('NMTEST bắt đầu: boss hp', nm.maxHp, 'dmg(raw)', Math.round(nm.dmg), 'player hp', G.P.maxHp, 'def', Math.round(G.P.def), 'dmgAvg', Math.round((G.P.dmgMin + G.P.dmgMax) / 2), 'spd', G.P.spd.toFixed(2), 'abs', G.P.abs, 'guard', G.P.guard, 'cd', G.P.cdMul);
    let min = 1; for (let i = 0; i < 2400 && nm.hp > 0 && p.dead <= 0; i++) { R.auto = true; update(0.05); if (i % 20 === 0) manage(); min = Math.min(min, p.hp / G.P.maxHp); if (i % 100 === 0) console.log('  +' + (i * 0.05).toFixed(0) + 's boss ' + Math.round(100 * Math.max(0, nm.hp) / nm.maxHp) + '% | người ' + Math.round(100 * p.hp / G.P.maxHp) + '% | pot ' + G.S.pot.hp); }
    console.log('NMTEST kết thúc: boss', Math.round(100 * Math.max(0, nm.hp) / nm.maxHp) + '%, máu thấp nhất của người', Math.round(min * 100) + '%', 'chết', p.dead > 0); process.exit(0);
  }
  { // người gác: nhân vật đứng yên > 120 giây (kể cả khi 'đang làm gì đó') → in trạng thái để điều tra lỗi kẹt
    const p = G.R.p, w = T.watch || (T.watch = { x: p.x, y: p.y, k: G.S.kills, t });
    if (Math.hypot(p.x - w.x, p.y - w.y) > 0.5 || G.S.kills !== w.k) { w.x = p.x; w.y = p.y; w.k = G.S.kills; w.t = t; }
    else if (t - w.t > 120 && !T.warned) { T.warned = 1; const tg = p.target; console.log('!! KẸT tại', Math.round(t / 3600 * 10) / 10 + 'h', JSON.stringify({ x: +p.x.toFixed(2), y: +p.y.toFixed(2), tx: p.tx, ty: p.ty, dead: p.dead, hp: Math.round(p.hp), target: tg && { x: +tg.x.toFixed(1), y: +tg.y.toFixed(1), hp: Math.round(tg.hp), boss: !!tg.boss, ignore: tg.ignoreT, id: tg.tpl && tg.tpl.id }, ev: G.R.event && G.R.event.id, drops: G.R.drops.length, mobs: G.R.mobs.length, invFull: G.S.inv.length, manualT: Math.round(G.R.manualT), travel: G.R.travel })); }
  }
  if (t >= nextM) { nextM = t + 4; manage(); if (!G.R.event && G.R.p.dead > 0) { /* hồi sinh tự động */ } }
  if (t >= nextRep) { // mỗi giờ: đánh giá tỉ lệ chết để chỉnh bản đồ
    const d = stat.deaths - deathsAtStart; deathsAtStart = stat.deaths;
    if (d > 25) T.mapAdj = Math.min(4, T.mapAdj + 1); else if (d < 4 && T.mapAdj > 0) T.mapAdj--;
    console.log(row(Math.round(nextRep / 3600))); nextRep += 3600;
  }
}
delete stat.fights; if (stat.noEng) { stat.noEngN = stat.noEng.length; stat.noEng = stat.noEng.slice(-8); }
console.log('--- tổng kết', cls, 'đổi class ' + (T.ccN || 0) + ' lần,', hours + 'h', 'thời gian chạy ' + ((Date.now() - t0) / 1000).toFixed(0) + 's', JSON.stringify(stat));
const S = G.S; console.log('đồ đang mặc:', SLOTS.map((sl) => S.equip[sl] ? sl + ' T' + (S.equip[sl].tier + 1) + '+' + S.equip[sl].plus + (S.equip[sl].god ? '✦' + S.equip[sl].god : '') : sl + ' -').join(' · '));
process.exit(0);
