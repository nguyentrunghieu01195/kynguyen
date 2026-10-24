// Hiệu ứng kỹ năng & đạn V2. Dùng chế độ hoà trộn 'lighter' cho ánh sáng.
import { isoRadius } from '../../iso.js';
import { gfx3d } from '../v3d/flag.js';
import { FX3, drawProjectile3 } from '../v3d/skillfx3d.js';
import { pEll, pCirc, pPoly, pRR, rgrad, vgrad, sparkle, hash } from './kit.js';

const glowRing = (c, x, y, rx, ry, col, lw, a) => { c.globalAlpha = a; c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.stroke(); };

const FX = {
  whirl(c, f, s, k, t) {
    const r = isoRadius(f.r), e = 0.35 + k * 0.65;
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const a0 = k * 14 + i * (Math.PI / 2);
      c.globalAlpha = (1 - k) * 0.9; c.strokeStyle = i % 2 ? '#bfe8ff' : '#ffffff'; c.lineWidth = 7 - i;
      c.beginPath(); c.ellipse(s.x, s.y - 12, r.rx * e, r.ry * e, 0, a0, a0 + 1.6); c.stroke();
    }
    c.globalAlpha = (1 - k) * 0.35; c.fillStyle = rgrad(c, s.x, s.y, 2, r.rx, 'rgba(160,220,255,.8)', 'rgba(0,0,0,0)'); pEll(c, s.x, s.y - 4, r.rx * e, r.ry * e); c.fill();
    for (let i = 0; i < 10; i++) { const a = hash(i) * 6.28 + k * 8, d = r.rx * e * (0.6 + hash(i + 3) * 0.4); sparkle(c, s.x + Math.cos(a) * d, s.y - 12 + Math.sin(a) * d * 0.5, 3, '#fff', 1 - k); }
  },
  slash(c, f, s, k) {
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = 1 - k;
    c.save(); c.translate(s.x, s.y - 22); c.scale(f.f || 1, 1); c.rotate(-0.6 + k * 1.2);
    c.beginPath(); c.arc(0, 0, 18, -1.6, 0.6); c.arc(-3, 2, 13, 0.6, -1.6, true); c.closePath();
    c.fillStyle = 'rgba(255,255,255,.95)'; c.fill(); c.restore();
  },
  meteor(c, f, s, k, t) {
    const r = isoRadius(f.r);
    c.globalCompositeOperation = 'lighter';
    if (f.t < 0.35) {
      const q = f.t / 0.35, x = s.x + 140 * (1 - q), y = s.y - 300 * (1 - q);
      for (let i = 1; i <= 8; i++) { const qq = Math.max(0, q - i * 0.04); c.globalAlpha = 0.5 * (1 - i / 8); c.fillStyle = '#ff6a1a'; pCirc(c, s.x + 140 * (1 - qq), s.y - 300 * (1 - qq), 12 - i); c.fill(); }
      c.globalAlpha = 1; c.fillStyle = rgrad(c, x, y, 2, 18, '#fff6c0', 'rgba(255,90,10,0)'); pCirc(c, x, y, 18); c.fill();
      c.globalAlpha = 0.3 * q; c.strokeStyle = '#ff9a3a'; c.lineWidth = 2; c.setLineDash([6, 6]); c.beginPath(); c.ellipse(s.x, s.y, r.rx, r.ry, 0, 0, 6.283); c.stroke(); c.setLineDash([]);
    } else {
      const q = (f.t - 0.35) / (f.d - 0.35);
      c.globalAlpha = 1 - q; c.fillStyle = rgrad(c, s.x, s.y, 4, r.rx, 'rgba(255,230,150,.9)', 'rgba(255,60,0,0)'); pEll(c, s.x, s.y, r.rx * (0.4 + q * 0.7), r.ry * (0.4 + q * 0.7)); c.fill();
      glowRing(c, s.x, s.y, r.rx * (0.5 + q * 0.7), r.ry * (0.5 + q * 0.7), '#ffd060', 4 * (1 - q) + 1, 1 - q);
      c.globalAlpha = 1 - q;
      for (let i = 0; i < 12; i++) { const a = hash(i + 7) * 6.28, d = q * r.rx * (0.5 + hash(i) * 0.6); pCirc(c, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d * 0.5 - Math.sin(q * Math.PI) * 30 * hash(i + 2), 2.5 * (1 - q) + 0.5); c.fillStyle = '#ffb040'; c.fill(); }
    }
  },
  boom(c, f, s, k) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 1 - k; c.fillStyle = rgrad(c, s.x, s.y - 22, 1, 8 + k * 16, '#fff0b0', 'rgba(255,80,0,0)'); pCirc(c, s.x, s.y - 22, 8 + k * 16); c.fill(); },
  die(c, f, s, k) {
    c.globalAlpha = 1 - k;
    for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.283, d = k * 24 * f.size; c.fillStyle = i % 2 ? f.col : '#ffffff'; pCirc(c, s.x + Math.cos(a) * d, s.y - 14 + Math.sin(a) * d * 0.5 - k * 12, 3.2 * (1 - k) + 0.6); c.fill(); }
    c.globalCompositeOperation = 'lighter'; c.fillStyle = rgrad(c, s.x, s.y - 18 - k * 30, 1, 10, 'rgba(220,240,255,.9)', 'rgba(0,0,0,0)'); pCirc(c, s.x, s.y - 18 - k * 30, 10); c.fill();
  },
  lvl(c, f, s, k, t) {
    c.globalCompositeOperation = 'lighter';
    const g = c.createLinearGradient(0, s.y - 200, 0, s.y); g.addColorStop(0, 'rgba(255,230,120,0)'); g.addColorStop(1, 'rgba(255,220,100,.75)');
    c.globalAlpha = 1 - k; c.fillStyle = g; c.fillRect(s.x - 16 - k * 14, s.y - 200, 32 + k * 28, 200);
    for (let i = 0; i < 3; i++) { const q = (k * 1.5 + i * 0.3) % 1; glowRing(c, s.x, s.y - q * 60, 26 - q * 8, 10 - q * 3, '#ffe680', 2.5, (1 - q) * (1 - k)); }
    for (let i = 0; i < 12; i++) sparkle(c, s.x + (hash(i) - 0.5) * 50, s.y - ((k + hash(i + 5)) % 1) * 120, 3, '#fff8c0', 1 - k);
  },
  click(c, f, s, k) { glowRing(c, s.x, s.y, 16 * (1 - k * 0.5), 8 * (1 - k * 0.5), '#9fff9f', 2, 1 - k); c.globalAlpha = 1 - k; c.fillStyle = '#9fff9f'; pPoly(c, [s.x, s.y - 4 - (1 - k) * 8, s.x - 4, s.y - 12 - (1 - k) * 8, s.x + 4, s.y - 12 - (1 - k) * 8]); c.fill(); },
  // Vết cào khi bị quái đánh
  claw(c, f, s, k) {
    c.globalAlpha = 1 - k; c.strokeStyle = f.boss ? '#ff7a30' : '#ff4040'; c.lineCap = 'round'; c.lineWidth = f.boss ? 4 : 2.5;
    const sz = f.boss ? 20 : 13;
    for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(s.x - sz * 0.6 * (f.f || 1) + i * 6, s.y - 46 - sz * 0.5); c.lineTo(s.x + sz * 0.6 * (f.f || 1) + i * 6 - k * 3, s.y - 30 + sz * 0.3); c.stroke(); }
  },
  // Thăng bậc: cột sáng lớn + vòng phù văn + mưa sáng
  tierup(c, f, s, k, t) {
    const col = f.tier === 3 ? '#ffd54a' : '#9fd8ff', fade = k < 0.8 ? 1 : (1 - k) / 0.2;
    c.globalCompositeOperation = 'lighter';
    const g = c.createLinearGradient(0, s.y - 420, 0, s.y); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, col);
    const w = 30 + Math.sin(Math.min(1, k * 3) * Math.PI * 0.5) * 30;
    c.globalAlpha = 0.6 * fade; c.fillStyle = g; c.fillRect(s.x - w / 2, s.y - 420, w, 420);
    for (let i = 0; i < 4; i++) { const q = (k * 2 + i * 0.25) % 1; glowRing(c, s.x, s.y - q * 8, 20 + q * 70, 9 + q * 32, i % 2 ? '#ffffff' : col, 3, (1 - q) * fade); }
    c.save(); c.translate(s.x, s.y); c.scale(1, 0.45); c.rotate(t * 1.5); c.globalAlpha = 0.8 * fade; c.strokeStyle = col; c.lineWidth = 2;
    for (let i = 0; i < 12; i++) { c.rotate(Math.PI / 6); c.beginPath(); c.moveTo(46, -4); c.lineTo(54, 0); c.lineTo(46, 4); c.stroke(); }
    c.beginPath(); c.arc(0, 0, 50, 0, 6.283); c.stroke(); c.restore();
    for (let i = 0; i < 26; i++) sparkle(c, s.x + (hash(i) - 0.5) * 140, s.y - ((k * 1.6 + hash(i + 7)) % 1) * 260, 4, i % 3 ? '#ffffff' : col, fade);
  },
  // Sóng chấn động / vụ nổ tròn (màu tuỳ f.col; f.crack = nứt đất, f.fire = lửa)
  nova(c, f, s, k) {
    const r = isoRadius(f.r), e = 0.3 + Math.min(1, k * 1.6) * 0.7;
    if (f.crack) {
      c.globalAlpha = 1 - k; c.strokeStyle = '#2a1404'; c.lineWidth = 2.5;
      for (let i = 0; i < 9; i++) { const a = hash(i) * 6.28, l = r.rx * (0.5 + hash(i + 4) * 0.5) * Math.min(1, k * 3);
        c.beginPath(); c.moveTo(s.x, s.y); c.lineTo(s.x + Math.cos(a) * l * 0.5 + 4, s.y + Math.sin(a) * l * 0.25); c.lineTo(s.x + Math.cos(a) * l, s.y + Math.sin(a) * l * 0.5); c.stroke(); }
    }
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = (1 - k) * 0.7; c.fillStyle = rgrad(c, s.x, s.y, 2, r.rx * e, f.fire ? 'rgba(255,220,120,.9)' : 'rgba(255,230,180,.6)', 'rgba(0,0,0,0)'); pEll(c, s.x, s.y, r.rx * e, r.ry * e); c.fill();
    glowRing(c, s.x, s.y, r.rx * e, r.ry * e, f.col, 5 * (1 - k) + 1, 1 - k);
    glowRing(c, s.x, s.y, r.rx * e * 0.7, r.ry * e * 0.7, '#fff', 2, (1 - k) * 0.6);
    c.globalAlpha = 1 - k;
    for (let i = 0; i < 14; i++) { const a = hash(i + 11) * 6.28, d = k * r.rx * (0.5 + hash(i) * 0.6); pCirc(c, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d * 0.5 - Math.sin(k * Math.PI) * 26 * hash(i + 2), 3 * (1 - k) + 0.6); c.fillStyle = f.fire ? '#ffb040' : f.col; c.fill(); }
  },
  // Trận băng: mặt băng + gai băng mọc lên
  frost(c, f, s, k) {
    const r = isoRadius(f.r), g = Math.min(1, k * 4), fade = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
    c.globalAlpha = 0.45 * fade; c.fillStyle = rgrad(c, s.x, s.y, 2, r.rx, 'rgba(200,245,255,.95)', 'rgba(80,160,255,0)'); pEll(c, s.x, s.y, r.rx * g, r.ry * g); c.fill();
    glowRing(c, s.x, s.y, r.rx * g, r.ry * g, '#bff4ff', 2.5, fade);
    for (let i = 0; i < 11; i++) {
      const a = hash(i + 3) * 6.28, d = hash(i + 9) * 0.85, x = s.x + Math.cos(a) * r.rx * d, y = s.y + Math.sin(a) * r.ry * d, h = (12 + hash(i) * 16) * Math.min(1, Math.max(0, k * 5 - hash(i) * 1.5));
      c.globalAlpha = fade; pPoly(c, [x - 4, y, x, y - h, x + 4, y]); c.fillStyle = vgrad(c, y - h, y, '#ffffff', '#6ac8ff'); c.fill(); c.strokeStyle = '#2a6aa0'; c.lineWidth = 1; c.stroke();
    }
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 10; i++) sparkle(c, s.x + (hash(i + 20) - 0.5) * r.rx * 1.6, s.y - 10 - ((k + hash(i)) % 1) * 30, 3, '#e8fbff', fade);
  },
  // Buff: xoắn ánh sáng bay lên quanh nhân vật
  buff(c, f, s, k) {
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 2; i++) {
      c.globalAlpha = (1 - k) * 0.9; c.strokeStyle = i ? '#fff' : f.col; c.lineWidth = 4 - i * 2; c.beginPath();
      for (let q = 0; q <= 1; q += 0.04) { const a = q * 12 + k * 8 + i * 3.14, y = s.y - q * 90 * (0.4 + k); c.lineTo(s.x + Math.cos(a) * 22 * (1 - q * 0.4), y + Math.sin(a) * 7); }
      c.stroke();
    }
    glowRing(c, s.x, s.y, 26 + k * 16, 11 + k * 7, f.col, 3, 1 - k);
    for (let i = 0; i < 8; i++) sparkle(c, s.x + (hash(i) - 0.5) * 50, s.y - ((k * 1.3 + hash(i + 5)) % 1) * 100, 3.5, '#fff', 1 - k);
  },
  // Lao tới: vệt kiếm khí từ điểm xuất phát
  dash(c, f, s, k, t, iso) {
    const a = iso(f.x0, f.y0);
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      c.globalAlpha = (1 - k) * (0.8 - i * 0.2); c.strokeStyle = ['#ffffff', '#ffe08a', '#ff9a3a'][i]; c.lineWidth = 10 - i * 3 + i * 6 * k; c.lineCap = 'round';
      c.beginPath(); c.moveTo(a.x, a.y - 22); c.lineTo(s.x, s.y - 22); c.stroke();
    }
    for (let i = 0; i < 10; i++) { const q = hash(i), x = a.x + (s.x - a.x) * q, y = a.y + (s.y - a.y) * q - 22 + (hash(i + 3) - 0.5) * 20; sparkle(c, x, y - k * 16, 3, '#fff6c0', 1 - k); }
  },
  // Tia xuyên thẳng
  beam(c, f, s, k, t, iso) {
    const b = iso(f.x1, f.y1), w = Math.sin(Math.min(1, k * 1.5) * Math.PI);
    c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    c.globalAlpha = w * 0.5; c.strokeStyle = f.col; c.lineWidth = 16 * w; c.beginPath(); c.moveTo(s.x, s.y - 26); c.lineTo(b.x, b.y - 26); c.stroke();
    c.globalAlpha = w; c.strokeStyle = '#ffffff'; c.lineWidth = 4 * w; c.stroke();
    const hx = s.x + (b.x - s.x) * Math.min(1, k * 2.2), hy = s.y + (b.y - s.y) * Math.min(1, k * 2.2) - 26;
    c.globalAlpha = 1 - k; c.fillStyle = rgrad(c, hx, hy, 1, 16, '#ffffff', 'rgba(120,255,255,0)'); pCirc(c, hx, hy, 16); c.fill();
  },
  // Sét nảy giữa các mục tiêu
  bolt(c, f, s, k, t, iso) {
    const P = f.pts.map((q) => iso(q.x, q.y));
    c.globalCompositeOperation = 'lighter'; c.lineJoin = 'round';
    for (const [col, lw, al] of [['#6a9aff', 9, 0.4], ['#bfe0ff', 4, 0.9], ['#ffffff', 1.6, 1]]) {
      c.globalAlpha = (1 - k) * al; c.strokeStyle = col; c.lineWidth = lw; c.beginPath();
      P.forEach((p, i) => {
        if (!i) { c.moveTo(p.x, p.y - 30); return; }
        const a = P[i - 1];
        for (let j = 1; j <= 5; j++) { const q = j / 5, jit = j < 5 ? (hash(i * 7 + j + Math.floor(t * 20)) - 0.5) * 16 : 0; c.lineTo(a.x + (p.x - a.x) * q + jit, a.y - 30 + (p.y - a.y) * q + jit * 0.6); }
      });
      c.stroke();
    }
    P.slice(1).forEach((p) => { c.globalAlpha = 1 - k; c.fillStyle = rgrad(c, p.x, p.y - 30, 1, 18, '#ffffff', 'rgba(100,150,255,0)'); pCirc(c, p.x, p.y - 30, 18); c.fill(); });
  },
  // Thiên kiếm giáng thế: kiếm khổng lồ rơi xuống rồi nổ sáng
  skyblade(c, f, s, k, t) {
    const r = isoRadius(f.r), hitK = f.hitAt / f.d;
    if (k < hitK) {
      const q = k / hitK, y = s.y - 320 * (1 - q * q);
      c.globalAlpha = 0.25 + q * 0.4; c.strokeStyle = '#ffe680'; c.lineWidth = 2; c.setLineDash([8, 6]); c.beginPath(); c.ellipse(s.x, s.y, r.rx, r.ry, 0, 0, 6.283); c.stroke(); c.setLineDash([]);
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5; c.fillStyle = rgrad(c, s.x, y - 40, 2, 60, 'rgba(255,240,180,.8)', 'rgba(255,200,80,0)'); pCirc(c, s.x, y - 40, 60); c.fill();
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
      c.save(); c.translate(s.x, y);
      pPoly(c, [-9, -100, 0, -116, 9, -100, 7, 0, 0, 14, -7, 0]); c.fillStyle = vgrad(c, -116, 14, '#ffffff', '#9ad8ff'); c.fill(); c.strokeStyle = '#2a3a6a'; c.lineWidth = 1.5; c.stroke();
      c.beginPath(); c.moveTo(0, -110); c.lineTo(0, 6); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 1.5; c.stroke();
      pRR(c, -24, -104, 48, 8, 3); c.fillStyle = '#f0c040'; c.fill(); c.strokeStyle = '#5a3a00'; c.stroke();
      pRR(c, -4, -134, 8, 30, 2); c.fillStyle = '#6a3a1a'; c.fill(); pCirc(c, 0, -138, 6); c.fillStyle = '#ff5a5a'; c.fill(); c.stroke();
      c.restore();
    } else {
      const q = (k - hitK) / (1 - hitK);
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 1 - q; const g = c.createLinearGradient(0, s.y - 260, 0, s.y); g.addColorStop(0, 'rgba(255,240,160,0)'); g.addColorStop(1, 'rgba(255,240,180,.9)');
      c.fillStyle = g; c.fillRect(s.x - 26 * (1 - q) - 6, s.y - 260, 52 * (1 - q) + 12, 260);
      c.fillStyle = rgrad(c, s.x, s.y, 4, r.rx, 'rgba(255,250,200,.95)', 'rgba(255,180,40,0)'); pEll(c, s.x, s.y, r.rx * (0.5 + q * 0.6), r.ry * (0.5 + q * 0.6)); c.fill();
      glowRing(c, s.x, s.y, r.rx * (0.6 + q * 0.6), r.ry * (0.6 + q * 0.6), '#fff2a0', 5 * (1 - q) + 1, 1 - q);
      for (let i = 0; i < 16; i++) { const a = hash(i + 30) * 6.28, d = q * r.rx * (0.4 + hash(i) * 0.7); sparkle(c, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d * 0.5 - Math.sin(q * 3.14) * 40 * hash(i + 1), 4, '#fff', 1 - q); }
    }
  },
  // Hố đen: xoáy tím hút vào tâm
  vortex(c, f, s, k, t) {
    const r = isoRadius(f.r), fade = Math.min(1, k * 6, (1 - k) * 5);
    c.globalAlpha = 0.75 * fade; c.fillStyle = rgrad(c, s.x, s.y - 6, 2, r.rx * 0.9, 'rgba(10,0,20,1)', 'rgba(60,0,100,0)'); pEll(c, s.x, s.y - 6, r.rx * 0.9, r.ry * 0.9); c.fill();
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const a0 = -t * 6 + i * 1.256;
      c.globalAlpha = fade * 0.8; c.strokeStyle = i % 2 ? '#c070ff' : '#7a3aff'; c.lineWidth = 3; c.beginPath();
      for (let q = 0; q <= 1; q += 0.05) { const a = a0 + q * 3.2, rr = (1 - q * 0.85); c.lineTo(s.x + Math.cos(a) * r.rx * rr, s.y - 6 + Math.sin(a) * r.ry * rr); }
      c.stroke();
    }
    glowRing(c, s.x, s.y - 6, r.rx, r.ry, '#b060ff', 2, fade * 0.7);
    c.globalAlpha = fade; c.fillStyle = rgrad(c, s.x, s.y - 8, 1, 14, '#ffffff', 'rgba(180,80,255,0)'); pCirc(c, s.x, s.y - 8, 14); c.fill();
    for (let i = 0; i < 14; i++) { const q = (t * 0.9 + hash(i)) % 1, a = hash(i + 8) * 6.28 - t * 2; sparkle(c, s.x + Math.cos(a) * r.rx * (1 - q), s.y - 6 + Math.sin(a) * r.ry * (1 - q), 2.5, '#e8c0ff', fade * q); }
  },
};

