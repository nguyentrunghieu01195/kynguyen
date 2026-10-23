// Hệ thống kỹ năng: học / nâng cấp / gắn thanh kỹ năng / thi triển / tự động dùng / buff.
import { G } from '../core/state.js';
import { log, announce, emit, on, EV, sysOn } from '../core/events.js';
import { rnd, dist, fmt } from '../core/utils.js';
import { SKILL_LIST, SKILLS_BY_ID, CLASS_TIERS, TIER_RESETS, RANK_CAP, MAX_RANK, BAR_SLOTS, GCD, rankMult, rankCd, rankLevelReq, rankCost } from '../config/skills.js';
import { hitMob, nearestMob, addText } from './combat.js';
import { calcStats } from './stats.js';
import { clampToBounds } from './world.js';
import { blockedAt } from './nav.js';

// ---------------- BẬC NHÂN VẬT ----------------
/** Bậc hiện tại (1..3) — tăng khi hoàn thành nhiệm vụ chuyển chức (systems/quests.js) */
export const tierOf = (S = G.S) => S.tier || 1;
export const tierName = (S = G.S) => CLASS_TIERS[S.cls][tierOf(S) - 1];
export const rankCap = () => RANK_CAP[tierOf() - 1];
export const classSkills = () => SKILL_LIST[G.S.cls];
export const rankOf = (id) => G.S.skills.r[id] || 0;

/** Chi phí MP của kỹ năng ở cấp hiện tại */
export const mpCost = (sk, r = rankOf(sk.id) || 1) => Math.round(sk.cost * (1 + 0.06 * (r - 1)) + G.S.lv * 0.2);
export const cdOf = (sk, r = rankOf(sk.id) || 1) => sk.cd * rankCd(r);
/** Chỉ số buff ở cấp r */
export const buffMods = (sk, r) => Object.fromEntries(Object.entries(sk.mods).map(([k, v]) => [k, +(v + ((sk.rankMods && sk.rankMods[k]) || 0) * (r - 1)).toFixed(1)]));

/** Kiểm tra điều kiện học / nâng cấp. Trả về { ok, next, reqs:[{text, ok}], zen, need } */
export function learnInfo(sk) {
  const S = G.S, r = rankOf(sk.id), next = r + 1;
  if (r >= MAX_RANK) return { ok: false, max: true, next: null, reqs: [] };
  const reqs = [];
  const tierNeed = Math.max(sk.tier, RANK_CAP.findIndex((c) => c >= next) + 1);
  const lvNeed = r === 0 ? sk.lv : rankLevelReq(sk, next);
  reqs.push({ text: 'Bậc ' + tierNeed + ' · ' + CLASS_TIERS[S.cls][tierNeed - 1], ok: tierOf() >= tierNeed });
  reqs.push({ text: 'Cấp ' + lvNeed, ok: S.lv >= lvNeed });
  let zen, need;
  if (r === 0) { zen = sk.learn; need = {}; }
  else ({ zen, need } = rankCost(sk, next));
  const hasMat = S.zen >= zen && Object.keys(need).every((k) => S.jewels[k] >= need[k]);
  return { ok: reqs.every((q) => q.ok) && hasMat, condOk: reqs.every((q) => q.ok), hasMat, next, reqs, zen, need };
}

/** Học kỹ năng mới hoặc nâng lên cấp tiếp theo */
export function learnSkill(id) {
  const S = G.S, sk = SKILLS_BY_ID[id];
  if (!sk || !classSkills().includes(sk)) return false;
  const inf = learnInfo(sk);
  if (!inf.ok) return false;
  S.zen -= inf.zen;
  for (const k in inf.need) S.jewels[k] -= inf.need[k];
  S.skills.r[id] = inf.next;
  if (inf.next === 1) {
    if (sk.type !== 'passive' && !S.skills.bar.includes(id)) { const i = S.skills.bar.indexOf(null); if (i >= 0) S.skills.bar[i] = id; }
    log('📖 Đã học kỹ năng <b>' + sk.name + '</b>!', '#8fd0ff');
    announce('Học được ' + sk.name + '!');
  } else log('📖 <b>' + sk.name + '</b> lên cấp ' + inf.next + '!', '#8fd0ff');
  calcStats();
  emit(EV.SKILL_LEARN, id, inf.next);
  return true;
}

