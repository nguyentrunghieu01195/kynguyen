import { createAccounts } from '../../server/src/accounts.js';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('một tài khoản có nhiều nhân vật', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kng-mc-'));
  const A = createAccounts(dir);
  const { acc, token } = A.register('tester1', 'secret1');
  const sv = (rec, name) => A.putSave(rec, { name, cls: 'knight', lv: 5 }, rec.rev, true);
  // nhân vật đầu tiên dùng bản ghi chính
  const c0 = A.newChar(acc); assert.equal(c0.id, acc.id); sv(c0, 'Một');
  const c1 = A.newChar(acc); assert.notEqual(c1.id, acc.id); sv(c1, 'Hai');
  // đăng nhập chọn nhân vật
  assert.equal(A.auth(token).id, acc.id);
  assert.equal(A.auth(token, c1.id).id, c1.id);
  assert.equal(A.auth(token, 'deadbeefdeadbeef'), null);
  assert.equal(A.get(c1.id).id, c1.id);
  assert.deepEqual(A.info(c1).chars.map((c) => c.name), ['Một', 'Hai']);
  // đủ 5 nhân vật thì báo lỗi
  for (const n of ['Ba', 'Bốn', 'Năm']) sv(A.newChar(acc), n);
  assert.throws(() => A.newChar(acc), (e) => e.code === 'chars_full');
  // người khác không chọn được nhân vật của mình
  const o = A.register('tester2', 'secret2');
  assert.equal(A.auth(o.token, c1.id), null);
  // xoá nhân vật phụ → mất khỏi danh sách; xoá nhân vật chính → để trống chỗ
  A.deleteSave(c1);
  assert.equal(A.info(acc).chars.length, 4);
  A.deleteSave(acc);
  assert.equal(A.info(acc).chars.length, 3);
  assert.equal(A.newChar(acc).id, acc.id); // chỗ chính trống → dùng lại
  // lưu ra file & nạp lại giữ nguyên
  A.flush();
  const B = createAccounts(dir);
  assert.equal(B.info(B.auth(token)).chars.length, 3);
  assert.ok(Object.keys(B.dump().saves).length >= 3);
});
