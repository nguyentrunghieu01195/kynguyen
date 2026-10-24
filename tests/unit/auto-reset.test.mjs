// Sau khi Reset (cấp 1) đứng ở bản đồ cao: AUTO phải chọn được quái (trước đây bị bỏ qua vì cấp thật quá thấp)
import { dirname as _dn, resolve as _rs } from 'node:path';
import { fileURLToPath as _fu } from 'node:url';
const ROOT = _rs(_dn(_fu(import.meta.url)), '../..');
import assert from 'node:assert';
const { G } = await import(ROOT + '/src/core/state.js');
const { createCharacter, autoLevel, canEnterMap } = await import(ROOT + '/src/systems/character.js');
const { calcStats } = await import(ROOT + '/src/systems/stats.js');
const { enterMap } = await import(ROOT + '/src/systems/world.js');
const { nearestMob } = await import(ROOT + '/src/systems/combat.js');
const { updatePlayer } = await import(ROOT + '/src/systems/player.js');

G.S = createCharacter('knight', 'T'); G.S.lv = 1; G.S.resets = 1; calcStats();
assert(canEnterMap(3), 'sau 1 lần Reset vào được Hầm Mộ Cổ ở cấp 1'); assert.equal(autoLevel(), 61);
enterMap(3); const R = G.R; R.auto = true;
assert(nearestMob(R.p, 999, true), 'AUTO chọn được quái ở bản đồ cao sau Reset');
// chạy AUTO một lúc: nhân vật phải nhắm mục tiêu (không đứng yên)
let targeted = false; for (let i = 0; i < 600 && !targeted; i++) { R.p.hp = G.P.maxHp; updatePlayer(0.05); if (R.p.target) targeted = true; }
assert(targeted, 'AUTO tự nhắm quái');
// người chưa Reset vẫn không bị lao vào quái quá mạnh
G.S.resets = 0; G.S.lv = 1; calcStats(); enterMap(0); const R2 = G.R; assert.equal(autoLevel(), 1);
for (const m of R2.mobs) assert(!(m.lv > 11 && !m.angry && !m.boss) || nearestMob(R2.p, 999, true) !== m, 'không chọn quái quá mạnh');
console.log('AUTO-RESET OK'); process.exit(0);
