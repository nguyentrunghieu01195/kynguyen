// Bản đồ con (góc phải HUD) + bản đồ lớn (bảng "bigmap"). Chạm/bấm lên bản đồ để tự đi tới đó (tìm đường A*).
import { G } from '../core/state.js';
import { on, EV } from '../core/events.js';
import { NET } from '../net/client.js';
import { act } from '../net/actions.js';
import { mapTier } from '../systems/loot.js';
import { SETS } from '../config/items.js';
import { shade } from '../render/paint.js';
import { $, UI } from './dom.js';

const U = 2; // px nền cho nửa bề ngang 1 ô (hình thoi 2U × U)
const bases = {};

/** Ảnh nền bản đồ con: mỗi ô 1 hình thoi nhỏ theo màu địa hình */
function baseOf(R) {
  const key = R.mapIndex;
  if (bases[key]) return bases[key];
  const map = R.map, M = R.M, th = M.theme, w = map.w || 40, h = map.h || 40;
  const cv = document.createElement('canvas'); cv.width = (w + h) * U; cv.height = ((w + h) * U) / 2;
  const g = cv.getContext('2d');
  const col = { edge: th.edge, town: th.town, path: th.path || th.town, lair: shade(th.g, -45), g: th.g, g2: th.g2 };
  for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) {
    const k = map.tiles[i][j].kind, X = (i - j) * U + h * U, Y = ((i + j) * U) / 2;
    g.fillStyle = k === 'edge' ? shade(th.edge, -10) : col[k] || th.g;
    g.beginPath(); g.moveTo(X, Y); g.lineTo(X + U, Y + U / 2); g.lineTo(X, Y + U); g.lineTo(X - U, Y + U / 2); g.closePath(); g.fill();
  }
  return (bases[key] = { cv, w, h });
}
const toBase = (b, x, y) => ({ X: (x - y) * U + b.h * U, Y: ((x + y) * U) / 2 });
const fromBase = (b, X, Y) => { const a = (X - b.h * U) / U, s = (2 * Y) / U; return { x: (a + s) / 2, y: (s - a) / 2 }; };

