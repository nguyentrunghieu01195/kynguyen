// Ghép cảnh: nền → vật rơi → (cây, quái, nhân vật sắp theo chiều sâu) → đạn → hiệu ứng → chữ.
import { G } from '../core/state.js';

import { CFG, SPAWN, SAFE_RADIUS } from '../config/constants.js';
import { iso, isoRadius, VIEW, camPos } from './iso.js';
import { art } from './art/index.js';
import { NET } from '../net/client.js';
import { fashionLook } from '../systems/fashion.js';
import { shakeOffset, drawTexts, drawVignette, drawWeather, drawTierAuraBack, drawTierAuraFront } from './juice.js';

let lastNow = 0;

/** Dựng trang bị để vẽ từ ngoại hình gọn gửi qua mạng */
function eqOf(p) {
  if (p._lookRef === p.look) return p._eq;
  const eq = {};
  for (const [sl, v] of Object.entries((p.look && p.look.eq) || {})) eq[sl] = { slot: sl, tier: v[0], plus: v[1], cls: p.look.cls, wt: sl === 'weapon' ? v[2] || 0 : 0, line: sl !== 'weapon' ? v[2] || 0 : 0 };
  p.fa = p.look && p.look.fa ? { outfit: p.look.fa.o || null, head: p.look.fa.h || null, aura: p.look.fa.a || null } : null;
  p._lookRef = p.look; p._eq = eq;
  return eq;
}

let ctx = null;
const mapCache = {};

export function initRenderer(canvas) { ctx = canvas.getContext('2d'); }

// ---------------- NỀN BẢN ĐỒ: chia mảnh (chunk) ----------------
// Bản đồ rộng không vẽ hết 1 lần: mỗi mảnh CH×CH ô được vẽ ra canvas phụ khi lần đầu lọt vào khung nhìn (giữ tối đa CHUNK_MAX mảnh).
const CH = 12, CHUNK_MAX = 28, PAD = 30;
function chunkCanvas(ci, cj) {
  const R = G.R, A = art(), key = R.mapIndex + ':' + A.id + ':' + ci + ':' + cj;
  let e = mapCache[key];
  if (e) { e.used = performance.now(); return e; }
  const i0 = ci * CH, j0 = cj * CH, i1 = i0 + CH, j1 = j0 + CH;
  const x0 = (i0 - j1) * 32 - PAD, y0 = (i0 + j0) * 16 - PAD;
  const off = document.createElement('canvas');
  off.width = CH * 64 + PAD * 2; off.height = CH * 32 + PAD * 2;
  const g = off.getContext('2d'); g.translate(-x0, -y0);
  A.paintMap(g, R.map, R.M, { i0, j0, i1, j1 });
  const keys = Object.keys(mapCache);
  if (keys.length >= CHUNK_MAX) { keys.sort((a, b) => mapCache[a].used - mapCache[b].used); for (const k of keys.slice(0, keys.length - CHUNK_MAX + 1)) delete mapCache[k]; }
  return (mapCache[key] = { off, x0, y0, used: performance.now() });
}
/** Vẽ các mảnh nền nằm trong khung nhìn (toạ độ thế giới đã đặt sẵn transform) */
function drawGround(cam, vw, vh) {
  const R = G.R, W = R.map.w || CFG.MAP_W, H = R.map.h || CFG.MAP_H;
  // 4 góc khung nhìn → khoảng ô (i,j)
  const corners = [[-vw, -vh], [vw, -vh], [-vw, vh], [vw, vh]].map(([dx, dy]) => { const sx = cam.x + dx, sy = cam.y + dy; return { i: (sx / 32 + sy / 16) / 2, j: (sy / 16 - sx / 32) / 2 }; });
  const iMin = Math.min(...corners.map((c) => c.i)), iMax = Math.max(...corners.map((c) => c.i)), jMin = Math.min(...corners.map((c) => c.j)), jMax = Math.max(...corners.map((c) => c.j));
  const c0 = Math.max(-1, Math.floor(iMin / CH)), c1 = Math.min(Math.ceil(W / CH), Math.floor(iMax / CH));
  const d0 = Math.max(-1, Math.floor(jMin / CH)), d1 = Math.min(Math.ceil(H / CH), Math.floor(jMax / CH));
  const list = [];
  for (let ci = c0; ci <= c1; ci++) for (let cj = d0; cj <= d1; cj++) list.push([ci, cj]);
  list.sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
  for (const [ci, cj] of list) { const e = chunkCanvas(ci, cj); ctx.drawImage(e.off, e.x0, e.y0); }
}
export const clearMapCache = () => Object.keys(mapCache).forEach((k) => delete mapCache[k]);

