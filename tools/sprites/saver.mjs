// Máy nhận ảnh nhỏ cho công cụ xuất sprite: POST /save?name=xxx.png (body nhị phân) → ghi vào tools/sprites/out/
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out');
fs.mkdirSync(OUT, { recursive: true });
http.createServer((req, res) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  const u = new URL(req.url, 'http://x'), name = (u.searchParams.get('name') || '').replace(/[^a-zA-Z0-9_.-]/g, '');
  if (req.method !== 'POST' || !name) { res.writeHead(400, cors); return res.end('bad'); }
  const chunks = []; req.on('data', (c) => chunks.push(c)); req.on('end', () => { fs.writeFileSync(path.join(OUT, name), Buffer.concat(chunks)); res.writeHead(200, cors); res.end('ok'); });
}).listen(5190, () => console.log('saver :5190'));