/** Gắn kỹ năng vào ô thanh kỹ năng (id = null để gỡ) */
export function setSlot(i, id) {
  const bar = G.S.skills.bar;
  if (i < 0 || i >= BAR_SLOTS) return false;
  if (id) {
    const sk = SKILLS_BY_ID[id];
    if (!sk || sk.type === 'passive' || !rankOf(id)) return false;
    const j = bar.indexOf(id);
    if (j >= 0) bar[j] = bar[i]; // đổi chỗ
  }
  bar[i] = id || null;
  emit(EV.SKILL_LEARN);
  return true;
}
export const toggleAutoSkill = (id) => { const o = G.S.skills.off; if (o[id]) delete o[id]; else o[id] = 1; };

/** Có kỹ năng mới đủ điều kiện học (để hiện chấm đỏ) */
export const hasLearnable = () => classSkills().some((sk) => !rankOf(sk.id) && learnInfo(sk).ok);

const SKO = { skill: true };

// ---------------- HIỆU ỨNG LÊN QUÁI ----------------
function applyStatus(m, eff) {
  if (!eff || m.hp <= 0 || m.static) return;
  const k = m.boss ? 0.4 : 1;
  if (eff.stun) { m.stun = Math.max(m.stun || 0, eff.stun * k); }
  if (eff.slow) m.slowT = Math.max(m.slowT || 0, eff.slow);
}
const inR = (m, x, y, r) => Math.hypot(m.x - x, m.y - y) <= r + (m.size - 1) * 0.5;
/** Sát thương diện rộng tại (x,y) */
export function areaHit(x, y, r, mult, eff) {
  const ts = G.R.mobs.filter((m) => inR(m, x, y, r));
  ts.forEach((m) => { hitMob(m, mult, SKO); applyStatus(m, eff); });
  return ts.length;
}
/** Quái nằm gần đoạn thẳng a→b */
function onSegment(ax, ay, bx, by, w) {
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
  return G.R.mobs.filter((m) => {
    const t = Math.max(0, Math.min(1, ((m.x - ax) * dx + (m.y - ay) * dy) / L2));
    return Math.hypot(m.x - (ax + dx * t), m.y - (ay + dy * t)) <= w + (m.size - 1) * 0.4;
  });
}
const pickTarget = (p, range, manual) => {
  const tg = p.target && p.target.hp > 0 && dist(p.target, p) <= range ? p.target : nearestMob(p, range);
  if (!tg && manual) log('Không có mục tiêu trong tầm', '#aaa');
  return tg;
};

