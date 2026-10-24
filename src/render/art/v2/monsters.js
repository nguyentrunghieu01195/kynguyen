// Quái vật: bộ khung vẽ từng họ nằm ở creatures.js; ở đây là cổng thành, kích thước hiển thị và drawMob (quầng, hạt, viền hoàn thiện, Boss).
// Gốc toạ độ = chân, hướng mặt sang phải.
import { themeParticles, bossOrbiters, haloColor, isRage, variant, drawPolished } from './monsterFx.js';
import { blob, beast, humanoid, bug, golem, winged, dragon, serpent, crab, ghost } from './creatures.js';
import { tones, pEll, pCirc, pPoly, pRR, fs, vgrad, rgrad, groundShadow, hash } from './kit.js';

const HEIGHT = { blob: 28, beast: 30, humanoid: 56, bug: 24, golem: 62, winged: 62, dragon: 64, serpent: 38, crab: 30, ghost: 54 };
export const VIS = 1.3; // phóng to hình quái 30% so với kích thước logic (nhìn rõ chi tiết hơn; va chạm / đòn đánh không đổi)
export const mobHeight = (m) => (HEIGHT[m.shape] || 40) * m.size * VIS;

// ---------------- CỔNG THÀNH (vật thể đứng yên) ----------------
function gate(c, m, t) {
  const S = tones(m.flash > 0 ? '#ffffff' : '#7a6a5a'), W = tones('#5a3418');
  pRR(c, -24, -54, 12, 54, 2); fs(c, vgrad(c, -54, 0, S.h, S.s), S.o);
  pRR(c, 12, -54, 12, 54, 2); fs(c, vgrad(c, -54, 0, S.h, S.s), S.o);
  c.beginPath(); c.moveTo(-24, -54); c.lineTo(-24, -62); c.quadraticCurveTo(0, -78, 24, -62); c.lineTo(24, -54); c.quadraticCurveTo(0, -66, -24, -54); fs(c, S.b, S.o);
  for (const x of [-24, -14, -4, 6, 16]) { pRR(c, x, -68 + Math.abs(x + 4) * 0.25, 8, 6, 1); fs(c, S.h, S.o, 1); }
  c.beginPath(); c.moveTo(-12, 0); c.lineTo(-12, -42); c.quadraticCurveTo(0, -54, 12, -42); c.lineTo(12, 0); c.closePath(); fs(c, vgrad(c, -54, 0, W.h, W.d), W.o);
  c.strokeStyle = W.o; c.lineWidth = 1.2; for (const x of [-6, 0, 6]) { c.beginPath(); c.moveTo(x, -46 + Math.abs(x)); c.lineTo(x, 0); c.stroke(); }
  for (const y of [-34, -14]) { pRR(c, -12, y, 24, 3, 1); fs(c, '#4a4a52', '#1a1a20', 0.8); }
  c.save(); c.shadowColor = m.c2; c.shadowBlur = 10 + Math.sin(t * 4) * 4; pCirc(c, 0, -28, 4); fs(c, m.c2, '#200', 1); c.restore();
  const dmg = 1 - m.hp / m.maxHp;
  c.strokeStyle = '#1a0a04'; c.lineWidth = 1.4;
  if (dmg > 0.3) { c.beginPath(); c.moveTo(-8, -40); c.lineTo(-3, -30); c.lineTo(-7, -18); c.stroke(); }
  if (dmg > 0.6) { c.beginPath(); c.moveTo(7, -38); c.lineTo(3, -24); c.lineTo(8, -10); c.stroke(); }
}
HEIGHT.gate = 72;

const SHAPES = { blob, beast, humanoid, bug, golem, winged, dragon, gate, serpent, crab, ghost };

