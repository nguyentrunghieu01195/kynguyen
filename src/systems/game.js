// Vòng lặp cập nhật logic. Không chứa code vẽ hay DOM.
import { G } from '../core/state.js';
import { CFG } from '../config/constants.js';
import { moveToward } from '../core/utils.js';
import { saveGame } from '../core/save.js';
import { updatePlayer } from './player.js';
import { updateMonsters } from './monsters.js';
import { updateDrops } from './loot.js';
import { hitMob } from './combat.js';
import { updateSkillFx, onProjectileHit } from './skills.js';
import { isAlive } from './world.js';
import { updateEvent } from './events.js';
import { updatePets } from './pets.js';

function updateProjectiles(dt) {
  const R = G.R;
  for (let i = R.projs.length - 1; i >= 0; i--) {
    const pr = R.projs[i];
    if (!isAlive(pr.tgt)) { R.projs.splice(i, 1); continue; }
    if (moveToward(pr, pr.tgt.x, pr.tgt.y, pr.spd, dt)) {
      R.projs.splice(i, 1);
      if (pr.mult) hitMob(pr.tgt, pr.mult, pr.skill ? { skill: true } : null);
      onProjectileHit(pr);
      if (pr.k === 'fire') R.fx.push({ k: 'boom', x: pr.x, y: pr.y, t: 0, d: 0.25 });
    }
  }
}

/** Đạn của đồng đội trong đấu trường bang (chỉ hình ảnh, bay tới vị trí đích rồi biến mất) */
function updateVisualProjectiles(dt) {
  const R = G.R;
  if (!R.vprojs || !R.vprojs.length) return;
  for (let i = R.vprojs.length - 1; i >= 0; i--) if (moveToward(R.vprojs[i], R.vprojs[i].tgt.x, R.vprojs[i].tgt.y, R.vprojs[i].spd, dt)) R.vprojs.splice(i, 1);
}

function updateEffects(dt) {
  const R = G.R;
  for (let i = R.fx.length - 1; i >= 0; i--) {
    const f = R.fx[i];
    f.t += dt;
    updateSkillFx(f, dt);
    if (f.t >= f.d) R.fx.splice(i, 1);
  }
  for (let i = R.texts.length - 1; i >= 0; i--) { R.texts[i].t += dt; if (R.texts[i].t > 1) R.texts.splice(i, 1); }
}

export function update(dt) {
  const R = G.R;
  R.t += dt;
  updatePlayer(dt);
  updatePets(dt);
  updateMonsters(dt);
  updateDrops(dt);
  updateProjectiles(dt);
  updateVisualProjectiles(dt);
  updateEffects(dt);
  updateEvent(dt);
  R.saveT -= dt;
  if (R.saveT <= 0) { R.saveT = CFG.AUTOSAVE_SEC; R.saveOk = saveGame(); }
}
