import { dirname as _dn, resolve as _rs } from 'node:path';
import { fileURLToPath as _fu } from 'node:url';
const ROOT = _rs(_dn(_fu(import.meta.url)), '../..');
import assert from 'node:assert';
const { G } = await import(ROOT + '/src/core/state.js');
const { emit, EV } = await import(ROOT + '/src/core/events.js');
const { createCharacter } = await import(ROOT + '/src/systems/character.js');
const { calcStats } = await import(ROOT + '/src/systems/stats.js');
const { enterMap, createMob } = await import(ROOT + '/src/systems/world.js');
const Pets = await import(ROOT + '/src/systems/pets.js');
const { PET, PETS, PET_BY_ID, petFx, petFight } = await import(ROOT + '/src/config/pets.js');
const { ACTIONS, runAction } = await import(ROOT + '/src/net/actions.js');

G.S = createCharacter('knight', 'T'); G.S.lv = 60; calcStats(); enterMap(0); Pets.initPets();
assert.deepEqual(G.S.pets, { list: [], active: null, eggs: [] });
const base = { dmg: G.P.dmgMax, def: G.P.def, zen: G.P.zen, hp: G.P.maxHp, crit: G.P.crit };

// cấu hình hợp lệ
assert.equal(PETS.length, 12); assert(new Set(PETS.map((p) => p.id)).size === 12);
for (const p of PETS) { assert(p.fx || p.fight, p.id + ' có công dụng'); const f1 = petFx(p.id, 1), f10 = petFx(p.id, 10); for (const k in f1) assert(f10[k] > f1[k], p.id + ' mạnh dần theo cấp'); }

// mua / dùng pet, chỉ số cộng
G.S.zen = 5e6;
assert.equal(runAction('petBuy', ['lion']).r, false, 'pet Vương Giả không bán');
assert.equal(runAction('petBuy', ['fox']).r, true); assert.equal(G.S.zen, 3e6);
const fox = G.S.pets.list[0]; assert.equal(G.S.pets.active, fox.id, 'pet đầu tiên tự động đi theo');
assert(G.P.dmgMax > base.dmg && G.P.crit > base.crit, 'hồ ly cộng sát thương + chí mạng');
runAction('petUse', [null]); assert.equal(G.P.dmgMax, base.dmg, 'bỏ pet → hết cộng'); runAction('petUse', [fox.id]);
assert.equal(runAction('petUse', ['nonexistent']).r, false);

// lên cấp bằng cách hạ quái
const realRnd = Math.random; Math.random = () => 0.9999; // không rơi trứng ngẫu nhiên khi đếm tiến độ
const kill = (boss) => emit(EV.KILL, { boss, lv: 1, elite: false, event: false });
for (let i = 0; i < PET.expNeed(1); i++) kill(false); assert.equal(fox.lv, 2);
for (let i = 0; i < 200; i++) kill(true); assert.equal(fox.lv, PET.maxLv, 'tối đa cấp 10'); assert.equal(fox.exp, 0);

// trứng: nở sau đủ số quái (xoá trứng/pet rơi ngẫu nhiên khi hạ boss ở trên)
G.S.pets.eggs = []; G.S.pets.list = [fox]; G.S.pets.active = fox.id;
assert(Pets.addEgg('common')); assert.equal(G.S.pets.eggs.length, 1);
for (let i = 0; i < PET.eggNeed.common; i++) kill(false);
assert.equal(G.S.pets.eggs.length, 0, 'trứng đã nở'); assert.equal(G.S.pets.list.length, 2);
for (let i = 0; i < PET.maxEggs; i++) Pets.addEgg('rare'); assert.equal(G.S.pets.eggs.length, PET.maxEggs, 'tối đa số trứng'); assert.equal(Pets.addEgg('rare'), false);
G.S.pets.eggs = [];

Math.random = realRnd;
// Zen + EXP + nhặt đồ
Pets.addPet('ghost'); Pets.petUse(G.S.pets.list[2].id); assert(G.P.zen > base.zen);
const g = G.S.pets.list[2]; assert(Pets.petExpMul() > 1);
Pets.addPet('bird'); Pets.petUse(G.S.pets.list[3].id); assert(Pets.petPickup() >= 4);
runAction('petUse', [null]); assert.equal(Pets.petPickup(), 0);

// tham chiến
const dragon = Pets.addPet('dragon'); Pets.petUse(dragon.id);
const mob = createMob({ id: 'slime', name: 'S', shape: 'blob', c1: '#0f0', c2: '#0a0', size: 1 }, 30, G.R.p.x + 2, G.R.p.y, {});
G.R.mobs.push(mob); const hp0 = mob.hp; Pets.updatePets(0.1); assert(mob.hp < hp0, 'rồng đánh quái trong tầm');
const hp1 = mob.hp; Pets.updatePets(0.1); assert.equal(mob.hp, hp1, 'chờ hồi chiêu');
G.R.mobs.length = 0;
// không tham chiến trong công thành
G.R.event = { id: 'siege' }; G.R.mobs.push(mob); mob.hp = mob.maxHp; Pets.updatePets(5); assert.equal(mob.hp, mob.maxHp); G.R.event = null; G.R.mobs.length = 0;

// thả pet
const z0 = G.S.zen, n0 = G.S.pets.list.length; assert.equal(runAction('petRelease', [dragon.id]).r, true); assert(G.S.zen > z0); assert.equal(G.S.pets.list.length, n0 - 1); assert.equal(G.S.pets.active, null);
// tham số độc hại
for (const a of [['__proto__'], [''], [123], [null]]) for (const n of ['petBuy', 'petRelease']) { const r = runAction(n, a); assert(r.error || r.r === false, n); }
console.log('PETS OK'); process.exit(0);
