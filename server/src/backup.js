// Sao lưu tự động: gom tài khoản + bản lưu nhân vật + hồ sơ trực tuyến vào 1 file .json.gz
// trong DATA_DIR/backups/. Mặc định mỗi 24 giờ, giữ 14 bản gần nhất.
// Khôi phục: dừng máy chủ rồi chạy  node server/src/restore.js <file.json.gz>
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

export function createBackups(dir, { accounts, store, market, guilds, gboss, siege, everyHours = 24, keep = 14 }) {
  const bdir = path.join(dir, 'backups');
  fs.mkdirSync(bdir, { recursive: true });
  const list = () => fs.readdirSync(bdir).filter((f) => /^kng-\d{8}-\d{6}\.json\.gz$/.test(f)).sort().reverse()
    .map((f) => { const st = fs.statSync(path.join(bdir, f)); return { name: f, size: st.size, at: st.mtimeMs }; });

  function run(tag = 'auto') {
    accounts.flush(); store.flush(); if (market) market.flush(); if (guilds) guilds.flush(); if (gboss) gboss.flush(); if (siege) siege.flush();
    const d = new Date(), pad = (n) => String(n).padStart(2, '0');
    const name = 'kng-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()) + '.json.gz';
    const bundle = { v: 1, at: Date.now(), tag, ...accounts.dump(), players: store.dump(), market: market ? market.dump() : null, guilds: guilds ? guilds.dump() : null, gboss: gboss ? gboss.dump() : null, siege: siege ? siege.dump() : null };
    const tmp = path.join(bdir, name + '.tmp');
    fs.writeFileSync(tmp, zlib.gzipSync(JSON.stringify(bundle), { level: 9 }));
    fs.renameSync(tmp, path.join(bdir, name));
    for (const old of list().slice(keep)) fs.unlinkSync(path.join(bdir, old.name));
    console.log('[backup] ' + name + ' (' + Object.keys(bundle.saves).length + ' nhân vật)');
    return name;
  }
  const filePath = (name) => (/^kng-\d{8}-\d{6}\.json\.gz$/.test(name) && fs.existsSync(path.join(bdir, name)) ? path.join(bdir, name) : null);

  // Lịch: chạy ngay nếu bản gần nhất đã cũ hơn chu kỳ, sau đó kiểm tra mỗi 10 phút
  const due = () => { const l = list()[0]; return !l || Date.now() - l.at >= everyHours * 36e5; };
  const tick = () => { try { if (due()) run(); } catch (e) { console.error('[backup] lỗi', e); } };
  setTimeout(tick, 5000);
  setInterval(tick, 10 * 60000).unref();
  return { run, list, filePath, dir: bdir };
}
