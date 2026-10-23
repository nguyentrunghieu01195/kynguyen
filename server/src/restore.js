// Khôi phục dữ liệu từ 1 file sao lưu. DỪNG MÁY CHỦ TRƯỚC KHI CHẠY.
//   node server/src/restore.js server/data/backups/kng-20261022-030000.json.gz
// Dữ liệu hiện tại được chuyển sang thư mục data/before-restore-<thời gian>/ để có thể quay lại.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = process.env.DATA_DIR || path.join(ROOT, 'server', 'data');
const file = process.argv[2];
if (!file || !fs.existsSync(file)) { console.error('Cách dùng: node server/src/restore.js <file .json.gz>'); process.exit(1); }
const b = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString('utf8'));
if (!b.accounts || !b.players) { console.error('File sao lưu không hợp lệ.'); process.exit(1); }

const keep = path.join(DIR, 'before-restore-' + Date.now());
fs.mkdirSync(keep, { recursive: true });
for (const f of ['accounts.json', 'players.json', 'market.json', 'guilds.json', 'gboss.json', 'siege.json', 'saves']) if (fs.existsSync(path.join(DIR, f))) fs.renameSync(path.join(DIR, f), path.join(keep, f));
fs.mkdirSync(path.join(DIR, 'saves'), { recursive: true });
fs.writeFileSync(path.join(DIR, 'accounts.json'), JSON.stringify(b.accounts));
fs.writeFileSync(path.join(DIR, 'players.json'), JSON.stringify(b.players));
if (b.market) fs.writeFileSync(path.join(DIR, 'market.json'), JSON.stringify(b.market));
if (b.guilds) fs.writeFileSync(path.join(DIR, 'guilds.json'), JSON.stringify(b.guilds));
if (b.gboss) fs.writeFileSync(path.join(DIR, 'gboss.json'), JSON.stringify(b.gboss));
if (b.siege) fs.writeFileSync(path.join(DIR, 'siege.json'), JSON.stringify(b.siege));
for (const [id, d] of Object.entries(b.saves || {})) fs.writeFileSync(path.join(DIR, 'saves', id + '.json'), JSON.stringify(d));
console.log('Đã khôi phục ' + Object.keys(b.accounts.accounts || {}).length + ' tài khoản, ' + Object.keys(b.saves || {}).length + ' nhân vật từ bản ' + new Date(b.at).toLocaleString('vi-VN') + '.');
console.log('Dữ liệu cũ được giữ tại: ' + keep);