export function makeDrawFx(iso) {
  return function drawFx(c, f, t) {
    const fn = (gfx3d() && FX3[f.k]) || FX[f.k];
    if (!fn) return;
    c.save(); fn(c, f, iso(f.x, f.y), Math.min(1, f.t / f.d), t, iso); c.restore();
  };
}

export function makeDrawProjectile(iso) {
  return function drawProjectile(c, pr, t) {
    const s = iso(pr.x, pr.y), ts = iso(pr.tgt.x, pr.tgt.y), ang = Math.atan2(ts.y - s.y, ts.x - s.x);
    c.save(); c.translate(s.x, s.y - 28);
    if (gfx3d()) { c.save(); const done = drawProjectile3(c, pr, t, ang); c.restore(); if (done) { c.restore(); return; } }
    if (pr.k === 'spit' || pr.k === 'mbolt') {
      const col = pr.k === 'spit' ? ['#c8ff60', '#3a8a10'] : ['#f0c0ff', '#8a3aff'];
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) { c.globalAlpha = 0.5 - i * 0.1; c.fillStyle = col[1]; pCirc(c, -Math.cos(ang) * i * 5, -Math.sin(ang) * i * 5, 6 - i); c.fill(); }
      c.globalAlpha = 1; c.fillStyle = rgrad(c, 0, 0, 1, 7, col[0], 'rgba(0,0,0,0)'); pCirc(c, 0, 0, 7); c.fill();
    } else if (pr.k === 'fire' || pr.k === 'mfire') {
      c.globalCompositeOperation = 'lighter';
      c.rotate(ang);
      for (let i = 0; i < 5; i++) { c.globalAlpha = 0.6 - i * 0.1; c.fillStyle = '#ff6a1a'; pCirc(c, -i * 5, Math.sin(t * 30 + i) * 1.5, 6 - i); c.fill(); }
      c.globalAlpha = 1; c.fillStyle = rgrad(c, 0, 0, 1, 9, '#fff6c0', 'rgba(255,100,0,0)'); pCirc(c, 0, 0, 9); c.fill();
    } else if (pr.k === 'phoenix') {
      c.globalCompositeOperation = 'lighter';
      c.rotate(ang);
      for (let i = 0; i < 9; i++) { c.globalAlpha = 0.55 - i * 0.05; c.fillStyle = i % 2 ? '#ffb040' : '#ff4a10'; pCirc(c, -i * 6, Math.sin(t * 25 + i) * 2, 10 - i); c.fill(); }
      const fl = Math.sin(t * 18) * 5;
      for (const sd of [-1, 1]) { c.globalAlpha = 0.85; c.beginPath(); c.moveTo(4, 0); c.quadraticCurveTo(-6, sd * (22 + fl), -22, sd * (18 + fl)); c.quadraticCurveTo(-10, sd * 8, -14, 0); c.closePath(); c.fillStyle = sd > 0 ? '#ff7a1a' : '#ffa030'; c.fill(); }
      c.globalAlpha = 1; c.fillStyle = rgrad(c, 4, 0, 1, 12, '#fffbe0', 'rgba(255,120,0,0)'); pCirc(c, 4, 0, 12); c.fill();
    } else if (pr.k === 'ice') {
      c.rotate(ang);
      c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(160,230,255,.6)'; c.lineWidth = 6; c.beginPath(); c.moveTo(-24, 0); c.lineTo(0, 0); c.stroke(); c.globalCompositeOperation = 'source-over';
      pPoly(c, [-12, 0, -4, -4, 10, 0, -4, 4]); c.fillStyle = vgrad(c, -4, 4, '#ffffff', '#6ac8ff'); c.fill(); c.strokeStyle = '#2a6aa0'; c.lineWidth = 1; c.stroke();
    } else {
      c.rotate(ang);
      if (pr.k === 'arrow2') { c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(120,255,255,.5)'; c.lineWidth = 5; c.beginPath(); c.moveTo(-22, 0); c.lineTo(2, 0); c.stroke(); c.globalCompositeOperation = 'source-over'; }
      c.strokeStyle = '#7a5030'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(-14, 0); c.lineTo(4, 0); c.stroke();
      c.fillStyle = '#dde'; pPoly(c, [4, -2.5, 9, 0, 4, 2.5]); c.fill();
      c.fillStyle = pr.k === 'arrow2' ? '#9ff' : '#e8e0c0'; pPoly(c, [-14, 0, -18, -3.5, -11, 0]); c.fill(); pPoly(c, [-14, 0, -18, 3.5, -11, 0]); c.fill();
    }
    c.restore();
  };
}
