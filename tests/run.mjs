// Chạy toàn bộ test:  npm test            (test đơn vị — nhanh, vài giây)
//                    npm run test:e2e    (từ đầu đến cuối trên máy chủ thật — vài phút, cần: cd server && npm install)
//                    npm run test:all    (cả hai)
// Cần Node ≥ 18 (code dùng `||=`; Dockerfile dùng Node 20).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const major = +process.versions.node.split('.')[0];
if (major < 18) { console.error('Cần Node ≥ 18 (đang chạy ' + process.version + ').'); process.exit(2); }
const mode = process.argv[2] || 'unit';
const dirs = mode === 'all' ? ['unit', 'e2e'] : [mode];
const files = dirs.flatMap((d) => fs.readdirSync(path.join(ROOT, 'tests', d)).filter((f) => f.endsWith('.mjs')).sort().map((f) => path.join('tests', d, f)));
const filter = process.argv[3];
let failed = 0;
for (const f of files) {
  if (filter && !f.includes(filter)) continue;
  const t0 = Date.now();
  const r = await new Promise((res) => {
    const p = spawn('node', [f], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = ''; p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (out += d));
    const timer = setTimeout(() => { p.kill('SIGKILL'); out += '\n[quá thời gian]'; }, 10 * 60000);
    p.on('exit', (code) => { clearTimeout(timer); res({ code, out }); });
  });
  const ok = r.code === 0;
  console.log((ok ? '✔ ' : '✘ ') + f + '  (' + ((Date.now() - t0) / 1000).toFixed(1) + 's)');
  if (!ok) { failed++; console.log(r.out.split('\n').filter((l) => !/EPIPE|^\s+at /.test(l)).slice(-25).join('\n')); }
}
// dọn thư mục tạm còn sót
for (const n of fs.readdirSync(os.tmpdir())) if (n.startsWith('kng-test-')) fs.rmSync(path.join(os.tmpdir(), n), { recursive: true, force: true });
console.log(failed ? '\n' + failed + ' test THẤT BẠI' : '\nTất cả test đạt (' + files.length + ' file).');
process.exit(failed ? 1 : 0);
