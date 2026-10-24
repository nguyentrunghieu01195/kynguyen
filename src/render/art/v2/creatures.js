// Quái vật vẽ lại: giải phẫu rõ ràng, mặt biểu cảm (mắt có lòng trắng - mống - điểm sáng), chi tiết theo từng loài.
// Gốc toạ độ = chân, mặt hướng +x, y âm là lên. Mỗi họ hình dáng có hàm riêng; loài cụ thể lấy từ m.tpl.id và các cờ trong m.tpl.
import { tones, pEll, pCirc, pPoly, pRR, fs, vgrad, rgrad, gloss, glowEye, sparkle, hash } from './kit.js';

const TAU = Math.PI * 2;
const blink = (t, m) => (t + (m.x || 0) * 0.37) % 3.9 < 0.13;
const lunge = (m) => (m.lunge > 0 ? Math.sin((m.lunge / 0.2) * Math.PI) : 0);

/** Chi thon: nối (x1,y1)→(x2,y2), độ rộng w1→w2, hai đầu tròn (một đường dẫn liền nên viền không bị đứt) */
export function limb(c, x1, y1, x2, y2, w1, w2) {
  const a = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
  c.beginPath(); c.moveTo(x1 + ca * w1, y1 + sa * w1); c.lineTo(x2 + ca * w2, y2 + sa * w2); c.arc(x2, y2, w2, a, a - Math.PI, true);
  c.lineTo(x1 - ca * w1, y1 - sa * w1); c.arc(x1, y1, w1, a + Math.PI, a + TAU, false); c.closePath();
}
const lim = (c, x1, y1, x2, y2, w1, w2, C, lw = 1.1) => { limb(c, x1, y1, x2, y2, w1, w2); fs(c, vgrad(c, Math.min(y1, y2) - w1, Math.max(y1, y2) + w1, C.h, C.s), C.o, lw); };

/** Mắt chibi: lòng trắng, mống mắt có chuyển màu, đồng tử, điểm sáng; lid > 0: mí trên cau lại (dữ), nhắm khi chớp */
export function bigEye(c, x, y, r, iris, o = {}) {
  if (o.closed) { c.strokeStyle = '#1a1020'; c.lineWidth = 1.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - r * 0.8, y); c.quadraticCurveTo(x, y + r * 0.5, x + r * 0.8, y); c.stroke(); return; }
  pEll(c, x, y, r * 0.88, r); fs(c, '#fffdf4', '#2a1424', 0.9);
  const lx = (o.look == null ? 0.35 : o.look) * r * 0.3;
  c.save(); pEll(c, x, y, r * 0.88, r); c.clip();
  pCirc(c, x + lx, y + r * 0.08, r * 0.7); c.fillStyle = rgrad(c, x + lx, y - r * 0.3, 0.2, r * 0.8, mixc(iris, '#ffffff', 0.35), iris); c.fill();
  pCirc(c, x + lx + r * 0.05, y + r * 0.08, r * 0.36); c.fillStyle = o.slit ? 'rgba(0,0,0,0)' : '#10060e'; c.fill();
  if (o.slit) { pEll(c, x + lx, y + r * 0.08, r * 0.14, r * 0.62); c.fillStyle = '#10060e'; c.fill(); }
  if (o.lid) { c.fillStyle = o.lidCol || '#00000044'; c.beginPath(); c.moveTo(x - r, y - r - 1); c.lineTo(x + r, y - r - 1); c.lineTo(x + r, y - r * (0.1 + o.lid * 0.5)); c.lineTo(x - r, y - r * (0.1 - o.lid * 0.4)); c.closePath(); c.fillStyle = o.lidFill || '#2a1a24'; c.fill(); }
  c.restore();
  pCirc(c, x + lx - r * 0.25, y - r * 0.32, r * 0.24); c.fillStyle = '#fff'; c.fill();
  pCirc(c, x + lx + r * 0.22, y + r * 0.3, r * 0.1); c.fillStyle = 'rgba(255,255,255,.8)'; c.fill();
}
function mixc(a, b, k) { const pa = parseInt(a.slice(1, 7), 16), pb = parseInt(b.slice(1, 7), 16), ch = (s) => Math.round(((pa >> s) & 255) * (1 - k) + ((pb >> s) & 255) * k); return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1); }
const tri = (c, pts, fill, o, lw = 1) => { pPoly(c, pts); fs(c, fill, o, lw); };
const fang = (c, x, y, s = 1) => tri(c, [x - 1.1 * s, y, x, y + 3 * s, x + 1.1 * s, y], '#fffdf0', '#3a2020', 0.6);
function crown(c, x, y, s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.beginPath(); c.moveTo(-8, 0); c.lineTo(-9, -9); c.lineTo(-4.5, -4); c.lineTo(0, -11); c.lineTo(4.5, -4); c.lineTo(9, -9); c.lineTo(8, 0); c.closePath();
  fs(c, vgrad(c, -11, 0, '#fff3a0', '#d09a10'), '#6a4a00', 1.2); pCirc(c, 0, -3.5, 1.6); c.fillStyle = '#ff3a5a'; c.fill(); pCirc(c, -5, -3, 1); pCirc(c, 5, -3, 1); c.fillStyle = '#5ad0ff'; c.fill();
  c.restore();
}
export { crown, tri, fang, lim };

// =====================================================================
//  SLIME / CÓC / MA NHÃN
// =====================================================================
export function blob(c, m, t, C, D) {
  const sq = 1 + Math.sin(t * 5 + m.x * 3) * 0.07, hop = m.moving ? Math.abs(Math.sin(t * 7 + m.x)) * 5 : 0, cl = blink(t, m);
  c.translate(0, -hop);
  if (m.tpl.eye) { // Ma Nhãn: nhãn cầu khổng lồ có gân máu, mống mắt xoáy, mí mắt, xúc tu
    for (let i = 0; i < 6; i++) { const a = 0.5 + i * 0.45, w = Math.sin(t * 3.5 + i * 1.3) * 4; c.strokeStyle = C.o; c.lineWidth = 4.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(Math.cos(a) * 7 - 3, -8); c.quadraticCurveTo(Math.cos(a) * 15 + w, -1, Math.cos(a) * 13 - w, 6); c.stroke(); c.strokeStyle = i % 2 ? D.b : C.b; c.lineWidth = 3; c.stroke(); pCirc(c, Math.cos(a) * 13 - w, 6, 1.8); c.fillStyle = D.hh; c.fill(); }
    pCirc(c, 0, -22, 14.5); fs(c, rgrad(c, -4, -28, 2, 17, '#fff8f4', '#d8b8c8'), C.o, 1.4);
    c.strokeStyle = 'rgba(190,40,60,.55)'; c.lineWidth = 0.8; for (const [a, b, d] of [[-12, -26, -5], [-11, -18, -6], [12, -26, 6], [11, -17, 7], [-2, -35, 0]]) { c.beginPath(); c.moveTo(a, b); c.quadraticCurveTo((a + d) / 2, (b - 22) / 2 - 4, d, -22); c.stroke(); }
    c.save(); c.shadowColor = D.b; c.shadowBlur = 10; pCirc(c, 4, -22, 8); c.fillStyle = rgrad(c, 4, -22, 1, 8, D.hh, D.b); c.fill(); c.restore();
    pCirc(c, 4, -22, 8); c.strokeStyle = C.o; c.lineWidth = 1; c.stroke(); for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + t; c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(4 + Math.cos(a) * 3, -22 + Math.sin(a) * 3); c.lineTo(4 + Math.cos(a) * 7.5, -22 + Math.sin(a) * 7.5); c.stroke(); }
    pEll(c, 4.5, -22, 2.2 + Math.sin(t * 2) * 0.6, 5.5); c.fillStyle = '#10000a'; c.fill(); pCirc(c, 1.5, -26, 2); c.fillStyle = '#fff'; c.fill();
    c.save(); pCirc(c, 0, -22, 14.5); c.clip(); c.fillStyle = C.s; c.beginPath(); c.moveTo(-16, -40); c.lineTo(16, -40); c.lineTo(16, -30 + (cl ? 8 : 0)); c.quadraticCurveTo(0, -26 + (cl ? 8 : 0), -16, -31 + (cl ? 8 : 0)); c.fill(); c.restore();
    return;
  }
  if (m.tpl.toad) { // cóc độc: thân bè, họng phập phồng, mắt lồi, mụn độc
    const th = Math.sin(t * 4 + m.x) * 0.8;
    pEll(c, -9, -4, 6, 4); fs(c, C.s, C.o, 1); pEll(c, 9, -2.5, 5, 2.6); fs(c, C.s, C.o, 1);
    pEll(c, -2, -10, 15, 9.5); fs(c, vgrad(c, -19, -1, C.h, C.s), C.o, 1.3);
    pEll(c, 3, -5.5, 10, 4.6); c.fillStyle = D.hh; c.globalAlpha = 0.55; c.fill(); c.globalAlpha = 1;
    pEll(c, 10, -6 + th * 0.4, 4.4 + th * 0.3, 3 + th * 0.4); fs(c, D.h, C.o, 0.9);
    for (const [x, y, r] of [[-8, -13, 1.8], [-3, -16, 1.5], [2, -14, 1.7], [-6, -8, 1.3], [6, -10, 1.2]]) { pCirc(c, x, y, r); fs(c, D.b, C.o, 0.6); }
    for (const x of [1, 10]) { pCirc(c, x, -18.5, 4.6); fs(c, vgrad(c, -23, -14, C.h, C.b), C.o, 1); bigEye(c, x + 0.4, -18.8, 3.2, '#d8c020', { slit: true, closed: cl, lid: 0.4, lidFill: C.s }); }
    c.strokeStyle = C.o; c.lineWidth = 1.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(4, -9); c.quadraticCurveTo(10, -6, 14, -10); c.stroke();
    if (m.tpl.crown) crown(c, 5, -25, 0.8);
    return;
  }
  // SLIME: giọt nước có lõi, bọt khí, mắt to long lanh, má hồng
  c.beginPath(); c.moveTo(-15 / sq, -1); c.bezierCurveTo(-16 / sq, -20 * sq, -4, -26 * sq, 2, -24 * sq); c.bezierCurveTo(10, -23 * sq, 16 / sq, -18 * sq, 15 / sq, -1); c.quadraticCurveTo(0, 3, -15 / sq, -1); c.closePath();
  c.globalAlpha = 0.96; fs(c, rgrad(c, -4, -18, 2, 20, C.hh, C.b), C.o, 1.4); c.globalAlpha = 1;
  c.save(); c.clip(); pEll(c, 0, -3, 14, 8); c.fillStyle = C.s; c.globalAlpha = 0.45; c.fill(); c.globalAlpha = 1;
  pEll(c, -2, -8, 5.4, 4.4); c.fillStyle = D.b; c.globalAlpha = 0.28; c.fill(); c.globalAlpha = 1;
  for (let i = 0; i < 4; i++) { const q = (t * 0.4 + i * 0.27) % 1; pCirc(c, -8 + i * 5 + Math.sin(i + t) * 1.5, -3 - q * 14, 0.9 + hash(i) * 1.1); c.fillStyle = 'rgba(255,255,255,.5)'; c.fill(); }
  c.restore();
  gloss(c, -8, -17 * sq, 4.4, 2.6, 0.8); gloss(c, 9, -14 * sq, 1.6, 1.1, 0.7);
  bigEye(c, 4, -12 * sq, 3.6, '#1a3a1a', { closed: cl }); bigEye(c, 11, -11.5 * sq, 3.1, '#1a3a1a', { closed: cl });
  pEll(c, -0.5, -7.5 * sq, 2.2, 1.2); c.fillStyle = 'rgba(255,110,130,.4)'; c.fill(); pEll(c, 14, -7.5 * sq, 1.8, 1.1); c.fill();
  c.strokeStyle = C.o; c.lineWidth = 1.1; c.beginPath(); c.arc(8, -7.5 * sq, 2.2, 0.15, Math.PI - 0.15); c.stroke();
  if (m.tpl.crown) crown(c, 2, -24 * sq, 0.95);
}

