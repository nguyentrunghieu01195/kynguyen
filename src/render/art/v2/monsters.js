// Quái vật V2. Mỗi shape là một "khung" vẽ; đặc điểm riêng lấy từ m.tpl (id, crown, horns…).
// Gốc toạ độ = chân, hướng mặt sang phải.
import { tones, pEll, pCirc, pPoly, pRR, fs, vgrad, rgrad, gloss, groundShadow, eye, glowEye, sparkle, hash } from './kit.js';

const HEIGHT = { blob: 28, beast: 30, humanoid: 56, bug: 24, golem: 62, winged: 62, dragon: 64, serpent: 38, crab: 30, ghost: 54 };
export const mobHeight = (m) => (HEIGHT[m.shape] || 40) * m.size;

function crown(c, x, y, s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.beginPath(); c.moveTo(-8, 0); c.lineTo(-9, -9); c.lineTo(-4.5, -4); c.lineTo(0, -11); c.lineTo(4.5, -4); c.lineTo(9, -9); c.lineTo(8, 0); c.closePath();
  fs(c, vgrad(c, -11, 0, '#fff3a0', '#d09a10'), '#6a4a00', 1.2);
  pCirc(c, 0, -3.5, 1.6); c.fillStyle = '#ff3a5a'; c.fill();
  c.restore();
}

// ---------------- SLIME / MA NHÃN ----------------
function blob(c, m, t, C) {
  const sq = 1 + Math.sin(t * 5 + m.x * 3) * 0.08, hop = m.moving ? Math.abs(Math.sin(t * 7 + m.x)) * 5 : 0;
  c.translate(0, -hop);
  if (m.tpl.eye) {
    // Ma Nhãn: nhãn cầu lơ lửng + xúc tu
    for (let i = 0; i < 5; i++) { const a = 0.6 + i * 0.5, w = Math.sin(t * 4 + i) * 4;
      c.strokeStyle = C.s; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(Math.cos(a) * 8 - 2, -10); c.quadraticCurveTo(Math.cos(a) * 14 + w, -2, Math.cos(a) * 12 - w, 4); c.stroke(); }
    pCirc(c, 0, -20, 13); fs(c, rgrad(c, -4, -25, 2, 15, C.h, C.s), C.o);
    pEll(c, 3, -20, 8, 7.5); fs(c, '#fff8f0', '#4a1040', 1);
    c.save(); c.shadowColor = m.c2; c.shadowBlur = 10; pCirc(c, 5, -20, 4.5); c.fillStyle = m.c2; c.fill(); c.restore();
    pEll(c, 5.5, -20, 1.5, 3.8); c.fillStyle = '#100010'; c.fill(); gloss(c, 1, -24, 2, 1.2, 0.8);
    return;
  }
  if (m.tpl.toad) {
    // Cóc độc: thân bè, mắt lồi trên đỉnh, đốm độc
    pEll(c, 0, -9 * sq, 15 / sq, 9 * sq); fs(c, rgrad(c, -4, -14, 2, 16, C.h, C.s), C.o);
    for (const [x, y] of [[-6, -12], [2, -15], [-1, -7], [7, -10]]) { pCirc(c, x, y * sq, 1.8); c.fillStyle = m.c2; c.fill(); }
    for (const x of [3, 10]) { pCirc(c, x, -16 * sq, 4); fs(c, C.h, C.o, 1); eye(c, x + 0.5, -16.5 * sq, 2.2, '#1a1a00', 0.7); }
    c.strokeStyle = C.o; c.lineWidth = 1.2; c.beginPath(); c.moveTo(2, -6); c.quadraticCurveTo(9, -3, 14, -7); c.stroke();
    pEll(c, -10, -1, 5, 2.5); fs(c, C.s, C.o, 1); pEll(c, 10, -1, 5, 2.5); fs(c, C.s, C.o, 1);
    if (m.tpl.crown) crown(c, 0, -22, 0.9);
    return;
  }
  c.beginPath(); c.moveTo(-15 / sq, -1); c.bezierCurveTo(-16 / sq, -20 * sq, 14 / sq, -24 * sq, 15 / sq, -1); c.quadraticCurveTo(0, 3, -15 / sq, -1); c.closePath();
  c.globalAlpha = 0.95; fs(c, rgrad(c, -4, -16, 2, 18, C.hh, C.b), C.o); c.globalAlpha = 1;
  for (let i = 0; i < 3; i++) { pCirc(c, -6 + i * 5, -5 - hash(i + m.lv) * 6, 1.2 + hash(i) * 1.2); c.fillStyle = 'rgba(255,255,255,.35)'; c.fill(); }
  gloss(c, -6, -15 * sq, 4, 2.5, 0.7);
  eye(c, 4, -11 * sq, 3, '#102010', 0.6); eye(c, 10, -10.5 * sq, 2.5, '#102010', 0.6);
  c.strokeStyle = C.o; c.lineWidth = 1; c.beginPath(); c.arc(7.5, -6 * sq, 2, 0.2, Math.PI - 0.2); c.stroke();
  if (m.tpl.crown) crown(c, 0, -20 * sq, 0.9);
}

