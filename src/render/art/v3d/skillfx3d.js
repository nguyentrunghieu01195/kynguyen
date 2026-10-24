// Hiệu ứng kỹ năng & đạn bằng 3D (khối phát sáng chụp sẵn, vẽ chồng 'lighter'). Chữ ký giống FX trong v2/fx.js.
import { isoRadius } from '../../iso.js';
import { gem, orb, flame, ring, beam, bar, crescent, spike, disc, swordSprite, arrowSprite } from './fx3d.js';
import { hash } from '../v2/kit.js';

const at = (c, x, y, fn) => { c.save(); c.translate(x, y); fn(); c.restore(); };
const rg = (c, x, y, rx, col, a, ry = rx * 0.5, th = 0.035) => { c.globalAlpha = Math.max(0, Math.min(1, a)); at(c, x, y, () => { c.scale(1, ry / (rx * 0.5)); ring(c, rx, col, th); }); };
const L = (c) => { c.globalCompositeOperation = 'lighter'; };

export const FX3 = {
  whirl(c, f, s, k, t) {
    const r = isoRadius(f.r), e = 0.35 + k * 0.65; L(c);
    for (let i = 0; i < 3; i++) rg(c, s.x, s.y - 12 - i * 4, r.rx * e * (1 - i * 0.14), i % 2 ? '#bfe8ff' : '#ffffff', (1 - k) * 0.95, r.ry * e * (1 - i * 0.14), 0.05);
    for (let i = 0; i < 10; i++) { const a = hash(i) * 6.28 + k * 8, d = r.rx * e * (0.6 + hash(i + 3) * 0.4); c.globalAlpha = 1 - k; gem(c, s.x + Math.cos(a) * d, s.y - 12 + Math.sin(a) * d * 0.5, 10, '#ffffff', a); }
  },
  slash(c, f, s, k) { L(c); c.globalAlpha = 1 - k; c.save(); c.translate(s.x, s.y - 22); c.scale(f.f || 1, 1); c.rotate(-0.6 + k * 1.2); crescent(c, 20, '#ffffff'); c.restore(); },
  meteor(c, f, s, k, t) {
    const r = isoRadius(f.r); L(c);
    if (f.t < 0.35) {
      const q = f.t / 0.35, x = s.x + 140 * (1 - q), y = s.y - 300 * (1 - q);
      for (let i = 1; i <= 8; i++) { const qq = Math.max(0, q - i * 0.04); c.globalAlpha = 0.6 * (1 - i / 8); orb(c, s.x + 140 * (1 - qq), s.y - 300 * (1 - qq), (12 - i) * 1.4, '#ff6a1a'); }
      c.globalAlpha = 1; orb(c, x, y, 22, '#ffb040'); flame(c, x - 6, y + 8, 30, '#ff6a1a', '#fff6c0');
      rg(c, s.x, s.y, r.rx, '#ff9a3a', 0.4 * q, r.ry, 0.03);
    } else {
      const q = (f.t - 0.35) / (f.d - 0.35);
      c.globalAlpha = 1 - q; orb(c, s.x, s.y - 10, r.rx * (0.5 + q * 0.5), '#ffd060');
      rg(c, s.x, s.y, r.rx * (0.5 + q * 0.7), '#ffd060', 1 - q, r.ry * (0.5 + q * 0.7), 0.08);
      for (let i = 0; i < 12; i++) { const a = hash(i + 7) * 6.28, d = q * r.rx * (0.5 + hash(i) * 0.6); c.globalAlpha = 1 - q; orb(c, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d * 0.5 - Math.sin(q * Math.PI) * 30 * hash(i + 2), 5, i % 2 ? '#ff6a1a' : '#ffd060'); }
    }
  },
  boom(c, f, s, k) { L(c); c.globalAlpha = 1 - k; orb(c, s.x, s.y - 22, 14 + k * 30, '#ffb050'); },
  die(c, f, s, k) { c.globalAlpha = 1 - k; L(c); for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.283, d = k * 24 * f.size; c.globalAlpha = 1 - k; orb(c, s.x + Math.cos(a) * d, s.y - 14 + Math.sin(a) * d * 0.5 - k * 12, 7 * (1 - k * 0.5), i % 2 ? f.col : '#ffffff'); } orb(c, s.x, s.y - 18 - k * 30, 16, '#dcf0ff'); },
  lvl(c, f, s, k, t) {
    L(c); c.globalAlpha = (1 - k) * 0.9; at(c, s.x, s.y, () => beam(c, 32 + k * 28, 200, '#ffd864'));
    for (let i = 0; i < 3; i++) { const q = (k * 1.5 + i * 0.3) % 1; rg(c, s.x, s.y - q * 60, 26 - q * 8, '#ffe680', (1 - q) * (1 - k), (10 - q * 3), 0.05); }
    for (let i = 0; i < 12; i++) { c.globalAlpha = 1 - k; gem(c, s.x + (hash(i) - 0.5) * 50, s.y - ((k + hash(i + 5)) % 1) * 120, 9, '#fff8c0', i); }
  },
  click(c, f, s, k) { L(c); rg(c, s.x, s.y, 16 * (1 - k * 0.5), '#9fff9f', 1 - k, 8 * (1 - k * 0.5), 0.07); c.globalAlpha = 1 - k; gem(c, s.x, s.y - 8 - (1 - k) * 8, 12, '#9fff9f', 0); },
  claw(c, f, s, k) {
    L(c); c.globalAlpha = 1 - k; const col = f.boss ? '#ff7a30' : '#ff4040', sz = f.boss ? 20 : 13, w = f.boss ? 5 : 3.2;
    for (let i = -1; i <= 1; i++) bar(c, s.x - sz * 0.6 * (f.f || 1) + i * 6, s.y - 46 - sz * 0.5, s.x + sz * 0.6 * (f.f || 1) + i * 6 - k * 3, s.y - 30 + sz * 0.3, w, col);
  },
  tierup(c, f, s, k, t) {
    const col = f.tier === 3 ? '#ffd54a' : '#9fd8ff', fade = k < 0.8 ? 1 : (1 - k) / 0.2; L(c);
    c.globalAlpha = 0.85 * fade; at(c, s.x, s.y, () => beam(c, 30 + Math.sin(Math.min(1, k * 3) * Math.PI * 0.5) * 30, 420, col));
    for (let i = 0; i < 4; i++) { const q = (k * 2 + i * 0.25) % 1; rg(c, s.x, s.y - q * 8, 20 + q * 70, i % 2 ? '#ffffff' : col, (1 - q) * fade, 9 + q * 32, 0.05); }
    for (let i = 0; i < 12; i++) { const a = t * 1.5 + (i / 12) * 6.283; c.globalAlpha = 0.9 * fade; gem(c, s.x + Math.cos(a) * 52, s.y + Math.sin(a) * 52 * 0.45, 11, col, a); }
    for (let i = 0; i < 26; i++) { c.globalAlpha = fade; gem(c, s.x + (hash(i) - 0.5) * 140, s.y - ((k * 1.6 + hash(i + 7)) % 1) * 260, 11, i % 3 ? '#ffffff' : col, i); }
  },
  nova(c, f, s, k) {
    const r = isoRadius(f.r), e = 0.3 + Math.min(1, k * 1.6) * 0.7;
    if (f.crack) { c.globalAlpha = 1 - k; for (let i = 0; i < 9; i++) { const a = hash(i) * 6.28, l = r.rx * (0.5 + hash(i + 4) * 0.5) * Math.min(1, k * 3); bar(c, s.x, s.y, s.x + Math.cos(a) * l * 0.5 + 4, s.y + Math.sin(a) * l * 0.25, 3, '#2a1404'); bar(c, s.x + Math.cos(a) * l * 0.5 + 4, s.y + Math.sin(a) * l * 0.25, s.x + Math.cos(a) * l, s.y + Math.sin(a) * l * 0.5, 3, '#2a1404'); } }
    L(c); rg(c, s.x, s.y, r.rx * e, f.col, 1 - k, r.ry * e, 0.09); rg(c, s.x, s.y, r.rx * e * 0.7, '#ffffff', (1 - k) * 0.7, r.ry * e * 0.7, 0.04);
    c.globalAlpha = (1 - k) * 0.5; orb(c, s.x, s.y - 4, r.rx * e * 0.55, f.fire ? '#ffd878' : '#ffe6b4');
    for (let i = 0; i < 14; i++) { const a = hash(i + 11) * 6.28, d = k * r.rx * (0.5 + hash(i) * 0.6); c.globalAlpha = 1 - k; orb(c, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d * 0.5 - Math.sin(k * Math.PI) * 26 * hash(i + 2), 6 * (1 - k) + 2, f.col); }
  },
  frost(c, f, s, k) {
    const r = isoRadius(f.r), g = Math.min(1, k * 4), fade = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1; L(c);
    rg(c, s.x, s.y, r.rx * Math.max(0.05, g), '#bff4ff', fade, r.ry * Math.max(0.05, g), 0.06);
    c.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 11; i++) { const a = hash(i + 3) * 6.28, d = hash(i + 9) * 0.85, x = s.x + Math.cos(a) * r.rx * d, y = s.y + Math.sin(a) * r.ry * d, h = (12 + hash(i) * 16) * Math.min(1, Math.max(0, k * 5 - hash(i) * 1.5)); if (h > 1) { c.globalAlpha = fade; spike(c, x, y, h * 1.8, i % 2 ? '#aee6ff' : '#e8fbff'); } }
    L(c); for (let i = 0; i < 10; i++) { c.globalAlpha = fade; gem(c, s.x + (hash(i + 20) - 0.5) * r.rx * 1.6, s.y - 10 - ((k + hash(i)) % 1) * 30, 8, '#e8fbff', i); }
  },
  buff(c, f, s, k) {
    L(c);
    for (let i = 0; i < 2; i++) for (let q = 0; q <= 1; q += 0.07) { const a = q * 12 + k * 8 + i * 3.14, y = s.y - q * 90 * (0.4 + k); c.globalAlpha = (1 - k) * 0.9 * (1 - q * 0.4); orb(c, s.x + Math.cos(a) * 22 * (1 - q * 0.4), y + Math.sin(a) * 7, 5, i ? '#ffffff' : f.col); }
    rg(c, s.x, s.y, 26 + k * 16, f.col, 1 - k, 11 + k * 7, 0.06);
    for (let i = 0; i < 8; i++) { c.globalAlpha = 1 - k; gem(c, s.x + (hash(i) - 0.5) * 50, s.y - ((k * 1.3 + hash(i + 5)) % 1) * 100, 10, '#fff', i); }
  },
  dash(c, f, s, k, t, iso) {
    const a = iso(f.x0, f.y0); L(c);
    for (let i = 0; i < 3; i++) { c.globalAlpha = (1 - k) * (0.85 - i * 0.2); bar(c, a.x, a.y - 22, s.x, s.y - 22, 10 - i * 3 + i * 6 * k, ['#ffffff', '#ffe08a', '#ff9a3a'][i]); }
    for (let i = 0; i < 10; i++) { const q = hash(i); c.globalAlpha = 1 - k; gem(c, a.x + (s.x - a.x) * q, a.y + (s.y - a.y) * q - 22 + (hash(i + 3) - 0.5) * 20 - k * 16, 9, '#fff6c0', i); }
  },
  beam(c, f, s, k, t, iso) {
    const b = iso(f.x1, f.y1), w = Math.sin(Math.min(1, k * 1.5) * Math.PI); L(c);
    c.globalAlpha = w * 0.6; bar(c, s.x, s.y - 26, b.x, b.y - 26, 18 * w + 1, f.col); c.globalAlpha = w; bar(c, s.x, s.y - 26, b.x, b.y - 26, 5 * w + 1, '#ffffff');
    const hx = s.x + (b.x - s.x) * Math.min(1, k * 2.2), hy = s.y + (b.y - s.y) * Math.min(1, k * 2.2) - 26; c.globalAlpha = 1 - k; orb(c, hx, hy, 18, '#bfffff');
  },
  bolt(c, f, s, k, t, iso) {
    const P = f.pts.map((q) => iso(q.x, q.y)); L(c);
    for (const [col, w, al] of [['#6a9aff', 9, 0.5], ['#bfe0ff', 4.5, 0.9], ['#ffffff', 2, 1]]) {
      c.globalAlpha = (1 - k) * al; let prev = null;
      P.forEach((p, i) => { if (!i) { prev = { x: p.x, y: p.y - 30 }; return; } const a = P[i - 1]; for (let j = 1; j <= 5; j++) { const q = j / 5, jit = j < 5 ? (hash(i * 7 + j + Math.floor(t * 20)) - 0.5) * 16 : 0, nx = a.x + (p.x - a.x) * q + jit, ny = a.y - 30 + (p.y - a.y) * q + jit * 0.6; bar(c, prev.x, prev.y, nx, ny, w, col); prev = { x: nx, y: ny }; } });
    }
    P.slice(1).forEach((p) => { c.globalAlpha = 1 - k; orb(c, p.x, p.y - 30, 20, '#9ac0ff'); });
  },
  skyblade(c, f, s, k, t) {
    const r = isoRadius(f.r), hitK = f.hitAt / f.d;
    if (k < hitK) {
      const q = k / hitK, y = s.y - 320 * (1 - q * q);
      L(c); rg(c, s.x, s.y, r.rx, '#ffe680', 0.25 + q * 0.5, r.ry, 0.03); c.globalAlpha = 0.5; orb(c, s.x, y - 40, 60, '#ffeab0');
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; at(c, s.x, y, () => swordSprite(c, 150));
    } else {
      const q = (k - hitK) / (1 - hitK); L(c);
      c.globalAlpha = (1 - q) * 0.9; at(c, s.x, s.y, () => beam(c, 52 * (1 - q) + 14, 260, '#fff0b0'));
      rg(c, s.x, s.y, r.rx * (0.6 + q * 0.6), '#fff2a0', 1 - q, r.ry * (0.6 + q * 0.6), 0.09);
      c.globalAlpha = 1 - q; orb(c, s.x, s.y - 6, r.rx * (0.5 + q * 0.6), '#fffacc');
      for (let i = 0; i < 16; i++) { const a = hash(i + 30) * 6.28, d = q * r.rx * (0.4 + hash(i) * 0.7); c.globalAlpha = 1 - q; gem(c, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d * 0.5 - Math.sin(q * 3.14) * 40 * hash(i + 1), 12, '#fff', i); }
    }
  },
  vortex(c, f, s, k, t) {
    const r = isoRadius(f.r), fade = Math.min(1, k * 6, (1 - k) * 5);
    c.globalAlpha = 0.85 * fade; at(c, s.x, s.y - 6, () => { c.scale(1, r.ry / (r.rx * 0.5)); disc(c, r.rx * 0.9, '#1a0830'); }); L(c);
    for (let i = 0; i < 5; i++) { const a0 = -t * 6 + i * 1.256; for (let q = 0; q <= 1; q += 0.1) { const a = a0 + q * 3.2, rr = (1 - q * 0.85); c.globalAlpha = fade * 0.85; orb(c, s.x + Math.cos(a) * r.rx * rr, s.y - 6 + Math.sin(a) * r.ry * rr, 5, i % 2 ? '#c070ff' : '#7a3aff'); } }
    rg(c, s.x, s.y - 6, r.rx, '#b060ff', fade * 0.8, r.ry, 0.04); c.globalAlpha = fade; orb(c, s.x, s.y - 8, 14, '#d8a8ff');
    for (let i = 0; i < 14; i++) { const q = (t * 0.9 + hash(i)) % 1, a = hash(i + 8) * 6.28 - t * 2; c.globalAlpha = fade * q; gem(c, s.x + Math.cos(a) * r.rx * (1 - q), s.y - 6 + Math.sin(a) * r.ry * (1 - q), 9, '#e8c0ff', a); }
  },
};