// ---------------- CÁC KỸ NĂNG CHỦ ĐỘNG ----------------
// Mỗi hàm nhận (sk, p, mult, manual) — mult đã gồm cấp kỹ năng & trang bị. Trả về false nếu không dùng được.
const SKILL_FN = {
  whirl(sk, p, mult, manual) {
    const r = sk.radius * G.P.skillArea;
    if (!G.R.mobs.some((m) => inR(m, p.x, p.y, r)) && !manual) return false;
    G.R.fx.push({ k: 'whirl', x: p.x, y: p.y, t: 0, d: 0.45, r });
    areaHit(p.x, p.y, r, mult);
    return true;
  },
  slam(sk, p, mult, manual) {
    const r = sk.radius * G.P.skillArea;
    if (!G.R.mobs.some((m) => inR(m, p.x, p.y, r)) && !manual) return false;
    G.R.fx.push({ k: 'nova', x: p.x, y: p.y, t: 0, d: 0.6, r, col: '#ffb060', crack: true });
    emit(EV.SHAKE, 6);
    areaHit(p.x, p.y, r, mult, { stun: sk.stun });
    return true;
  },
  charge(sk, p, mult, manual) {
    const tg = pickTarget(p, sk.castRange, manual);
    if (!tg) return false;
    const d = dist(tg, p), k = Math.max(0, (d - 0.8) / d), x0 = p.x, y0 = p.y;
    const x1 = p.x + (tg.x - p.x) * k, y1 = p.y + (tg.y - p.y) * k;
    onSegment(x0, y0, tg.x, tg.y, sk.width).forEach((m) => { hitMob(m, mult, SKO); applyStatus(m, { stun: 0.5 }); });
    // dừng trước vật cản (nước, vách đá)
    let fx = x0, fy = y0;
    for (let q = 0.1; q <= 1.001; q += 0.1) { const nx = x0 + (x1 - x0) * q, ny = y0 + (y1 - y0) * q; if (blockedAt(G.R.map, nx, ny)) break; fx = nx; fy = ny; }
    p.x = fx; p.y = fy; p.tx = null; clampToBounds(p);
    p.target = tg.hp > 0 ? tg : null;
    G.R.fx.push({ k: 'dash', x: p.x, y: p.y, x0, y0, t: 0, d: 0.4 });
    return true;
  },
  skyblade(sk, p, mult, manual) {
    const tg = pickTarget(p, sk.castRange, manual);
    if (!tg) return false;
    G.R.fx.push({ k: 'skyblade', x: tg.x, y: tg.y, t: 0, d: 1, hitAt: 0.45, r: sk.radius * G.P.skillArea, mult, eff: { stun: sk.stun } });
    return true;
  },
  meteor(sk, p, mult, manual) {
    const tg = pickTarget(p, sk.castRange, manual);
    if (!tg) return false;
    G.R.fx.push({ k: 'meteor', x: tg.x, y: tg.y, t: 0, d: 0.7, hitAt: 0.35, r: sk.radius * G.P.skillArea, mult });
    return true;
  },
  frost(sk, p, mult, manual) {
    const tg = pickTarget(p, sk.castRange, manual);
    if (!tg) return false;
    const r = sk.radius * G.P.skillArea;
    G.R.fx.push({ k: 'frost', x: tg.x, y: tg.y, t: 0, d: 0.9, r });
    areaHit(tg.x, tg.y, r, mult, { slow: sk.slow });
    return true;
  },
  chain(sk, p, mult, manual) {
    let cur = pickTarget(p, sk.castRange, manual);
    if (!cur) return false;
    const hit = new Set(), pts = [{ x: p.x, y: p.y }];
    for (let i = 0; i < sk.jumps + G.P.extraArrows && cur; i++) {
      hit.add(cur); pts.push({ x: cur.x, y: cur.y });
      hitMob(cur, mult * (1 - i * 0.08), SKO); applyStatus(cur, { stun: sk.stun });
      let nb = null, bd = 4.2;
      for (const m of G.R.mobs) { if (hit.has(m) || m.hp <= 0) continue; const dd = dist(m, pts[pts.length - 1]); if (dd < bd) { bd = dd; nb = m; } }
      cur = nb;
    }
    G.R.fx.push({ k: 'bolt', x: p.x, y: p.y, pts, t: 0, d: 0.4 });
    return true;
  },
  blackhole(sk, p, mult, manual) {
    const tg = pickTarget(p, sk.castRange, manual);
    if (!tg) return false;
    G.R.fx.push({ k: 'vortex', x: tg.x, y: tg.y, t: 0, d: sk.ticks * sk.every + 0.4, r: sk.radius * G.P.skillArea, mult, ticks: sk.ticks, every: sk.every, next: 0.2, pull: true });
    return true;
  },
  arrowrain(sk, p, mult, manual) {
    const ts = G.R.mobs.filter((m) => dist(m, p) <= sk.castRange).sort((a, b) => dist(a, p) - dist(b, p)).slice(0, sk.targets + G.P.extraArrows);
    if (!ts.length) { if (manual) log('Không có mục tiêu trong tầm', '#aaa'); return false; }
    ts.forEach((m, i) => G.R.projs.push({ x: p.x + rnd(-0.2, 0.2), y: p.y + rnd(-0.2, 0.2), tgt: m, spd: 16 + i, mult, k: 'arrow2', skill: true }));
    return true;
  },
  pierce(sk, p, mult, manual) {
    const tg = pickTarget(p, sk.castRange, manual);
    if (!tg) return false;
    const d = dist(tg, p) || 1, ux = (tg.x - p.x) / d, uy = (tg.y - p.y) / d, L = sk.length;
    const x1 = p.x + ux * L, y1 = p.y + uy * L;
    onSegment(p.x, p.y, x1, y1, sk.width).forEach((m) => hitMob(m, mult, SKO));
    G.R.fx.push({ k: 'beam', x: p.x, y: p.y, x1, y1, t: 0, d: 0.45, col: '#7ff8ff' });
    return true;
  },
  icearrow(sk, p, mult, manual) {
    const ts = G.R.mobs.filter((m) => dist(m, p) <= sk.castRange).sort((a, b) => dist(a, p) - dist(b, p)).slice(0, sk.targets + G.P.extraArrows);
    if (!ts.length) { if (manual) log('Không có mục tiêu trong tầm', '#aaa'); return false; }
    ts.forEach((m, i) => G.R.projs.push({ x: p.x, y: p.y, tgt: m, spd: 14 + i, mult, k: 'ice', skill: true, eff: { slow: sk.slow } }));
    return true;
  },
  phoenix(sk, p, mult, manual) {
    const tg = pickTarget(p, sk.castRange, manual);
    if (!tg) return false;
    G.R.projs.push({ x: p.x, y: p.y, tgt: tg, spd: 11, mult: 0, k: 'phoenix', aoe: { r: sk.radius * G.P.skillArea, mult } });
    return true;
  },
};

