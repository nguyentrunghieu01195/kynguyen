// Chiến đấu: đánh thường, kỹ năng, nhận sát thương, chết, bình thuốc.
import { G } from '../core/state.js';
import { NIGHTMARE } from '../config/nightmare.js';
import { checkUnlocks } from './fashion.js';
import { log, announce, emit, EV } from '../core/events.js';
import { rnd, dist, fmt } from '../core/utils.js';
import { CLASSES } from '../config/classes.js';
import { PLAYER, POTION, MONSTER, mitigate } from '../config/balance.js';
import { gainExp, expNeed, expRate, autoLevel } from './character.js';
import { petExpMul } from './pets.js';
import { rollDrops } from './loot.js';
import { SIEGE } from '../config/siege.js';

/** Chữ bay. style: true/'big' (to), 'crit' (chí mạng, nảy to), 'skill' (sát thương kỹ năng), 'hurt' (người chơi mất máu) */
export function addText(x, y, txt, col, style) {
  const T = G.R.texts;
  T.push({ x, y, txt, col, t: 0, big: style === true || style === 'big', st: typeof style === 'string' ? style : null, ox: rnd(-10, 10) });
  if (T.length > 60) T.shift();
}

export function nearestMob(o, maxD, forAuto) {
  let best = null, bd = maxD;
  for (const m of G.R.mobs) {
    if (m.hp <= 0 || m.ret || m.invuln) continue;
    if (forAuto && m.boss && !m.angry && autoLevel() < m.lv - 5) continue; // auto không tự lao vào boss quá mạnh
    if (forAuto && !m.angry && !G.R.event && m.lv > autoLevel() + 10) continue;
    if (forAuto && m.ignoreT > (G.R.time || 0)) continue; // AUTO tạm bỏ qua quái không với tới // bỏ qua quái quá mạnh
    const d = dist(m, o);
    if (d < bd) { bd = d; best = m; }
  }
  return best;
}

/** Gây sát thương lên quái. opts.skill = đòn từ kỹ năng */
export function hitMob(m, mult, opts) {
  if (m.hp <= 0) return;
  if (m.invuln) { if (Math.random() < 0.3) addText(m.x, m.y, 'Miễn nhiễm', '#8fd0ff'); return; }
  const P = G.P;
  let d = rnd(P.dmgMin, P.dmgMax) * mult;
  const crit = Math.random() * 100 < P.crit;
  if (crit) d *= PLAYER.critMult;
  if (m.pvp || m.siegeGate) return siegeHit(m, d, mult, crit, opts);
  d = Math.max(1, Math.round(mitigate(d, m.def)));
  m.hp -= d;
  m.flash = 0.12;
  m.angry = true;
  m.hpShow = 4;
  const sk = !!(opts && opts.skill);
  addText(m.x, m.y, fmt(d) + (crit ? '!' : ''), crit ? '#ffd54a' : sk ? '#ffb070' : '#ffffff', crit ? 'crit' : sk ? 'skill' : null);
  // Đẩy lùi nhẹ (không áp dụng boss / vật thể đứng yên)
  if (!m.boss && !m.static) {
    const p = G.R.p, dx = m.x - p.x, dy = m.y - p.y, dd = Math.hypot(dx, dy) || 1, f = (crit ? 3.2 : 1.6) * (sk ? 1.3 : 1);
    m.kbx = (dx / dd) * f; m.kby = (dy / dd) * f; m.kbT = 0.12;
  }
  emit(EV.HIT, m, d, crit, sk);
  if (m.hp <= 0) killMob(m);
}

/**
 * Công Thành Chiến: đánh vào người địch (m.pvp) hoặc Cổng Thành (m.siegeGate). Không giết "đại diện" tại máy này:
 * sát thương được ghi vào E.out để máy chủ chuyển cho người bị đánh / trừ máu cổng.
 *  - Người chơi: công thức thường (trừ phòng thủ thật của họ) × SIEGE.pvpCoef.
 *  - Cổng: tính theo hệ số đòn (mult) nên không phụ thuộc cấp người đánh.
 */
function siegeHit(m, d, mult, crit, opts) {
  const E = G.R.event;
  if (!E || E.id !== 'siege' || E.over) return;
  const sk = !!(opts && opts.skill);
  let shown;
  if (m.pvp) {
    d = Math.max(1, Math.round(mitigate(d, m.def) * SIEGE.pvpCoef));
    E.out.pvp[m.pid] = (E.out.pvp[m.pid] || 0) + d;
    E.dmgOut += d;
    m.hp = Math.max(1, m.hp - d); // chỉ để thanh máu nhảy ngay; máy chủ sẽ gửi lại máu thật
    shown = d;
  } else {
    shown = Math.round(mult * SIEGE.gate.unit);
    E.out.gate += shown;
    m.hp = Math.max(1, m.hp - shown);
  }
  m.flash = 0.12; m.hpShow = 4;
  addText(m.x, m.y, fmt(shown) + (crit ? '!' : ''), crit ? '#ffd54a' : sk ? '#ffb070' : '#ffffff', crit ? 'crit' : sk ? 'skill' : null);
  emit(EV.HIT, m, shown, crit, sk);
}

