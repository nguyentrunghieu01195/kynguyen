// "Cảm giác chơi": rung màn hình, chữ sát thương, viền đỏ khi sắp chết, hào quang bậc nhân vật, thời tiết theo bản đồ.
// Chỉ đọc trạng thái game + lắng nghe event bus, không thay đổi logic.
import { G } from '../core/state.js';
import { on, EV } from '../core/events.js';
import { iso, VIEW, worldToScreen } from './iso.js';

// ---------------- TUỲ CHỌN (lưu riêng, không nằm trong save nhân vật) ----------------
const PREF_KEY = 'kng_fx_prefs';
export const FXP = (() => { try { return Object.assign({ shake: true, weather: true, particles: true, daynight: true }, JSON.parse(localStorage.getItem(PREF_KEY) || '{}')); } catch (e) { return { shake: true, weather: true, particles: true, daynight: true }; } })();
export const setFxPref = (k, v) => { FXP[k] = v; try { localStorage.setItem(PREF_KEY, JSON.stringify(FXP)); } catch (e) { /* bỏ qua */ } };

// ---------------- NGÀY ĐÊM & ÁNH SÁNG ----------------
// Chu kỳ theo giờ thật (mỗi vòng DAY_LEN giây). Ban đêm phủ tông xanh tối (multiply), đuốc / pha lê / dung nham / nhân vật toả quầng sáng.
const DAY_LEN = 1500;
const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
/** Mức "đêm" 0 (ban ngày) .. 1 (nửa đêm) */
export function nightLevel(now = Date.now()) {
  if (typeof FXP.nightOverride === 'number') return FXP.nightOverride; // tuỳ chọn ẩn để thử: localStorage kng_fx_prefs {"nightOverride":0.7}
  const ph = ((now / 1000) % DAY_LEN) / DAY_LEN, s = 0.5 + 0.5 * Math.cos(ph * 6.2832);
  return 1 - smooth(0.1, 0.5, s);
}
const NIGHT_MAX = { crypt: 0.35, volcano: 0.3, fallen: 0.4, darkwood: 0.65, arena_bc: 0, arena_ds: 0 }; // bản đồ vốn tối: giảm mức đêm
const LIGHT_KINDS = { torch: ['255,170,70', 100, 0.42], crystal: null, basalt: ['255,90,20', 78, 0.22] };
export function drawLighting(c, t) {
  const R = G.R;
  if (FXP.daynight === false || !R || R.event) return;
  const id = R.M.id.startsWith('tower_') ? 'tower' : R.M.id, mx = NIGHT_MAX[id] == null ? 1 : NIGHT_MAX[id];
  const k = nightLevel() * mx;
  if (k < 0.03) return;
  const { W, H, DPR } = VIEW, w = W * DPR, h = H * DPR;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  // hoàng hôn / bình minh: ánh cam nhẹ ở giai đoạn chuyển
  const warm = Math.sin(Math.min(1, k) * Math.PI) * 0.09;
  if (warm > 0.01) { c.fillStyle = 'rgba(255,140,60,' + warm.toFixed(3) + ')'; c.fillRect(0, 0, w, h); }
  // tối dần sang xanh đêm
  c.globalCompositeOperation = 'multiply';
  const lerp = (a, b) => Math.round(a + (b - a) * k);
  c.fillStyle = 'rgb(' + lerp(255, 112) + ',' + lerp(255, 126) + ',' + lerp(255, 186) + ')'; c.fillRect(0, 0, w, h);
  // quầng sáng: đuốc, pha lê, dung nham, và quanh nhân vật
  c.globalCompositeOperation = 'screen'; // 'screen' không cháy trắng trên nền sáng như 'lighter'
  const pool = (x, y, r, rgb, a) => { const g = c.createRadialGradient(x, y, 2, x, y, r); g.addColorStop(0, 'rgba(' + rgb + ',' + a.toFixed(3) + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); };
  const lights = R.map._lights || (R.map._lights = (R.map.decos || []).filter((d) => d.kind === 'torch' || d.kind === 'crystal' || d.kind === 'basalt'));
  const Z = VIEW.Z * DPR;
  for (const d of lights) {
    const s = worldToScreen(d.x, d.y); if (s.x < -150 || s.y < -150 || s.x > W + 150 || s.y > H + 150) continue;
    const flick = d.kind === 'torch' ? 1 + Math.sin(t * 13 + d.x * 3) * 0.06 : 1 + Math.sin(t * 2 + d.seed * 9) * 0.1;
    const spec = LIGHT_KINDS[d.kind];
    if (spec) pool(s.x * DPR, (s.y - 34 * VIEW.Z) * DPR, spec[1] * Z * flick, spec[0], spec[2] * k);
    else { const col = (d.col || '#b48cff'); const m = /#(..)(..)(..)/.exec(col); pool(s.x * DPR, (s.y - 30 * VIEW.Z) * DPR, 84 * Z * flick, m ? parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16) : '180,140,255', 0.3 * k); }
  }
  const p = worldToScreen(R.p.x, R.p.y); pool(p.x * DPR, (p.y - 24 * VIEW.Z) * DPR, 120 * Z, '255,214,150', 0.2 * k); // đèn của người chơi
  c.restore();
}

// ---------------- RUNG MÀN HÌNH ----------------
let shake = 0;
export function initJuice() {
  document.documentElement.classList.toggle('outdoor', !!FXP.outdoor);
  on(EV.SHAKE, (n) => { if (FXP.shake) shake = Math.max(shake, n); });
  on(EV.HIT, (m, d, crit) => { if (crit && FXP.shake) shake = Math.max(shake, 2.5); });
  on(EV.PLAYER_HIT, (d) => { if (G.P && d > G.P.maxHp * 0.12 && FXP.shake) shake = Math.max(shake, 4); });
  on(EV.PLAYER_DIE, () => { if (FXP.shake) shake = 12; });
  on(EV.TIER_UP, () => { if (FXP.shake) shake = 8; });
}
/** Độ lệch camera khung hình này (px) */
export function shakeOffset(dt) {
  if (shake <= 0.05) { shake = 0; return { x: 0, y: 0 }; }
  const o = { x: (Math.random() * 2 - 1) * shake, y: (Math.random() * 2 - 1) * shake * 0.7 };
  shake *= Math.pow(0.0008, dt); // tắt dần ~0.3 giây
  return o;
}

// ---------------- CHỮ SÁT THƯƠNG ----------------
const STYLE = {
  crit: { size: 21, rise: 52, pop: 1.8, stroke: '#5a2a00' },
  skill: { size: 15, rise: 44, pop: 1.25, stroke: '#3a1400' },
  hurt: { size: 14, rise: 34, pop: 1.2, stroke: '#2a0000' },
  big: { size: 17, rise: 40, pop: 1, stroke: '#000' },
  normal: { size: 13, rise: 40, pop: 1, stroke: '#000' },
};
export function drawTexts(c) {
  c.textAlign = 'center';
  for (const tx of G.R.texts) {
    const S = STYLE[tx.st] || (tx.big ? STYLE.big : STYLE.normal), k = tx.t, s = iso(tx.x, tx.y);
    const pop = k < 0.12 ? S.pop - (S.pop - 1) * (k / 0.12) : 1;
    const y = s.y - 60 - (tx.st === 'crit' ? Math.sin(Math.min(1, k * 2) * Math.PI * 0.5) * S.rise : k * S.rise);
    c.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
    c.font = '800 ' + Math.round(S.size * pop) + 'px "Be Vietnam Pro", sans-serif';
    c.lineWidth = tx.st === 'crit' ? 4.5 : 3; c.strokeStyle = S.stroke; c.lineJoin = 'round';
    c.strokeText(tx.txt, s.x + tx.ox, y);
    if (tx.st === 'crit') { const g = c.createLinearGradient(0, y - S.size, 0, y); g.addColorStop(0, '#fff8c0'); g.addColorStop(1, '#ff9a20'); c.fillStyle = g; }
    else c.fillStyle = tx.col;
    c.fillText(tx.txt, s.x + tx.ox, y);
  }
  c.globalAlpha = 1;
}

// ---------------- VIỀN ĐỎ KHI MÁU THẤP / BỊ ĐÁNH ----------------
let hurtFlash = 0;
on(EV.PLAYER_HIT, (d) => { if (G.P) hurtFlash = Math.min(1, hurtFlash + 0.25 + d / G.P.maxHp); });
export function drawVignette(c, t, dt) {
  const p = G.R.p, P = G.P;
  if (!P || p.dead > 0) return;
  hurtFlash = Math.max(0, hurtFlash - dt * 2.5);
  const low = Math.max(0, 1 - p.hp / P.maxHp / 0.3), a = Math.max(hurtFlash * 0.35, low * (0.3 + Math.sin(t * 6) * 0.12));
  if (a <= 0.01) return;
  const { W, H, DPR } = VIEW, w = W * DPR, h = H * DPR, g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(160,0,0,0)'); g.addColorStop(1, 'rgba(170,0,0,' + a.toFixed(3) + ')');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
}

// ---------------- HÀO QUANG BẬC NHÂN VẬT ----------------
const TIER_COL = [null, ['#9fd8ff', '#e8f6ff'], ['#ffd54a', '#fff6c0']];
/** Vẽ dưới chân (đã translate tới vị trí nhân vật). tier: 1..3 */
export function drawTierAuraBack(c, tier, t) {
  const C = TIER_COL[(tier || 1) - 1];
  if (!C) return;
  c.save(); c.globalCompositeOperation = 'lighter';
  // vòng phù văn xoay dưới chân
  c.scale(1, 0.45);
  c.globalAlpha = 0.55 + Math.sin(t * 2) * 0.12; c.strokeStyle = C[0]; c.lineWidth = 2.2;
  c.beginPath(); c.arc(0, 0, 27, 0, 6.283); c.stroke();
  c.globalAlpha = 0.35; c.beginPath(); c.arc(0, 0, 21, 0, 6.283); c.stroke();
  c.rotate(t * (tier === 3 ? 0.9 : 0.6));
  const n = tier === 3 ? 8 : 6;
  c.globalAlpha = 0.75; c.fillStyle = C[1];
  for (let i = 0; i < n; i++) { const a = (i / n) * 6.283; c.save(); c.rotate(a); c.translate(24, 0); c.rotate(0.785); c.fillRect(-2, -2, 4, 4); c.restore(); }
  c.restore();
  // hạt sáng bay lên
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < (tier === 3 ? 7 : 4); i++) {
    const q = (t * 0.45 + i * 0.37) % 1, a = i * 2.4 + t * 0.7, x = Math.cos(a) * 18, y = -q * 70;
    c.globalAlpha = (1 - q) * 0.85; c.fillStyle = C[1]; c.beginPath(); c.arc(x, y, tier === 3 ? 1.8 : 1.4, 0, 6.283); c.fill();
  }
  c.restore();
}
/** Vẽ trên đầu: Bậc 3 có vầng sáng (halo) */
export function drawTierAuraFront(c, tier, t, headY) {
  if (tier !== 3) return;
  c.save(); c.translate(0, headY + Math.sin(t * 2) * 1.5); c.scale(1, 0.38);
  c.shadowColor = '#ffcf40'; c.shadowBlur = 10;
  c.globalAlpha = 0.95; c.strokeStyle = '#8a5a00'; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, 12, 0, 6.283); c.stroke();
  c.strokeStyle = '#ffe680'; c.lineWidth = 3; c.stroke();
  c.restore();
}