// ---------------- THÚ 4 CHÂN ----------------
function beast(c, m, t, C, D) {
  const id = m.tpl.id, mv = m.moving ? Math.sin(t * 12 + m.x) : 0, bob = m.moving ? Math.abs(mv) * 1.5 : Math.sin(t * 3 + m.y) * 0.6;
  const rat = id === 'rat';
  // Đuôi
  c.strokeStyle = rat ? '#d89a8a' : D.b; c.lineWidth = rat ? 1.6 : 5; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-12, -16 + bob); c.quadraticCurveTo(-22, -18 + mv * 3, -24, rat ? -6 : -26 + mv * 2); c.stroke();
  // Chân sau/trước phía xa
  const legC = (x, ph, back) => { c.save(); c.translate(x, -10 + bob); c.rotate(mv * 0.5 * ph); pRR(c, -2, 0, 4, 10, 2); fs(c, back ? D.s : D.b, D.o, 1); c.restore(); };
  legC(-8, -1, true); legC(7, 1, true);
  // Thân
  pEll(c, 0, -16 + bob, 14, 8.5); fs(c, vgrad(c, -25, -8, C.h, C.s), C.o);
  if (!rat) { c.beginPath(); c.moveTo(4, -23 + bob); c.quadraticCurveTo(10, -28 + bob, 13, -20 + bob); c.quadraticCurveTo(6, -16 + bob, 2, -18 + bob); fs(c, C.hh, C.o, 1); }
  const tp = m.tpl;
  if (tp.bear) { pEll(c, -2, -20 + bob, 15, 11); fs(c, vgrad(c, -31, -9, C.hh, C.s), C.o); }
  if (tp.spikes || tp.croc) for (let i = 0; i < 5; i++) { pPoly(c, [-10 + i * 4, -23 + bob, -8 + i * 4, -28 - (i % 2) * 2 + bob, -6 + i * 4, -23 + bob]); fs(c, tp.croc ? D.b : m.c2, C.o, 0.8); }
  if (tp.flame) { c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 6; i++) { const q = (t * 2 + i / 6) % 1; c.globalAlpha = (1 - q) * 0.8; pCirc(c, -8 + i * 4, -24 + bob - q * 10, 3 * (1 - q) + 1); c.fillStyle = i % 2 ? '#ffb030' : '#ff5a10'; c.fill(); } c.restore(); }
  if (id === 'icewolf') for (let i = 0; i < 4; i++) { pPoly(c, [-8 + i * 4, -23 + bob, -6 + i * 4, -30 - (i % 2) * 3 + bob, -4 + i * 4, -23 + bob]); fs(c, '#e8f8ff', '#3d86c2', 0.8); }
  legC(-5, 1, false); legC(10, -1, false);
  // Đầu
  c.save(); c.translate(14, -21 + bob);
  pEll(c, 0, 0, 8, 6.5); fs(c, vgrad(c, -7, 6, C.h, C.b), C.o);
  if (tp.croc) { pRR(c, 2, -1, 18, 6, 2.5); fs(c, vgrad(c, -1, 5, C.h, C.b), C.o, 1); c.fillStyle = '#fff'; for (let k = 0; k < 4; k++) { pPoly(c, [6 + k * 3.5, 5, 7.5 + k * 3.5, 7.5, 9 + k * 3.5, 5]); c.fill(); } }
  else { pEll(c, 7, 2, 5, 3.5); fs(c, C.hh, C.o, 1); pCirc(c, 11.5, 1.2, 1.5); c.fillStyle = '#201010'; c.fill(); }
  if (rat) { pCirc(c, -3, -6, 4); fs(c, '#e8b0a0', C.o, 1); }
  else if (tp.bear) { for (const x of [-3, 2]) { pCirc(c, x, -6, 3); fs(c, C.b, C.o, 1); } }
  else if (!tp.croc) { pPoly(c, [-4, -4, -2, -13, 2, -5]); fs(c, C.b, C.o, 1); pPoly(c, [0, -5, 3, -12, 5, -4]); fs(c, C.s, C.o, 1); }
  if (rat) eye(c, 3, -1.5, 2, '#000', 0.6); else glowEye(c, 3, -1.5, 1.8, id === 'icewolf' ? '#7fe0ff' : '#ffcc30');
  if (m.lunge > 0) { c.fillStyle = '#fff'; pPoly(c, [7, 4, 8, 7, 9, 4]); c.fill(); pPoly(c, [10, 4, 11, 6.5, 12, 4]); c.fill(); }
  c.restore();
}