export function killMob(m) {
  const R = G.R, S = G.S, P = G.P;
  m.hp = 0;
  const i = R.mobs.indexOf(m);
  if (i >= 0) R.mobs.splice(i, 1);
  if (R.p.target === m) R.p.target = null;
  S.kills++;
  gainExp(m.exp * expRate() * petExpMul() * ((G.P && G.P.expMul) || 1));
  if (P.heal) R.p.hp = Math.min(P.maxHp, R.p.hp + (P.maxHp * P.heal) / 100);
  rollDrops(m);
  R.fx.push({ k: 'die', x: m.x, y: m.y, t: 0, d: 0.45, col: m.c1, size: m.size });
  if (m.event || m.noRespawn) { /* quái sự kiện: không hồi sinh */ }
  else if (m.nightmare) {
    R.nm = null; R.nmT = NIGHTMARE.respawnSec; S.nmKills = (S.nmKills || 0) + 1; checkUnlocks();
    announce('Đã hạ Hỗn Mang Chi Vương!');
    log('🌀 Bạn đã hạ gục <b>Hỗn Mang Chi Vương</b>! Nó sẽ trở lại sau ' + Math.round(NIGHTMARE.respawnSec / 60) + ' phút.', '#d070ff');
  } else if (m.boss) {
    R.boss = null;
    R.bossT = MONSTER.boss.respawnSec;
    announce('Đã hạ gục BOSS ' + m.name + '!');
    log('🏆 Bạn đã hạ gục <b>' + m.name + '</b>! Boss sẽ quay lại sau 3 phút.', '#ffb070');
  } else R.respawn.push({ t: MONSTER.respawnSec, ci: m.ci });
  emit(EV.KILL, m);
}

export function basicAttack(m) {
  const p = G.R.p, c = CLASSES[G.S.cls];
  p.atkT = 1 / G.P.spd;
  p.atk = 0.25;
  emit(EV.BASIC, c.attack);
  if (c.attack === 'melee') {
    hitMob(m, G.P.basicMul);
    G.R.fx.push({ k: 'slash', x: m.x, y: m.y, t: 0, d: 0.2, f: p.face });
  } else {
    G.R.projs.push({ x: p.x, y: p.y, tgt: m, spd: c.attack === 'fire' ? 9 : 15, mult: G.P.basicMul, k: c.attack });
  }
}

export function usePotion(t, manual) {
  const p = G.R.p, S = G.S, P = G.P;
  if (p.dead > 0) return;
  if (S.pot[t] <= 0) { if (manual) log('Hết bình ' + (t === 'hp' ? 'máu' : 'mana') + '! Mua thêm ở Cửa hàng.', '#f88'); return; }
  if (p.potT > 0 && !manual) return;
  if (t === 'hp') {
    if (p.hp >= P.maxHp) return;
    p.hp = Math.min(P.maxHp, p.hp + P.maxHp * POTION.hpHeal);
    addText(p.x, p.y, '+HP', '#5dff7a');
  } else {
    if (p.mp >= P.maxMp) return;
    p.mp = Math.min(P.maxMp, p.mp + P.maxMp * POTION.mpHeal);
    addText(p.x, p.y, '+MP', '#6aaaff');
  }
  S.pot[t]--;
  p.potT = POTION.cooldown;
  emit(EV.POTION, t);
}

export function mobAttack(m) {
  const p = G.R.p, P = G.P;
  const d = Math.max(1, Math.round(mitigate(m.dmg * rnd(0.85, 1.15), P.def) * (1 - P.abs / 100) * (1 - P.guard / 100)));
  p.hp -= d;
  p.hurtT = 1.2;
  addText(p.x, p.y, '-' + fmt(d), '#ff5050', 'hurt');
  emit(EV.PLAYER_HIT, d, m);
  m.lunge = 0.2;
  if (P.reflect) {
    const r = Math.round((d * P.reflect) / 100);
    if (r > 0) { m.hp -= r; if (m.hp <= 0) killMob(m); }
  }
  if (p.hp <= 0) playerDie();
}

export function playerDie() {
  const p = G.R.p, S = G.S;
  p.hp = 0;
  p.dead = PLAYER.respawnSec;
  p.target = null;
  p.tx = null;
  const loss = Math.floor(expNeed(S.lv) * PLAYER.deathExpLoss);
  S.exp = Math.max(0, S.exp - loss);
  announce('Bạn đã tử trận...');
  log('Bạn đã tử trận và mất ' + fmt(loss) + ' EXP. Hãy cộng Thể lực hoặc nâng cấp giáp!', '#f66');
  emit(EV.PLAYER_DIE);
}
