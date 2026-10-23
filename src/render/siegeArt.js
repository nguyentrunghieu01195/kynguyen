// Đồ hoạ riêng cho Công Thành Chiến & Boss Bang: Ngai Vàng, tàn tích cổng, dấu phe, vòng boss, thanh máu cổng.
import { SIEGE } from '../config/siege.js';
import { iso, isoRadius } from './iso.js';

const darken = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join(''); };

/** Ngai Vàng: bệ đá ba bậc, ghế vàng có lưng cao, hai lá cờ màu bang đang giữ, cột sáng khi đang chiếm */
export function drawThrone(c, t, col, frac) {
  const th = SIEGE.throne, s = iso(th.x, th.y);
  c.save(); c.translate(s.x, s.y);
  // bệ đá 3 bậc
  for (const [rx, ry, h, tone] of [[56, 25, 0, '#4a4650'], [44, 20, 6, '#625d6a'], [32, 14, 12, '#7a7484']]) {
    c.fillStyle = darken(tone, 0.6); c.beginPath(); c.ellipse(0, -h + 5, rx, ry, 0, 0, 6.283); c.fill();
    c.fillStyle = tone; c.beginPath(); c.ellipse(0, -h, rx, ry, 0, 0, 6.283); c.fill();
    c.strokeStyle = '#1a1620'; c.lineWidth = 1.4; c.stroke();
  }
  c.strokeStyle = col; c.globalAlpha = 0.9; c.lineWidth = 2; c.beginPath(); c.ellipse(0, -12, 26, 11, 0, 0, 6.283); c.stroke(); c.globalAlpha = 1; // vòng màu bang giữ ngai
  // cờ hai bên
  for (const sx of [-1, 1]) {
    const x = sx * 40, w = Math.sin(t * 2 + sx) * 3;
    c.strokeStyle = '#2a2230'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, -4); c.lineTo(x, -78); c.stroke();
    c.fillStyle = col; c.strokeStyle = darken(col, 0.45); c.lineWidth = 1.4; c.beginPath(); c.moveTo(x, -76); c.quadraticCurveTo(x + sx * (14 + w), -70, x + sx * (22 + w), -62); c.lineTo(x + sx * (14 + w * 0.5), -54); c.quadraticCurveTo(x + sx * 8, -52, x, -50); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#ffd34a'; c.beginPath(); c.arc(x, -80, 3, 0, 6.283); c.fill();
  }
  // ghế
  const gold = '#e8b838', goldD = '#8a6414', goldL = '#fff0a0';
  c.fillStyle = goldD; c.strokeStyle = '#2a1a04'; c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(-17, -14); c.lineTo(-17, -66); c.quadraticCurveTo(-17, -80, -6, -76); c.lineTo(0, -88); c.lineTo(6, -76); c.quadraticCurveTo(17, -80, 17, -66); c.lineTo(17, -14); c.closePath(); c.fill(); c.stroke();
  const g = c.createLinearGradient(-17, -70, 17, -14); g.addColorStop(0, goldL); g.addColorStop(0.4, gold); g.addColorStop(1, goldD);
  c.fillStyle = g; c.beginPath(); c.moveTo(-13, -16); c.lineTo(-13, -64); c.quadraticCurveTo(-13, -74, -6, -71); c.lineTo(0, -82); c.lineTo(6, -71); c.quadraticCurveTo(13, -74, 13, -64); c.lineTo(13, -16); c.closePath(); c.fill();
  c.fillStyle = '#7a1424'; c.beginPath(); c.moveTo(-10, -20); c.lineTo(-10, -58); c.quadraticCurveTo(0, -64, 10, -58); c.lineTo(10, -20); c.closePath(); c.fill(); // nệm
  c.fillStyle = gold; c.fillRect(-22, -30, 8, 6); c.fillRect(14, -30, 8, 6); c.strokeRect(-22, -30, 8, 6); c.strokeRect(14, -30, 8, 6);
  c.fillStyle = '#c8262a'; c.beginPath(); c.moveTo(0, -58); c.lineTo(5, -50); c.lineTo(0, -42); c.lineTo(-5, -50); c.closePath(); c.fill(); c.strokeStyle = goldL; c.lineWidth = 1; c.stroke();
  // cột sáng khi đang chiếm
  if (frac > 0) {
    c.save(); c.globalCompositeOperation = 'lighter';
    const b = c.createLinearGradient(0, -12, 0, -190); b.addColorStop(0, col); b.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalAlpha = 0.28 + 0.12 * Math.sin(t * 6); c.fillStyle = b; c.fillRect(-14 - frac * 10, -190, 28 + frac * 20, 178);
    c.restore();
  }
  c.restore();
}