export function drawMob(c, m, t, iso) {
  const s = iso(m.x, m.y);
  c.save(); c.translate(s.x, s.y); c.scale(VIS, VIS);
  if (m.boss) {
    const a = 0.35 + Math.sin(t * 4) * 0.12;
    c.save(); c.globalAlpha = a; c.fillStyle = rgrad(c, 0, 0, 2, 30 * m.size, m.c2, 'rgba(0,0,0,0)'); c.scale(1, 0.45); pCirc(c, 0, 0, 30 * m.size); c.fill(); c.restore();
    // vòng phù văn xoay dưới chân Boss + tàn lửa bay lên
    c.save(); c.globalCompositeOperation = 'lighter'; c.scale(1, 0.45); c.rotate(t * 0.5); c.strokeStyle = m.c2; c.globalAlpha = 0.5; c.lineWidth = 2.5; c.setLineDash([10, 8]);
    c.beginPath(); c.arc(0, 0, 36 * m.size, 0, 6.283); c.stroke(); c.setLineDash([]); c.globalAlpha = 0.75; c.fillStyle = '#ffffff';
    for (let i = 0; i < 6; i++) { c.save(); c.rotate((i / 6) * 6.283); c.translate(36 * m.size, 0); c.rotate(0.785); c.fillRect(-2.2, -2.2, 4.4, 4.4); c.restore(); }
    c.restore();
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) { const q = (t * 0.45 + i / 5) % 1; c.globalAlpha = (1 - q) * 0.8; c.fillStyle = m.c2; pCirc(c, Math.sin(i * 2.3 + t * 1.3) * 16 * m.size, -q * 78 * m.size, 2 * (1 - q) + 0.6); c.fill(); }
    c.restore();
  }
  if (m.elite) {
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.55 + Math.sin(t * 5) * 0.15; c.strokeStyle = '#ffd54a'; c.lineWidth = 2;
    c.beginPath(); c.ellipse(0, 0, 18 * m.size, 8 * m.size, 0, 0, 6.283); c.stroke();
    for (let i = 0; i < 3; i++) { const q = (t * 0.7 + i / 3) % 1; c.globalAlpha = (1 - q) * 0.8; pCirc(c, Math.cos(i * 2.1 + t) * 12 * m.size, -q * 40 * m.size, 1.6); c.fillStyle = '#ffe680'; c.fill(); }
    c.restore();
  }
  const rage = isRage(m);
  if (rage) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.3 + 0.15 * Math.sin(t * 10); c.fillStyle = '#ff2010'; c.scale(1, 0.45); pCirc(c, 0, 0, 40 * m.size); c.fill(); c.restore(); }
  if (!m.static) themeParticles(c, m, t, m.boss ? (rage ? 9 : 6) : m.elite ? 4 : 2, rage ? 1.6 : 1);
  groundShadow(c, 14 * m.size, 6 * m.size);
  const lg = m.lunge > 0 ? Math.sin((m.lunge / 0.2) * Math.PI) * 5 : 0;
  // thở nhẹ khi đứng yên, nảy khi chạy, bẹp ngang khi bị đánh (co giãn quanh chân)
  const hit = m.flash > 0 ? Math.min(1, m.flash / 0.12) : 0, breathe = m.moving ? Math.abs(Math.sin(t * 12 + m.x)) * 0.05 : Math.sin(t * 2.4 + m.x * 1.7 + m.y) * 0.018;
  // Boss thỉnh thoảng gầm: phồng người; cuồng nộ thì rung nhẹ
  const roar = m.boss ? Math.max(0, Math.sin(t * 1.05 + hash(m.x) * 6.28) - 0.82) * 0.5 + (rage ? Math.sin(t * 30) * 0.012 : 0) : 0;
  const V = variant(m), sc = V.k * (1 + roar);
  c.scale(m.size * m.face * sc * (1 - breathe * 0.6 + hit * 0.1), m.size * sc * (1 + breathe - hit * 0.08)); c.translate(lg, 0);
  const fl = m.flash > 0, shp = SHAPES[m.shape] || blob, hc = haloColor(m, rage);
  if (hc && !fl && m.shape !== 'gate') { // quầng viền theo đúng hình dáng: vẽ lại hình dáng to hơn 7% bằng màu quầng, phía sau
    c.save(); c.globalAlpha = rage ? 0.5 : m.boss ? 0.28 : 0.4; c.globalCompositeOperation = 'lighter'; c.scale(1.07, 1.07);
    shp(c, m, t, tones(hc), tones(hc)); c.restore();
  }
  const C = tones(V.c1), D = tones(m.c2); // nháy trắng khi trúng đòn do drawPolished xử lý (không đổi bảng màu nữa)
  const body = (g) => shp(g, m, t, C, D);
  if (m.shape === 'gate') { const C2 = tones(fl ? '#ffffff' : V.c1), D2 = tones(fl ? '#ffffff' : m.c2); shp(c, m, t, C2, D2); }
  else drawPolished(c, body, tones(V.c1).o, fl ? Math.min(1, m.flash / 0.12) : 0);
  c.restore();
  if (m.boss) { c.save(); c.translate(s.x, s.y); c.scale(VIS, VIS); bossOrbiters(c, m, t, rage); c.restore(); }
}