function drawBars(c, m, A) {
  const s = iso(m.x, m.y), h = A.mobHeight(m) + 10, show = m.hpShow > 0 || m === G.R.p.target || m.boss || m.elite;
  c.textAlign = 'center';
  if (show) {
    const bw = m.boss ? 70 : 34;
    c.fillStyle = '#000'; c.fillRect(s.x - bw / 2 - 1, s.y - h - 1, bw + 2, 6);
    c.fillStyle = m.boss ? '#ff8a2a' : '#e33'; c.fillRect(s.x - bw / 2, s.y - h, bw * Math.max(0, m.hp / m.maxHp), 4);
    c.font = (m.boss ? 'bold 12px ' : '11px ') + 'sans-serif'; c.lineWidth = 3; c.strokeStyle = '#000';
    const tx = m.name + ' Lv' + m.lv;
    c.strokeText(tx, s.x, s.y - h - 5); c.fillStyle = m.boss ? '#ffb070' : m.elite ? '#ffd54a' : '#eee'; c.fillText(tx, s.x, s.y - h - 5);
  }
}


/** Trạng thái quái: choáng (sao xoay trên đầu) / làm chậm (băng dưới chân) */
function drawStatus(c, m, A, t) {
  const s = iso(m.x, m.y);
  c.save();
  if (m.slowT > 0) {
    c.globalAlpha = 0.55; c.fillStyle = '#9fe4ff'; c.strokeStyle = '#e8fbff'; c.lineWidth = 1.5;
    c.beginPath(); c.ellipse(s.x, s.y, 16 * m.size, 7 * m.size, 0, 0, 6.283); c.fill(); c.stroke();
    for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.4, x = s.x + Math.cos(a) * 12 * m.size, y = s.y + Math.sin(a) * 5 * m.size; c.beginPath(); c.moveTo(x - 3, y); c.lineTo(x, y - 9); c.lineTo(x + 3, y); c.fill(); }
  }
  if (m.stun > 0) {
    const y = s.y - A.mobHeight(m) - 6;
    c.globalAlpha = 1;
    for (let i = 0; i < 3; i++) {
      const a = t * 5 + i * 2.094, x = s.x + Math.cos(a) * 13, yy = y + Math.sin(a) * 4;
      c.fillStyle = '#ffe24a'; c.strokeStyle = '#6a4a00'; c.lineWidth = 1; c.beginPath();
      for (let k = 0; k < 10; k++) { const r = k % 2 ? 2 : 5, b = (k / 10) * 6.283 - 1.57; c.lineTo(x + Math.cos(b) * r, yy + Math.sin(b) * r); }
      c.closePath(); c.fill(); c.stroke();
    }
  }
  c.restore();
}