// ---------------- HÌNH NGƯỜI ----------------
function humanoid(c, m, t, C, D) {
  const tp = m.tpl, id = tp.id, mv = m.moving ? Math.sin(t * 9 + m.x) : 0, bob = Math.sin(t * 3 + m.y) * 0.8;
  const zombie = id === 'zombie', skel = tp.bones, knight = tp.armored, gob = tp.ears;
  const hunch = zombie ? 4 : 0;
  // Áo choàng hiệp sĩ bóng tối
  if (knight) { c.beginPath(); c.moveTo(-6, -42 + bob); c.quadraticCurveTo(-16, -22, -14 - mv * 2, -4); c.lineTo(4, -6); c.closePath(); fs(c, vgrad(c, -42, -4, '#3a1a60', '#0a0418'), '#000'); }
  // Chân
  for (const [x, ph, back] of [[-3, -1, true], [3, 1, false]]) {
    c.save(); c.translate(x, -18); c.rotate(mv * 0.45 * ph);
    if (skel) { c.strokeStyle = back ? D.s : C.b; c.lineWidth = 2.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 16); c.stroke(); pEll(c, 2, 17, 3.5, 1.6); fs(c, C.b, C.o, 0.8); }
    else { pRR(c, -3, 0, 6, 17, 2.5); fs(c, back ? D.s : D.b, D.o, 1.1); }
    c.restore();
  }
  c.save(); c.translate(hunch, bob);
  // Thân
  if (skel) {
    pRR(c, -1.2, -40, 2.4, 22, 1); fs(c, C.b, C.o, 0.8);
    for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(0, -36 + i * 4.5, 7 - i * 0.6, 2, 0, Math.PI * 0.05, Math.PI * 0.95, true); c.strokeStyle = C.o; c.lineWidth = 3.2; c.stroke(); c.strokeStyle = C.b; c.lineWidth = 1.8; c.stroke(); }
    pEll(c, 0, -19, 6, 3); fs(c, C.b, C.o, 1);
  } else {
    c.beginPath(); c.moveTo(-8, -40); c.lineTo(8, -40); c.quadraticCurveTo(10, -28, 8, -18); c.lineTo(-8, -18); c.quadraticCurveTo(-10, -28, -8, -40); c.closePath();
    fs(c, vgrad(c, -40, -18, knight ? '#5a4a9a' : C.h, knight ? '#14102a' : C.s), C.o);
    if (knight) { for (const sx of [-7, 7]) { pEll(c, sx, -39, 6, 4.5); fs(c, vgrad(c, -43, -35, '#6a5aaa', '#1a1438'), '#000'); } pPoly(c, [0, -36, 3, -30, 0, -24, -3, -30]); fs(c, m.c2, '#000', 0.8); }
    if (zombie) { c.strokeStyle = D.d; c.lineWidth = 1; c.beginPath(); c.moveTo(-4, -34); c.lineTo(-1, -30); c.lineTo(-4, -26); c.stroke(); }
    if (gob) { pRR(c, -8, -23, 16, 3, 1); fs(c, '#5a3a1a', '#1a0a04', 0.8); }
  }
  // Tay sau
  c.save(); c.translate(-6, -37); c.rotate(zombie ? -1.3 : 0.3 - mv * 0.4); pRR(c, -2.3, 0, 4.6, 14, 2.3); fs(c, skel ? C.s : D.s, D.o, 1); c.restore();
  // Đầu
  const hy = -48;
  if (skel) {
    pCirc(c, 1, hy, 9); fs(c, vgrad(c, hy - 9, hy + 9, C.hh, C.s), C.o); pRR(c, -2, hy + 5, 8, 5, 2); fs(c, C.b, C.o, 1);
    c.save(); c.shadowColor = '#ff3020'; c.shadowBlur = 6; c.fillStyle = '#1a0a0a'; pEll(c, 4.5, hy, 2.6, 3); c.fill(); pEll(c, -1.5, hy, 2.2, 3); c.fill();
    c.fillStyle = '#ff4030'; pCirc(c, 4.5, hy + 0.5, 0.9); c.fill(); pCirc(c, -1.5, hy + 0.5, 0.8); c.fill(); c.restore();
  } else if (knight) {
    pCirc(c, 1, hy, 9.5); fs(c, vgrad(c, hy - 10, hy + 10, '#6a5aaa', '#14102a'), '#000');
    pRR(c, -1, hy - 1.5, 10, 3, 1); c.fillStyle = '#000'; c.fill(); glowEye(c, 6, hy, 1.6, m.c2); glowEye(c, 1.5, hy, 1.4, m.c2);
    c.beginPath(); c.moveTo(-2, hy - 9); c.quadraticCurveTo(-12, hy - 16, -16, hy - 6); c.quadraticCurveTo(-10, hy - 10, -4, hy - 7); fs(c, m.c2, '#000', 0.8);
  } else {
    pCirc(c, 1, hy, 9); fs(c, vgrad(c, hy - 9, hy + 9, C.hh, C.b), C.o);
    if (gob) for (const sd of [-1, 1]) { pPoly(c, [1 + sd * 7, hy - 2, 1 + sd * 17, hy - 9, 1 + sd * 7, hy + 3]); fs(c, C.h, C.o, 1); }
    if (zombie) { eye(c, 5, hy - 1, 2.4, '#5a0000', 0.5); pCirc(c, -1, hy - 1, 1.6); c.fillStyle = '#300'; c.fill(); c.strokeStyle = C.o; c.lineWidth = 1; c.beginPath(); c.moveTo(1, hy + 5); c.lineTo(7, hy + 4); c.stroke(); }
    else { glowEye(c, 5, hy - 1, 2, '#ffe030'); glowEye(c, -0.5, hy - 1, 1.6, '#ffe030'); c.strokeStyle = C.o; c.lineWidth = 1; c.beginPath(); c.moveTo(1, hy + 4); c.lineTo(4, hy + 5.5); c.lineTo(8, hy + 4); c.stroke(); }
  }
  if (tp.fins) { c.beginPath(); c.moveTo(-6, hy - 4); c.quadraticCurveTo(-14, hy - 14, -4, hy - 12); c.quadraticCurveTo(-2, hy - 9, -6, hy - 4); fs(c, m.c2, C.o, 1); }
  if (tp.horns) for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(1 + sd * 4, hy - 6); c.quadraticCurveTo(1 + sd * 11, hy - 10, 1 + sd * 9, hy - 17); c.quadraticCurveTo(1 + sd * 7, hy - 10, 1 + sd * 1, hy - 7); fs(c, '#2a0a04', '#000', 1); }
  if (tp.crown) crown(c, 1, hy - 8, 0.85);
  // Tay trước + vũ khí
  const sw = m.lunge > 0 ? Math.sin((m.lunge / 0.2) * Math.PI) * 1.6 : 0;
  c.save(); c.translate(6, -37); c.rotate(zombie ? -1.4 : -0.5 - sw);
  pRR(c, -2.3, 0, 4.6, 14, 2.3); fs(c, skel ? C.b : D.b, D.o, 1);
  if (!zombie) {
    c.translate(0, 14); c.rotate(-0.4);
    if (tp.staff) { pRR(c, -1.4, -26, 2.8, 30, 1.2); fs(c, vgrad(c, -26, 4, '#8a5a30', '#3a2010'), '#1a0a04', 0.9); c.save(); c.shadowColor = m.c2; c.shadowBlur = 10; pCirc(c, 0, -28, 4); fs(c, rgrad(c, -1, -29, 0.5, 4, '#ffffff', m.c2), '#1a1a1a', 0.8); c.restore(); }
    else if (tp.bow) { c.beginPath(); c.arc(-4, -8, 14, -1.2, 1.2); c.strokeStyle = '#6a4020'; c.lineWidth = 2.4; c.stroke(); c.strokeStyle = '#e8dcc0'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-4 + Math.cos(-1.2) * 14, -8 + Math.sin(-1.2) * 14); c.lineTo(-4 + Math.cos(1.2) * 14, -8 + Math.sin(1.2) * 14); c.stroke(); }
    else if (gob) { c.beginPath(); c.moveTo(-1.5, 2); c.lineTo(-3, -20); c.quadraticCurveTo(0, -26, 3, -20); c.lineTo(1.5, 2); c.closePath(); fs(c, vgrad(c, -26, 2, '#9a6a3a', '#4a2a10'), '#1a0a04', 1); }
    else { const len = knight ? 32 : 24; pPoly(c, [-2, 0, -2, -len, 0, -len - 5, 2, -len, 2, 0]); fs(c, knight ? vgrad(c, -len, 0, '#c8b8ff', '#4a3a8a') : vgrad(c, -len, 0, '#e8e8f0', '#8a8a9a'), '#1a1020', 1);
      pRR(c, -6, -1, 12, 2.6, 1); fs(c, knight ? '#7a5cff' : '#8a6a3a', '#000', 0.8); }
  }
  c.restore();
  c.restore();
}

