// Trang xem nhân vật (chạy sống, renderer thật của game): chọn class / vũ khí / giới tính / bậc / tư thế / biểu cảm / kích thước.
import './design.css';
import { drawChibi } from '../render/art/v2/chibi.js';
import { plusAll } from '../render/art/v2/heroDraw.js';

const S = { plus: 0, cls: 'knight', wt: 'sword', gender: 'm', tier: 0, pose: 'idle', mood: 'auto', size: 320, armor: true, cape: true, weapon: true, halo: true, fx: true, sil: false, noGlow: false, three: false, bg: 'dark' };
if (location.hash === '#80') Object.assign(S, { size: 80, three: true, noGlow: true }); // mở sẵn: 80px, ba bậc, tắt phát sáng
const TN = { 0: 'Bậc 1 · Bộ Da', 2: 'Bậc 3 · Bộ Xương', 5: 'Bậc 6 · Bộ Thiên Thần' };
const MOODS = { idle: 0, attack: 2, hit: 3, victory: 5 };
const WTS = { knight: [['sword', 'Kiếm'], ['axe', 'Rìu'], ['mace', 'Chùy'], ['spear', 'Thương'], ['special', 'Vương Giả']], wizard: [['staff', 'Trượng'], ['orb', 'Quả Cầu'], ['tome', 'Sách Phép'], ['special', 'Vương Giả']], archer: [['bow', 'Cung'], ['crossbow', 'Nỏ'], ['twinbow', 'Song Cung'], ['special', 'Vương Giả']] };
const CLS_NAME = { knight: 'Kiếm Sĩ', wizard: 'Pháp Sư', archer: 'Xạ Thủ' };
const app = document.getElementById('app');
app.innerHTML = '<div class="card" id="ctl"></div><div id="stage"></div><div class="card"><h3><span class="code">80px</span>Kích thước thật 80 px — 3 class × 3 bậc × nam/nữ</h3><div id="real"></div></div>';
const ctl = document.getElementById('ctl'), stage = document.getElementById('stage'), real = document.getElementById('real');

const groups = [];
function group(label, key, opts) {
  const d = document.createElement('div'); d.className = 'cg'; d.innerHTML = '<span>' + label + '</span>';
  const g = { d, key, setOpts(list) { d.querySelectorAll('button').forEach((b) => b.remove()); for (const [v, t] of list) { const b = document.createElement('button'); b.textContent = t; b.dataset.v = v; b.onclick = () => { S[key] = typeof S[key] === 'number' ? +v : v; refresh(); }; d.appendChild(b); } } };
  g.setOpts(opts); ctl.appendChild(d); groups.push(g); return g;
}
function toggle(label, key) { const b = document.createElement('button'); b.className = 'tg'; b.textContent = label; b.onclick = () => { S[key] = !S[key]; refresh(); }; b.dataset.k = key; ctl.appendChild(b); }
group('Nhân vật', 'cls', Object.entries(CLS_NAME));
const wtG = group('Vũ khí', 'wt', WTS.knight);
group('Giới tính', 'gender', [['m', 'Nam'], ['f', 'Nữ']]);
group('Bậc', 'tier', [[0, 'Bậc 1'], [2, 'Bậc 3'], [5, 'Bậc 6']]);
group('Tư thế', 'pose', ['idle', 'walk', 'attack', 'skill', 'hit', 'death'].map((p) => [p, p[0].toUpperCase() + p.slice(1)]));
group('Biểu cảm', 'mood', [['auto', 'Theo tư thế'], ['idle', 'Idle'], ['attack', 'Attack'], ['hit', 'Hit'], ['victory', 'Victory']]);
group('Cộng', 'plus', [[0, '+0'], [3, '+3'], [5, '+5'], [7, '+7'], [9, '+9'], [11, '+11'], [13, '+13'], [15, '+15']]);
group('Kích thước', 'size', [[80, '80px'], [160, '160px'], [320, '320px']]);
group('Nền', 'bg', [['dark', 'Tối'], ['iso', 'Bản đồ isometric']]);
for (const [l, k] of [['Giáp', 'armor'], ['Áo choàng', 'cape'], ['Vũ khí', 'weapon'], ['Halo', 'halo'], ['Hiệu ứng', 'fx'], ['Silhouette', 'sil'], ['Không phát sáng', 'noGlow'], ['3 bậc cạnh nhau', 'three']]) toggle(l, k);