// =====================================================================
//  THÚ BỐN CHÂN: sói, chuột, thằn lằn, cá sấu, sói băng, gấu băng, chó địa ngục
// =====================================================================
const QUAD = {
  wolf: { len: 14, h: 8.5, head: 6.6, snout: 5.5, ears: 'point', tail: 'bushy', L: 10, eye: '#e0a020' },
  rat: { len: 10, h: 6.2, head: 5.4, snout: 4.5, ears: 'round', tail: 'whip', L: 5, eye: '#201010', whisk: 1 },
  lizard: { len: 14, h: 5.8, head: 5, snout: 6.5, ears: 'frill', tail: 'long', L: 6, eye: '#e0c020', splay: 1, slit: 1 },
  croc: { len: 18, h: 7.5, head: 6.2, snout: 12, ears: null, tail: 'long', L: 5, eye: '#d8d020', splay: 1, slit: 1, teeth: 1, bumps: 1 },
  icewolf: { len: 14.5, h: 8.8, head: 6.8, snout: 5.5, ears: 'point', tail: 'bushy', L: 10, eye: '#80e8ff', frost: 1 },
  icebear: { len: 17, h: 12, head: 8, snout: 4, ears: 'round', tail: 'stub', L: 9, eye: '#101010', claws: 1 },
  hellhound: { len: 15, h: 9, head: 7, snout: 6, ears: 'point', tail: 'bushy', L: 10, eye: '#ffd040', flame: 1, spikes: 1 },
};
export function beast(c, m, t, C, D) {
  const id = m.tpl.id, P = QUAD[id] || (m.tpl.bear ? QUAD.icebear : m.tpl.croc ? QUAD.croc : QUAD.wolf);
  const mv = m.moving ? Math.sin(t * 12 + m.x) : 0, bob = m.moving ? Math.abs(mv) * 1.6 : Math.sin(t * 3 + m.y) * 0.5, lg = lunge(m);
  const by = -(P.L + P.h * 0.78) + bob, hx = P.len * 0.82 + lg * 2, hy = by - P.h * 0.45 - (m.moving ? 0 : 0.5), cl = blink(t, m);
  const sway = Math.sin(t * 4 + m.x) * 3;
  // Đuôi
  c.lineCap = 'round';
  if (P.tail === 'whip') { c.strokeStyle = C.o; c.lineWidth = 3; c.beginPath(); c.moveTo(-P.len * 0.85, by); c.bezierCurveTo(-P.len - 8, by + 3, -P.len - 12, by - 10 + sway, -P.len - 6, by - 14 + sway); c.stroke(); c.strokeStyle = '#e0a090'; c.lineWidth = 1.5; c.stroke(); }
  else if (P.tail === 'long') { c.strokeStyle = C.o; c.lineWidth = P.h * 0.9; c.beginPath(); c.moveTo(-P.len * 0.8, by + 1); c.bezierCurveTo(-P.len - 8, by + 2, -P.len - 14, by - 2 + sway, -P.len - 22, by + 2 + sway * 1.5); c.stroke(); c.strokeStyle = C.b; c.lineWidth = P.h * 0.9 - 2; c.stroke(); }
  else if (P.tail === 'stub') { pCirc(c, -P.len * 0.95, by - 1, 3.4); fs(c, C.b, C.o, 1); }
  else { c.save(); c.translate(-P.len * 0.8, by - 1); c.rotate(-0.7 + sway * 0.05); pEll(c, -7, 0, 9, 3.8); fs(c, vgrad(c, -4, 4, C.h, C.s), C.o, 1.1); pEll(c, -12, 0, 3.6, 2.4); c.fillStyle = D.hh; c.globalAlpha = P.flame ? 0 : 0.75; c.fill(); c.globalAlpha = 1; c.restore(); }
  // Chân xa (sau thân)
  const leg = (x, ph, near) => {
    const sw = mv * ph * 4, k = near ? C : { ...C, h: C.s, s: C.d };
    if (P.splay) { c.save(); c.translate(x, by + P.h * 0.5); lim(c, 0, 0, sw * 0.5 + (x > 0 ? 3 : -3), P.L * 0.5, 2.8, 2.2, k); lim(c, sw * 0.5 + (x > 0 ? 3 : -3), P.L * 0.5, sw + (x > 0 ? 5 : -2), P.L + 0.5 - by - P.h * 0.5 + by, 2.2, 2, k); c.restore(); return; }
    const kx = x + sw * 0.4, fy = 0;
    lim(c, x, by + P.h * 0.4, kx, -P.L * 0.45, P.h * 0.38 + 0.4, P.h * 0.27, k); lim(c, kx, -P.L * 0.45, x + sw, fy - 1.5, P.h * 0.27, P.h * 0.23, k);
    pEll(c, x + sw + 1.2, fy - 1, P.h * 0.32 + 0.8, 1.9); fs(c, k.d, C.o, 0.9);
    if (P.claws && near) { for (const dx of [0, 2, 4]) { tri(c, [x + sw + 1 + dx, fy - 1, x + sw + 2 + dx, fy + 1.4, x + sw + 3 + dx, fy - 1], '#fffdf0', '#4a4a4a', 0.5); } }
  };
  leg(-P.len * 0.55, -1, false); leg(P.len * 0.5, 1, false);
  // Thân
  c.save();
  pEll(c, 0, by, P.len, P.h); fs(c, vgrad(c, by - P.h, by + P.h, C.h, C.s), C.o, 1.3);
  c.clip(); pEll(c, 1, by + P.h * 0.55, P.len * 0.8, P.h * 0.55); c.fillStyle = id === 'wolf' || id === 'icewolf' || P.claws ? D.hh : D.b; c.globalAlpha = 0.5; c.fill(); c.globalAlpha = 1;
  if (P.bumps) { c.fillStyle = C.s; for (let i = 0; i < 6; i++) { pCirc(c, -P.len * 0.7 + i * (P.len * 0.28), by - P.h * 0.85, 1.8); c.fill(); } c.strokeStyle = C.s; c.lineWidth = 0.8; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-P.len * 0.7 + i * P.len * 0.3, by - P.h * 0.4); c.lineTo(-P.len * 0.7 + i * P.len * 0.3 + 2, by + P.h * 0.6); c.stroke(); } }
  if (id === 'wolf' || id === 'icewolf' || id === 'hellhound') { c.strokeStyle = C.s; c.lineWidth = 1.2; c.globalAlpha = 0.6; for (const x of [-6, -1, 4]) { c.beginPath(); c.moveTo(x, by - P.h * 0.8); c.quadraticCurveTo(x + 1.5, by, x - 1, by + P.h * 0.4); c.stroke(); } c.globalAlpha = 1; }
  c.restore();
  if (P.spikes || P.frost) for (let i = 0; i < 5; i++) { const x = -P.len * 0.55 + i * (P.len * 0.3); tri(c, [x - 2.2, by - P.h * 0.85, x + 0.4, by - P.h * 1.45 - hash(i) * 2, x + 2.6, by - P.h * 0.85], P.frost ? '#e8fbff' : D.b, C.o, 0.9); }
  if (P.flame) { c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 6; i++) { const x = -P.len * 0.7 + i * (P.len * 0.3), fl = Math.sin(t * 9 + i * 1.7) * 2; c.fillStyle = i % 2 ? '#ff7a20' : '#ffd060'; c.globalAlpha = 0.85; pPoly(c, [x - 2, by - P.h * 0.9, x + fl * 0.5, by - P.h * 1.5 - 4 + fl, x + 2.4, by - P.h * 0.9]); c.fill(); } c.restore(); }
  leg(-P.len * 0.4, 1, true); leg(P.len * 0.65, -1, true);
  // Đầu
  c.save(); c.translate(hx, hy); c.rotate(m.moving ? Math.sin(t * 12 + m.x) * 0.04 : Math.sin(t * 2.2 + m.x) * 0.03);
  const sn = P.snout, hr = P.head;
  if (P.ears === 'point') { for (const [ex, ey, k] of [[-hr * 0.4, -hr * 0.9, 0.85], [hr * 0.15, -hr * 1.0, 1]]) { tri(c, [ex - hr * 0.45, ey + 1, ex + hr * 0.05, ey - hr * 1.15 * k, ex + hr * 0.55, ey + 1], C.b, C.o, 1); tri(c, [ex - hr * 0.2, ey + 0.5, ex + hr * 0.05, ey - hr * 0.7 * k, ex + hr * 0.3, ey + 0.5], D.hh, 'rgba(0,0,0,0)', 0.1); } }
  if (P.ears === 'round') { for (const [ex, k] of [[-hr * 0.5, 0.9], [hr * 0.2, 1]]) { pCirc(c, ex, -hr * 0.95, hr * 0.5 * k); fs(c, C.b, C.o, 1); pCirc(c, ex, -hr * 0.95, hr * 0.28 * k); c.fillStyle = id === 'rat' ? '#f0a8a0' : D.hh; c.fill(); } }
  if (P.ears === 'frill') for (const k of [0, 1, 2]) tri(c, [-hr * 0.5 - k * 2.2, -hr * 0.4 + k * 2, -hr * 0.9 - k * 3.4, -hr * 1.2 + k * 1.5, -hr * 0.3 - k * 2, -hr * 0.9 + k * 2.4], D.b, C.o, 0.9);
  // mõm
  pEll(c, hr * 0.15, 0, hr, hr * 0.92); fs(c, vgrad(c, -hr, hr, C.hh, C.s), C.o, 1.2);
  const sw = sn * 0.9; pEll(c, hr * 0.8 + sw * 0.5, hr * 0.28, sw * 0.7 + hr * 0.3, hr * 0.5); fs(c, vgrad(c, -hr * 0.2, hr * 0.8, C.hh, C.b), C.o, 1.1);
  pEll(c, hr * 0.8 + sw * 1.05, hr * 0.1, 1.9 + hr * 0.1, 1.5 + hr * 0.08); c.fillStyle = '#1a0e14'; c.fill(); pCirc(c, hr * 0.8 + sw * 1.0, hr * 0.0, 0.5); c.fillStyle = '#fff'; c.fill();
  c.strokeStyle = C.o; c.lineWidth = 1; c.beginPath(); c.moveTo(hr * 0.8 + sw * 0.9, hr * 0.5); c.quadraticCurveTo(hr * 0.8 + sw * 0.4, hr * 0.8, hr * 0.8 - 1, hr * 0.55); c.stroke();
  if (P.teeth) for (let i = 0; i < 5; i++) fang(c, hr * 0.9 + i * 2.1, hr * 0.62, 0.55);
  else if (id !== 'rat' && !P.claws) { fang(c, hr * 0.8 + sw * 0.62, hr * 0.56, 0.7); }
  if (id === 'rat') { tri(c, [hr * 0.9 + sw * 0.6, hr * 0.5, hr * 0.9 + sw * 0.6 + 1.4, hr * 0.5, hr * 0.9 + sw * 0.6 + 0.7, hr * 0.5 + 2.8], '#fffdf0', C.o, 0.5); c.strokeStyle = '#d8c8b8'; c.lineWidth = 0.6; for (const dy of [-1, 0.5, 2]) { c.beginPath(); c.moveTo(hr * 0.9 + sw, hr * 0.3 + dy); c.lineTo(hr * 0.9 + sw + 6, hr * 0.3 + dy * 2.2); c.stroke(); } }
  bigEye(c, hr * 0.38, -hr * 0.1, hr * (P.slit ? 0.34 : 0.4), P.eye, { closed: cl, lid: P.flame || id === 'wolf' || id === 'icewolf' ? 0.55 : 0.1, slit: !!P.slit, lidFill: C.s });
  if (id === 'wolf' || id === 'icewolf' || id === 'hellhound') { c.strokeStyle = C.o; c.lineWidth = 1.4; c.beginPath(); c.moveTo(hr * 0.05, -hr * 0.55); c.lineTo(hr * 0.75, -hr * 0.28); c.stroke(); }
  if (P.flame) { c.save(); c.globalCompositeOperation = 'lighter'; c.shadowColor = '#ff8020'; c.shadowBlur = 8; bigEye(c, hr * 0.38, -hr * 0.1, hr * 0.2, '#fff0a0', {}); c.restore(); }
  if (P.claws) { pEll(c, hr * 0.8 + sw * 1.1, hr * 0.15, 2.4, 1.8); c.fillStyle = '#10080c'; c.fill(); }
  c.restore();
}