/** Vẽ chấm & ký hiệu (toạ độ nền), z = độ phóng hiện tại */
function overlay(c, b, R, z, t, big) {
  const p = R.p, dot = (x, y, r, fill, stroke) => { const q = toBase(b, x, y); c.beginPath(); c.arc(q.X, q.Y, r / z, 0, 6.283); c.fillStyle = fill; c.fill(); if (stroke) { c.lineWidth = 1 / z; c.strokeStyle = stroke; c.stroke(); } };
  // thị trấn
  if (R.map.town) { const q = toBase(b, R.map.town.x, R.map.town.y); c.fillStyle = '#5dff7a'; c.strokeStyle = '#0b2a10'; c.lineWidth = 1.5 / z; c.beginPath(); c.moveTo(q.X, q.Y - 6 / z); c.lineTo(q.X + 6 / z, q.Y); c.lineTo(q.X + 4 / z, q.Y); c.lineTo(q.X + 4 / z, q.Y + 5 / z); c.lineTo(q.X - 4 / z, q.Y + 5 / z); c.lineTo(q.X - 4 / z, q.Y); c.lineTo(q.X - 6 / z, q.Y); c.closePath(); c.fill(); c.stroke(); }
  // nhãn vùng (bản đồ lớn)
  if (big && R.map.zones) {
    c.textAlign = 'center'; c.font = '700 ' + 10 / z + 'px "Be Vietnam Pro", sans-serif';
    // xếp nhãn không đè nhau: đẩy xuống dưới nếu trùng nhãn trước
    const placed = [], lh = 13 / z;
    for (const Z of R.map.zones.slice().sort((za, zb) => toBase(b, za.x, za.y).Y - toBase(b, zb.x, zb.y).Y)) {
      const q = toBase(b, Z.x, Z.y), tx = Z.name + ' · Lv' + Z.lv[0] + '–' + Z.lv[1], tw = c.measureText(tx).width;
      let y = q.Y;
      for (let k = 0; k < 8 && placed.some((r) => Math.abs(r.x - q.X) < (r.w + tw) / 2 + 4 / z && Math.abs(r.y - y) < lh); k++) y += lh;
      placed.push({ x: q.X, y, w: tw });
      c.lineWidth = 3 / z; c.strokeStyle = 'rgba(0,0,0,.85)'; c.strokeText(tx, q.X, y);
      c.fillStyle = Z.lv[0] > G.S.lv + 5 ? '#ff8a8a' : Z.lv[1] < G.S.lv - 20 ? '#bbb' : '#ffe9a8'; c.fillText(tx, q.X, y);
    }
    const L = R.map.centers[R.map.bossCi];
    if (L) { const q = toBase(b, L.x, L.y); c.font = 14 / z + 'px sans-serif'; c.fillText('☠', q.X, q.Y + 16 / z); c.font = '700 ' + 11 / z + 'px "Be Vietnam Pro", sans-serif'; c.strokeText('Hang ổ Boss', q.X, q.Y + 28 / z); c.fillStyle = '#ffb070'; c.fillText('Hang ổ Boss', q.X, q.Y + 28 / z); }
  }
  // đường đi đang theo
  const path = p.path || (p.tx != null ? [{ x: p.tx, y: p.ty }] : null);
  if (path) {
    c.save(); c.setLineDash([3 / z, 3 / z]); c.strokeStyle = 'rgba(255,233,168,.9)'; c.lineWidth = 1.5 / z; c.beginPath();
    let q = toBase(b, p.x, p.y); c.moveTo(q.X, q.Y); for (const w of path) { q = toBase(b, w.x, w.y); c.lineTo(q.X, q.Y); } c.stroke(); c.restore();
    if (p.tx != null) { const f = toBase(b, p.tx, p.ty); c.fillStyle = '#ffd54a'; c.beginPath(); c.moveTo(f.X, f.Y); c.lineTo(f.X, f.Y - 8 / z); c.lineTo(f.X + 5 / z, f.Y - 6 / z); c.lineTo(f.X, f.Y - 4 / z); c.fill(); }
  }
  // quái
  for (const m of R.mobs) {
    if (m.hp <= 0) continue;
    if (m.boss) dot(m.x, m.y, 4 + Math.sin(t * 6), '#ff8a2a', '#000');
    else if (m.elite) dot(m.x, m.y, 2.2, '#ffd54a');
    else if (!big || true) dot(m.x, m.y, big ? 1.4 : 1.6, m.lv > G.S.lv + 5 ? '#ff4040' : '#e05050');
  }
  // người chơi khác
  if (!R.event) for (const o of NET.players.values()) dot(o.x, o.y, 2.4, '#7fd8ff', '#00283a');
  // bản thân: mũi tên theo hướng nhìn
  const q = toBase(b, p.x, p.y), r = 5 / z;
  c.save(); c.translate(q.X, q.Y); c.scale(p.face || 1, 1);
  c.beginPath(); c.moveTo(r * 1.3, 0); c.lineTo(-r * 0.8, -r * 0.8); c.lineTo(-r * 0.3, 0); c.lineTo(-r * 0.8, r * 0.8); c.closePath();
  c.fillStyle = '#fff'; c.fill(); c.strokeStyle = '#000'; c.lineWidth = 1.2 / z; c.stroke(); c.restore();
}

// ---------------- BẢN ĐỒ CON (HUD) ----------------
const MINI = { z: 1.5 };
let lastMini = 0;
export function drawMinimap(t) {
  const R = G.R, cv = $('mmc');
  if (!R || !cv || !R.map || !R.map.tiles) return;
  const now = performance.now(); if (now - lastMini < 66) return; lastMini = now; // ~15 khung/giây là đủ
  const css = cv.clientWidth || 116, dpr = Math.min(2, devicePixelRatio || 1);
  if (cv.width !== Math.round(css * dpr)) { cv.width = Math.round(css * dpr); cv.height = Math.round(css * dpr); }
  const c = cv.getContext('2d'), b = baseOf(R), z = MINI.z * dpr, q = toBase(b, R.p.x, R.p.y);
  c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = R.M.theme.bg; c.fillRect(0, 0, cv.width, cv.height);
  c.setTransform(z, 0, 0, z, cv.width / 2 - q.X * z, cv.height / 2 - q.Y * z);
  c.drawImage(b.cv, 0, 0);
  overlay(c, b, R, z, t, false);
  MINI.view = { z, ox: cv.width / 2 - q.X * z, oy: cv.height / 2 - q.Y * z, dpr };
}