// ---------------- CÔN TRÙNG ----------------
function bug(c, m, t, C, D) {
  const mv = m.moving ? t * 16 + m.x : 0, scorp = m.tpl.tail;
  c.strokeStyle = D.o; c.lineWidth = 2; c.lineCap = 'round';
  for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) {
    const ph = Math.sin(mv + i * 1.4 + (sd > 0 ? Math.PI : 0)) * 2, bx = -6 + i * 4;
    c.beginPath(); c.moveTo(bx, -8); c.lineTo(bx + sd * 3 + ph, -14 + (sd > 0 ? 0 : 2)); c.lineTo(bx + sd * 6 + ph, 0); c.stroke();
  }
  if (scorp) {
    // Đuôi bọ cạp
    const sw = Math.sin(t * 3) * 2 + (m.lunge > 0 ? 6 : 0);
    let px = -10, py = -9;
    for (let i = 0; i < 5; i++) { const nx = -14 + i * 2.5 + sw * (i / 5), ny = -12 - i * 5; pCirc(c, nx, ny, 3.6 - i * 0.3); fs(c, vgrad(c, ny - 4, ny + 4, C.h, C.s), C.o, 1); px = nx; py = ny; }
    pPoly(c, [px, py - 2, px + 8, py + 1, px, py + 3]); fs(c, '#ffe060', '#3a1a00', 1);
    for (const dy of [-3, 3]) { c.save(); c.translate(12, -9 + dy); pEll(c, 4, 0, 5, 2.6); fs(c, C.b, C.o, 1); c.restore(); }
  }
  pEll(c, -5, -9, scorp ? 10 : 11, scorp ? 5.5 : 8); fs(c, rgrad(c, -7, -13, 1, 12, C.h, C.s), C.o);
  if (!scorp) { c.fillStyle = m.c2; pPoly(c, [-5, -15, -2, -9, -5, -3, -8, -9]); c.fill(); }
  pEll(c, 7, -9, 5.5, 4.5); fs(c, vgrad(c, -13, -5, C.h, C.b), C.o);
  for (const [x, y, r] of [[10, -10.5, 1.3], [8, -12, 1], [11.5, -8, 0.9], [7.5, -9, 0.8]]) { c.save(); c.shadowColor = m.c2; c.shadowBlur = 4; pCirc(c, x, y, r); c.fillStyle = scorp ? '#200' : m.c2; c.fill(); c.restore(); }
  gloss(c, -8, -14, 3, 1.6, 0.5);
}