function castBuff(sk, p, r) {
  p.buffs[sk.id] = { t: sk.dur, dur: sk.dur, mods: buffMods(sk, r) };
  G.R.fx.push({ k: 'buff', x: p.x, y: p.y, t: 0, d: 0.9, follow: true, col: BUFF_COL[sk.id] || '#ffd54a' });
  addText(p.x, p.y, sk.name, '#ffe082', true);
  calcStats();
  return true;
}
export const BUFF_COL = { warcry: '#ff7a3a', manashield: '#7fb8ff', focus: '#7fff9a' };

/** Thi triển kỹ năng theo id. manual = do người chơi bấm */
export function castSkillId(id, manual) {
  const p = G.R.p, sk = SKILLS_BY_ID[id], r = rankOf(id);
  if (!sk || !r || sk.type === 'passive' || p.dead > 0) return false;
  if ((p.cds[id] || 0) > 0 || p.gcd > 0) return false;
  const cost = mpCost(sk, r);
  if (p.mp < cost) { if (manual) log('Không đủ MP!', '#6aaaff'); return false; }
  const ok = sk.type === 'buff' ? castBuff(sk, p, r) : SKILL_FN[sk.id](sk, p, sk.mult * rankMult(r) * G.P.skillMul, manual);
  if (!ok) return false;
  p.mp -= cost;
  p.cds[id] = cdOf(sk, r);
  p.gcd = GCD;
  p.atk = 0.3;
  emit(EV.SKILL, id);
  return true;
}
export const castSlot = (i, manual = true) => { const id = G.S.skills.bar[i]; return id ? castSkillId(id, manual) : false; };
/** Tương thích cũ: dùng kỹ năng ô 1 */
export const castSkill = (manual) => castSlot(0, manual);

/** AUTO: dùng các kỹ năng trên thanh (trừ kỹ năng bị tắt tự động). Buff trước, chiêu mạnh (hồi lâu) trước. */
export function autoCast() {
  const p = G.R.p, S = G.S;
  if (p.gcd > 0) return;
  const ids = S.skills.bar.filter((id) => id && !S.skills.off[id] && !(p.cds[id] > 0));
  if (!ids.length) return;
  ids.sort((a, b) => {
    const A = SKILLS_BY_ID[a], B = SKILLS_BY_ID[b];
    return (B.type === 'buff') - (A.type === 'buff') || B.cd - A.cd;
  });
  for (const id of ids) {
    const sk = SKILLS_BY_ID[id];
    if (sk.type === 'buff' && p.buffs[id]) continue;
    if (castSkillId(id, false)) return;
  }
}

