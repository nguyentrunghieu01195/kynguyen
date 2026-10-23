import { dirname as _dn, resolve as _rs, join as _jn } from 'node:path';
import { tmpdir as _td } from 'node:os';
import { fileURLToPath as _fu } from 'node:url';
const ROOT = _rs(_dn(_fu(import.meta.url)), '../..');
const TMP = (name) => _jn(_td(), 'kng-test-' + name + '-');
const { createGuilds } = await import(ROOT + '/server/src/guilds.js');
import fs from 'node:fs'; import assert from 'node:assert';
const dir = fs.mkdtempSync(TMP('gt'));
const profiles = { A:{name:'Anh',lv:60,cls:'knight'}, B:{name:'Binh',lv:55,cls:'wizard'}, C:{name:'Cuong',lv:70,cls:'archer'} };
const store = { findByAccount: (a) => profiles[a] };
const g = createGuilds(dir, { store }); const synced=[]; g.setNotify(a=>synced.push(a));
const S = { lv:60, zen:5e6, jewels:{bless:0,soul:3,chaos:0} };
assert.throws(()=>g.create('A',{...S,lv:10},'Rong'),/cấp/);
assert.throws(()=>g.create('A',{...S,zen:1},'Rong'),/Zen/);
g.create('A',S,'Rong Than'); assert.equal(S.zen,2e6); assert.equal(S.guild.role,'leader');
assert.throws(()=>g.create('B',{...S,zen:5e6},'rong than'),/Tên/);
g.apply('B', S.guild.id); assert.throws(()=>g.apply('B', S.guild.id),/rồi/);
assert.equal(g.detail('A').apps.length,1);
assert.throws(()=>g.accept('B','B'),/vào bang/);
g.accept('A','B'); assert.equal(g.brief('B').role,'member'); assert.equal(g.detail('A').apps.length,0);
assert.throws(()=>g.kick('B','A'),/quyền/);
g.setRole('A','B','officer'); assert.equal(g.brief('B').role,'officer');
// donate
const r = g.donate('B', {zen:1e6,jewels:{soul:2}}, {zen:600000, jewels:{soul:2}}); // 600 + 1000 pts
assert.equal(r.pts,1600); assert.equal(r.levelUp,2);
assert.throws(()=>g.donate('B',{zen:10,jewels:{}},{zen:5000}),/Không đủ/);
assert.throws(()=>g.donate('B',{zen:1e9,jewels:{}},{zen:500}),/ít nhất/);
assert.throws(()=>g.donate('B',{zen:1e9,jewels:{}},{zen:-5}),/không hợp lệ/);
assert.equal(g.brief('A').lv,2);
// leader can't leave, transfer, leave
assert.throws(()=>g.leave('A'),/nhượng/);
g.transfer('A','B'); assert.equal(g.brief('A').role,'officer'); assert.equal(g.brief('B').role,'leader');
g.leave('A'); assert.equal(g.brief('A'),null);
g.flush();
const g2 = createGuilds(dir,{store}); assert.equal(g2.brief('B').lv,2); // persisted
assert.equal(g2.list('C').rows[0].name,'Rong Than');
g2.disband('B'); assert.equal(g2.brief('B'),null); assert.equal(g2.count(),0);
console.log('ALL OK', synced.length,'syncs');