// ---------------- KHỔNG LỒ ----------------
function golem(c, m, t, C, D) {
  const id = m.tpl.id, mv = m.moving ? Math.sin(t * 6 + m.x) : 0, bob = Math.sin(t * 2 + m.y) * 0.8, sw = m.lunge > 0 ? Math.sin((m.lunge / 0.2) * Math.PI) : 0;
  const lava = id === 'lavagolem', yeti = id === 'yeti', tree = m.tpl.leaves;
  const glow = (fn) => { if (!lava) return; c.save(); c.shadowColor = '#ff6a1a'; c.shadowBlur = 8; c.strokeStyle = '#ffb040'; c.lineWidth = 1.3; fn(); c.stroke(); c.restore(); };
  for (const [x, ph, back] of [[-7, -1, true], [7, 1, false]]) { c.save(); c.translate(x, -20); c.rotate(mv * 0.3 * ph); pRR(c, -5, 0, 10, 20, 3); fs(c, back ? D.s : vgrad(c, 0, 20, D.b, D.s), D.o); c.restore(); }
  c.translate(0, bob);
  // Tay sau
  c.save(); c.translate(-14, -44); c.rotate(0.15 - mv * 0.2); pRR(c, -4, 0, 8, 22, 4); fs(c, D.s, D.o); c.restore();
  // Thân
  c.beginPath(); c.moveTo(-15, -50); c.quadraticCurveTo(0, -56, 15, -50); c.quadraticCurveTo(18, -32, 12, -18); c.lineTo(-12, -18); c.quadraticCurveTo(-18, -32, -15, -50); c.closePath();
  fs(c, vgrad(c, -56, -18, C.h, C.s), C.o);
  if (yeti) { c.strokeStyle = C.s; c.lineWidth = 1; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(-10 + i * 4, -48 + (i % 2) * 3); c.lineTo(-11 + i * 4, -42 + (i % 2) * 3); c.stroke(); } }
  if (tree) { c.strokeStyle = D.d; c.lineWidth = 1; c.beginPath(); c.moveTo(-6, -50); c.quadraticCurveTo(-8, -36, -4, -20); c.moveTo(5, -50); c.quadraticCurveTo(8, -36, 4, -22); c.stroke(); }
  glow(() => { c.beginPath(); c.moveTo(-8, -46); c.lineTo(-2, -36); c.lineTo(-6, -26); c.moveTo(6, -44); c.lineTo(2, -32); c.lineTo(8, -22); });
  // Đầu
  c.save(); c.translate(2, -56);
  pRR(c, -8, -8, 16, 13, 4); fs(c, vgrad(c, -8, 5, C.h, C.b), C.o);
  if (yeti) { for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 6, -7); c.quadraticCurveTo(sd * 14, -10, sd * 12, -18); c.quadraticCurveTo(sd * 9, -11, sd * 3, -8); fs(c, '#d8d0c0', '#5a5040', 1); } eye(c, 3, -2, 2.2, '#1a3a6a'); eye(c, -2.5, -2, 1.8, '#1a3a6a'); pRR(c, -3, 2, 8, 2.5, 1); c.fillStyle = '#4a2a3a'; c.fill(); }
  else { glowEye(c, 3.5, -2, 2, lava ? '#ffb030' : tree ? '#c0ff60' : m.c2); glowEye(c, -2.5, -2, 1.7, lava ? '#ffb030' : tree ? '#c0ff60' : m.c2); }
  if (tree) for (let i = 0; i < 5; i++) { pCirc(c, -9 + i * 4.5, -9 - (i % 2) * 4, 5); fs(c, i % 2 ? '#7cb342' : '#5a9a30', '#2a4a10', 1); }
  c.restore();
  // Tay trước
  c.save(); c.translate(14, -44); c.rotate(-0.25 + mv * 0.2 - sw * 1.2); pRR(c, -4.5, 0, 9, 24, 4.5); fs(c, vgrad(c, 0, 24, C.b, C.s), C.o);
  pCirc(c, 0, 25, 6); fs(c, C.b, C.o); glow(() => { c.beginPath(); c.moveTo(-2, 4); c.lineTo(1, 14); }); c.restore();
}