const BUFF_RING = { warcry: '#ff7a3a', manashield: '#7fb8ff', focus: '#7fff9a' };
/** Vòng sáng dưới chân khi có buff (đã translate tới vị trí nhân vật) */
function drawBuffAura(c, p, t) {
  const ids = Object.keys(p.buffs || {});
  if (!ids.length) return;
  c.save(); c.globalCompositeOperation = 'lighter';
  ids.forEach((id, i) => {
    const col = BUFF_RING[id] || '#ffd54a', a = 0.35 + Math.sin(t * 4 + i) * 0.12;
    c.globalAlpha = a; c.strokeStyle = col; c.lineWidth = 2.5;
    c.beginPath(); c.ellipse(0, 0, 22 + i * 4, 10 + i * 2, 0, 0, 6.283); c.stroke();
    if (id === 'manashield') { c.globalAlpha = 0.16 + Math.sin(t * 3) * 0.05; c.fillStyle = col; c.beginPath(); c.ellipse(0, -30, 26, 36, 0, 0, 6.283); c.fill(); }
    for (let k = 0; k < 3; k++) { const q = (t * 0.8 + k / 3 + i * 0.17) % 1, b = k * 2.1 + t; c.globalAlpha = (1 - q) * 0.8; c.fillStyle = col; c.beginPath(); c.arc(Math.cos(b) * 18, -q * 50, 2, 0, 6.283); c.fill(); }
  });
  c.restore();
}