// ---------------- BẢN ĐỒ LỚN ----------------
let bigView = null;
export function drawBigMap(t) {
  const R = G.R, cv = document.getElementById('bigmapc');
  if (!R || !cv) return;
  const b = baseOf(R), dpr = Math.min(2, devicePixelRatio || 1), cssW = cv.clientWidth || 340, cssH = Math.round(cssW * 0.62);
  if (cv.width !== Math.round(cssW * dpr)) { cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr); cv.style.height = cssH + 'px'; }
  const z = Math.min(cv.width / b.cv.width, cv.height / b.cv.height) * 0.96, ox = (cv.width - b.cv.width * z) / 2, oy = (cv.height - b.cv.height * z) / 2;
  const c = cv.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = R.M.theme.bg; c.fillRect(0, 0, cv.width, cv.height);
  c.setTransform(z, 0, 0, z, ox, oy); c.drawImage(b.cv, 0, 0);
  overlay(c, b, R, z / dpr, t, true);
  bigView = { z, ox, oy, dpr };
}

function travelFromCanvas(cv, view, e) {
  const R = G.R, rect = cv.getBoundingClientRect(), dpr = view.dpr;
  const X = ((e.clientX - rect.left) * dpr - view.ox) / view.z, Y = ((e.clientY - rect.top) * dpr - view.oy) / view.z;
  const w = fromBase(baseOf(R), X, Y);
  if (!(w.x > 0 && w.y > 0 && w.x < (R.map.w || 40) && w.y < (R.map.h || 40))) return false;
  act('move', w.x, w.y, true);
  return true;
}

export function initMinimap() {
  const cv = $('mmc');
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (G.R && MINI.view && G.R.p.dead <= 0) travelFromCanvas(cv, MINI.view, e); });
  document.addEventListener('pointerdown', (e) => {
    if (e.target.id !== 'bigmapc' || !bigView || !G.R) return;
    e.preventDefault();
    if (travelFromCanvas(e.target, bigView, e) && UI.bigmapClose !== false) document.querySelector('#panel-close').click();
  });
  on(EV.MAP_ENTER, () => { lastMini = 0; });
}

// ---------------- BẢNG BẢN ĐỒ LỚN ----------------
export const bigMapPanel = {
  id: 'bigmap',
  title: '🧭 Bản đồ khu vực',
  render() {
    const R = G.R, M = R.M, Z = (R.map.zones || []).slice().sort((a, b) => a.lv[0] - b.lv[0]);
    setTimeout(() => drawBigMap(R.t), 0);
    return '<div class="muted" style="margin-bottom:6px"><b style="color:#f3d58a">' + M.name + '</b> · Quái cấp ' + M.lv[0] + '–' + M.lv[1] + ' · Đồ rơi bậc ' + (mapTier() + 1) + ' (' + SETS[mapTier()].name + ')' + ' — chạm lên bản đồ để tự đi tới đó.</div>' +
      '<canvas id="bigmapc" class="bigmap"></canvas>' +
      '<label class="row"><input type="checkbox" data-act="bmClose" ' + (UI.bigmapClose !== false ? 'checked' : '') + '> Đóng bản đồ sau khi chọn điểm đến</label>' +
      '<div class="mmleg"><span><i style="background:#5dff7a"></i>Thị trấn</span><span><i style="background:#fff"></i>Bạn</span><span><i style="background:#7fd8ff"></i>Người chơi</span><span><i style="background:#e05050"></i>Quái</span><span><i style="background:#ffd54a"></i>Tinh anh</span><span><i style="background:#ff8a2a"></i>Boss</span></div>' +
      (Z.length ? '<h4>Khu vực</h4>' + Z.map((z) => '<div class="stat"><span>' + z.name + '</span><span class="' + (z.lv[0] > G.S.lv + 5 ? 'no' : '') + '" style="color:' + (z.lv[0] > G.S.lv + 5 ? '#ff8a8a' : '#ffd54a') + '">Lv ' + z.lv[0] + '–' + z.lv[1] + '</span></div>').join('') : '');
  },
  actions: { bmClose: () => { UI.bigmapClose = UI.bigmapClose === false; return { keep: true }; } },
};