// ---------------- CÓ CÁNH ----------------
function winged(c, m, t, C, D) {
  const id = m.tpl.id, hv = -14 + Math.sin(t * 4 + m.x) * 3, fw = Math.sin(t * (id === 'bat' ? 16 : 8) + m.x) * 0.45;
  c.translate(0, hv);
  const wing = (sd) => {
    c.save(); c.translate(-2, -30); c.scale(sd, 1); c.rotate(fw * sd * -1 - 0.1);
    if (id === 'bat' || id === 'firedemon') {
      c.beginPath(); c.moveTo(0, 0); c.lineTo(-10, -12); c.lineTo(-28, -10); c.quadraticCurveTo(-24, -2, -28, 4); c.quadraticCurveTo(-18, 0, -18, 8); c.quadraticCurveTo(-10, 2, 0, 6); c.closePath();
      if (id === 'firedemon') { c.save(); c.shadowColor = '#ff6a00'; c.shadowBlur = 10; fs(c, vgrad(c, -12, 8, '#ffcc40', '#c02000'), '#400800'); c.restore(); }
      else fs(c, vgrad(c, -12, 8, C.b, D.d), C.o);
    } else if (id === 'icefairy') {
      c.globalAlpha = 0.75; pEll(c, -12, -8, 13, 7, 0.4); fs(c, rgrad(c, -12, -8, 1, 13, '#ffffff', m.c2), '#3d86c2', 1); pEll(c, -10, 4, 8, 4.5, -0.3); fs(c, rgrad(c, -10, 4, 1, 8, '#fff', m.c1), '#3d86c2', 1); c.globalAlpha = 1;
    } else {
      for (let i = 4; i >= 0; i--) { c.save(); c.rotate(-0.8 + i * 0.32); pEll(c, -13 + i, 0, 14 - i, 4); fs(c, vgrad(c, -4, 4, i % 2 ? C.hh : C.h, C.s), C.o, 1); c.restore(); }
    }
    c.restore();
  };
  wing(-1);
  // Thân
  if (m.tpl.stripes) {
    // Ong bắp cày: thân côn trùng sọc vàng-đen + ngòi
    pEll(c, -6, -28, 9, 6); fs(c, vgrad(c, -34, -22, C.h, C.s), C.o);
    c.fillStyle = D.b; for (const x of [-10, -5]) { pRR(c, x, -33.5, 2.6, 11, 1); c.fill(); }
    pPoly(c, [-15, -28, -21, -27, -15, -25]); fs(c, '#2a1a0a', '#000', 0.8);
    pCirc(c, 5, -30, 5.5); fs(c, vgrad(c, -36, -24, C.h, C.b), C.o); glowEye(c, 8, -31, 1.8, '#ff3030');
    c.strokeStyle = D.o; c.lineWidth = 1; c.beginPath(); c.moveTo(6, -35); c.lineTo(9, -41); c.moveTo(4, -35); c.lineTo(5, -42); c.stroke();
  } else if (m.tpl.bird) {
    pEll(c, -2, -28, 10, 7); fs(c, vgrad(c, -35, -21, C.h, C.s), C.o);
    pEll(c, 7, -36, 4, 6); fs(c, '#e8b8a0', '#5a3a2a', 1); pCirc(c, 9, -40, 4.5); fs(c, '#f0c8b0', '#5a3a2a', 1);
    pPoly(c, [12, -41, 19, -38, 12, -37]); fs(c, '#e8c030', '#5a4000', 0.8); glowEye(c, 10, -41, 1.4, '#ff4020');
    pEll(c, -2, -21, 8, 3); fs(c, m.c2, C.o, 0.8);
  } else if (id === 'bat') {
    pEll(c, 0, -28, 8, 9); fs(c, rgrad(c, -2, -31, 1, 10, C.h, C.s), C.o);
    for (const sd of [-1, 1]) { pPoly(c, [sd * 3, -35, sd * 7, -44, sd * 7.5, -33]); fs(c, C.b, C.o, 1); }
    glowEye(c, 4, -30, 1.8, '#ff3030'); glowEye(c, -1, -30, 1.5, '#ff3030');
    c.fillStyle = '#fff'; pPoly(c, [2, -25, 3, -22, 4, -25]); c.fill(); pPoly(c, [5, -25, 6, -22, 7, -25]); c.fill();
  } else {
    // Thân người có cánh
    c.beginPath(); c.moveTo(-6, -36); c.quadraticCurveTo(-8, -20, -4, -10); c.quadraticCurveTo(0, -6, 4, -10); c.quadraticCurveTo(8, -20, 6, -36); c.closePath();
    fs(c, vgrad(c, -36, -8, C.h, C.s), C.o);
    if (id === 'firedemon') { c.beginPath(); c.moveTo(-3, -12); c.quadraticCurveTo(-14, -6, -16, -16); c.stroke(); pPoly(c, [-16, -16, -19, -14, -15, -20]); fs(c, C.b, C.o, 1); }
    pCirc(c, 1, -42, 7.5); fs(c, vgrad(c, -50, -34, id === 'fallenangel' ? '#f0ecff' : C.hh, C.b), C.o);
    if (m.tpl.horns) for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(1 + sd * 4, -48); c.quadraticCurveTo(1 + sd * 10, -52, 1 + sd * 8, -58); c.quadraticCurveTo(1 + sd * 6, -52, 1 + sd * 1, -49); fs(c, '#2a0a04', '#000', 1); }
    if (m.tpl.halo) { c.save(); c.shadowColor = '#c0a0ff'; c.shadowBlur = 8; c.strokeStyle = '#d8c8ff'; c.lineWidth = 2; c.beginPath(); c.ellipse(1, -53, 7, 2.2, 0, 0.3, Math.PI * 2 - 0.6); c.stroke(); c.restore(); }
    if (id === 'icefairy') { eye(c, 4, -42, 2.2, '#1a6aaa'); eye(c, -1, -42, 1.8, '#1a6aaa'); for (let i = 0; i < 3; i++) sparkle(c, Math.cos(t * 2 + i * 2) * 14, -30 + Math.sin(t * 2 + i * 2) * 10, 2, '#e8fbff', 0.8); }
    else { glowEye(c, 4, -42, 1.8, id === 'fallenangel' ? '#a070ff' : '#ffd030'); glowEye(c, -1, -42, 1.5, id === 'fallenangel' ? '#a070ff' : '#ffd030'); }
  }
  wing(1);
}

