import { dirname as _dn, resolve as _rs } from 'node:path';
import { fileURLToPath as _fu } from 'node:url';
const ROOT = _rs(_dn(_fu(import.meta.url)), '../..');
import assert from 'node:assert';
const { clientIp, isPrivateIp, isLoopback, Bucket, audit, auditLog, auditCount } = await import(ROOT + '/server/src/guard.js');

// IP thật: không tin X-Forwarded-For từ kết nối công cộng (chống đổi IP để vượt giới hạn)
assert.equal(clientIp({ 'x-forwarded-for': '1.2.3.4' }, '203.0.113.9'), '203.0.113.9', 'kết nối công cộng: bỏ qua tiêu đề giả');
assert.equal(clientIp({ 'x-forwarded-for': '66.6.6.6, 5.5.5.5' }, '10.0.0.2'), '5.5.5.5', 'qua proxy nội bộ: lấy phần tử do proxy thêm (cuối)');
assert.equal(clientIp({ 'x-forwarded-for': '1.2.3.4' }, '203.0.113.9', true), '1.2.3.4', 'TRUST_PROXY=1');
assert.equal(clientIp({}, '203.0.113.9'), '203.0.113.9');
assert(isPrivateIp('172.17.0.3') && isPrivateIp('192.168.1.5') && isPrivateIp('::ffff:127.0.0.1') && !isPrivateIp('172.32.0.1') && !isPrivateIp('8.8.8.8'));
assert(isLoopback('127.0.0.1') && isLoopback('::1') && !isLoopback('10.0.0.1'));

// xô token: bùng nổ rồi bị chặn, hồi lại theo thời gian
const b = new Bucket(10, 20, 0); let ok = 0; for (let i = 0; i < 100; i++) if (b.take(0)) ok++;
assert.equal(ok, 20, 'chỉ 20 tin đầu qua');
assert.equal(b.take(0), false); assert.equal(b.take(500), true, 'sau 0,5s hồi 5 token');
let ok2 = 0; for (let i = 0; i < 10; i++) if (b.take(500)) ok2++; assert.equal(ok2, 4);

// nhật ký
const n0 = auditLog().length; audit('test', 'x', 'a'); for (let i = 0; i < 40; i++) audit('test', 'x', 'b');
assert.equal(auditCount('test', 'x'), 41); assert(auditLog().length >= n0 + 2 && auditLog().length <= n0 + 3, 'chỉ ghi lần đầu và mỗi 20 lần');
console.log('GUARD OK'); process.exit(0);