// =====================================================================
//  SÂU BỌ: nhện, bọ cạp
// =====================================================================
export function bug(c, m, t, C, D) {
  const mv = m.moving ? t * 14 + m.x : t * 2 + m.x, scorp = !!m.tpl.tail, lg = lunge(m);
  if (scorp) {
    // đuôi cong có ngòi
    const sw = Math.sin(t * 3) * 2 - lg * 5; c.strokeStyle = C.o; c.lineWidth = 5; c.lineCap = 'round';
    const pts = [[-8, -8], [-16, -12], [-18, -22 + sw], [-12, -30 + sw], [-4, -30 + sw * 1.4]];
    c.beginPath(); c.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) c.quadraticCurveTo(pts[i - 1][0] - 2, pts[i - 1][1], pts[i][0], pts[i][1]); c.stroke(); c.strokeStyle = C.b; c.lineWidth = 3; c.stroke();
    for (const [x, y] of pts.slice(1, 4)) { pCirc(c, x, y, 3.4); fs(c, C.h, C.o, 0.9); }
    tri(c, [-5, -30 + sw * 1.4 - 3, 1.5, -26 + sw * 1.4, -4, -30 + sw * 1.4 + 4], D.b, C.o, 1); pCirc(c, -3, -29.5 + sw * 1.4, 1.2); c.fillStyle = '#ffe0a0'; c.fill();
  }
  // tám chân có khớp
  c.lineCap = 'round';
  for (let i = 0; i < 4; i++) for (const sd of [0, 1]) {
    const ph = Math.sin(mv + i * 1.4 + sd * Math.PI) * 3, x0 = -4 + i * 3.4, spread = (i - 1.5) * 4 + (sd ? 3 : -3), lx = x0 + spread * 1.5, lyk = -14 - (sd ? 0 : 2);
    c.strokeStyle = C.o; c.lineWidth = 2.4; c.beginPath(); c.moveTo(x0, -8 + (sd ? 1 : -1)); c.lineTo(lx + ph * 0.4, lyk); c.lineTo(lx + spread * 0.5 + ph, -1); c.stroke();
    c.strokeStyle = sd ? C.s : C.b; c.lineWidth = 1.3; c.stroke();
  }
  // thân: bụng + đầu ngực
  pEll(c, scorp ? -2 : -7, -9, scorp ? 12 : 8.5, scorp ? 5.6 : 7); fs(c, vgrad(c, -16, -2, C.h, C.s), C.o, 1.3);
  if (!scorp) { c.strokeStyle = D.b; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-11, -13); c.lineTo(-7, -9); c.lineTo(-11, -5); c.moveTo(-3, -13); c.lineTo(-7, -9); c.lineTo(-3, -5); c.stroke(); pCirc(c, -10, -8, 1.6); pCirc(c, -6, -10, 1.6); c.fillStyle = D.b; c.fill(); }
  else { c.strokeStyle = C.s; c.lineWidth = 1; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-9 + i * 4, -13); c.lineTo(-8 + i * 4, -5); c.stroke(); } }
  pEll(c, scorp ? 9 : 3.4, -9, scorp ? 6 : 5.4, scorp ? 4.8 : 5); fs(c, vgrad(c, -15, -3, C.hh, C.b), C.o, 1.2);
  if (scorp) { for (const sd of [-1, 1]) { c.save(); c.translate(13, -9 + sd * 4); c.rotate(sd * (0.4 + lg * 0.4)); lim(c, 0, 0, 7, 0, 2, 1.8, C); pEll(c, 10, -sd * 1, 4.4, 2.8); fs(c, vgrad(c, -3, 3, C.hh, C.b), C.o, 1); tri(c, [11, -sd * 4, 15, -sd * 1, 11, sd * 2], C.s, C.o, 0.8); c.restore(); } }
  // mắt: nhện có 4 mắt nhỏ sáng; bọ cạp 2 mắt
  const ex = scorp ? 11 : 6, eyes = scorp ? [[ex, -12, 1.6], [ex + 2.4, -8, 1.6]] : [[ex, -13, 1.8], [ex + 2.6, -11, 1.8], [ex - 0.5, -9.4, 1.5], [ex + 2, -8, 1.5]];
  for (const [x, y, r] of eyes) { c.save(); c.shadowColor = D.b; c.shadowBlur = 5; pCirc(c, x, y, r); c.fillStyle = D.b; c.fill(); c.restore(); pCirc(c, x - 0.4, y - 0.4, r * 0.35); c.fillStyle = '#fff'; c.fill(); }
  if (!scorp) { for (const sd of [-1, 1]) tri(c, [ex + 5.5, -5 + sd, ex + 6.5, -1 + sd * 0.6, ex + 4.4, -4 + sd], '#fffdf0', C.o, 0.6); }
}

// =====================================================================
//  CUA
// =====================================================================
export function crab(c, m, t, C, D) {
  const mv = m.moving ? Math.sin(t * 14 + m.x) : 0, sn = lunge(m) || Math.max(0, Math.sin(t * 3 + m.x)) * 0.35, cl = blink(t, m);
  c.lineCap = 'round';
  for (let i = 0; i < 3; i++) for (const sd of [-1, 1]) { const ph = mv * (i % 2 ? 1 : -1) * 2.4, x = sd * (6 + i * 3.4); c.strokeStyle = C.o; c.lineWidth = 3; c.beginPath(); c.moveTo(sd * (4 + i * 3), -8); c.lineTo(x + sd * 6, -15); c.lineTo(x + sd * 9 + ph, -1.5); c.stroke(); c.strokeStyle = C.s; c.lineWidth = 1.7; c.stroke(); }
  // mai
  pEll(c, 0, -11, 16, 10); fs(c, rgrad(c, -4, -17, 2, 18, C.hh, C.s), C.o, 1.4);
  c.save(); pEll(c, 0, -11, 16, 10); c.clip(); c.strokeStyle = C.s; c.lineWidth = 1; for (const [a, b] of [[-9, -6], [0, 0], [9, 6]]) { c.beginPath(); c.moveTo(a, -22); c.quadraticCurveTo(a + b * 0.6, -12, a + b, -2); c.stroke(); } for (const [x, y, r] of [[-7, -14, 1.3], [5, -16, 1.2], [9, -9, 1.4], [-3, -8, 1.1]]) { pCirc(c, x, y, r); c.fillStyle = D.hh; c.globalAlpha = 0.7; c.fill(); c.globalAlpha = 1; } c.restore();
  gloss(c, -6, -17, 5, 2.4, 0.6);
  // gai mai
  for (const [x, k] of [[-8, 0.8], [-3, 1], [3, 1], [8, 0.8]]) tri(c, [x - 1.8, -19.5, x, -23.5 - k * 2, x + 1.8, -19.5], D.b, C.o, 0.8);
  // càng
  for (const sd of [-1, 1]) {
    c.save(); c.translate(sd * 15, -12); c.rotate(sd * (-0.5 - sn * 0.5));
    lim(c, 0, 0, sd * 2, -9, 3, 2.6, C); c.translate(sd * 2, -12);
    c.beginPath(); c.moveTo(-5.5, 1); c.quadraticCurveTo(-8, -9, -2, -13); c.quadraticCurveTo(2, -9 - sn * 6, 0, -4); c.quadraticCurveTo(4, -9, 6, -3); c.quadraticCurveTo(6, 3, 0, 4); c.closePath(); fs(c, vgrad(c, -13, 4, C.hh, C.b), C.o, 1.2);
    c.strokeStyle = C.s; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-1, -4); c.lineTo(-1, -10); c.stroke();
    c.restore();
  }
  // mắt cuống
  for (const x of [-3.4, 3.6]) { c.strokeStyle = C.o; c.lineWidth = 3; c.beginPath(); c.moveTo(x, -19); c.lineTo(x + 0.6, -25); c.stroke(); c.strokeStyle = C.b; c.lineWidth = 1.6; c.stroke(); bigEye(c, x + 0.6, -27, 3, '#201010', { closed: cl, look: 0.8 }); }
  pEll(c, 0, -12.5, 4, 1.7); c.fillStyle = '#2a1018'; c.fill(); if (!cl) for (const x of [-2, 2]) fang(c, x, -12.2, 0.5);
  if (m.tpl.crown) crown(c, 0, -34, 0.95);
}

// =====================================================================
//  RẮN / THỦY QUÁI / GIUN CÁT
// =====================================================================
function snakeHead(c, x, y, rot, C, D, m, t, cl, o = {}) {
  const k = o.k || 1;
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(k, k);
  if (o.crest) for (let i = 0; i < 3; i++) tri(c, [-3 + i * 3, -4, -2 + i * 3, -10 - (i === 1 ? 2 : 0), 1 + i * 3, -4], D.b, C.o, 0.9);
  pEll(c, 0, 0, 8.4, 5.6); fs(c, vgrad(c, -6, 6, C.hh, C.b), C.o, 1.2);
  pEll(c, 3, 3, 6, 2.4); c.fillStyle = D.hh; c.globalAlpha = 0.5; c.fill(); c.globalAlpha = 1;
  bigEye(c, 2.6, -1.8, 2.5, D.b, { closed: cl, slit: true, lid: 0.5, lidFill: C.s });
  pCirc(c, 7.4, -0.8, 0.7); c.fillStyle = C.o; c.fill();
  if (Math.sin(t * 6 + m.y) > 0.2 || lunge(m) > 0) { c.strokeStyle = '#e02848'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(8, 1.4); c.lineTo(13, 1.4); c.lineTo(15, 0); c.moveTo(13, 1.4); c.lineTo(15, 2.8); c.stroke(); }
  fang(c, 5.5, 3.4, 0.55);
  c.restore();
}
export function serpent(c, m, t, C, D) {
  const id = m.tpl.id, br = lunge(m), mv = t * (m.moving ? 7 : 2.5) + m.x, cl = blink(t, m);
  if (id === 'sandworm') return sandworm(c, m, t, C, D);
  // thân cuộn sát đất: đốt có sọc màu
  for (let i = 6; i >= 0; i--) {
    const x = -19 + i * 5.6, y = -4.4 - Math.sin(mv + i * 0.9) * 2, r = 6.8 - i * 0.2;
    pEll(c, x, y, r, r * 0.82); fs(c, vgrad(c, y - r, y + r, i % 2 ? C.h : C.hh, C.s), C.o, 1.1);
    pEll(c, x, y + r * 0.35, r * 0.7, r * 0.3); c.fillStyle = D.hh; c.globalAlpha = 0.45; c.fill(); c.globalAlpha = 1;
    if (i % 2 === 0) { c.save(); pEll(c, x, y, r, r * 0.82); c.clip(); c.fillStyle = D.b; c.globalAlpha = 0.35; c.fillRect(x - 2, y - r, 3.4, r * 2); c.restore(); }
  }
  const heads = id === 'hydra' ? [[0, 1], [-7, 0.8], [8, 0.8]] : [[0, 1]];
  for (const [off, k] of heads) {
    const ph = off * 0.5 + (off ? Math.sin(t * 2 + off) * 1.6 : 0), hx = 14 + br * 7 + off * 0.8 + ph, hy = -32 * k + (off ? 4 : 0) - Math.sin(t * 2.2 + off) * 1.4, bx = 6 + off * 0.5;
    c.strokeStyle = C.o; c.lineCap = 'round'; c.lineWidth = 11 * k; c.beginPath(); c.moveTo(bx, -6); c.quadraticCurveTo(17 + off * 0.4, -16 * k, hx - 4, hy + 6); c.stroke();
    c.strokeStyle = C.b; c.lineWidth = 9 * k; c.stroke();
    c.strokeStyle = D.b; c.globalAlpha = 0.5; c.lineWidth = 3 * k; c.setLineDash([2, 4]); c.beginPath(); c.moveTo(bx + 1, -6); c.quadraticCurveTo(16 + off * 0.4, -16 * k, hx - 3, hy + 6); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
    snakeHead(c, hx, hy, -0.1 + br * 0.2, C, D, m, t, cl, { k: k, crest: id === 'seasnake' || m.tpl.crown });
    if (m.tpl.crown && off === 0) crown(c, hx, hy - 8, 0.75);
  }
}
function sandworm(c, m, t, C, D) {
  const br = lunge(m), w = Math.sin(t * 2.4 + m.x) * 2, cl = blink(t, m);
  pEll(c, 0, 0, 22, 6); fs(c, vgrad(c, -6, 6, '#d8b878', '#8a6a38'), C.o, 1); // gò cát
  for (let i = 7; i >= 0; i--) { const y = -6 - i * 5.6, x = Math.sin(t * 2 + i * 0.7) * 2 + (i > 4 ? w * (i - 4) * 0.3 : 0) + br * i * 0.6, r = 11 - i * 0.35; pEll(c, x, y, r, 6.4); fs(c, vgrad(c, y - 6, y + 6, i % 2 ? C.hh : C.h, C.s), C.o, 1.1); c.strokeStyle = C.s; c.lineWidth = 0.9; c.beginPath(); c.arc(x, y, r - 1, 0.3, 2.8); c.stroke(); }
  const hy = -6 - 8 * 5.4 - 4, hx = br * 5 + w * 0.8;
  pEll(c, hx, hy, 12, 10.5); fs(c, rgrad(c, hx - 3, hy - 4, 2, 14, C.hh, C.b), C.o, 1.3);
  c.save(); c.translate(hx + 3, hy + 1); pEll(c, 0, 0, 9, 7.5); fs(c, '#4a0a14', C.o, 1);
  for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, r = 7.5; tri(c, [Math.cos(a) * r * 1.0, Math.sin(a) * r * 0.82, Math.cos(a) * r * 0.5 + Math.cos(a + 1.57) * 1.3, Math.sin(a) * r * 0.4 + Math.sin(a + 1.57) * 1.1, Math.cos(a) * r * 0.5 - Math.cos(a + 1.57) * 1.3, Math.sin(a) * r * 0.4 - Math.sin(a + 1.57) * 1.1], '#fffdf0', '#3a2020', 0.5); }
  pEll(c, 0, 0, 3, 2.4); c.fillStyle = '#10000a'; c.fill(); c.restore();
  for (const [x, y] of [[-6, -6], [3, -9]]) bigEye(c, hx + x, hy + y, 2.6, D.b, { closed: cl, lid: 0.5, lidFill: C.s });
  for (let i = 0; i < 4; i++) tri(c, [hx - 10 + i * 6, hy - 9, hx - 8 + i * 6, hy - 14, hx - 6 + i * 6, hy - 9], D.b, C.o, 0.8);
}