// ---------------- RỒNG (BOSS) ----------------
function dragon(c, m, t, C, D) {
  const fw = Math.sin(t * 3) * 0.22, bob = Math.sin(t * 2) * 1.2, br = m.lunge > 0;
  const wing = (sd, back) => {
    c.save(); c.translate(-4, -38 + bob); c.scale(sd, 1); c.rotate(-fw * sd - 0.1);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(-10, -26); c.lineTo(-44, -32); c.quadraticCurveTo(-38, -20, -46, -8); c.quadraticCurveTo(-34, -10, -34, 2); c.quadraticCurveTo(-22, -4, -22, 10); c.quadraticCurveTo(-12, 0, 0, 6); c.closePath();
    fs(c, vgrad(c, -32, 10, back ? D.b : C.hh, back ? D.d : C.s), C.o);
    c.strokeStyle = C.o; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-10, -26); c.lineTo(-46, -8); c.moveTo(-10, -26); c.lineTo(-34, 2); c.moveTo(-10, -26); c.lineTo(-22, 10); c.stroke();
    c.restore();
  };
  wing(-1, true);
  // Đuôi
  c.beginPath(); c.moveTo(-14, -20 + bob); c.quadraticCurveTo(-34, -16, -40, -2 + Math.sin(t * 2.5) * 3); c.quadraticCurveTo(-30, -10, -12, -12 + bob); c.closePath(); fs(c, vgrad(c, -20, 0, C.b, C.s), C.o);
  pPoly(c, [-40, -2, -46, -8, -44, 2]); fs(c, C.hh, C.o, 1);
  // Chân
  for (const x of [-10, 8]) { pRR(c, x - 3.5, -16, 7, 16, 3); fs(c, vgrad(c, -16, 0, C.b, C.d), C.o); }
  // Thân
  pEll(c, 0, -24 + bob, 20, 13); fs(c, vgrad(c, -37, -11, C.h, C.s), C.o);
  pEll(c, 4, -18 + bob, 12, 6); fs(c, vgrad(c, -24, -12, C.hh, C.h), C.o, 1);
  for (let i = 0; i < 5; i++) { pPoly(c, [-14 + i * 6, -35 + bob, -11 + i * 6, -42 + bob, -8 + i * 6, -35 + bob]); fs(c, m.c2, C.o, 1); }
  // Cổ + đầu
  c.beginPath(); c.moveTo(8, -32 + bob); c.quadraticCurveTo(16, -46, 22, -48 + bob); c.lineTo(26, -42 + bob); c.quadraticCurveTo(20, -36, 16, -24 + bob); c.closePath(); fs(c, vgrad(c, -48, -24, C.h, C.b), C.o);
  c.save(); c.translate(26, -48 + bob);
  pEll(c, 0, 0, 10, 7); fs(c, vgrad(c, -7, 7, C.h, C.b), C.o);
  c.beginPath(); c.moveTo(4, -2); c.lineTo(17, 0); c.lineTo(16, 3); c.lineTo(4, 4); c.closePath(); fs(c, C.b, C.o, 1);
  c.save(); c.rotate(br ? 0.35 : 0.08); c.beginPath(); c.moveTo(3, 4); c.lineTo(15, 5); c.lineTo(13, 8); c.lineTo(3, 7); c.closePath(); fs(c, C.s, C.o, 1); c.restore();
  for (const [x, l] of [[-4, 12], [1, 9]]) { c.beginPath(); c.moveTo(x, -5); c.quadraticCurveTo(x - 8, -10, x - 10, -5 - l); c.quadraticCurveTo(x - 4, -10, x + 3, -6); fs(c, m.c2, C.o, 1); }
  glowEye(c, 4, -2, 2.2, m.tpl.id === 'azoth' ? '#ff40ff' : '#ffe040');
  c.restore();
  if (br) { c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 6; i++) { const k = (t * 6 + i / 6) % 1; c.globalAlpha = 1 - k; pCirc(c, 44 + k * 40, -44 + bob + Math.sin(i * 2) * k * 10, 4 + k * 8); c.fillStyle = m.c2; c.fill(); } c.restore(); }
  wing(1, false);
}

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

// ---------------- RẮN ----------------
function serpent(c, m, t, C, D) {
  const mv = t * (m.moving ? 7 : 2.5) + m.x, br = m.lunge > 0 ? Math.sin((m.lunge / 0.2) * Math.PI) : 0;
  // thân cuộn sát đất
  for (let i = 5; i >= 0; i--) { const x = -16 + i * 5.5, y = -4 - Math.sin(mv + i * 0.9) * 2; pEll(c, x, y, 7 - i * 0.3, 5); fs(c, vgrad(c, y - 5, y + 5, i % 2 ? C.h : C.b, C.s), C.o, 1); }
  // thân dựng lên + đầu
  c.beginPath(); c.moveTo(6, -6); c.quadraticCurveTo(14 + br * 4, -18, 8 + br * 6, -28); c.lineTo(15 + br * 6, -30); c.quadraticCurveTo(20 + br * 3, -16, 12, -4); c.closePath(); fs(c, vgrad(c, -30, -4, C.h, C.s), C.o);
  c.beginPath(); c.moveTo(9 + br * 6, -26); c.quadraticCurveTo(13 + br * 5, -16, 12, -6); c.strokeStyle = D.b; c.lineWidth = 2.2; c.stroke();
  c.save(); c.translate(13 + br * 7, -32);
  pEll(c, 0, 0, 8, 5.5); fs(c, vgrad(c, -5, 5, C.h, C.b), C.o);
  if (m.boss || m.tpl.crown) { for (const sd of [-1, 1]) { pEll(c, -2, sd * 4 - 2, 6, 2.5, sd * 0.5); fs(c, D.b, C.o, 0.8); } }
  glowEye(c, 3, -1.5, 1.6, m.c2);
  if (Math.sin(t * 6 + m.y) > 0.3) { c.strokeStyle = '#e02040'; c.lineWidth = 1; c.beginPath(); c.moveTo(7, 1); c.lineTo(11, 1); c.lineTo(13, -1); c.moveTo(11, 1); c.lineTo(13, 3); c.stroke(); }
  c.restore();
  if (m.tpl.crown) crown(c, 13 + br * 7, -38, 0.8);
}
HEIGHT.serpent = 38;