/** Tàn tích cổng khi đã bị phá: hai trụ gãy + gạch đá vương vãi */
export function drawGateRuins(c) {
  const gt = SIEGE.gate, s = iso(gt.x, gt.y);
  c.save(); c.translate(s.x, s.y);
  const stone = (x, y, w, h, k) => { c.fillStyle = darken('#7a6a5a', k); c.strokeStyle = '#1a140e'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y - 3); c.lineTo(x + w - 2, y - h); c.lineTo(x + 1, y - h + 4); c.closePath(); c.fill(); c.stroke(); };
  stone(-58, 4, 16, 34, 1); stone(-60, 4, 6, 50, 0.8); stone(42, 4, 16, 26, 1); stone(52, 4, 6, 44, 0.8);
  for (const [x, y, w, h, k] of [[-30, 6, 10, 6, 0.9], [-12, 10, 12, 7, 1], [8, 5, 9, 5, 0.85], [24, 9, 11, 6, 1], [-42, 12, 8, 5, 0.8], [36, 12, 9, 5, 0.9], [0, 14, 8, 4, 0.8]]) stone(x, y, w, h, k);
  c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 4; c.beginPath(); c.moveTo(-40, 6); c.lineTo(40, 6); c.stroke();
  c.restore();
}

/** Dấu phe trên đầu: mũi tên bập bềnh màu phe */
export function drawTeamMarker(c, x, y, col, t) {
  const b = Math.sin(t * 4) * 2; c.save(); c.fillStyle = col; c.strokeStyle = '#000'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x - 6, y + b - 8); c.lineTo(x + 6, y + b - 8); c.lineTo(x, y + b + 1); c.closePath(); c.stroke(); c.fill(); c.restore();
}

/** Vòng pháp trận dưới chân Boss Bang + vòng vàng dưới chân đồng đội */
export function drawBossRing(c, m, t) {
  const s = iso(m.x, m.y), r = isoRadius(3.2);
  c.save(); c.translate(s.x, s.y);
  c.globalAlpha = 0.16 + 0.05 * Math.sin(t * 2.5); c.fillStyle = '#ff5a2a'; c.beginPath(); c.ellipse(0, 0, r.rx, r.ry, 0, 0, 6.283); c.fill();
  c.globalAlpha = 0.85; c.strokeStyle = '#ff9a4a'; c.lineWidth = 2.4; c.beginPath(); c.ellipse(0, 0, r.rx, r.ry, 0, 0, 6.283); c.stroke();
  c.lineWidth = 1.4; c.setLineDash([6, 8]); c.lineDashOffset = -t * 18; c.beginPath(); c.ellipse(0, 0, r.rx * 0.72, r.ry * 0.72, 0, 0, 6.283); c.stroke(); c.setLineDash([]);
  c.fillStyle = '#ffd09a'; for (let i = 0; i < 8; i++) { const a = i * 0.7854 + t * 0.4; c.globalAlpha = 0.8; c.beginPath(); c.arc(Math.cos(a) * r.rx * 0.9, Math.sin(a) * r.ry * 0.9, 2.2, 0, 6.283); c.fill(); }
  c.restore();
}
export function drawAllyRing(c, x, y, col) { const q = iso(x, y); c.save(); c.globalAlpha = 0.75; c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.ellipse(q.x, q.y, 16, 7, 0, 0, 6.283); c.stroke(); c.restore(); }

/** Thanh máu Cổng Thành: rộng, có khung, hiện % */
export function drawGateBar(c, m, A) {
  const s = iso(m.x, m.y), y = s.y - A.mobHeight(m) - 22, bw = 120, k = Math.max(0, m.hp / m.maxHp);
  c.save(); c.textAlign = 'center';
  c.fillStyle = '#000'; c.fillRect(s.x - bw / 2 - 2, y - 2, bw + 4, 10);
  const g = c.createLinearGradient(s.x - bw / 2, 0, s.x + bw / 2, 0); g.addColorStop(0, '#ff8a2a'); g.addColorStop(1, '#ffd34a');
  c.fillStyle = g; c.fillRect(s.x - bw / 2, y, bw * k, 6);
  c.strokeStyle = '#ffd34a'; c.lineWidth = 1; c.strokeRect(s.x - bw / 2 - 2, y - 2, bw + 4, 10);
  c.font = '700 11px "Be Vietnam Pro", sans-serif'; c.lineWidth = 3; c.strokeStyle = '#000';
  const tx = 'Cổng Thành ' + Math.ceil(k * 100) + '%'; c.strokeText(tx, s.x, y - 6); c.fillStyle = '#ffe9b0'; c.fillText(tx, s.x, y - 6);
  c.restore();
}