// ---------------- THỜI TIẾT THEO BẢN ĐỒ ----------------
// Hạt trong không gian màn hình, số lượng theo diện tích (nhẹ cho điện thoại).
const WEATHER = {
  meadow: { kind: 'petal', n: 26, cols: ['#ffd0e8', '#fff6b0', '#ffffff'] },
  darkwood: { kind: 'rain', n: 90, cols: ['rgba(170,200,255,.45)'], fog: 'rgba(40,60,50,.16)' },
  crypt: { kind: 'wisp', n: 26, cols: ['#8fffc0', '#c0ffd8'], fog: 'rgba(20,40,30,.18)' },
  tundra: { kind: 'snow', n: 80, cols: ['#ffffff', '#e0f0ff'] },
  desert: { kind: 'ember', n: 45, cols: ['#ffb040', '#ff6a1a', '#ffe080'], tint: 'rgba(255,120,40,.06)' },
  swamp: { kind: 'wisp', n: 30, cols: ['#c8ff60', '#90ff90'], fog: 'rgba(60,80,30,.2)' },
  canyon: { kind: 'snow', n: 40, cols: ['rgba(230,170,110,.7)', 'rgba(200,140,90,.6)'], tint: 'rgba(200,100,40,.05)' },
  coast: { kind: 'petal', n: 22, cols: ['#ffffff', '#c8f4ff'], tint: 'rgba(80,200,255,.04)' },
  volcano: { kind: 'ember', n: 70, cols: ['#ff5a10', '#ffb040', '#555'], tint: 'rgba(255,40,0,.08)' },
  fallen: { kind: 'feather', n: 34, cols: ['#e8c0ff', '#ffffff', '#c080ff'], tint: 'rgba(80,0,120,.07)' },
  arena_bc: { kind: 'ember', n: 30, cols: ['#ff3040', '#ff8080'], tint: 'rgba(120,0,0,.08)' },
  arena_ds: { kind: 'ember', n: 50, cols: ['#ff8a20', '#ffd040'], tint: 'rgba(255,60,0,.06)' },
};
let wKey = null, parts = [];
const rand = Math.random;
function spawnPart(cfg, w, h, init) {
  const k = cfg.kind, col = cfg.cols[Math.floor(rand() * cfg.cols.length)];
  const p = { x: rand() * w, y: init ? rand() * h : -10, col, s: 0.6 + rand() * 0.8, ph: rand() * 6.28, life: 0 };
  if (k === 'rain') { p.vx = -60; p.vy = 700 + rand() * 300; }
  else if (k === 'snow') { p.vx = -10 + rand() * 20; p.vy = 30 + rand() * 40; }
  else if (k === 'petal' || k === 'feather') { p.vx = 20 + rand() * 30; p.vy = 18 + rand() * 22; }
  else if (k === 'ember') { p.y = init ? rand() * h : h + 10; p.vx = -10 + rand() * 20; p.vy = -(25 + rand() * 45); }
  else if (k === 'wisp') { p.y = rand() * h; p.vx = -8 + rand() * 16; p.vy = -(5 + rand() * 10); p.max = 4 + rand() * 4; }
  return p;
}
export function drawWeather(c, t, dt) {
  if (!FXP.weather || !G.R) return;
  const M = G.R.M, id = M.id.startsWith('tower_') ? null : M.id, cfg = WEATHER[id];
  const { W, H, DPR } = VIEW, w = W, h = H;
  if (!cfg) { parts = []; wKey = null; return; }
  const n = Math.round(cfg.n * Math.min(1.6, (w * h) / (1280 * 760) + 0.35));
  if (wKey !== id) { wKey = id; parts = Array.from({ length: n }, () => spawnPart(cfg, w, h, true)); }
  c.save(); c.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (cfg.tint) { c.fillStyle = cfg.tint; c.fillRect(0, 0, w, h); }
  if (cfg.fog) { // sương mù trôi chậm
    for (let i = 0; i < 3; i++) { const x = ((t * (8 + i * 5) + i * 400) % (w + 600)) - 300, y = h * (0.25 + i * 0.25); const g = c.createRadialGradient(x, y, 10, x, y, 260); g.addColorStop(0, cfg.fog); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - 260, y - 260, 520, 520); }
  }
  for (let i = 0; i < parts.length; i++) {
    let p = parts[i];
    p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt;
    const k = cfg.kind;
    if (k === 'snow' || k === 'petal' || k === 'feather') p.x += Math.sin(t * 1.5 + p.ph) * 12 * dt;
    if (p.y > h + 12 || p.y < -14 || p.x < -20 || p.x > w + 20 || (p.max && p.life > p.max)) { p = parts[i] = spawnPart(cfg, w, h, false); if (k === 'snow' || k === 'petal' || k === 'feather' || k === 'rain') { p.x = rand() * (w + 100); } }
    c.fillStyle = p.col; c.strokeStyle = p.col;
    if (k === 'rain') { c.globalAlpha = 1; c.lineWidth = 1; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + p.vx * 0.02, p.y + p.vy * 0.02); c.stroke(); }
    else if (k === 'snow') { c.globalAlpha = 0.85; c.beginPath(); c.arc(p.x, p.y, 1.2 + p.s * 1.4, 0, 6.283); c.fill(); }
    else if (k === 'petal' || k === 'feather') {
      c.globalAlpha = 0.8; c.save(); c.translate(p.x, p.y); c.rotate(Math.sin(t * 2 + p.ph) * 1.2);
      c.beginPath(); c.ellipse(0, 0, (k === 'feather' ? 4.5 : 3) * p.s, 1.6 * p.s, 0, 0, 6.283); c.fill(); c.restore();
    } else if (k === 'ember') { c.globalAlpha = 0.6 + Math.sin(t * 8 + p.ph) * 0.3; c.globalCompositeOperation = 'lighter'; c.beginPath(); c.arc(p.x, p.y, 1 + p.s, 0, 6.283); c.fill(); c.globalCompositeOperation = 'source-over'; }
    else if (k === 'wisp') { const a = Math.sin((p.life / p.max) * Math.PI); c.globalAlpha = a * 0.7; c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, 7 * p.s); g.addColorStop(0, p.col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(p.x - 8, p.y - 8, 16, 16); c.globalCompositeOperation = 'source-over'; }
  }
  // sấm chớp nhẹ ở Rừng Hắc Ám
  if (id === 'darkwood') { const f = (t % 17) ; if (f < 0.12 || (f > 0.2 && f < 0.26)) { c.globalAlpha = 0.18; c.fillStyle = '#dfe8ff'; c.fillRect(0, 0, w, h); } }
  c.restore();
}
