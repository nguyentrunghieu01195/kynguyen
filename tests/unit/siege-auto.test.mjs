import { dirname as _dn, resolve as _rs } from 'node:path';
import { fileURLToPath as _fu } from 'node:url';
import assert from 'node:assert';
const ROOT = _rs(_dn(_fu(import.meta.url)), '../..');
const { G } = await import(ROOT + '/src/core/state.js');
const { createCharacter } = await import(ROOT + '/src/systems/character.js');
const { calcStats } = await import(ROOT + '/src/systems/stats.js');
const { enterMap } = await import(ROOT + '/src/systems/world.js');
const { enterSiege, setSiegeProvider, syncSiege, siegeAuto } = await import(ROOT + '/src/systems/siege.js');
const { updatePlayer } = await import(ROOT + '/src/systems/player.js');
const { SIEGE } = await import(ROOT + '/src/config/siege.js');

function setup(role, slot) {
  G.S = createCharacter('knight', 'T'); G.S.lv = 80; G.S.guild = { id: 'g', name: 'G', lv: 1, role: 'leader' }; calcStats(); enterMap(0);
  setSiegeProvider(() => ({ ok: true, team: { gid: 'g', name: 'G', slot, role }, key: 'k' }));
  assert.equal(enterSiege(), true); G.R.auto = true; return G.R;
}
const foe = (id, x, y) => ({ id, name: id, lv: 80, x, y, hp: 100, maxHp: 100, def: 0, face: 1, moving: false, team: 2, prot: false });
const view = (enemies, open) => ({ enemies, gate: { hp: 500, max: 1000, open }, board: null });
const th = SIEGE.throne;

{ // phe công, cổng đóng, không có địch → đánh cổng
  const R = setup('att', 1), p = R.p; p.x = 20; p.y = 33; syncSiege(view([], false)); updatePlayer(0.05);
  assert(p.target && p.target.siegeGate, 'nhắm cổng'); }
{ // có địch trong 6.5 ô → đánh địch trước cổng
  const R = setup('att', 1), p = R.p; p.x = 20; p.y = 33; syncSiege(view([foe('E1', 22, 33)], false)); siegeAuto();
  assert(p.target && p.target.pvp && p.target.pid === 'E1', 'nhắm người địch'); }
{ // địch xa (> 6.5) → vẫn đánh cổng
  const R = setup('att', 1), p = R.p; p.x = 20; p.y = 33; syncSiege(view([foe('E1', 20, 33 - 10)], false)); siegeAuto();
  assert(p.target && p.target.siegeGate, 'địch xa thì đánh cổng'); }
{ // địch đang bất tử (vừa hồi sinh) → bỏ qua
  const R = setup('att', 1), p = R.p; p.x = 20; p.y = 33; const e = foe('E1', 21, 33); e.prot = true; syncSiege(view([e], false)); siegeAuto();
  assert(p.target && p.target.siegeGate, 'bỏ qua mục tiêu bất tử'); }
{ // cổng đã vỡ → đi tới ngai (đặt tx trong vòng ngai)
  const R = setup('att', 1), p = R.p; p.x = 20; p.y = 33; syncSiege(view([], true)); siegeAuto();
  assert.equal(p.target, null); assert(Math.hypot(p.tx - th.x, p.ty - th.y) <= th.r, 'đích nằm trong vòng ngai'); }
{ // đang đứng trên ngai: đứng yên, địch trong 12 ô thì đánh, ngoài 12 thì kệ
  const R = setup('att', 1), p = R.p; p.x = th.x; p.y = th.y; syncSiege(view([foe('E1', th.x + 9, th.y)], true)); siegeAuto();
  assert(p.target && p.target.pid === 'E1', 'bảo vệ ngai trong 12 ô'); p.target = null;
  syncSiege(view([foe('E1', th.x + 14, th.y)], true)); siegeAuto(); assert.equal(p.target, null); assert.equal(p.tx, null, 'đứng giữ ngai'); }
{ // phe thủ (cổng đóng) → về giữ ngai, không bao giờ đánh cổng nhà
  const R = setup('def', 0), p = R.p; p.x = 20; p.y = 16.5; syncSiege(view([], false)); siegeAuto();
  assert(!p.target || !p.target.siegeGate, 'phe thủ không đánh cổng'); assert(Math.hypot(p.tx - th.x, p.ty - th.y) <= th.r); }
{ // lệnh tay được ưu tiên 2.5 giây
  const R = setup('att', 1), p = R.p; p.x = 20; p.y = 33; syncSiege(view([], false)); R.manualT = 2; p.target = null; siegeAuto();
  assert.equal(p.target, null, 'không ghi đè lệnh tay'); }
console.log('SIEGE AUTO OK'); process.exit(0);