// ---------------- CUA ----------------
function crab(c, m, t, C, D) {
  const mv = m.moving ? Math.sin(t * 14 + m.x) : 0, sn = m.lunge > 0 ? Math.sin((m.lunge / 0.2) * Math.PI) : Math.max(0, Math.sin(t * 2 + m.y)) * 0.3;
  c.strokeStyle = C.o; c.lineWidth = 2.2; c.lineCap = 'round';
  for (let i = 0; i < 3; i++) for (const sd of [-1, 1]) { const ph = mv * (i % 2 ? 1 : -1) * 2; c.beginPath(); c.moveTo(sd * 6, -8); c.lineTo(sd * (12 + i * 2) + ph, -10 + i); c.lineTo(sd * (15 + i * 2) + ph, 0); c.stroke(); }
  pEll(c, 0, -11, 15, 8.5); fs(c, rgrad(c, -4, -15, 2, 16, C.hh, C.s), C.o);
  c.strokeStyle = C.s; c.lineWidth = 1; c.beginPath(); c.moveTo(-8, -12); c.quadraticCurveTo(0, -16, 8, -12); c.stroke();
  for (const sd of [-1, 1]) {
    c.save(); c.translate(sd * 13, -16); c.rotate(sd * (-0.4 - sn * 0.5));
    pRR(c, -2, -8, 4, 8, 2); fs(c, C.b, C.o, 1);
    c.translate(0, -10); pEll(c, 0, -2, 6, 4.5); fs(c, vgrad(c, -6, 2, C.hh, C.b), C.o, 1);
    pPoly(c, [-2, -4, 0, -9 - sn * 3, 3, -4]); fs(c, C.h, C.o, 0.8);
    c.restore();
  }
  for (const x of [-3, 3]) { c.strokeStyle = C.o; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, -18); c.lineTo(x + 1, -24); c.stroke(); pCirc(c, x + 1, -25, 2.2); fs(c, '#fff', C.o, 0.8); pCirc(c, x + 1.5, -25, 1); c.fillStyle = '#100'; c.fill(); }
  if (m.tpl.crown) crown(c, 0, -27, 0.85);
}

// ---------------- HỒN MA / SỨA ----------------
function ghost(c, m, t, C, D) {
  const hv = -14 + Math.sin(t * 2.6 + m.x) * 3, jelly = m.tpl.jelly;
  c.translate(0, hv);
  c.save(); c.globalAlpha = 0.85;
  if (jelly) {
    for (let i = 0; i < 5; i++) { const x = -8 + i * 4, w = Math.sin(t * 4 + i) * 3; c.strokeStyle = i % 2 ? m.c2 : m.c1; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x, -18); c.quadraticCurveTo(x + w, -8, x - w, 2); c.stroke(); }
    c.beginPath(); c.moveTo(-13, -18); c.quadraticCurveTo(-13, -36, 0, -36); c.quadraticCurveTo(13, -36, 13, -18); c.quadraticCurveTo(0, -14, -13, -18); c.closePath();
    fs(c, rgrad(c, -3, -28, 2, 16, C.hh, C.b), C.o, 1.2);
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5 + Math.sin(t * 8) * 0.3; c.strokeStyle = m.c2; c.lineWidth = 1; c.beginPath(); c.moveTo(-6, -26); c.lineTo(-2, -22); c.lineTo(-4, -18); c.moveTo(5, -28); c.lineTo(2, -23); c.stroke();
  } else {
    c.save(); c.shadowColor = m.c2; c.shadowBlur = 14;
    c.beginPath(); c.moveTo(-11, -30); c.quadraticCurveTo(-11, -46, 1, -46); c.quadraticCurveTo(13, -46, 12, -30);
    for (let i = 0; i < 4; i++) { const x = 12 - i * 6, w = Math.sin(t * 5 + i) * 2; c.quadraticCurveTo(x - 1 + w, -12, x - 3, -6 - (i % 2) * 4); }
    c.quadraticCurveTo(-14, -16, -11, -30); c.closePath();
    fs(c, vgrad(c, -46, -6, C.hh, C.s), C.o, 1.2); c.restore();
    glowEye(c, 5, -35, 2.2, m.c2); glowEye(c, -1, -35, 1.8, m.c2);
    c.fillStyle = 'rgba(0,0,0,.45)'; pEll(c, 2, -28, 3, 2 + Math.max(0, Math.sin(t * 3)) * 1.5); c.fill();
  }
  c.restore();
}

const SHAPES = { blob, beast, humanoid, bug, golem, winged, dragon, gate, serpent, crab, ghost };

export function drawMob(c, m, t, iso) {
  const s = iso(m.x, m.y);
  c.save(); c.translate(s.x, s.y);
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
  groundShadow(c, 14 * m.size, 6 * m.size);
  const lg = m.lunge > 0 ? Math.sin((m.lunge / 0.2) * Math.PI) * 5 : 0;
  // thở nhẹ khi đứng yên, nảy khi chạy, bẹp ngang khi bị đánh (co giãn quanh chân)
  const hit = m.flash > 0 ? Math.min(1, m.flash / 0.12) : 0, breathe = m.moving ? Math.abs(Math.sin(t * 12 + m.x)) * 0.05 : Math.sin(t * 2.4 + m.x * 1.7 + m.y) * 0.018;
  c.scale(m.size * m.face * (1 - breathe * 0.6 + hit * 0.1), m.size * (1 + breathe - hit * 0.08)); c.translate(lg, 0);
  const fl = m.flash > 0;
  const C = tones(fl ? '#ffffff' : m.c1), D = tones(fl ? '#ffffff' : m.c2);
  (SHAPES[m.shape] || blob)(c, m, t, C, D);
  c.restore();
}