// =====================================================================
//  MA / HỒN / SỨA / LỬA / BÓNG TỐI (bay lơ lửng)
// =====================================================================
export function ghost(c, m, t, C, D) {
  const id = m.tpl.id, hv = -14 + Math.sin(t * 2.6 + m.x) * 3, cl = blink(t, m);
  c.translate(0, hv);
  if (m.tpl.jelly) { // sứa: chuông trong suốt có cơ quan bên trong, xúc tu dài
    for (let i = 0; i < 6; i++) { const x = -9 + i * 3.6, w = Math.sin(t * 4 + i) * 3; c.strokeStyle = i % 2 ? D.b : C.b; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, -18); c.bezierCurveTo(x + w, -10, x - w, -4, x + w * 1.3, 4 + (i % 3) * 2); c.stroke(); }
    c.save(); c.globalAlpha = 0.9;
    c.beginPath(); c.moveTo(-14, -18); c.bezierCurveTo(-15, -40, 15, -40, 14, -18); c.quadraticCurveTo(8, -14 + Math.sin(t * 4) * 1.2, 0, -17); c.quadraticCurveTo(-8, -14 - Math.sin(t * 4) * 1.2, -14, -18); c.closePath();
    fs(c, rgrad(c, -3, -32, 2, 18, C.hh, C.b), C.o, 1.3); c.restore();
    c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = D.b; c.globalAlpha = 0.5 + Math.sin(t * 6) * 0.3; c.lineWidth = 1.2; for (const x of [-8, -3, 3, 8]) { c.beginPath(); c.moveTo(x, -20); c.quadraticCurveTo(x * 0.6, -29, x * 0.3, -34); c.stroke(); } pEll(c, 0, -26, 4, 3.4); c.fillStyle = D.b; c.globalAlpha = 0.35; c.fill(); c.restore();
    bigEye(c, -4, -24, 3.2, '#201040', { closed: cl }); bigEye(c, 5, -24, 3.2, '#201040', { closed: cl }); c.strokeStyle = C.o; c.lineWidth = 1; c.beginPath(); c.arc(0.5, -20, 2.2, 0.2, 2.9); c.stroke();
    return;
  }
  const flame = id === 'flamespirit', shade = id === 'voidshade', wisp = id === 'wisp';
  c.save();
  if (flame || wisp) { // thể lửa / đốm sáng: giọt lệ có đuôi uốn
    c.globalCompositeOperation = 'lighter'; c.shadowColor = D.b; c.shadowBlur = 16;
    for (let i = 0; i < 3; i++) { const s = 1 - i * 0.22; c.globalAlpha = i === 0 ? 0.95 : 0.55; c.beginPath(); c.moveTo(0, -48 * s); c.bezierCurveTo(13 * s + Math.sin(t * 5) * 1.5, -34 * s, 16 * s, -14 * s, 0, -3); c.bezierCurveTo(-16 * s, -14 * s, -12 * s - Math.sin(t * 5) * 1.5, -34 * s, 0, -48 * s); fs(c, i === 0 ? rgrad(c, 0, -22, 2, 24, D.hh, C.b) : i === 1 ? C.hh : D.b, C.o, i === 0 ? 1.2 : 0); }
    c.restore(); c.save();
    if (flame) for (let i = 0; i < 3; i++) { const x = -7 + i * 7; pPoly(c, [x - 2.5, -44, x + Math.sin(t * 8 + i) * 1.6, -54 - i % 2 * 3, x + 2.5, -44]); c.fillStyle = D.hh; c.globalAlpha = 0.85; c.fill(); }
    c.globalAlpha = 1; bigEye(c, -4, -26, 3.8, '#301000', { closed: cl, lid: flame ? 0.4 : 0, lidFill: '#7a2a00' }); bigEye(c, 5, -26, 3.8, '#301000', { closed: cl, lid: flame ? 0.4 : 0, lidFill: '#7a2a00' });
    c.strokeStyle = '#401000'; c.lineWidth = 1.2; c.beginPath(); c.arc(0.5, -19, 3, 0.2, 2.9); c.stroke(); c.restore(); return;
  }
  // áo choàng ma: phantom (trắng xanh, tay xương) / voidshade (đen tím, khói, vuốt)
  c.shadowColor = D.b; c.shadowBlur = shade ? 10 : 8;
  c.beginPath(); c.moveTo(-12, -34); c.quadraticCurveTo(-13, -52, 0, -52); c.quadraticCurveTo(13, -52, 12, -34);
  c.quadraticCurveTo(15, -22, 14, -8); for (let i = 0; i < 5; i++) { const x = 14 - i * 6.5, w = Math.sin(t * 5 + i) * 2.2; c.quadraticCurveTo(x - 1.5 + w, -2 + (i % 2) * 3, x - 3.2, -8 - (i % 2) * 4); }
  c.quadraticCurveTo(-15, -22, -12, -34); c.closePath(); c.globalAlpha = shade ? 0.95 : 0.88; fs(c, vgrad(c, -52, -4, shade ? C.b : C.hh, shade ? '#0a0414' : C.s), C.o, 1.3); c.restore(); c.save(); c.globalAlpha = 1;
  // mũ trùm: vành tối quanh mặt
  pEll(c, 2, -37, 8.6, 9.4); fs(c, shade ? '#08020e' : '#1e2638', C.o, 1);
  for (const x of [-1.5, 6.5]) { c.save(); c.shadowColor = D.b; c.shadowBlur = 8; pEll(c, x, -38, 2.4, cl ? 0.4 : 3); c.fillStyle = shade ? D.b : '#d8f0ff'; c.fill(); c.restore(); pCirc(c, x - 0.6, -39, 0.8); c.fillStyle = '#fff'; c.fill(); }
  c.strokeStyle = shade ? D.b : '#aac4e8'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-1, -31.5); c.quadraticCurveTo(2.4, -29 + Math.sin(t * 3) * 1, 6, -31.5); c.stroke();
  // tay
  for (const sd of [-1, 1]) { const sw = Math.sin(t * 3 + sd) * 2; c.save(); c.translate(sd * 11, -26); c.rotate(sd * (0.5 + sw * 0.05)); lim(c, 0, 0, sd * 3, 9, 3.2, 2.2, shade ? { ...C, h: C.b, s: '#10061a', o: C.o } : C, 1); if (shade) for (let i = -1; i <= 1; i++) tri(c, [sd * 3 + i * 1.8 - 0.8, 10, sd * 3 + i * 2.6, 15, sd * 3 + i * 1.8 + 0.8, 10], D.b, C.o, 0.5); else for (let i = -1; i <= 1; i++) { c.strokeStyle = '#f4f0e4'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(sd * 3 + i * 1.6, 9); c.lineTo(sd * 3 + i * 2.4, 14); c.stroke(); } c.restore(); }
  if (shade) { c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 5; i++) { const q = (t * 0.5 + i / 5) % 1; c.globalAlpha = (1 - q) * 0.6; pCirc(c, Math.sin(i * 2.7 + t) * 11, -10 - q * 40, 2 + (1 - q) * 2); c.fillStyle = D.b; c.fill(); } }
  c.restore();
}

// =====================================================================
//  GOLEM / NGƯỜI CÂY / YETI
// =====================================================================
export function golem(c, m, t, C, D) {
  const id = m.tpl.id, mv = m.moving ? Math.sin(t * 8 + m.x) : 0, lg = lunge(m), bob = m.moving ? Math.abs(mv) * 1.5 : Math.sin(t * 2.2 + m.y) * 0.7, cl = blink(t, m);
  const yeti = id === 'yeti', tree = m.tpl.leaves, lava = id === 'lavagolem', obs = id === 'obsidian';
  const rock = (x, y, w, h, k = 1) => { c.beginPath(); c.moveTo(x - w * 0.5, y); c.lineTo(x - w * 0.55, y - h * 0.6); c.lineTo(x - w * 0.25, y - h); c.lineTo(x + w * 0.3, y - h * 0.97); c.lineTo(x + w * 0.55, y - h * 0.55); c.lineTo(x + w * 0.5, y); c.closePath(); fs(c, vgrad(c, y - h, y, k > 0 ? C.hh : C.h, C.s), C.o, 1.3); };
  // chân
  for (const sd of [-1, 1]) { const sw = mv * sd * 3, x = sd * 7 + sw * 0.3; if (tree) { c.strokeStyle = C.o; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, -20 + bob); c.lineTo(x + sw * 0.4, -3); c.stroke(); c.strokeStyle = C.b; c.lineWidth = 5; c.stroke(); for (const dx of [-3, 0, 3]) { c.strokeStyle = C.o; c.lineWidth = 2; c.beginPath(); c.moveTo(x + sw * 0.4, -3); c.lineTo(x + sw * 0.4 + dx * 1.6, 0); c.stroke(); } } else rock(x, 0, 11, 17 - sd * 0 + Math.max(0, sw) * 0.2, sd > 0 ? -1 : 1); }
  // thân
  c.beginPath(); c.moveTo(-14, -22 + bob); c.lineTo(-17, -38 + bob); c.lineTo(-9, -48 + bob); c.lineTo(10, -48 + bob); c.lineTo(17, -37 + bob); c.lineTo(14, -22 + bob); c.closePath();
  fs(c, vgrad(c, -48, -20, C.hh, C.s), C.o, 1.5);
  c.save(); c.clip();
  if (tree) { c.strokeStyle = C.s; c.lineWidth = 1.1; for (let i = 0; i < 6; i++) { const x = -12 + i * 5; c.beginPath(); c.moveTo(x, -48); c.bezierCurveTo(x + 3, -40, x - 3, -30, x + 1, -20); c.stroke(); } pEll(c, 4, -33, 3, 4.4); c.fillStyle = C.d; c.fill(); }
  else if (yeti) { c.fillStyle = D.hh; c.globalAlpha = 0.8; pEll(c, 0, -33, 10, 11); c.fill(); c.globalAlpha = 1; c.strokeStyle = C.s; c.lineWidth = 1; for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(-14 + i * 4.6, -46 + (i % 2) * 2); c.lineTo(-15 + i * 4.6, -40); c.stroke(); } }
  else { c.strokeStyle = C.d; c.lineWidth = 1.2; for (const [a, b, d, e] of [[-8, -46, -4, -36], [-4, -36, -9, -27], [6, -47, 3, -38], [3, -38, 9, -30]]) { c.beginPath(); c.moveTo(a, b); c.lineTo(d, e); c.stroke(); } if (lava || obs || id === 'stonegolem') { c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = D.b; c.globalAlpha = 0.55 + 0.35 * Math.sin(t * 3); c.lineWidth = 2; for (const [a, b, d, e] of [[-8, -46, -4, -36], [-4, -36, -9, -27], [6, -47, 3, -38], [3, -38, 9, -30]]) { c.beginPath(); c.moveTo(a, b); c.lineTo(d, e); c.stroke(); } pCirc(c, 0, -34, 5); c.fillStyle = D.b; c.globalAlpha = 0.5 + 0.3 * Math.sin(t * 3); c.fill(); c.restore(); } }
  c.restore();
  // tay lớn
  for (const sd of [-1, 1]) {
    const sw = mv * -sd * 3 + (sd > 0 ? lg * 5 : 0), sx = sd * 16, sy = -42 + bob;
    c.strokeStyle = C.o; c.lineCap = 'round'; c.lineWidth = yeti ? 11 : 12; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + sd * 4 + sw * 0.4, sy + 14); c.lineTo(sx + sd * 3 + sw, sy + 26); c.stroke(); c.strokeStyle = tree ? C.b : C.h; c.lineWidth = yeti ? 9 : 10; c.stroke();
    pCirc(c, sx + sd * 3 + sw, sy + 28, yeti ? 6 : 7); fs(c, vgrad(c, sy + 20, sy + 36, C.hh, C.s), C.o, 1.3);
    if (yeti) for (const dx of [-3, 0, 3]) tri(c, [sx + sd * 3 + sw + dx - 1, sy + 33, sx + sd * 3 + sw + dx, sy + 38, sx + sd * 3 + sw + dx + 1, sy + 33], '#f0f8ff', C.o, 0.6);
    if (tree) { for (const k of [-1, 0, 1]) { c.strokeStyle = C.o; c.lineWidth = 2; c.beginPath(); c.moveTo(sx + sd * 3 + sw, sy + 30); c.lineTo(sx + sd * 3 + sw + k * 4, sy + 37); c.stroke(); } pEll(c, sx + sd * 6, sy + 12, 5, 2.4, sd * 0.6); c.fillStyle = '#5a9a3a'; c.fill(); }
    // vai đá
    if (!tree && !yeti) { rock(sx + sd * 1, sy + 6, 14, 12); }
  }
  // đầu
  const hy = -50 + bob;
  if (yeti) { pEll(c, 1, hy - 4, 11.5, 10.5); fs(c, vgrad(c, hy - 14, hy + 7, C.hh, C.b), C.o, 1.3); for (let i = 0; i < 5; i++) tri(c, [-9 + i * 4.6, hy - 12, -8 + i * 4.6, hy - 17 - (i % 2) * 2, -6 + i * 4.6, hy - 12], C.hh, C.o, 0.7); pEll(c, 3, hy - 1, 8, 6.4); fs(c, '#e8f2fb', C.o, 0.8); bigEye(c, 0, hy - 5, 2.8, '#5ab0ff', { closed: cl, lid: 0.5, lidFill: C.s }); bigEye(c, 7, hy - 5, 2.8, '#5ab0ff', { closed: cl, lid: 0.5, lidFill: C.s }); pEll(c, 3.5, hy - 1.5, 2.2, 1.5); c.fillStyle = '#2a3a5a'; c.fill(); for (const x of [-1.5, 8]) tri(c, [x - 1.2, hy + 1, x, hy + 6, x + 1.2, hy + 1], '#fffdf0', C.o, 0.6); c.strokeStyle = C.o; c.lineWidth = 1; c.beginPath(); c.moveTo(0, hy + 2); c.quadraticCurveTo(4, hy + 5, 8, hy + 2); c.stroke(); }
  else if (tree) {
    pEll(c, 1, hy - 3, 11, 11); fs(c, vgrad(c, hy - 14, hy + 8, C.hh, C.s), C.o, 1.3);
    c.strokeStyle = C.s; c.lineWidth = 0.9; for (const x of [-5, 0, 5]) { c.beginPath(); c.moveTo(x, hy - 12); c.quadraticCurveTo(x + 1, hy - 4, x - 1, hy + 6); c.stroke(); }
    bigEye(c, -2, hy - 5, 3.3, '#c8e040', { closed: cl, lid: 0.45, lidFill: C.s }); bigEye(c, 6, hy - 5, 3.3, '#c8e040', { closed: cl, lid: 0.45, lidFill: C.s });
    tri(c, [1.5, hy - 3, 3.4, hy + 1.5, -0.4, hy + 1.5], C.b, C.o, 0.8); pEll(c, 2, hy + 4.4, 3.4, 1.6); c.fillStyle = '#1a0c06'; c.fill();
    for (const [x, y, r, k] of [[-10, hy - 12, 0.5, 1], [-3, hy - 17, 0, 1.15], [6, hy - 16, -0.4, 1], [12, hy - 9, -0.8, 0.8], [-13, hy - 6, 0.9, 0.8]]) { c.save(); c.translate(x, y); c.rotate(r + Math.sin(t * 2 + x) * 0.08); pEll(c, 0, -5 * k, 4.4 * k, 8 * k); fs(c, vgrad(c, -13 * k, 3 * k, '#9ad060', '#3a7a28'), '#1e4a14', 0.9); c.strokeStyle = '#2a5a1c'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(0, 2 * k); c.lineTo(0, -12 * k); c.stroke(); c.restore(); }
  } else {
    c.beginPath(); c.moveTo(-9, hy + 4); c.lineTo(-11, hy - 6); c.lineTo(-5, hy - 14); c.lineTo(8, hy - 13); c.lineTo(12, hy - 5); c.lineTo(9, hy + 4); c.closePath(); fs(c, vgrad(c, hy - 14, hy + 4, C.hh, C.s), C.o, 1.4);
    pPoly(c, [-8, hy - 6, 11, hy - 6, 11, hy - 2, -8, hy - 2]); c.fillStyle = C.d; c.globalAlpha = 0.5; c.fill(); c.globalAlpha = 1;
    for (const [x, w] of [[-3, 3], [6, 3.4]]) { c.save(); c.shadowColor = D.b; c.shadowBlur = 8; pEll(c, x, hy - 4.5, w, cl ? 0.5 : 2.4); c.fillStyle = D.b; c.fill(); c.restore(); pCirc(c, x - 0.8, hy - 5.4, 0.9); c.fillStyle = '#fff'; c.fill(); }
    c.strokeStyle = C.o; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-6, hy - 9); c.lineTo(0, hy - 7); c.moveTo(10, hy - 9); c.lineTo(4, hy - 7); c.stroke();
    c.strokeStyle = D.b; c.globalAlpha = 0.8; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-3, hy + 0.5); c.lineTo(7, hy + 0.5); c.stroke(); c.globalAlpha = 1;
    if (obs) for (const x of [-7, 0, 7]) tri(c, [x - 2.4, hy - 13, x, hy - 21 - (x === 0 ? 3 : 0), x + 2.4, hy - 13], C.hh, C.o, 0.9);
    if (lava) for (let i = 0; i < 3; i++) { const q = (t * 0.6 + i / 3) % 1; c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 1 - q; pCirc(c, -6 + i * 6, hy - 14 - q * 10, 2 * (1 - q) + 0.6); c.fillStyle = '#ffa030'; c.fill(); c.restore(); }
  }
}

