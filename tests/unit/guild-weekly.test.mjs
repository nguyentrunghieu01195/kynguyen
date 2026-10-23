import { dirname as _dn, resolve as _rs } from 'node:path';
import { fileURLToPath as _fu } from 'node:url';
const ROOT = _rs(_dn(_fu(import.meta.url)), '../..');
import assert from 'node:assert';
const { G } = await import(ROOT + '/src/core/state.js');
const { emit, EV } = await import(ROOT + '/src/core/events.js');
const { createCharacter } = await import(ROOT + '/src/systems/character.js');
const { calcStats } = await import(ROOT + '/src/systems/stats.js');
const Q = await import(ROOT + '/src/systems/quests.js');
const { GUILD_WEEKLY } = await import(ROOT + '/src/config/guild.js');

G.S = createCharacter('knight', 'T'); G.S.lv = 120; G.S.guild = { id: 'g', name: 'G', lv: 1, role: 'member' }; calcStats();
Q.initQuests();

// mã tuần: mọi ngày trong cùng tuần (T2–CN) cho cùng một mã, bắt đầu từ thứ Hai
assert.equal(Q.weekKey(new Date(2026, 9, 19)), '2026-10-19'); // thứ Hai
assert.equal(Q.weekKey(new Date(2026, 9, 25)), '2026-10-19'); // Chủ nhật
assert.equal(Q.weekKey(new Date(2026, 9, 26)), '2026-10-26'); // thứ Hai kế tiếp

const W = Q.ensureGuildW();
assert.equal(W.ids.length, GUILD_WEEKLY.perWeek);
assert.equal(new Set(W.ids).size, W.ids.length, 'không trùng nhiệm vụ');
assert.deepEqual(Q.ensureGuildW().ids, W.ids, 'cùng tuần: cùng bộ');
const list = Q.guildWList();
assert(list.every(Boolean));

// chưa xong → không nhận được
assert.equal(Q.claimGuildQ(list[0].id), null);
// làm xong từng nhiệm vụ bằng cách cộng tiến độ trực tiếp
const finish = (gq) => { W.prog[gq.id] = gq.goal.n; };
const zen0 = G.S.zen, ch0 = G.S.jewels.chaos;
finish(list[0]); let r = Q.claimGuildQ(list[0].id);
assert.equal(r.pts, GUILD_WEEKLY.pts); assert.equal(r.all, false); assert(G.S.zen > zen0, 'có Zen');
assert.equal(Q.claimGuildQ(list[0].id), null, 'không nhận 2 lần');
finish(list[1]); r = Q.claimGuildQ(list[1].id); assert.equal(r.all, false);
finish(list[2]); r = Q.claimGuildQ(list[2].id);
assert.equal(r.all, true); assert.equal(r.pts, GUILD_WEEKLY.pts + GUILD_WEEKLY.allBonus); assert.equal(G.S.jewels.chaos, ch0 + GUILD_WEEKLY.allChaos, 'thưởng đủ bộ có ngọc');

// tiến độ theo sự kiện: Boss bang + công thành
for (const id of ['w_gboss', 'w_siege']) assert(GUILD_WEEKLY.pool.some((x) => x.id === id));
G.S.quest.gw = { week: Q.weekKey(), ids: ['w_gboss', 'w_siege', 'w_kill'], prog: {}, claimed: {} };
emit(EV.GBOSS_END, { dmg: 0 }); assert.equal(G.S.quest.gw.prog.w_gboss || 0, 0, 'không gây sát thương không tính');
emit(EV.GBOSS_END, { dmg: 5000 }); assert.equal(G.S.quest.gw.prog.w_gboss, 1);
emit(EV.SIEGE_END, { active: 0 }); assert.equal(G.S.quest.gw.prog.w_siege || 0, 0, 'không vào trận không tính');
emit(EV.SIEGE_END, { active: 120 }); assert.equal(G.S.quest.gw.prog.w_siege, 1);

// sang tuần mới → bộ mới, tiến độ xoá
G.S.quest.gw.week = '2000-01-03'; const W2 = Q.ensureGuildW(); assert.equal(W2.week, Q.weekKey()); assert.deepEqual(W2.claimed, {});
console.log('WEEKLY OK'); process.exit(0);
