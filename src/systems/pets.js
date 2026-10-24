// Thú cưng: chuồng pet, trứng, nở, lên cấp, chỉ số cộng, tham chiến. Trạng thái nằm trong S.pets (máy chủ giữ).
import { G } from '../core/state.js';
import { on, emit, EV, log, announce, sysOn } from '../core/events.js';
import { uid } from '../core/utils.js';
import { PET, PETS_BY_RARITY, PET_BY_ID, RARITY, RARITY_ORDER, petFx, petFight } from '../config/pets.js';
import { hitMob } from './combat.js';
import { calcStats } from './stats.js';

export const defaultPets = () => ({ list: [], active: null, eggs: [] });
const pets = () => G.S.pets || (G.S.pets = defaultPets());
export const petById = (id) => pets().list.find((p) => p.id === id) || null;
export const activePet = () => (G.S && G.S.pets ? petById(G.S.pets.active) : null);

/** Tổng chỉ số cộng từ pet đang đi theo */
export function petBonus(S) {
  const o = { dmg: 0, crit: 0, def: 0, hp: 0, zen: 0, exp: 0, heal: 0, pickup: 0 };
  const ap = S.pets && S.pets.list.find((p) => p.id === S.pets.active);
  if (ap) { const fx = petFx(ap.kind, ap.lv); for (const k in fx) o[k] += fx[k]; }
  return o;
}
/** Bán kính nhặt đồ thêm / hệ số EXP của pet đang theo */
export const petPickup = () => { const a = activePet(); return a ? petFx(a.kind, a.lv).pickup || 0 : 0; };
export const petExpMul = () => { const a = activePet(); return a ? 1 + (petFx(a.kind, a.lv).exp || 0) / 100 : 1; };

// ---------------- THÊM PET / TRỨNG ----------------
export function addPet(kind) {
  const P = pets();
  if (!PET_BY_ID[kind] || P.list.length >= PET.maxPets) return null;
  const p = { id: uid(), kind, lv: 1, exp: 0 };
  P.list.push(p);
  if (!P.active) P.active = p.id;
  calcStats();
  emit(EV.PET);
  return p;
}
export function addEgg(rarity) {
  const P = pets();
  if (!PET.eggNeed[rarity] || P.eggs.length >= PET.maxEggs) return false;
  P.eggs.push({ r: rarity, prog: 0, need: PET.eggNeed[rarity] });
  log('🥚 Nhận được <b style="color:' + RARITY[rarity].color + '">Trứng Pet ' + RARITY[rarity].name + '</b>! Hạ quái để ấp nở.', RARITY[rarity].color);
  emit(EV.PET);
  return true;
}
function hatch(egg) {
  const list = PETS_BY_RARITY[egg.r], kind = list[Math.floor(Math.random() * list.length)].id;
  const p = addPet(kind);
  if (!p) return; // chuồng đầy: giữ trứng ở mức sẵn sàng nở
  const def = PET_BY_ID[kind];
  announce('🐣 Trứng nở ra ' + def.name + ' (' + RARITY[def.rarity].name + ')!');
  log('🐣 Nở ra <b style="color:' + RARITY[def.rarity].color + '">' + def.name + '</b> — ' + def.role + '.', RARITY[def.rarity].color);
  return p;
}

// ---------------- HÀNH ĐỘNG ----------------
export function petUse(id) {
  const P = pets();
  if (id != null && !petById(id)) return false;
  P.active = id || null; calcStats(); emit(EV.PET); return true;
}
export function petBuy(kind) {
  const d = PET_BY_ID[kind], price = d && PET.shop[d.rarity];
  if (!d || !price || G.S.zen < price || pets().list.length >= PET.maxPets) return false;
  G.S.zen -= price; addPet(kind); log('🐾 Đã mua ' + d.name + '.', '#9fd0ff'); return true;
}
export function petRelease(id) {
  const P = pets(), p = petById(id);
  if (!p || P.list.length <= 0) return false;
  const d = PET_BY_ID[p.kind]; G.S.zen += Math.round(PET.releaseZen[d.rarity] * (1 + (p.lv - 1) * 0.2));
  P.list.splice(P.list.indexOf(p), 1);
  if (P.active === id) P.active = null;
  calcStats(); emit(EV.PET); return true;
}

// ---------------- TIẾN TRIỂN KHI HẠ QUÁI ----------------
function onKill(m) {
  const S = G.S; if (!S || !S.pets || (m.pvp || m.siegeGate)) return;
  const P = S.pets;
  // trứng đang ấp: tiến độ chỉ tính cho trứng đầu tiên chưa nở
  const egg = P.eggs[0];
  if (egg) { egg.prog += m.boss ? 5 : 1; if (egg.prog >= egg.need && hatch(egg)) P.eggs.shift(); }
  // pet đang theo: nhận EXP
  const a = activePet();
  if (a && a.lv < PET.maxLv) {
    a.exp += m.boss ? PET.bossExp : 1;
    while (a.lv < PET.maxLv && a.exp >= PET.expNeed(a.lv)) { a.exp -= PET.expNeed(a.lv); a.lv++; log('🐾 ' + PET_BY_ID[a.kind].name + ' lên cấp ' + a.lv + '!', '#9fd0ff'); calcStats(); }
    if (a.lv >= PET.maxLv) a.exp = 0;
  }
  // rơi trứng
  const tbl = m.boss && !m.event ? PET.drop.boss : m.elite ? PET.drop.elite : m.event ? null : PET.drop.mob;
  if (tbl) for (const r of RARITY_ORDER) if (tbl[r] && Math.random() < tbl[r]) { addEgg(r); break; }
}

// ---------------- THAM CHIẾN ----------------
let atkT = 0;
export function updatePets(dt) {
  const R = G.R, S = G.S; if (!R || !S || !S.pets || R.p.dead > 0) return;
  const a = activePet(); if (!a) return;
  const f = petFight(a.kind, a.lv); if (!f) return;
  if (R.event && PET.fightSkipEvents.includes(R.event.id)) return;
  atkT -= dt; if (atkT > 0) return;
  const p = R.p; let best = null, bd = f.range;
  for (const m of R.mobs) { if (m.hp <= 0 || m.invuln || m.pvp || m.siegeGate || m.ret) continue; const d = Math.hypot(m.x - p.x, m.y - p.y); if (d < bd) { bd = d; best = m; } }
  if (!best) { atkT = 0.3; return; }
  atkT = f.every;
  hitMob(best, f.pct);
  emit(EV.PET_ATK, best.x, best.y);
}

let inited = false;
export function initPets() {
  if (inited) return; inited = true;
  sysOn(EV.KILL, onKill);
  sysOn(EV.TOWER_FLOOR, (n, first) => { if (first && n % PET.rewards.towerEvery === 0 && G.S && G.S.pets) addEgg(PET.rewards.towerEgg); });
  sysOn(EV.EVENT, (id, ok) => { if (ok && G.S && G.S.pets && Math.random() < PET.rewards.eventChance) addEgg(PET.rewards.eventEgg); });
  sysOn(EV.SIEGE_END, (r) => { const S = G.S; if (r && r.winner && S && S.pets && S.guild && S.guild.name === r.winner && r.active >= PET.rewards.siegeMinActive) addEgg(PET.rewards.siegeWinEgg); });
}