// =====================================================================
//  NGƯỜI: goblin, pháp sư goblin, thủ lĩnh, xương, zombie, đạo tặc, người cá, pháp sư địa ngục, hiệp sĩ hắc ám…
// =====================================================================
const HS = {
  goblin: { head: 'goblin', cloth: '#7a5230', weapon: 'dagger', hairy: 0 },
  goblinshaman: { head: 'goblin', cloth: '#3a6a5a', weapon: 'staff', cape: '#2a5a4a', feather: 1, orb: '#60ff80' },
  goblinlord: { head: 'goblin', cloth: '#5a3a1a', weapon: 'axe', armor: 1, cape: '#7a1a14', big: 1.12 },
  skeleton: { head: 'skull', bone: 1, cloth: '#7a6a4a', weapon: 'sword', rags: 1 },
  boneking: { head: 'skull', bone: 1, cloth: '#4a1a4a', weapon: 'sceptre', cape: '#5a1a5a', armor: 1, big: 1.1 },
  zombie: { head: 'zombie', cloth: '#5a5a6a', weapon: null, reach: 1, rags: 1 },
  bandit: { head: 'bandit', cloth: '#4a3a30', weapon: 'bow', mask: '#8a2a20', hood: '#3a2a20' },
  banditking: { head: 'bandit', cloth: '#3a2a2a', weapon: 'sword', hat: 1, cape: '#6a1a1a', armor: 1, fur: 1, big: 1.1 },
  merman: { head: 'fish', cloth: '#1a5a6a', weapon: 'trident', fins: 1 },
  hellmage: { head: 'hood', cloth: '#3a0c0c', weapon: 'firestaff', horns: 1, cape: '#2a0808' },
  darkknight: { head: 'helm', cloth: '#2a2450', weapon: 'greatsword', armor: 2, cape: '#1a1236', plume: '#8a5cff', big: 1.1 },
};
export function humanoid(c, m, t, C, D) {
  const id = m.tpl.id, S = HS[id] || HS.goblin, mv = m.moving ? Math.sin(t * 11 + m.x) : 0, lg = lunge(m), bob = m.moving ? Math.abs(mv) * 1.6 : Math.sin(t * 2.6 + m.y) * 0.6, cl = blink(t, m);
  const bone = !!S.bone, skin = bone ? { ...C, h: '#f4f0e0', hh: '#fffdf4', b: '#e0dcc8', s: '#a8a28a', d: '#6a6450', o: '#3a3426' } : C;
  const cloth = tones2(S.cloth), k = S.big || 1;
  c.scale(k, k);
  // áo choàng sau lưng
  if (S.cape) { const cc = tones2(S.cape); c.beginPath(); c.moveTo(-7, -34 + bob); c.quadraticCurveTo(-19 + Math.sin(t * 3) * 2 - mv * 2, -20, -16 - mv * 3, -2); c.lineTo(-3, -4); c.lineTo(-2, -32 + bob); c.closePath(); fs(c, vgrad(c, -34, -2, cc.h, cc.d), cc.o, 1.2); }
  // tay sau
  const arm = (sd, front) => {
    const sx = sd * 8.5, sy = -33 + bob, sw = mv * -sd * 4, reach = S.reach ? 10 : 0, wl = front && S.weapon ? lg * 8 : 0;
    const ex = sx + sd * 2 + sw * 0.3 + reach * 0.5, ey = sy + 9, hx = sx + sd * 2.5 + sw + reach + wl, hy = sy + 17 - (S.reach ? 6 : 0) - wl * 0.6;
    lim(c, sx, sy, ex, ey, 3.2, 2.7, bone ? skin : (S.armor ? tones2('#7a7e8a') : cloth), 1.1);
    lim(c, ex, ey, hx, hy, 2.7, 2.3, skin, 1.1); pCirc(c, hx, hy, 3); fs(c, vgrad(c, hy - 3, hy + 3, skin.hh, skin.s), skin.o, 1);
    if (S.armor) { pEll(c, sx, sy, 5.2, 3.8); fs(c, vgrad(c, sy - 4, sy + 4, '#c8ccd8', '#5a5e6a'), '#2a2c34', 1); }
    return [hx, hy];
  };
  const hb = arm(-1, false);
  // chân
  for (const sd of [-1, 1]) {
    const sw = mv * sd * 5, hx = sd * 3.6, kx = hx + sw * 0.3, fx = hx + sw * 0.9, fy = 0;
    if (bone) { lim(c, hx, -17 + bob, kx, -9, 1.9, 1.6, skin, 1); lim(c, kx, -9, fx, fy - 2, 1.6, 1.4, skin, 1); pEll(c, fx + 1.4, fy - 1, 3.2, 1.6); fs(c, skin.b, skin.o, 0.9); }
    else { lim(c, hx, -19 + bob, kx, -10, 3.6, 3.1, S.armor ? tones2('#6a6e7a') : cloth, 1.1); lim(c, kx, -10, fx, fy - 2.5, 3.1, 2.8, S.armor ? tones2('#555966') : skin, 1.1); pEll(c, fx + 1.6, fy - 1.2, 4.4, 2.2); fs(c, tones2('#3a2a1e').h, '#1a1008', 0.9); }
  }
  // thân
  const tw = id === 'zombie' ? 1.02 : 1;
  c.beginPath(); c.moveTo(-9 * tw, -17 + bob); c.quadraticCurveTo(-11, -27, -9, -36 + bob); c.lineTo(9, -36 + bob); c.quadraticCurveTo(11, -27, 9 * tw, -17 + bob); c.closePath();
  if (bone) { fs(c, vgrad(c, -36, -17, '#3a3426', '#1a1610'), skin.o, 1.1); for (let i = 0; i < 4; i++) { c.strokeStyle = skin.hh; c.lineWidth = 1.7; c.beginPath(); c.moveTo(-6, -33 + i * 4 + bob); c.quadraticCurveTo(0, -35.5 + i * 4 + bob, 6, -33 + i * 4 + bob); c.stroke(); c.strokeStyle = skin.d; c.lineWidth = 0.6; c.stroke(); } c.strokeStyle = skin.b; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -36 + bob); c.lineTo(0, -19 + bob); c.stroke(); }
  else { fs(c, vgrad(c, -36, -17, cloth.h, cloth.d), cloth.o, 1.3); }
  if (S.armor === 2) { c.beginPath(); c.moveTo(-9, -35 + bob); c.lineTo(9, -35 + bob); c.lineTo(7, -22 + bob); c.lineTo(0, -19 + bob); c.lineTo(-7, -22 + bob); c.closePath(); fs(c, vgrad(c, -35, -19, '#9a9ab8', '#33344c'), '#14141e', 1.3); c.strokeStyle = D.b; c.lineWidth = 1.4; c.beginPath(); c.moveTo(0, -35 + bob); c.lineTo(0, -21 + bob); c.stroke(); }
  else if (S.armor) { pRR(c, -7, -34 + bob, 14, 12, 3); fs(c, vgrad(c, -34, -22, '#c8c8d8', '#5a5a6a'), '#2a2a34', 1.1); }
  if (S.rags) { for (const [x, y] of [[-8, -20], [-3, -19], [4, -20]]) tri(c, [x - 2, y + bob, x, y + 6 + bob, x + 2.4, y + bob], cloth.b, cloth.o, 0.7); }
  c.fillStyle = tones2('#2a1a0e').b; c.fillRect(-9, -22 + bob, 18, 3); pRR(c, -2, -22.5 + bob, 4, 4, 1); fs(c, '#d8b040', '#6a4a10', 0.7);
  if (S.fur) { for (let i = 0; i < 7; i++) tri(c, [-9 + i * 2.8, -36 + bob, -8 + i * 2.8, -41 + bob, -6.4 + i * 2.8, -36 + bob], '#d8cbb0', '#5a4a38', 0.7); }
  // đầu
  const hy = -45 + bob;
  c.save(); c.translate(1, hy); c.rotate(Math.sin(t * 2.2 + m.x) * 0.03);
  const H = S.head;
  if (S.hood || H === 'hood' || H === 'bandit' && S.hood) { /* vẽ sau */ }
  if (H === 'goblin') {
    for (const sd of [-1, 1]) { c.save(); c.scale(sd, 1); tri(c, [9, -3, 22 + Math.sin(t * 5) * 1, -7, 10, 4], C.b, C.o, 1.1); tri(c, [10.5, -2, 18, -5.4, 11, 2.4], D.hh, 'rgba(0,0,0,0)', 0); c.restore(); }
    pEll(c, 0, 0, 11, 10); fs(c, vgrad(c, -10, 10, C.hh, C.b), C.o, 1.4);
    bigEye(c, -4, -2, 3.8, '#e8c820', { closed: cl, lid: 0.6, lidFill: C.s, slit: true }); bigEye(c, 5.4, -2, 3.8, '#e8c820', { closed: cl, lid: 0.6, lidFill: C.s, slit: true });
    c.strokeStyle = C.o; c.lineWidth = 1.7; c.beginPath(); c.moveTo(-8, -8); c.lineTo(-1.5, -4.5); c.moveTo(11, -8); c.lineTo(3, -4.5); c.stroke();
    tri(c, [0.5, -1, 4.6, 3.8, -1.4, 3.8], C.hh, C.o, 0.9); pEll(c, 1.6, 7, 5, 2.2); fs(c, '#4a1a1a', C.o, 0.9); fang(c, -1.4, 5.8, 0.8); fang(c, 4.6, 5.8, 0.8);
  } else if (H === 'skull') {
    pEll(c, 0, -1, 10.5, 9.4); fs(c, vgrad(c, -10, 8, skin.hh, skin.b), skin.o, 1.4);
    pEll(c, 0, 8, 7.6 + (lg > 0 ? 1 : 0), 3.4 + (lg > 0 ? 2.4 : Math.max(0, Math.sin(t * 3 + m.x)) * 0.8)); fs(c, skin.b, skin.o, 1.1); for (let i = -2; i <= 2; i++) { c.fillStyle = skin.hh; c.fillRect(i * 2.8 - 0.9, 5.2, 1.8, 3); }
    for (const x of [-4, 4.6]) { pEll(c, x, -2, 3.4, 3.8); c.fillStyle = '#10080c'; c.fill(); c.save(); c.shadowColor = '#ff3030'; c.shadowBlur = 7; pCirc(c, x + 0.5, -1.6, cl ? 0.3 : 1.5); c.fillStyle = '#ff5040'; c.fill(); c.restore(); }
    tri(c, [0.4, 2.4, 2.2, 5.6, -1.4, 5.6], '#10080c', 'rgba(0,0,0,0)', 0); c.strokeStyle = skin.d; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-6, -8); c.lineTo(-3, -4); c.lineTo(-5, -1); c.stroke();
  } else if (H === 'zombie') {
    pEll(c, 0, 0, 10.4, 9.8); fs(c, vgrad(c, -10, 10, C.hh, C.s), C.o, 1.4);
    pEll(c, -4, -2, 3.6, 3.4); fs(c, '#e8f0d0', C.o, 0.9); pCirc(c, -3.4, -1.6, 1.1); c.fillStyle = '#601010'; c.fill(); pEll(c, 5.6, -2.4, 2.6, 2.6); fs(c, '#e0e8c8', C.o, 0.9); pCirc(c, 5.8, -2, 0.9); c.fillStyle = '#601010'; c.fill();
    c.strokeStyle = '#3a2a18'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-8, -7); c.lineTo(-1, -5.4); c.moveTo(9, -8); c.lineTo(3, -5.4); c.stroke();
    pEll(c, 1, 6.2, 5, 2.8 + Math.max(0, Math.sin(t * 3)) * 0.8); fs(c, '#2a0a10', C.o, 0.9); for (const x of [-2.4, 0, 2.4]) { c.fillStyle = '#d8d0a0'; c.fillRect(x + 0.6, 3.8, 1.6, 2); }
    c.strokeStyle = '#2a1a10'; c.lineWidth = 1; for (const x of [-7, -4.6, -2.2]) { c.beginPath(); c.moveTo(x, -9.6); c.lineTo(x + 0.6, -5.4); c.stroke(); } tri(c, [-9, -6, -3, -9, -6, -2], '#c8c0a8', '#4a4030', 0.7);
    for (let i = 0; i < 4; i++) tri(c, [-8 + i * 3.4, -9, -7 + i * 3.4, -13, -5.4 + i * 3.4, -9], '#3a4a2a', C.o, 0.6);
  } else if (H === 'bandit') {
    pEll(c, 0, 0, 10, 9.2); fs(c, vgrad(c, -10, 9, '#f2c8a0', '#c8946a'), '#5a3a22', 1.3);
    bigEye(c, -3.6, -1.4, 3, '#2a1a10', { closed: cl, lid: 0.5, lidFill: '#8a5a38' }); bigEye(c, 5, -1.6, 3, '#2a1a10', { closed: cl, lid: 0.5, lidFill: '#8a5a38' });
    c.strokeStyle = '#3a2410'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-7, -6) ; c.lineTo(-1.5, -4.2); c.moveTo(9, -6.4); c.lineTo(3, -4.4); c.stroke();
    if (S.mask) { c.beginPath(); c.moveTo(-9.6, 1.6); c.quadraticCurveTo(0, 8, 9.6, 1.6); c.lineTo(9, 7); c.quadraticCurveTo(0, 13, -9, 7); c.closePath(); fs(c, tones2(S.mask).h, tones2(S.mask).o, 1); }
    else { c.strokeStyle = '#6a3a22'; c.lineWidth = 1.1; c.beginPath(); c.arc(1, 5.4, 2.6, 0.2, Math.PI - 0.2); c.stroke(); }
    tri(c, [0.4, 0, 3.6, 3.6, -1.6, 3.6], '#e0aa80', '#5a3a22', 0.7);
    if (S.hat) { pEll(c, 0, -8, 15, 3.6); fs(c, '#4a2a1a', '#1a0e08', 1.1); c.beginPath(); c.moveTo(-9, -8); c.quadraticCurveTo(-8, -20, 0, -20); c.quadraticCurveTo(8, -20, 9, -8); c.closePath(); fs(c, vgrad(c, -20, -8, '#6a3a22', '#3a1e12'), '#1a0e08', 1.2); crown(c, 0, -17, 0.8); c.strokeStyle = '#c8a040'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-9, -9.5); c.lineTo(9, -9.5); c.stroke(); }
    else { c.beginPath(); c.moveTo(-11, 0); c.quadraticCurveTo(-12, -13, 0, -13); c.quadraticCurveTo(12, -13, 11, 0); c.quadraticCurveTo(7, -7, 0, -7.4); c.quadraticCurveTo(-7, -7, -11, 0); c.closePath(); fs(c, vgrad(c, -13, 0, tones2(S.hood).h, tones2(S.hood).d), tones2(S.hood).o, 1.2); tri(c, [10, -2, 17, 5 + Math.sin(t * 5), 8, 3], tones2(S.hood).b, tones2(S.hood).o, 0.9); }
  } else if (H === 'fish') {
    for (const sd of [-1, 1]) { c.save(); c.scale(sd, 1); c.beginPath(); c.moveTo(9, -2); c.quadraticCurveTo(17, -9, 19, -2); c.quadraticCurveTo(17, 2, 10, 3); c.closePath(); fs(c, D.b, C.o, 1); c.strokeStyle = D.hh; c.lineWidth = 0.7; for (const dy of [-5, -3.4, -1.8]) { c.beginPath(); c.moveTo(10, dy * 0.4); c.lineTo(17, dy); c.stroke(); } c.restore(); }
    for (let i = 0; i < 4; i++) tri(c, [-5 + i * 3.4, -9, -3.6 + i * 3.4, -17 + (i === 1 || i === 2 ? -3 : 0), -2 + i * 3.4, -9], D.b, C.o, 0.9);
    pEll(c, 0, 0, 10.4, 9.6); fs(c, vgrad(c, -10, 10, C.hh, C.b), C.o, 1.3);
    c.save(); pEll(c, 0, 0, 10.4, 9.6); c.clip(); c.fillStyle = C.s; c.globalAlpha = 0.35; for (const [x, y] of [[-6, 4], [-2, 6], [3, 5], [7, 3], [-7, -4], [8, -6]]) { pCirc(c, x, y, 2); c.fill(); } c.restore();
    bigEye(c, -3.8, -2, 4, '#e8e020', { closed: cl, slit: true, look: 0.7 }); bigEye(c, 5.6, -2, 4, '#e8e020', { closed: cl, slit: true, look: 0.7 });
    pEll(c, 1.4, 5.6, 5.4, 2.4); fs(c, '#1a4a50', C.o, 0.9); for (const x of [-1.6, 3.2]) fang(c, x, 4.6, 0.5);
  } else if (H === 'hood') {
    for (const sd of [-1, 1]) { c.save(); c.scale(sd, 1); c.beginPath(); c.moveTo(4, -9); c.quadraticCurveTo(14, -12, 16, -22); c.quadraticCurveTo(9, -16, 2, -13); c.closePath(); fs(c, '#2a0808', '#0e0202', 1); c.restore(); }
    c.beginPath(); c.moveTo(-11, 5); c.quadraticCurveTo(-13, -13, 0, -14); c.quadraticCurveTo(13, -13, 11, 5); c.quadraticCurveTo(0, 3, -11, 5); c.closePath(); fs(c, vgrad(c, -14, 5, cloth.h, cloth.d), cloth.o, 1.3);
    pEll(c, 0, 0, 7.6, 7); fs(c, '#0a0204', '#1a0406', 0.8);
    for (const x of [-3.2, 4]) { c.save(); c.shadowColor = '#ffa020'; c.shadowBlur = 8; pEll(c, x, -1, 2.2, cl ? 0.4 : 2.8); c.fillStyle = '#ffb030'; c.fill(); c.restore(); pCirc(c, x - 0.6, -2, 0.7); c.fillStyle = '#fff'; c.fill(); }
    c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3; i++) { const q = (t * 0.7 + i / 3) % 1; c.globalAlpha = 1 - q; pPoly(c, [-4 + i * 4, -13, -3 + i * 4 + Math.sin(t * 6 + i), -19 - q * 5, -2 + i * 4, -13]); c.fillStyle = '#ff8a20'; c.fill(); } c.restore();
  } else if (H === 'helm') {
    c.beginPath(); c.moveTo(-10, 5); c.quadraticCurveTo(-12, -12, 0, -13); c.quadraticCurveTo(12, -12, 10, 5); c.lineTo(5, 9); c.lineTo(-5, 9); c.closePath(); fs(c, vgrad(c, -13, 9, '#9a9ab8', '#2a2a42'), '#10101c', 1.5);
    pPoly(c, [-8, -3, 9, -3, 8, 1.4, -7, 1.4]); c.fillStyle = '#08060e'; c.fill(); c.save(); c.shadowColor = D.b; c.shadowBlur = 9; c.fillStyle = D.b; c.globalAlpha = 0.9; c.fillRect(-6.4, -2.2, 6, 2); c.fillRect(1.4, -2.2, 6.6, 2); c.restore();
    c.strokeStyle = '#4a4a68'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, -13); c.lineTo(0, -3); c.moveTo(-5, 3); c.lineTo(-5, 8); c.moveTo(0, 3); c.lineTo(0, 9); c.moveTo(5, 3); c.lineTo(5, 8); c.stroke();
    for (const sd of [-1, 1]) { c.save(); c.scale(sd, 1); c.beginPath(); c.moveTo(8, -8); c.quadraticCurveTo(16, -12, 15, -22); c.quadraticCurveTo(11, -14, 6, -11); c.closePath(); fs(c, '#c8c8d8', '#20202c', 0.9); c.restore(); }
    c.beginPath(); c.moveTo(0, -13); c.bezierCurveTo(-4 - Math.sin(t * 4) * 2, -22, -14, -20 - Math.sin(t * 4) * 2, -18, -10); c.bezierCurveTo(-10, -14, -4, -12, 0, -13); fs(c, S.plume, '#2a1a5a', 1);
  }
  c.restore();
  if (S.crown && H !== 'bandit') crown(c, 1, hy - 11, 0.9);
  if (S.crown2 || m.tpl.crown && (H === 'goblin' || H === 'skull')) crown(c, 1, hy - (H === 'skull' ? 10 : 11), 0.9);
  if (S.horns) { /* sừng đã vẽ ở mũ trùm */ }
  // tay trước + vũ khí
  const hf = arm(1, true), [wx, wy] = hf, sw2 = lg * 0.9;
  c.save(); c.translate(wx, wy); c.rotate(-0.3 - sw2);
  const W = S.weapon, tc = tones2;
  if (W === 'dagger') { pRR(c, -1.2, -2, 2.4, 5, 1); fs(c, '#4a2a1a', '#1a0e08', 0.7); pRR(c, -3.4, -3.4, 6.8, 1.8, 0.8); fs(c, '#a08040', '#3a2a10', 0.6); tri(c, [-1.8, -3.4, 0, -15, 1.8, -3.4], '#e0e6f0', '#3a4050', 0.8); c.strokeStyle = '#fff'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(-0.4, -4); c.lineTo(-0.2, -13); c.stroke(); }
  else if (W === 'staff') { pRR(c, -1, -24, 2.2, 34, 1); fs(c, '#6a4a2a', '#2a1a0a', 0.8); c.save(); c.shadowColor = S.orb; c.shadowBlur = 10; pCirc(c, 0, -27, 4.4); fs(c, rgrad(c, -1, -28, 0.5, 5, '#ffffff', S.orb), '#10401a', 0.9); c.restore(); for (const sd of [-1, 1]) tri(c, [sd * 1, -24, sd * 5, -30, sd * 2, -22], '#6a4a2a', '#2a1a0a', 0.6); }
  else if (W === 'firestaff') { pRR(c, -1, -24, 2.2, 34, 1); fs(c, '#3a1a1a', '#10080a', 0.8); c.save(); c.globalCompositeOperation = 'lighter'; c.shadowColor = '#ff7a20'; c.shadowBlur = 12; for (let i = 0; i < 3; i++) { pPoly(c, [-4 + i * 4, -25, -3 + i * 4 + Math.sin(t * 8 + i) * 1.4, -35 - (i === 1 ? 4 : 0), -2 + i * 4, -25]); c.fillStyle = i === 1 ? '#ffe080' : '#ff7a20'; c.fill(); } c.restore(); }
  else if (W === 'axe') { pRR(c, -1.4, -20, 2.8, 30, 1); fs(c, '#5a3a1a', '#1e1208', 0.8); c.beginPath(); c.moveTo(1, -19); c.quadraticCurveTo(13, -23, 12, -8); c.quadraticCurveTo(6, -9, 1, -9); c.closePath(); fs(c, vgrad(c, -23, -8, '#e0e4ee', '#6a6e7c'), '#2a2c36', 1); tri(c, [-1, -20, -6, -23, -1, -15], '#c0c4d0', '#2a2c36', 0.8); }
  else if (W === 'sword') { pRR(c, -1, -1, 2, 5, 0.8); fs(c, '#4a3a2a', '#1a1208', 0.6); pRR(c, -4, -3, 8, 2, 0.8); fs(c, '#a08a50', '#3a3010', 0.6); c.beginPath(); c.moveTo(-1.8, -3); c.lineTo(-1.4, -22); c.lineTo(0, -26); c.lineTo(1.4, -22); c.lineTo(1.8, -3); c.closePath(); fs(c, vgrad(c, -26, -3, '#e8ecf2', '#8a909c'), '#3a3e4a', 0.9); }
  else if (W === 'greatsword') { pRR(c, -1.4, -2, 2.8, 8, 1); fs(c, '#2a1a3a', '#0a0612', 0.6); pRR(c, -6, -4.6, 12, 2.6, 1); fs(c, '#5a5a78', '#14141e', 0.8); c.beginPath(); c.moveTo(-3, -4.6); c.lineTo(-2.6, -32); c.lineTo(0, -38); c.lineTo(2.6, -32); c.lineTo(3, -4.6); c.closePath(); fs(c, vgrad(c, -38, -4.6, '#d8d8f0', '#4a4a68'), '#14141e', 1); c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = D.b; c.globalAlpha = 0.6 + 0.3 * Math.sin(t * 4); c.lineWidth = 1.3; c.beginPath(); c.moveTo(0, -8); c.lineTo(0, -32); c.stroke(); c.restore(); }
  else if (W === 'sceptre') { pRR(c, -1, -22, 2.2, 32, 1); fs(c, '#d8c060', '#5a4a10', 0.8); c.save(); c.shadowColor = '#c060ff'; c.shadowBlur = 9; pCirc(c, 0, -25, 4.6); fs(c, rgrad(c, -1, -26, 0.5, 5, '#fff', '#a040ff'), '#2a1050', 0.9); c.restore(); pEll(c, 0, -27.5, 0.9, 0.9); }
  else if (W === 'trident') { pRR(c, -1, -22, 2.2, 34, 1); fs(c, '#8a9aa0', '#2a3438', 0.7); for (const x of [-4.6, 0, 4.6]) { c.beginPath(); c.moveTo(x - 1, -22 + (x ? 0 : -3)); c.lineTo(x, -33 - (x ? 0 : 3)); c.lineTo(x + 1, -22 + (x ? 0 : -3)); c.closePath(); fs(c, '#e8f4f8', '#2a3438', 0.8); } c.strokeStyle = '#8a9aa0'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-4.6, -22); c.quadraticCurveTo(0, -17, 4.6, -22); c.stroke(); }
  else if (W === 'bow') { c.strokeStyle = '#3a2410'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(3, -17); c.quadraticCurveTo(14, 0, 3, 17); c.stroke(); c.strokeStyle = '#8a5a30'; c.lineWidth = 1.2; c.stroke(); c.strokeStyle = '#e8e0c8'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(3, -17); c.lineTo(3, 17); c.stroke(); }
  c.restore();
  if (S.feather) { c.save(); c.translate(1 + 2, hy - 8); for (let i = 0; i < 3; i++) { pEll(c, -4 + i * 4, -8 - (i === 1 ? 3 : 0), 1.6, 6); fs(c, ['#e8504a', '#e8c040', '#40c8e8'][i], '#2a1a10', 0.6); } c.restore(); }
}
function tones2(hex) { return tones(hex); }

