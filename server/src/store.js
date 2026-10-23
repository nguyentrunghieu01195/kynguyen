// Lưu hồ sơ người chơi ra file JSON (đủ cho bản thử nghiệm vài trăm người).
// Khi lên quy mô lớn: thay module này bằng PostgreSQL/Redis, giữ nguyên các hàm bên dưới.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function createStore(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'players.json');
  let data = { players: {} };
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { /* file mới */ }
  const byToken = new Map(Object.values(data.players).map((p) => [p.token, p]));
  let dirty = false, timer = null;

  function flush() {
    if (!dirty) return;
    dirty = false;
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, file); // ghi nguyên tử, tránh hỏng file khi tắt đột ngột
  }
  const touch = () => { dirty = true; if (!timer) timer = setTimeout(() => { timer = null; flush(); }, 2000); };

  return {
    findByToken: (token) => (token && byToken.get(token)) || null,
    findByAccount: (accId) => (accId && Object.values(data.players).find((p) => p.acc === accId)) || null,
    nameTaken: (name, exceptId) => Object.values(data.players).some((p) => p.name.toLowerCase() === name.toLowerCase() && p.id !== exceptId),
    create(fields) {
      const id = crypto.randomBytes(6).toString('hex'), token = crypto.randomBytes(24).toString('hex');
      const p = { id, token, created: Date.now(), lastSeen: Date.now(), lv: 1, resets: 0, tower: 0, power: 0, ...fields };
      data.players[id] = p;
      byToken.set(token, p);
      touch();
      return p;
    },
    update(p, fields) { Object.assign(p, fields, { lastSeen: Date.now() }); touch(); },
    all: () => Object.values(data.players),
    get: (id) => data.players[id] || null,
    dump: () => data,
    flush,
  };
}
