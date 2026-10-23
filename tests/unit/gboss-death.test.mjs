import { dirname as _dn, resolve as _rs, join as _jn } from 'node:path';
import { tmpdir as _td } from 'node:os';
import { fileURLToPath as _fu } from 'node:url';
const ROOT = _rs(_dn(_fu(import.meta.url)), '../..');
const TMP = (name) => _jn(_td(), 'kng-test-' + name + '-');
import assert from 'node:assert';
const real = Date.now; Date.now = () => Date.UTC(2026, 9, 23, 5, 5, 0); // 12:05 VN: Boss bang đang mở
const { G } = await import(ROOT + '/src/core/state.js');
const { createCharacter } = await import(ROOT + '/src/systems/character.js');
const { calcStats } = await import(ROOT + '/src/systems/stats.js');
const { enterMap } = await import(ROOT + '/src/systems/world.js');
const { enterGBoss, gbossHurt } = await import(ROOT + '/src/systems/gboss.js');
const { updatePlayer } = await import(ROOT + '/src/systems/player.js');
const { PLAYER } = await import(ROOT + '/src/config/balance.js');
G.S = createCharacter('knight', 'T'); G.S.lv = 80; G.S.exp = 12345; G.S.guild = { id: 'g', name: 'G', lv: 1, role: 'leader' }; calcStats(); enterMap(0);
assert.equal(enterGBoss(), true);
const p = G.R.p; gbossHurt('hit', { frac: 5 }); // chí mạng: 500% máu tối đa
assert.equal(p.hp, 0); assert.equal(p.dead, PLAYER.respawnSec); assert.equal(G.S.exp, 12345, 'không mất EXP');
for (let i = 0; i < 100; i++) updatePlayer(0.05); assert(p.dead <= 0 && p.hp > 0, 'đã hồi sinh'); assert.equal(G.S.exp, 12345);
const { GBOSS } = await import(ROOT + '/src/config/gboss.js'); console.log('thưởng tham gia cấp 80/200/300:', [80, 200, 300].map((l) => GBOSS.participation(l).zen).join(' / '), 'Zen +', JSON.stringify({ bless: 1, soul: 1 }));
console.log('NOEXP OK'); Date.now = real; process.exit(0);