// =====================================================================
//  CÓ CÁNH: ong, dơi, kền kền, tiên băng, quỷ lửa, thiên thần sa ngã
// =====================================================================
function batWing(c, sd, flap, C, D, len = 26, bones = 4) {
  c.save(); c.scale(sd, 1); c.rotate(-0.25 - flap * 0.55);
  c.beginPath(); c.moveTo(0, 0); c.lineTo(-len * 0.35, -len * 0.55); const tips = [];
  for (let i = 0; i < bones; i++) { const a = -2.3 + (i / (bones - 1)) * 1.9; tips.push([Math.cos(a) * len, Math.sin(a) * len * 0.8 - 2]); }
  tips.forEach(([x, y], i) => { c.quadraticCurveTo((x + (i ? tips[i - 1][0] : -len * 0.35)) / 2 - 1, (y + (i ? tips[i - 1][1] : -len * 0.55)) / 2 + 5, x, y); });
  c.quadraticCurveTo(-len * 0.3, 3, 0, 3); c.closePath(); fs(c, vgrad(c, -len, 4, D.h, D.d), C.o, 1.2);
  c.strokeStyle = C.o; c.lineWidth = 1.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.lineTo(-len * 0.35, -len * 0.55); for (const [x, y] of tips) { c.moveTo(-len * 0.35, -len * 0.55); c.lineTo(x, y); } c.stroke();
  c.restore();
}
export function winged(c, m, t, C, D) {
  const id = m.tpl.id, flap = Math.sin(t * (id === 'hornet' ? 38 : 12) + m.x), hv = -12 + Math.sin(t * 3 + m.x) * 2.5, cl = blink(t, m), lg = lunge(m);
  c.translate(lg * 3, hv);
  if (id === 'hornet') { // ong bắp cày: bụng sọc, cánh trong suốt, ngòi, mắt kép
    c.save(); c.globalAlpha = 0.6; for (const [sx, rr] of [[-1, 0], [1, 0.3]]) { c.save(); c.translate(-2, -17); c.rotate(-0.9 - flap * 0.5 + sx * 0.3 + rr); pEll(c, -9, 0, 11, 4.8); fs(c, 'rgba(235,245,255,.75)', C.o, 0.9); c.restore(); } c.restore();
    pEll(c, -9, -10, 10, 6.6); fs(c, vgrad(c, -16, -3, C.hh, C.b), C.o, 1.3); c.save(); pEll(c, -9, -10, 10, 6.6); c.clip(); c.fillStyle = D.b; for (const x of [-14, -8, -2]) c.fillRect(x, -17, 3.4, 14); c.restore();
    tri(c, [-18.5, -11.4, -26, -8.5, -18.5, -8.4], D.b, C.o, 1); pEll(c, 0, -11, 6.4, 5.6); fs(c, vgrad(c, -16, -5, C.hh, C.b), C.o, 1.2);
    for (let i = 0; i < 3; i++) { c.strokeStyle = C.o; c.lineWidth = 1.3; c.beginPath(); c.moveTo(-1 + i * 2.4, -6); c.lineTo(-2 + i * 3.4, -1 + Math.sin(t * 10 + i)); c.stroke(); }
    pEll(c, 8, -12, 5.6, 5.4); fs(c, vgrad(c, -18, -6, C.hh, C.b), C.o, 1.2);
    pEll(c, 10, -13, 3.8, 3.8); c.fillStyle = '#d02820'; c.fill(); c.strokeStyle = C.o; c.lineWidth = 0.9; c.stroke(); pCirc(c, 9, -14, 1.2); c.fillStyle = '#fff'; c.fill(); c.strokeStyle = C.o; c.lineWidth = 1.2; c.beginPath(); c.moveTo(6, -18); c.quadraticCurveTo(7, -22, 11, -23); c.stroke(); fang(c, 12, -9.4, 0.5);
    return;
  }
  if (id === 'vulture' || m.tpl.bird) { // kền kền: cổ trụi, mỏ quặp, cánh to xoè
    for (const sd of [-1, 1]) { c.save(); c.translate(sd * 2, -15); c.rotate(sd * (0.6 + flap * 0.45) - (sd < 0 ? 0 : 0)); for (let i = 0; i < 6; i++) { c.save(); c.rotate(sd * (-0.2 - i * 0.14)); pEll(c, sd * (-8 - i * 0.5), 0, 11 - i * 0.4, 3.6); fs(c, vgrad(c, -4, 4, i % 2 ? C.h : C.hh, C.s), C.o, 0.9); c.restore(); } c.restore(); }
    pEll(c, -3, -13, 9, 7.6); fs(c, vgrad(c, -20, -6, C.hh, C.s), C.o, 1.3); for (const x of [-8, -5, -2]) { c.strokeStyle = C.s; c.lineWidth = 1; c.beginPath(); c.moveTo(x, -17); c.quadraticCurveTo(x + 1, -13, x - 1, -9); c.stroke(); }
    pPoly(c, [-11, -11, -20, -7, -9, -8]); fs(c, C.b, C.o, 1); for (let i = 0; i < 6; i++) tri(c, [4 + i * 1.6, -19, 5.4 + i * 1.6, -24, 6.8 + i * 1.6, -19], '#f0e8d8', C.o, 0.5); pEll(c, 4, -21, 6.6, 3.4); fs(c, '#f0e8d8', C.o, 1);
    pEll(c, 9, -24, 4.6, 5.2); fs(c, vgrad(c, -29, -19, D.hh, D.b), C.o, 1.1); c.beginPath(); c.moveTo(11, -25); c.quadraticCurveTo(20, -26, 19, -19); c.quadraticCurveTo(15, -22, 12, -21.6); c.closePath(); fs(c, '#f0c050', '#6a4a10', 0.9);
    bigEye(c, 10, -26, 2.2, '#c02818', { closed: cl, lid: 0.6, lidFill: D.b }); pEll(c, 4, -17, 2.6, 4); c.fillStyle = 'rgba(0,0,0,0)'; return;
  }
  if (id === 'icefairy') { // tiên băng: cô bé nhỏ, cánh tinh thể, đũa phép
    for (const sd of [-1, 1]) { c.save(); c.translate(-2, -21); c.rotate(sd * (0.4 + flap * 0.3)); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(sd * 14, -16, sd * 22, -6); c.quadraticCurveTo(sd * 18, 4, 0, 2); c.closePath(); c.save(); c.globalAlpha = 0.8; fs(c, vgrad(c, -12, 4, '#f4fcff', C.b), C.o, 1); c.restore(); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(0, 0); c.lineTo(sd * 20, -6); c.moveTo(0, 0); c.lineTo(sd * 13, -10); c.stroke(); c.restore(); }
    c.beginPath(); c.moveTo(-5, -9); c.lineTo(-7, -2); c.lineTo(7, -2); c.lineTo(5, -9); c.closePath(); fs(c, vgrad(c, -9, -2, D.hh, C.b), C.o, 1.1); for (const x of [-5, -1.6, 1.8, 5]) tri(c, [x - 1.6, -2.4, x, 1.4, x + 1.6, -2.4], D.hh, C.o, 0.6);
    pRR(c, -3.4, -18, 6.8, 9.6, 2); fs(c, vgrad(c, -18, -8, D.hh, C.b), C.o, 1.1);
    for (const sd of [-1, 1]) lim(c, sd * 4, -16, sd * 8 + (sd > 0 ? 6 : 0), -11 + (sd > 0 ? -5 : 2), 1.6, 1.4, { ...C, h: '#fde0d0', s: '#e0b8a8' }, 0.9);
    pCirc(c, 0, -26, 8.6); fs(c, vgrad(c, -35, -17, '#fff0e4', '#e8c8b8'), '#8a6a60', 1.2);
    c.beginPath(); c.moveTo(-9, -24); c.quadraticCurveTo(-11, -37, 0, -36); c.quadraticCurveTo(11, -37, 9, -24); c.quadraticCurveTo(7, -31, 0, -30); c.quadraticCurveTo(-6, -31, -9, -24); c.closePath(); fs(c, vgrad(c, -37, -24, '#dff6ff', C.b), C.o, 1.1);
    for (const sd of [-1, 1]) tri(c, [sd * 7, -33, sd * 11, -42, sd * 3, -35], '#e8fbff', C.o, 0.8);
    bigEye(c, -3, -26, 2.8, '#3a8ad8', { closed: cl }); bigEye(c, 4, -26, 2.8, '#3a8ad8', { closed: cl }); pEll(c, 0.6, -21.4, 1.6, 0.9); c.fillStyle = '#e07080'; c.fill();
    c.save(); c.translate(12, -16); c.rotate(-0.4 - lg); c.strokeStyle = '#8a6a40'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(0, 4); c.lineTo(0, -9); c.stroke(); c.save(); c.shadowColor = '#bff0ff'; c.shadowBlur = 8; pPoly(c, [0, -16, 3, -11, 0, -6, -3, -11]); fs(c, '#e8fbff', '#3a8ab8', 0.8); c.restore(); c.restore();
    return;
  }
  if (id === 'bat') { // dơi: tai to, cánh có xương, răng nanh
    batWing(c, -1, flap, C, D, 24, 4); batWing(c, 1, flap, C, D, 24, 4);
    pEll(c, 0, -14, 8, 8.6); fs(c, vgrad(c, -23, -6, C.hh, C.s), C.o, 1.3);
    for (const sd of [-1, 1]) { c.save(); c.scale(sd, 1); tri(c, [3, -20, 8, -31, 8.6, -19], C.b, C.o, 1.1); tri(c, [4.6, -20, 7.6, -27, 8, -20], '#e07880', 'rgba(0,0,0,0)', 0); c.restore(); }
    pEll(c, 2, -9.6, 4.6, 3.4); fs(c, D.hh, C.o, 0.9); pCirc(c, 3.6, -10.4, 0.8); c.fillStyle = '#1a0a0a'; c.fill();
    bigEye(c, -2.4, -15, 3, '#ffd040', { closed: cl, lid: 0.55, lidFill: C.s }); bigEye(c, 5, -15, 3, '#ffd040', { closed: cl, lid: 0.55, lidFill: C.s });
    pEll(c, 1.4, -7, 3, 1.4); c.fillStyle = '#2a0808'; c.fill(); fang(c, -0.6, -7.2, 0.7); fang(c, 3.4, -7.2, 0.7);
    return;
  }
  // quỷ lửa / thiên thần sa ngã: thân người nhỏ + cánh dơi / cánh lông
  const angel = !!m.tpl.halo;
  if (angel) for (const sd of [-1, 1]) { c.save(); c.translate(-2, -22); c.rotate(sd * (0.55 + flap * 0.28)); for (let i = 0; i < 6; i++) { c.save(); c.rotate(sd * (-0.15 - i * 0.2)); pEll(c, sd * (-12 - i * 0.7), 0, 15 - i * 0.7, 4.4); fs(c, vgrad(c, -5, 5, i % 2 ? C.hh : C.h, C.s), C.o, 0.9); c.restore(); } c.restore(); }
  else { c.save(); c.translate(-2, -22); batWing(c, -1, flap, C, D, 27, 4); batWing(c, 1, flap, C, D, 27, 4); c.restore(); }
  if (!angel) { c.strokeStyle = C.o; c.lineWidth = 3.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(-3, -9); c.bezierCurveTo(-14, -4, -16 + Math.sin(t * 5) * 3, -16, -11, -19); c.stroke(); c.strokeStyle = C.b; c.lineWidth = 2; c.stroke(); tri(c, [-15, -21, -9, -17, -14, -14], D.b, C.o, 0.9); }
  pRR(c, -6, -22, 12, 15, 4); fs(c, vgrad(c, -22, -7, C.hh, C.s), C.o, 1.3);
  if (angel) { pRR(c, -6, -22, 12, 7, 3); fs(c, vgrad(c, -22, -15, '#f4f0ff', '#8a80b8'), C.o, 1); }
  for (const sd of [-1, 1]) { lim(c, sd * 6, -20, sd * 9 + (sd > 0 ? 3 + lg * 6 : 0), -13, 2.4, 2, C, 0.9); pCirc(c, sd * 9 + (sd > 0 ? 3 + lg * 6 : 0), -12, 2.4); fs(c, C.hh, C.o, 0.8); }
  for (const sd of [-1, 1]) { lim(c, sd * 3, -8, sd * 3.6, -2, 2.4, 2.1, C, 0.9); pEll(c, sd * 3.6 + 1, -1, 3.2, 1.6); fs(c, C.s, C.o, 0.8); }
  pCirc(c, 0, -29, 9.6); fs(c, vgrad(c, -39, -19, C.hh, C.b), C.o, 1.4);
  if (angel) { c.beginPath(); c.moveTo(-9.6, -29); c.quadraticCurveTo(-11, -41, 0, -40); c.quadraticCurveTo(11, -41, 9.6, -29); c.quadraticCurveTo(7, -35, 0, -34); c.quadraticCurveTo(-7, -35, -9.6, -29); c.closePath(); fs(c, vgrad(c, -41, -29, '#e8e0ff', '#6a60a0'), C.o, 1); c.save(); c.strokeStyle = '#d8c8ff'; c.lineWidth = 2; c.shadowColor = '#c0a8ff'; c.shadowBlur = 8; c.beginPath(); c.ellipse(0, -45, 8, 2.8, 0, 0.3, TAU - 0.9); c.stroke(); c.restore(); }
  else for (const sd of [-1, 1]) { c.save(); c.scale(sd, 1); c.beginPath(); c.moveTo(4, -36); c.quadraticCurveTo(12, -40, 11, -50); c.quadraticCurveTo(7, -43, 2, -39); c.closePath(); fs(c, vgrad(c, -50, -36, '#fff0c0', '#c07020'), C.o, 1); c.restore(); }
  bigEye(c, -3.2, -29, 3.2, angel ? '#a080e8' : '#ffd030', { closed: cl, lid: angel ? 0.25 : 0.55, lidFill: C.s }); bigEye(c, 4.6, -29, 3.2, angel ? '#a080e8' : '#ffd030', { closed: cl, lid: angel ? 0.25 : 0.55, lidFill: C.s });
  if (angel) { c.strokeStyle = '#3a2a5a'; c.lineWidth = 1; c.beginPath(); c.arc(0.6, -22.4, 2, 0.3, 2.8); c.stroke(); }
  else { pEll(c, 0.8, -22, 3.2, 1.6 + lg * 1.6); fs(c, '#2a0808', C.o, 0.8); fang(c, -0.8, -22.6, 0.6); fang(c, 2.4, -22.6, 0.6); }
}

