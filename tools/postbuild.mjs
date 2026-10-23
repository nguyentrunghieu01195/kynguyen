// Sau khi build: đổi <script type="module"> nội tuyến thành script thường đặt cuối <body>.
// Một số trình xem file trên điện thoại (vd. xem trước trong app) không chạy script module.
import { readFileSync, writeFileSync } from 'node:fs';
const f = process.argv[2] || 'dist/index.html';
let s = readFileSync(f, 'utf8');
const m = s.match(/<script type="module"[^>]*>([\s\S]*?)<\/script>/);
if (!m) { console.log('postbuild: không thấy script module'); process.exit(0); }
if (/^\s*(import|export)\s/m.test(m[1])) { console.log('postbuild: còn import/export, giữ nguyên'); process.exit(0); }
s = s.replace(m[0], '');
const code = '<script>(function(){"use strict";\n' + m[1].replace(/<\/script/gi, '<\\/script') + '\n})();</script>';
s = s.replace(/<\/body>(?![\s\S]*<\/body>)/, () => code + '</body>');
writeFileSync(f, s);
console.log('postbuild: đã chuyển script module → script thường (' + f + ')');