/** Đếm lùi hồi chiêu & thời gian buff mỗi khung hình */
export function updateSkillTimers(dt) {
  const p = G.R.p;
  p.gcd -= dt;
  for (const id in p.cds) p.cds[id] -= dt;
  let changed = false;
  for (const id in p.buffs) { const b = p.buffs[id]; b.t -= dt; if (b.t <= 0) { delete p.buffs[id]; changed = true; } }
  if (changed) calcStats();
}

/** Hiệu ứng kỹ năng có sát thương trễ / nhiều nhịp (gọi mỗi khung hình từ game.js) */
export function updateSkillFx(f, dt) {
  if (f.foreign) return; // hiệu ứng của đồng đội chỉ để xem, không tính sát thương ở đây
  const R = G.R;
  if (f.follow) { f.x = R.p.x; f.y = R.p.y; }
  if (f.hitAt != null && !f.hit && f.t >= f.hitAt) { f.hit = true; areaHit(f.x, f.y, f.r, f.mult, f.eff); emit(EV.SHAKE, f.k === 'skyblade' ? 9 : 5); }
  if (f.ticks) {
    if (f.pull) for (const m of R.mobs) {
      if (m.static || m.hp <= 0) continue;
      const d = Math.hypot(m.x - f.x, m.y - f.y);
      if (d > 0.3 && d < f.r * 1.4) { const s = Math.min(d - 0.3, (m.boss ? 0.6 : 3) * dt); m.x -= ((m.x - f.x) / d) * s; m.y -= ((m.y - f.y) / d) * s; }
    }
    f.next -= dt;
    if (f.next <= 0 && f.ticks > 0) { f.ticks--; f.next = f.every; areaHit(f.x, f.y, f.r, f.mult, { slow: 1 }); }
  }
}
/** Đạn kỹ năng trúng mục tiêu */
export function onProjectileHit(pr) {
  if (pr.eff) applyStatus(pr.tgt, pr.eff);
  if (pr.aoe) { emit(EV.SHAKE, 8); areaHit(pr.tgt.x, pr.tgt.y, pr.aoe.r, pr.aoe.mult, pr.aoe.eff); G.R.fx.push({ k: 'nova', x: pr.tgt.x, y: pr.tgt.y, t: 0, d: 0.7, r: pr.aoe.r, col: '#ff7a2a', fire: true }); }
}

/** Số kỹ năng chủ động đã học (dùng cho ước lượng cày offline) */
export const activeLearned = (S = G.S) => SKILL_LIST[S.cls].filter((s) => s.type === 'active' && S.skills && S.skills.r[s.id]).length;

export function initSkills() {
  sysOn(EV.RESET, (n) => {
    const S = G.S, next = tierOf() + 1;
    if (next <= 3 && n === TIER_RESETS[next - 1]) log('🌟 Đã mở <b>nhiệm vụ chuyển chức</b> lên ' + CLASS_TIERS[S.cls][next - 1] + '! Xem tab <b>Chuyển chức</b> trong bảng Nhiệm vụ.', '#ffd54a');
  });
  sysOn(EV.TIER_UP, (t) => {
    announce('THĂNG BẬC: ' + CLASS_TIERS[G.S.cls][t - 1].toUpperCase() + '!');
    log('🌟 Đã đạt <b>Bậc ' + t + ' — ' + CLASS_TIERS[G.S.cls][t - 1] + '</b>! Mở khoá kỹ năng mới và nâng cấp kỹ năng tới cấp ' + RANK_CAP[t - 1] + '.', '#ffd54a');
    const p = G.R && G.R.p;
    if (p) G.R.fx.push({ k: 'tierup', x: p.x, y: p.y, t: 0, d: 2.2, tier: t, follow: true });
  });
  sysOn(EV.LEVEL_UP, (lv, up) => {
    const S = G.S;
    for (const sk of SKILL_LIST[S.cls]) if (!rankOf(sk.id) && sk.lv > lv - up && sk.lv <= lv && tierOf() >= sk.tier) log('📖 Có thể học kỹ năng mới: <b>' + sk.name + '</b> (' + fmt(sk.learn) + ' Zen) — mở bảng <b>Kỹ năng</b>.', '#8fd0ff');
  });
}