/** Đạn bay (3D). Trả true nếu đã vẽ. c đã translate về tâm đạn; ang = hướng bay trên màn hình. */
export function drawProjectile3(c, pr, t, ang) {
  const k = pr.k;
  if (k === 'spit' || k === 'mbolt') { const col = k === 'spit' ? ['#c8ff60', '#3a8a10'] : ['#f0c0ff', '#8a3aff']; L(c); for (let i = 3; i >= 0; i--) { c.globalAlpha = 0.55 - i * 0.1; orb(c, -Math.cos(ang) * i * 5, -Math.sin(ang) * i * 5, (6 - i) * 1.8, col[1]); } c.globalAlpha = 1; return orb(c, 0, 0, 12, col[0]); }
  if (k === 'fire' || k === 'mfire') { L(c); c.rotate(ang); for (let i = 4; i >= 0; i--) { c.globalAlpha = 0.65 - i * 0.1; orb(c, -i * 5, Math.sin(t * 30 + i) * 1.5, (6 - i) * 1.9, '#ff6a1a'); } c.globalAlpha = 1; c.rotate(-ang); return orb(c, 0, 0, 15, '#ffd890'); }
  if (k === 'phoenix') { L(c); c.rotate(ang); for (let i = 8; i >= 0; i--) { c.globalAlpha = 0.6 - i * 0.05; orb(c, -i * 6, Math.sin(t * 25 + i) * 2, (10 - i) * 1.7, i % 2 ? '#ffb040' : '#ff4a10'); } const fl = Math.sin(t * 18) * 5; for (const sd of [-1, 1]) { c.globalAlpha = 0.9; gem(c, -8, sd * (14 + fl), 22, sd > 0 ? '#ffd060' : '#ff7a20', sd * 0.6); } c.globalAlpha = 1; return orb(c, 4, 0, 19, '#fff0b0'); }
  if (k === 'ice') { L(c); c.rotate(ang); c.globalAlpha = 0.6; bar(c, -24, 0, 0, 0, 6, '#a0e6ff'); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.rotate(Math.PI / 2); return spike(c, 0, 10, 30, '#bff0ff'); }
  c.rotate(ang);
  if (k === 'arrow2') { L(c); c.globalAlpha = 0.6; bar(c, -22, 0, 2, 0, 6, '#78ffff'); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; }
  return arrowSprite(c, 26, k === 'arrow2' ? '#99ffff' : '#e8e0c0');
}