function refresh() {
  if (!WTS[S.cls].some(([v]) => v === S.wt)) S.wt = WTS[S.cls][0][0];
  wtG.setOpts(WTS[S.cls]);
  for (const g of groups) for (const b of g.d.querySelectorAll('button')) b.classList.toggle('on', String(S[g.key]) === b.dataset.v);
  for (const b of ctl.querySelectorAll('.tg')) b.classList.toggle('on', !!S[b.dataset.k]);
  build();
}
let cells = [];
function cell(label, tier) {
  const sz = S.size, w = Math.round(sz * 1.5), h = Math.round(sz * 1.3), dpr = Math.min(2, devicePixelRatio || 1);
  const wrap = document.createElement('div'); wrap.className = 'tile'; const cv = document.createElement('canvas');
  cv.width = w * dpr; cv.height = h * dpr; cv.style.width = w + 'px'; cv.className = 'art'; wrap.appendChild(cv); wrap.insertAdjacentHTML('beforeend', '<b>' + label + '</b>');
  cells.push({ c: cv.getContext('2d'), w, h, dpr, tier, sz });
  return wrap;
}
function build() {
  cells = []; stage.innerHTML = '';
  const g = document.createElement('div'); g.className = 'grid'; g.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:center;gap:12px'; stage.appendChild(g);
  if (S.three) for (const t of [0, 2, 5]) g.appendChild(cell(CLS_NAME[S.cls] + ' · ' + TN[t], t)); else g.appendChild(cell(CLS_NAME[S.cls] + ' · ' + TN[S.tier], S.tier));
}
function bgDraw(c, w, h, ox, oy, sz) {
  if (S.bg === 'dark') { c.fillStyle = '#0b0a10'; c.fillRect(0, 0, w, h); return; }
  c.fillStyle = '#2a3a22'; c.fillRect(0, 0, w, h); const tw = sz * 0.34, th = tw / 2;
  for (let i = -8; i <= 8; i++) for (let j = -8; j <= 8; j++) { const x = ox + (i - j) * tw, y = oy - th * 4 + (i + j) * th; c.beginPath(); c.moveTo(x, y - th); c.lineTo(x + tw, y); c.lineTo(x, y + th); c.lineTo(x - tw, y); c.closePath(); c.fillStyle = (i + j) & 1 ? '#34482a' : '#3b5230'; c.fill(); c.strokeStyle = 'rgba(0,0,0,.18)'; c.stroke(); }
}
function opts(cls, wt, tier, gender, pose, t) {
  const o = { cls, wtype: wt === 'special' ? WTS[cls][0][0] : wt, special: wt === 'special', tier, gender, pose, t, pl: plusAll(S.plus, t), hide: { armor: !S.armor, cape: !S.cape, weapon: !S.weapon, halo: !S.halo }, noFx: !S.fx, noGlow: S.noGlow };
  if (S.mood !== 'auto') o.mood = MOODS[S.mood];
  if (pose === 'attack') o.k = (t * 0.8) % 1; else if (pose === 'skill') o.k = (t * 0.55) % 1; else if (pose === 'death') o.k = Math.min(1, ((t * 0.4) % 1.5) / 1.1);
  return o;
}
function drawCell(e, t) {
  const { c, dpr, w, h, sz } = e, sc = sz / 340, ox = w * 0.4, oy = h - 8;
  c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h); bgDraw(c, w, h, ox, oy, sz);
  const draw = (cx) => { cx.save(); cx.translate(ox, oy); cx.scale(sc, sc); drawChibi(cx, opts(S.cls, S.wt, e.tier, S.gender, S.pose, t)); cx.restore(); };
  if (S.sil) {
    const off = document.createElement('canvas'); off.width = w * dpr; off.height = h * dpr; const o = off.getContext('2d'); o.setTransform(dpr, 0, 0, dpr, 0, 0); draw(o);
    o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'source-in'; o.fillStyle = '#0a0810'; o.fillRect(0, 0, off.width, off.height);
    c.fillStyle = '#d8d4c8'; c.fillRect(0, 0, w, h); c.drawImage(off, 0, 0, w, h);
  } else draw(c);
}
// dải 80px thật: 3 class × 3 bậc × nam/nữ
const realCells = [];
for (const cls of ['knight', 'wizard', 'archer']) {
  const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin:6px 0;align-items:flex-end'; row.insertAdjacentHTML('beforeend', '<b style="width:62px;color:#e8c26a;font-size:12px">' + CLS_NAME[cls] + '</b>');
  for (const gd of ['m', 'f']) for (const tr of [0, 2, 5]) {
    const cv = document.createElement('canvas'), dpr = Math.min(2, devicePixelRatio || 1); cv.width = 120 * dpr; cv.height = 100 * dpr; cv.style.cssText = 'width:120px;height:100px;background:#0b0a10;border-radius:6px'; row.appendChild(cv);
    realCells.push({ cv, c: cv.getContext('2d'), dpr, cls, gd, tr, wt: WTS[cls][0][0] });
  }
  real.appendChild(row);
}
function loop() {
  const t = performance.now() / 1000;
  for (const e of cells) { try { drawCell(e, t); } catch (er) { if (!e.err) console.error(er); e.err = true; } }
  for (const e of realCells) {
    const { c, dpr } = e; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, 120, 100);
    c.save(); c.translate(48, 94); c.scale(80 / 340, 80 / 340); try { drawChibi(c, { cls: e.cls, wtype: e.wt, tier: e.tr, gender: e.gd, pose: 'idle', t }); } catch (er) { if (!e.err) console.error(er); e.err = true; } c.restore();
  }
  requestAnimationFrame(loop);
}
app.insertAdjacentHTML('beforeend', '<style>#ctl{display:flex;flex-wrap:wrap;gap:10px 18px;position:sticky;top:0;z-index:5}.cg{display:flex;gap:4px;align-items:center;flex-wrap:wrap}.cg span{color:#a49a86;font-size:12px;margin-right:4px}#ctl button{background:#1b150e;color:#e9e2d0;border:1px solid #3a2e1a;border-radius:6px;padding:5px 9px;font-size:12px;cursor:pointer}#ctl button.on{background:#e8c26a;color:#1a1206;font-weight:700}</style>');
refresh(); loop();
