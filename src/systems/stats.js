// Tính chỉ số dẫn xuất G.P từ dữ liệu nhân vật G.S
import { G } from '../core/state.js';
import { CLASSES, STAT_FORMULA } from '../config/classes.js';
import { SLOTS } from '../config/items.js';
import { PLAYER } from '../config/balance.js';
import { SKILL_LIST, TIER_BONUS } from '../config/skills.js';
import { itemPower, wingStats, weaponType, activeSets } from './items.js';
import { guildBuff } from '../config/guild.js';

export function calcStats() {
  const S = G.S, c = CLASSES[S.cls], f = STAT_FORMULA[S.cls], st = S.stats, lv = S.lv;
  const ex = { dmg: 0, crit: 0, spd: 0, heal: 0, hp: 0, def: 0, zen: 0, reflect: 0, mp: 0, skill: 0, guard: 0 };
  let wdmg = 0, adef = 0, wingDmg = 0, wingAbs = 0;

  for (const sl of SLOTS) {
    const it = S.equip[sl];
    if (!it) continue;
    if (sl === 'weapon') wdmg = itemPower(it);
    else if (sl === 'wings') ({ dmg: wingDmg, abs: wingAbs } = wingStats(it));
    else adef += itemPower(it);
    if (it.exc) for (const o of it.exc) ex[o.k] += o.v;
  }

  // Hiệu ứng bộ giáp (3 món / 5 món)
  const sets = activeSets(S.equip);
  for (const g of sets) for (const b of g.active) for (const k in b) ex[k] += b[k];
  // Kỹ năng nội tại (cộng theo cấp kỹ năng) + buff đang có hiệu lực
  const SK = S.skills || { r: {} };
  for (const sk of SKILL_LIST[S.cls]) if (sk.type === 'passive' && SK.r[sk.id]) for (const k in sk.mods) ex[k] += sk.mods[k] * SK.r[sk.id];
  const tb = TIER_BONUS[(S.tier || 1) - 1] || {};
  for (const k in tb) ex[k] += tb[k];
  if (S.guild) { const gb = guildBuff(S.guild.lv); for (const k in gb) ex[k] += gb[k]; } // buff bang hội
  const buffs = (G.R && G.R.p && G.R.p.buffs) || {};
  for (const id in buffs) for (const k in buffs[id].mods) ex[k] += buffs[id].mods[k];
  // Chỉ số riêng của loại vũ khí
  const wm = S.equip.weapon ? weaponType(S.equip.weapon).mods : {};

  const dmg = (f.dmg(st) + wdmg) * (1 + ex.dmg / 100) * (1 + wingDmg / 100) * (1 + (wm.dmg || 0));
  G.P = {
    maxHp: Math.round(f.hp(st, lv) * (1 + ex.hp / 100)),
    maxMp: Math.round(f.mp(st, lv) * (1 + (wm.mp || 0)) * (1 + ex.mp / 100)),
    dmgMin: dmg * (1 - PLAYER.dmgSpread),
    dmgMax: dmg * (1 + PLAYER.dmgSpread),
    def: (st.agi / f.defDiv + adef) * (1 + ex.def / 100) * (1 + (wm.def || 0)),
    spd: Math.min(PLAYER.atkSpeedCap, (c.atkSpd + st.agi / 500) * (1 + ex.spd / 100) * (1 + (wm.spd || 0))),
    crit: +(PLAYER.baseCrit + ex.crit + (wm.crit || 0)).toFixed(1),
    range: c.range + (wm.range || 0),
    skillMul: (1 + (wm.skill || 0)) * (1 + ex.skill / 100),
    basicMul: 1 + (wm.basic || 0),
    skillArea: 1 + (wm.skillArea || 0),
    extraArrows: wm.extraArrows || 0,
    sets,
    heal: ex.heal,
    zen: ex.zen,
    reflect: ex.reflect,
    abs: wingAbs,
    guard: Math.min(60, ex.guard),
  };

  const p = G.R && G.R.p;
  if (p) {
    p.hp = Math.min(p.hp, G.P.maxHp);
    p.mp = Math.min(p.mp, G.P.maxMp);
  }
  return G.P;
}