export function render() {
  const R = G.R, S = G.S, A = art(), p = R.p, t = R.t, cam = camPos(), { W, H, DPR, Z } = VIEW, sc = DPR * Z;
  const now = performance.now(), dt = Math.min(0.1, lastNow ? (now - lastNow) / 1000 : 0.016); lastNow = now;
  const sh = shakeOffset(dt);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = R.M.theme.bg;
  ctx.fillRect(0, 0, W * DPR, H * DPR);
  ctx.setTransform(sc, 0, 0, sc, (DPR * W) / 2 - cam.x * sc + sh.x * DPR, (DPR * H) / 2 - (cam.y - VIEW.CAM_OFFSET_Y) * sc + sh.y * DPR);

  const vw = W / Z / 2 + 90, vh = H / Z / 2 + 130;
  drawGround(cam, W / Z / 2 + 40, H / Z / 2 + 60);

  const inView = (o) => { const s = iso(o.x, o.y); return Math.abs(s.x - cam.x) < vw && Math.abs(s.y - cam.y) < vh; };

  // Vòng thị trấn an toàn (không có trong đấu trường sự kiện)
  const TW = R.map.town, sz = TW ? iso(TW.x, TW.y) : null, sr = isoRadius(R.map.townR || SAFE_RADIUS);
  if (!R.event && TW) {
    ctx.save(); ctx.strokeStyle = 'rgba(120,255,160,.25)'; ctx.setLineDash([8, 8]); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(sz.x, sz.y, sr.rx, sr.ry, 0, 0, 6.283); ctx.stroke(); ctx.restore();
  }

  if (p.target) {
    const s = iso(p.target.x, p.target.y);
    ctx.save(); ctx.strokeStyle = '#ff4040'; ctx.lineWidth = 2; ctx.beginPath();
    ctx.ellipse(s.x, s.y, 18 * p.target.size, 8 * p.target.size, 0, 0, 6.283); ctx.stroke(); ctx.restore();
  }
  for (const d of R.drops) if (inView(d)) A.drawDrop(ctx, d, t);
  // Vùng cảnh báo chiêu boss (vẽ dưới chân, trước quái)
  for (const m of R.mobs) if (m.cast) {
    const c = m.cast, s = iso(c.x, c.y), r = isoRadius(c.r), k = Math.min(1, c.t / c.d);
    ctx.save();
    ctx.globalAlpha = 0.22 + Math.sin(t * 18) * 0.06; ctx.fillStyle = '#ff2020'; ctx.beginPath(); ctx.ellipse(s.x, s.y, r.rx, r.ry, 0, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 0.45; ctx.fillStyle = '#ff5a30'; ctx.beginPath(); ctx.ellipse(s.x, s.y, r.rx * k, r.ry * k, 0, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 0.9; ctx.strokeStyle = '#ffb0a0'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(s.x, s.y, r.rx, r.ry, 0, 0, 6.283); ctx.stroke();
    ctx.restore();
  }

  // Sắp xếp theo chiều sâu (x+y) để vật ở gần che vật ở xa
  const list = [];
  for (const d of R.map.decos) if (inView(d)) list.push({ z: d.x + d.y, k: 0, o: d });
  for (const m of R.mobs) if (inView(m)) list.push({ z: m.x + m.y, k: 1, o: m });
  if (p.dead <= 0) list.push({ z: p.x + p.y, k: 2, o: p });
  if (!R.event) for (const o of NET.players.values()) if (inView(o)) list.push({ z: o.x + o.y, k: 3, o });
  list.sort((a, b) => a.z - b.z);
  for (const e of list) {
    if (e.k === 0) A.drawDeco(ctx, e.o, t);
    else if (e.k === 1) {
      A.drawMob(ctx, e.o, t);
      if (e.o.stun > 0 || e.o.slowT > 0) drawStatus(ctx, e.o, A, t);
      if (e.o.invuln) { // khiên phép bảo hộ
        const s = iso(e.o.x, e.o.y), r = 30 * e.o.size;
        ctx.save(); ctx.globalAlpha = 0.25 + Math.sin(t * 3) * 0.08; ctx.fillStyle = '#6ab8ff'; ctx.strokeStyle = '#bfe4ff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(s.x, s.y - r * 0.8, r, r * 1.05, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 0.7; ctx.stroke(); ctx.restore();
      }
    }
    else if (e.k === 2) { const s = iso(p.x, p.y); ctx.save(); ctx.translate(s.x, s.y); drawBuffAura(ctx, p, t); drawTierAuraBack(ctx, S.tier, t); p.fa = fashionLook(S); A.drawHero(ctx, S.cls, S.equip, t, p); drawTierAuraFront(ctx, S.tier, t, -A.heroHeight + 12); ctx.restore(); }
    else { const o = e.o, s = iso(o.x, o.y); ctx.save(); ctx.translate(s.x, s.y); const tr = (o.look && o.look.tr) || 1, ot = t + (o.id.charCodeAt(0) % 7); drawTierAuraBack(ctx, tr, ot); A.drawHero(ctx, (o.look && o.look.cls) || 'knight', eqOf(o), ot, o); drawTierAuraFront(ctx, tr, ot, -A.heroHeight + 12); ctx.restore(); }
  }

  for (const pr of R.projs) A.drawProjectile(ctx, pr, t);
  for (const pr of R.eprojs || []) A.drawProjectile(ctx, pr, t);
  for (const f of R.fx) A.drawFx(ctx, f, t);
  for (const m of R.mobs) if (inView(m)) drawBars(ctx, m, A);

  if (p.dead <= 0) {
    const s = iso(p.x, p.y), y = s.y - A.heroHeight;
    ctx.font = '700 11px "Be Vietnam Pro", sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#000';
    ctx.strokeText(S.name, s.x, y); ctx.fillStyle = '#8fd0ff'; ctx.fillText(S.name, s.x, y);
  }
  // Tên người chơi khác
  if (!R.event) for (const o of NET.players.values()) if (inView(o)) {
    const s = iso(o.x, o.y), y = s.y - A.heroHeight, label = o.name + ' · Lv' + o.lv + (o.resets ? ' R' + o.resets : '');
    ctx.font = '700 11px "Be Vietnam Pro", sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#000';
    ctx.strokeText(label, s.x, y); ctx.fillStyle = '#ffc8f0'; ctx.fillText(label, s.x, y);
  }
  drawTexts(ctx);
  drawWeather(ctx, t, dt);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawVignette(ctx, t, dt);

  if (p.dead > 0) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = 'rgba(80,0,0,.35)'; ctx.fillRect(0, 0, W * DPR, H * DPR); }
}