// =====================================================================
//  RỒNG: băng, lửa, ma vương, Azoth
// =====================================================================
export function dragon(c, m, t, C, D) {
  const id = m.tpl.id, mv = m.moving ? Math.sin(t * 9 + m.x) : 0, lg = lunge(m), bob = m.moving ? Math.abs(mv) * 2 : Math.sin(t * 2.4 + m.y) * 1, flap = Math.sin(t * 5 + m.x), cl = blink(t, m);
  const ice = id === 'icedragon', fire = id === 'firedragon', demon = id === 'demonlord', azo = id === 'azoth';
  // đuôi dài có gai ở chóp
  c.lineCap = 'round'; const sw = Math.sin(t * 3) * 4;
  c.strokeStyle = C.o; c.lineWidth = 12; c.beginPath(); c.moveTo(-14, -20 + bob); c.bezierCurveTo(-26, -14, -32, -24 + sw, -42, -18 + sw * 1.4); c.stroke(); c.strokeStyle = C.b; c.lineWidth = 9.4; c.stroke();
  tri(c, [-39, -26 + sw * 1.4, -50, -18 + sw * 1.4, -39, -12 + sw * 1.4], D.b, C.o, 1.1);
  // cánh sau
  c.save(); c.translate(-4, -36 + bob); batWing(c, -1, flap, C, D, 36, 4); c.restore();
  // chân sau
  for (const sd of [0, 1]) { const x = sd ? -8 : -14, sw2 = mv * (sd ? 1 : -1) * 3; lim(c, x, -16 + bob, x + sw2 * 0.4, -8, 6.4, 4.4, sd ? C : { ...C, h: C.s, s: C.d }, 1.2); pEll(c, x + sw2 + 2, -2, 6, 2.8); fs(c, C.s, C.o, 1); for (const dx of [0, 2.4, 4.8]) tri(c, [x + sw2 + 2.6 + dx - 1, -2, x + sw2 + 4 + dx, 1.4, x + sw2 + 5 + dx, -2], '#f4f0e0', C.o, 0.5); }
  // thân
  pEll(c, -3, -24 + bob, 17, 13); fs(c, vgrad(c, -37, -11, C.hh, C.s), C.o, 1.5);
  c.save(); pEll(c, -3, -24 + bob, 17, 13); c.clip(); pEll(c, 2, -15 + bob, 14, 8); c.fillStyle = D.hh; c.globalAlpha = 0.65; c.fill(); c.globalAlpha = 1; c.strokeStyle = D.b; c.lineWidth = 0.9; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-10, -20 + i * 2.2 + bob); c.quadraticCurveTo(0, -17 + i * 2.2 + bob, 11, -20 + i * 2.2 + bob); c.stroke(); } if (fire || demon || azo) { c.globalCompositeOperation = 'lighter'; pEll(c, 2, -19 + bob, 10, 7); c.fillStyle = D.b; c.globalAlpha = 0.28 + 0.12 * Math.sin(t * 3); c.fill(); } c.restore();
  // gai sống lưng
  for (let i = 0; i < 6; i++) { const x = -16 + i * 5.2, y = -36 + bob + Math.abs(i - 2.5) * 0.9; if (ice) tri(c, [x - 2.2, y, x + 0.4, y - 9 - (i % 2) * 3, x + 2.6, y], '#e8fbff', '#3a8ab8', 0.9); else tri(c, [x - 2.4, y, x + 0.4, y - 7 - (i % 2) * 2, x + 2.8, y], D.b, C.o, 0.9); }
  // chân trước
  for (const sd of [0, 1]) { const x = sd ? 8 : 2, sw2 = mv * (sd ? -1 : 1) * 3; lim(c, x, -17 + bob, x + sw2 * 0.4, -8, 5.8, 4.2, sd ? C : { ...C, h: C.s, s: C.d }, 1.2); pEll(c, x + sw2 + 2, -2, 5.6, 2.6); fs(c, C.s, C.o, 1); for (const dx of [0, 2.4, 4.6]) tri(c, [x + sw2 + 2.4 + dx - 1, -2, x + sw2 + 3.8 + dx, 1.4, x + sw2 + 4.8 + dx, -2], '#f4f0e0', C.o, 0.5); }
  // cánh trước
  c.save(); c.translate(0, -36 + bob); batWing(c, 1, flap, C, D, 36, 4); c.restore();
  // cổ + đầu to chibi
  const hx = 14 + lg * 5, hy = -40 + bob - lg * 2;
  c.strokeStyle = C.o; c.lineWidth = 13; c.beginPath(); c.moveTo(6, -28 + bob); c.quadraticCurveTo(10, -34 + bob, hx - 2, hy + 4); c.stroke(); c.strokeStyle = C.b; c.lineWidth = 10.6; c.stroke();
  c.save(); c.translate(hx, hy); c.rotate(Math.sin(t * 2 + m.x) * 0.04 - lg * 0.15);
  // sừng
  for (const [x, y, ex, ey] of demon ? [[-6, -8, -12, -23], [2, -9, 0, -26], [8, -8, 11, -22]] : azo ? [[-6, -8, -13, -22], [0, -9, -4, -27], [6, -8, 8, -24], [10, -6, 17, -17]] : [[-4, -8, -10, -19], [5, -8, 8, -18]]) { c.beginPath(); c.moveTo(x - 2.6, y); c.quadraticCurveTo((x + ex) / 2 - 3, (y + ey) / 2, ex, ey); c.quadraticCurveTo((x + ex) / 2 + 2, (y + ey) / 2 + 2, x + 2.6, y); c.closePath(); fs(c, vgrad(c, ey, y, ice ? '#f4fdff' : '#fff0c8', ice ? '#7ab8d8' : '#b88a3a'), C.o, 1); }
  pEll(c, 0, 0, 11, 9.6); fs(c, vgrad(c, -10, 10, C.hh, C.b), C.o, 1.4);
  pEll(c, 9, 3, 8.4, 5.4); fs(c, vgrad(c, -2, 8, C.hh, C.b), C.o, 1.2);
  pEll(c, 14.4, 1.4, 1.4, 1.1); c.fillStyle = '#10060a'; c.fill();
  const open = lg > 0 ? 4 : Math.max(0, Math.sin(t * 2.2 + m.x)) * 1.2; pEll(c, 8, 7 + open * 0.5, 6.4, 2 + open); fs(c, '#3a0a14', C.o, 0.9); for (const x of [4, 7.4, 10.6]) fang(c, x, 5.4, 0.55); 
  bigEye(c, 1.4, -3.8, 4.4, ice ? '#40c8ff' : fire ? '#ffd030' : demon ? '#ff5030' : '#ff40ff', { closed: cl, lid: 0.55, lidFill: C.s });
  c.strokeStyle = C.o; c.lineWidth = 1.7; c.beginPath(); c.moveTo(-4, -9.4); c.lineTo(5, -6.2); c.stroke();
  if (azo) { c.save(); c.shadowColor = '#ff40ff'; c.shadowBlur = 8; pPoly(c, [0, -8.4, 1.8, -6, 0, -3.6, -1.8, -6]); c.fillStyle = '#ff90ff'; c.fill(); c.restore(); }
  if (fire || demon) { c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3; i++) { const q = (t * 1.4 + i / 3) % 1; c.globalAlpha = (1 - q) * 0.8; pCirc(c, 14 + q * 10, 6 + open - q * 2, 1.8 + q * 2); c.fillStyle = i % 2 ? '#ffd060' : '#ff6a20'; c.fill(); } c.restore(); }
  if (ice) { c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 4; i++) { const q = (t * 1.1 + i / 4) % 1; c.globalAlpha = (1 - q) * 0.8; pPoly(c, [14 + q * 11, 5 + q * 3 - 2, 15.6 + q * 11, 5 + q * 3, 14 + q * 11, 5 + q * 3 + 2, 12.4 + q * 11, 5 + q * 3]); c.fillStyle = '#e8fbff'; c.fill(); } c.restore(); }
  c.restore();
  if (demon) crown(c, hx, hy - 12, 0.9);
}
