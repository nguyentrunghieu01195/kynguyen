// =====================================================================
//  NHÂN VẬT CHIBI — Kiếm Sĩ / Pháp Sư / Xạ Thủ (renderer duy nhất của game)
// =====================================================================
// Dựng từ bộ xương có khớp (vai-khuỷu-cổ tay, hông-gối-cổ chân) → mỗi bộ phận là một "hình" dữ liệu:
//   { t:'part', d, m, k }   mảng đổ 3 tông theo chất liệu m (da mờ / kim loại sắc / vàng ấm / pha lê lạnh) + rim light
//   { t:'fill' | 'stroke' } chi tiết phẳng (mắt, đường may, vệt tóc…)
// Các lớp, từ sau ra trước: cape_back, arm_back, legs, body, armor_chest, armor_shoulder, head, hair, helmet, arm_front, weapon, effects.
// Hệ toạ độ: đơn vị phác (cao ~290 ≈ 87px trong game), gốc (0,0) GIỮA HAI BÀN CHÂN, mặt hướng +x, y âm là lên.
// Tư thế: solvePose (đi bằng IK, đòn đánh bằng keyframe) + adjustPose (trượng / cung cho Pháp Sư, Xạ Thủ).
import { mix } from '../../paint.js';

// ---------------- CHẤT LIỆU: viền · tối · gốc · sáng + kiểu phản sáng ----------------
// kind: matte (da, vải: mờ, không viền trắng) · metal (kim loại: viền sáng sắc + vệt phản chiếu) · bone (xương: bóng nhẹ)
//       gold (vàng: ánh ấm) · crystal (pha lê: cạnh sáng lạnh)
export const MATS = {
  skin: { o: '#8a5434', d: '#d49a70', b: '#f2c9a0', l: '#ffe2c4', kind: 'matte', name: 'Da người' },
  hair: { o: '#2a140c', d: '#4a2814', b: '#6a3e20', l: '#a8703c', kind: 'matte', name: 'Tóc nâu' },
  hairF: { o: '#3a0a08', d: '#7a1a18', b: '#b82a26', l: '#f0705c', kind: 'matte', name: 'Tóc đỏ (nữ)' },
  leather: { o: '#3a2012', d: '#5c3c24', b: '#80583a', l: '#a8814f', kind: 'matte', name: 'Da thuộc' },
  leatherD: { o: '#26140a', d: '#3e2616', b: '#5a3a24', l: '#7c5a38', kind: 'matte', name: 'Da thuộc tối' },
  cloth: { o: '#241c34', d: '#3a3254', b: '#554a78', l: '#7a70a0', kind: 'matte', name: 'Vải lót' },
  clothW: { o: '#5a5e7c', d: '#c0c6de', b: '#e8ecfa', l: '#ffffff', kind: 'matte', name: 'Vải trắng' },
  steel: { o: '#232b3a', d: '#6a7a8e', b: '#b0bed0', l: '#ffffff', kind: 'metal', name: 'Thép' },
  darkmetal: { o: '#12141c', d: '#2c303c', b: '#484e60', l: '#8a92ac', kind: 'metal', name: 'Thép đen' },
  bone: { o: '#4a3e2c', d: '#b6aa8e', b: '#e6dcc2', l: '#fffaf0', kind: 'bone', name: 'Xương' },
  angel: { o: '#555a7c', d: '#c2c8e0', b: '#eff2ff', l: '#ffffff', kind: 'metal', name: 'Giáp trắng' },
  gold: { o: '#4a3004', d: '#a67a18', b: '#e6b840', l: '#fff0a0', kind: 'gold', name: 'Vàng' },
  crystal: { o: '#12385c', d: '#2c74b4', b: '#72ceff', l: '#e8fbff', kind: 'crystal', name: 'Pha lê' },
  capeRed: { o: '#480a0c', d: '#781418', b: '#b6282a', l: '#e45f4a', kind: 'matte', name: 'Áo choàng đỏ' },
  capeDark: { o: '#2a0608', d: '#560e12', b: '#841a1e', l: '#b4403a', kind: 'matte', name: 'Áo choàng đỏ sẫm' },
  robe0: { o: '#1d2250', d: '#2c3a8a', b: '#4560c8', l: '#8aa0f0', kind: 'matte', name: 'Áo choàng pháp sư xanh' },
  robe2: { o: '#2a1038', d: '#44205e', b: '#6a3a8c', l: '#a070c8', kind: 'matte', name: 'Áo choàng pháp sư tím' },
  arch0: { o: '#1e3a1a', d: '#2f5a28', b: '#4a8438', l: '#86c060', kind: 'matte', name: 'Da xanh xạ thủ' },
  arch2: { o: '#262616', d: '#44442a', b: '#6a6942', l: '#a2a068', kind: 'matte', name: 'Da ô liu xạ thủ' },
  orbP: { o: '#2a1048', d: '#4a2090', b: '#8a50e0', l: '#d8b0ff', kind: 'crystal', name: 'Ngọc tím' },
  wood: { o: '#3a2410', d: '#6a4422', b: '#a2703a', l: '#d8a468', kind: 'matte', name: 'Gỗ' },
  capeWhite: { o: '#646a8c', d: '#cdd3ea', b: '#fbfcff', l: '#ffffff', kind: 'matte', name: 'Áo choàng trắng' },
};
let ALIAS = null; // tên chất liệu → chất liệu thay thế (đổi màu theo bộ giáp cụ thể của game)
const M = (n) => MATS[(ALIAS && ALIAS[n]) || n] || MATS.steel;
/** Tạo chất liệu động từ một màu: viền · tối · gốc · sáng */
function dynMat(hex, kind) {
  const key = 'dyn' + hex + kind;
  if (!MATS[key]) MATS[key] = { o: mix(hex, '#000000', 0.66), d: mix(hex, '#000000', 0.4), b: hex, l: mix(hex, '#ffffff', 0.45), kind, name: key };
  return key;
}

// ---------------- BỐN BỘ (bậc 1 · 3 · 6 trong game = chỉ số 0 · 2 · 5) ----------------
export const TIERS = {
  0: { id: 'da', name: 'Bậc 1 · Bộ Da', armor: 'leather', trim: 'leatherD', hard: 'steel', pants: 'leatherD', cloth: 'cloth', cape: 'capeRed', capeLen: 60, blade: 'steel', boots: 'leather', glow: null },
  2: { id: 'xuong', name: 'Bậc 3 · Bộ Xương', armor: 'bone', trim: 'darkmetal', hard: 'darkmetal', pants: 'cloth', cloth: 'cloth', cape: 'capeDark', capeLen: 76, blade: 'bone', boots: 'darkmetal', glow: null },
  5: { id: 'thienthan', name: 'Bậc 6 · Bộ Thiên Thần', armor: 'angel', trim: 'gold', hard: 'gold', pants: 'clothW', cloth: 'clothW', cape: 'capeWhite', capeLen: 96, blade: 'gold', boots: 'angel', glow: '#ffd75a' },
};

// ---------------- VẼ MẢNG: 3 tông + rim light, phản sáng theo chất liệu ----------------
const PATHS = new Map();
const P2 = (d) => { let p = PATHS.get(d); if (!p) { if (PATHS.size > 3000) PATHS.clear(); p = new Path2D(d); PATHS.set(d, p); } return p; }; // đường dẫn đổi theo từng khung hình → giới hạn bộ nhớ đệm
let LIGHT = null;
/** Ánh sáng mềm chung cho cả nhân vật (sáng trên-trái → tối dưới-phải): 1 hướng sáng duy nhất cho mọi mảng */
function softLight(c) {
  if (!LIGHT || LIGHT.ctx !== c) { const g = c.createLinearGradient(-110, -360, 120, 20); g.addColorStop(0, 'rgba(255,248,235,.20)'); g.addColorStop(0.45, 'rgba(255,248,235,0)'); g.addColorStop(0.75, 'rgba(24,6,30,.10)'); g.addColorStop(1, 'rgba(24,6,30,.28)'); LIGHT = { ctx: c, g }; }
  return LIGHT.g;
}
export function paintPart(c, sh) {
  const p = P2(sh.d), t = M(sh.m), k = sh.k || 1;
  c.save(); c.clip(p);
  c.fillStyle = t.d; c.fill(p);
  c.save(); c.translate(-7 * k, -8 * k); c.fillStyle = t.b; c.fill(p); c.restore();
  c.save(); c.translate(6 * k, 7 * k); c.strokeStyle = t.l; c.lineWidth = (t.kind === 'matte' ? 9 : 12) * k; c.globalAlpha = t.kind === 'matte' ? 0.55 : 1; c.stroke(p); c.restore();
  if (t.kind === 'metal' || t.kind === 'gold' || t.kind === 'crystal' || t.kind === 'bone') {
    // viền sáng sắc ở mép trên-trái
    c.save(); c.translate(2 * k, 2.5 * k); c.globalAlpha = t.kind === 'bone' ? 0.45 : 0.85; c.strokeStyle = t.kind === 'gold' ? '#fff4b8' : t.kind === 'crystal' ? '#d6f6ff' : '#fff'; c.lineWidth = 3.4 * k; c.stroke(p); c.restore();
  }
  if (t.kind === 'metal') { // vệt phản chiếu thứ hai, mảnh và cứng
    c.save(); c.translate(11 * k, 13 * k); c.globalAlpha = 0.32; c.strokeStyle = '#fff'; c.lineWidth = 2.2 * k; c.stroke(p); c.restore();
  } else if (t.kind === 'gold') {
    c.save(); c.globalAlpha = 0.16; c.fillStyle = '#ffcf5a'; c.fill(p); c.restore(); // ánh ấm phủ nhẹ
    c.save(); c.translate(10 * k, 12 * k); c.globalAlpha = 0.4; c.strokeStyle = '#fff2b0'; c.lineWidth = 2.4 * k; c.stroke(p); c.restore();
  } else if (t.kind === 'crystal') {
    c.save(); c.translate(9 * k, 11 * k); c.globalAlpha = 0.6; c.strokeStyle = '#ffffff'; c.lineWidth = 2.2 * k; c.stroke(p); c.restore();
  }
  c.fillStyle = softLight(c); c.fill(p);
  c.save(); c.translate(-3.5 * k, -4.5 * k); c.globalAlpha = 0.3; c.strokeStyle = t.o; c.lineWidth = 11 * k; c.stroke(p); c.restore(); // ambient occlusion: tối dần về mép dưới-phải
  c.restore();
  c.strokeStyle = t.o; c.lineWidth = 5.2; c.lineJoin = 'round'; c.stroke(p);
}
function paintShape(c, sh) {
  if (sh.t === 'part') return paintPart(c, sh);
  c.save();
  if (sh.clip) c.clip(P2(sh.clip));
  c.globalAlpha = sh.a == null ? 1 : sh.a;
  if (sh.t === 'fill') { c.fillStyle = sh.fill; c.fill(P2(sh.d)); if (sh.stroke) { c.strokeStyle = sh.stroke; c.lineWidth = sh.w || 4; c.lineJoin = 'round'; c.stroke(P2(sh.d)); } }
  else if (sh.t === 'stroke') { c.strokeStyle = sh.stroke; c.lineWidth = sh.w || 4; c.lineCap = 'round'; c.lineJoin = 'round'; if (sh.dash) c.setLineDash(sh.dash); c.stroke(P2(sh.d)); }
  else if (sh.t === 'glow') { c.globalCompositeOperation = 'lighter'; c.fillStyle = sh.fill; c.fill(P2(sh.d)); }
  c.restore();
}

// ---------------- DỰNG ĐƯỜNG DẪN ----------------
const f1 = (n) => (Math.round(n * 10) / 10).toString();
/** Biến đổi một chuỗi đường dẫn (chỉ M L Q C Z, toạ độ tuyệt đối) qua hàm tf(x,y) → [x,y] */
function xf(d, tf) {
  const tok = d.match(/[MLQCZ]|-?\d*\.?\d+/g) || [];
  let out = '', i = 0;
  const pair = () => { const [a, b] = tf(+tok[i], +tok[i + 1]); i += 2; return f1(a) + ' ' + f1(b); };
  while (i < tok.length) {
    const cmd = tok[i++];
    if (cmd === 'Z') { out += 'Z'; continue; }
    const n = cmd === 'C' ? 3 : cmd === 'Q' ? 2 : 1;
    out += cmd; for (let k = 0; k < n; k++) out += (k ? ' ' : '') + pair();
  }
  return out;
}
/** Elip → đường dẫn (4 cung Bézier) qua tf; rot = góc xoay của elip */
function ell(tf, cx, cy, rx, ry, rot = 0) {
  const K = 0.5523, co = Math.cos(rot), si = Math.sin(rot);
  const P = (x, y) => { const px = cx + x * co - y * si, py = cy + x * si + y * co; const [a, b] = tf(px, py); return f1(a) + ' ' + f1(b); };
  return 'M' + P(rx, 0) + 'C' + P(rx, ry * K) + ' ' + P(rx * K, ry) + ' ' + P(0, ry) + 'C' + P(-rx * K, ry) + ' ' + P(-rx, ry * K) + ' ' + P(-rx, 0) + 'C' + P(-rx, -ry * K) + ' ' + P(-rx * K, -ry) + ' ' + P(0, -ry) + 'C' + P(rx * K, -ry) + ' ' + P(rx, -ry * K) + ' ' + P(rx, 0) + 'Z';
}
/** Chi (tay / chân) thon: hai đầu tròn bán kính r1, r2 */
function limb(a, b, r1, r2 = r1) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  const A1 = [a[0] + nx * r1, a[1] + ny * r1], B1 = [b[0] + nx * r2, b[1] + ny * r2], B2 = [b[0] - nx * r2, b[1] - ny * r2], A2 = [a[0] - nx * r1, a[1] - ny * r1];
  return 'M' + f1(A1[0]) + ' ' + f1(A1[1]) + 'L' + f1(B1[0]) + ' ' + f1(B1[1]) + 'A' + f1(r2) + ' ' + f1(r2) + ' 0 0 0 ' + f1(B2[0]) + ' ' + f1(B2[1]) + 'L' + f1(A2[0]) + ' ' + f1(A2[1]) + 'A' + f1(r1) + ' ' + f1(r1) + ' 0 0 0 ' + f1(A1[0]) + ' ' + f1(A1[1]) + 'Z';
}
const lerp2 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
const dirv = (a) => [Math.sin(a), Math.cos(a)];

// ---------------- HÌNH CỐ ĐỊNH CỦA ĐẦU (toạ độ nghỉ, gốc = bàn chân, đầu tâm (6,-270)) ----------------
const BANGS_M = 'M -54 -262 Q -62 -330 8 -330 Q 70 -328 66 -276 Q 56 -292 40 -290 Q 30 -276 18 -288 Q 4 -276 -6 -290 Q -16 -268 -26 -262 Q -40 -250 -54 -262 Z';
const BANGS_F = 'M -56 -256 Q -72 -336 8 -340 Q 78 -338 70 -266 Q 70 -240 60 -224 Q 56 -250 46 -260 Q 44 -284 30 -296 Q 22 -274 6 -292 Q -6 -270 -22 -284 Q -32 -262 -40 -246 Q -44 -230 -52 -226 Z';
const HAIR_BACK_M = 'M -54 -262 Q -60 -236 -46 -222 Q -40 -240 -34 -254 Z';
const HAIR_SPIKES = ['M -50 -318 L -84 -356 L -24 -336 Z', 'M -22 -334 L -34 -384 L 14 -344 Z', 'M 14 -342 L 30 -394 L 52 -336 Z', 'M 40 -330 L 80 -358 L 66 -316 Z'];
// các lọn tóc riêng (4–6 mảng có hình khối): mái trước, tóc mai
const LOCKS = ['M -46 -306 Q -44 -290 -30 -284 Q -22 -296 -20 -308 Z', 'M -14 -308 Q -8 -290 6 -284 Q 12 -296 10 -310 Z', 'M 18 -310 Q 28 -292 46 -288 Q 50 -302 44 -314 Z', 'M -56 -282 Q -68 -250 -54 -222 Q -52 -252 -40 -278 Z', 'M 54 -296 Q 70 -270 62 -242 Q 56 -266 46 -286 Z'];
const HAIR_LONG = 'M -48 -296 C -108 -282 -122 -200 -98 -112 C -94 -88 -76 -74 -62 -84 C -56 -118 -62 -160 -46 -200 C -40 -226 -40 -252 -34 -268 Z';
const HAIR_LONG2 = 'M -60 -252 C -96 -224 -94 -152 -76 -102 Q -64 -148 -54 -192 Z';
const STR_L = ['M -34 -320 Q -8 -334 32 -320', 'M 4 -330 Q 40 -326 56 -300', 'M -50 -296 Q -56 -322 -28 -332', 'M -20 -306 Q 6 -318 36 -304'];
const STR_D = ['M -44 -266 Q -32 -296 -8 -302', 'M 24 -298 Q 34 -310 58 -298', 'M -2 -292 Q 8 -300 20 -292'];
const STR_LF = ['M -38 -322 Q -4 -340 36 -324', 'M 8 -334 Q 48 -328 62 -296', 'M -56 -290 Q -62 -330 -28 -338', 'M 46 -276 Q 62 -262 58 -236'];

// ---------------- CÁC TƯ THẾ (khoá hình, góc tính từ "thẳng xuống", dương = ra trước +x) ----------------
const NUM = ['lean', 'tilt', 'px', 'thF', 'shF', 'thB', 'shB', 'a1F', 'a2F', 'wpn', 'a1B', 'a2B', 'fa'];
const S0 = { lean: 0.12, tilt: 0.0, px: 0, thF: 0.6, shF: 0.1, thB: -0.5, shB: -0.3, a1F: 0.62, a2F: 1.2, wpn: 2.35, a1B: -0.3, a2B: 0.34, fa: 0 };
const st = (o) => ({ ...S0, ...o });
const KF = {
  attack: [[0, st({})], [0.28, st({ lean: -0.18, tilt: -0.1, px: -8, thF: 0.12, shF: 0.0, thB: -0.6, shB: -0.42, a1F: -2.2, a2F: -2.4, wpn: 3.5, a1B: 0.5, a2B: 0.95 })],
    [0.5, st({ lean: 0.27, tilt: 0.05, px: 18, thF: 0.76, shF: 0.28, thB: -0.38, shB: -0.22, a1F: 0.95, a2F: 1.62, wpn: 1.3, a1B: -0.65, a2B: -0.2 })],
    [0.74, st({ lean: 0.12, px: 8, thF: 0.5, shF: 0.2, thB: -0.34, shB: -0.2, a1F: 0.6, a2F: 1.5, wpn: 1.95 })], [1, st({})]],
  skill: [[0, st({})], [0.18, st({ lean: -0.06, px: -4, thF: 0.5, shF: 0.0, thB: -0.55, shB: -0.1 })],
    [0.4, st({ lean: -0.08, px: -6, thF: 0.82, shF: -0.25, thB: -0.78, shB: 0.15, a1F: 2.25, a2F: 2.95, wpn: 3.05, a1B: 1.1, a2B: 1.75 })],
    [0.6, st({ lean: 0.36, tilt: 0.06, px: 24, thF: 0.95, shF: 0.34, thB: -0.42, shB: -0.3, a1F: 1.05, a2F: 1.4, wpn: 0.85, a1B: -0.95, a2B: -0.45 })],
    [0.82, st({ lean: 0.22, px: 14, thF: 0.7, shF: 0.25, thB: -0.36, shB: -0.22, a1F: 0.8, a2F: 1.3, wpn: 1.2 })], [1, st({})]],
  hit: [[0, st({ lean: -0.3, tilt: -0.26, px: -9, thF: 0.5, shF: 0.55, thB: -0.2, shB: -0.06, a1F: -0.2, a2F: 0.9, wpn: 2.9, a1B: 1.4, a2B: 2.0 })]],
  death: [[0, st({})], [0.14, st({ lean: -0.3, tilt: -0.26, px: -9, thF: 0.5, shF: 0.55, thB: -0.2, shB: -0.06, a1F: -0.2, a2F: 0.9, wpn: 2.9, a1B: 1.4, a2B: 2.0 })],
    [0.42, st({ lean: -0.55, tilt: -0.3, px: -20, thF: 1.25, shF: 0.3, thB: -1.0, shB: 0.45, a1F: 0.1, a2F: 0.5, wpn: 1.7, a1B: 0.9, a2B: 1.2 })],
    [0.62, st({ lean: -0.7, tilt: -0.4, px: -26, thF: 1.0, shF: 0.2, thB: -0.6, shB: 0.1, a1F: -0.5, a2F: -0.1, wpn: 1.6, a1B: 1.6, a2B: 1.6 })], [1, st({ lean: -0.7, tilt: -0.4, px: -26, thF: 1.0, shF: 0.2, thB: -0.6, shB: 0.1, a1F: -0.5, a2F: -0.1, wpn: 1.6, a1B: 1.6, a2B: 1.6 })]],
};
const sstep = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
function sample(frames, k) {
  if (k <= frames[0][0]) return { ...frames[0][1] };
  for (let i = 1; i < frames.length; i++) {
    if (k <= frames[i][0]) { const [t0, A] = frames[i - 1], [t1, B] = frames[i], e = sstep((k - t0) / (t1 - t0 || 1)), o = {}; for (const n of NUM) o[n] = A[n] + (B[n] - A[n]) * e; return o; }
  }
  return { ...frames[frames.length - 1][1] };
}
/** Tư thế theo tên + thời gian t (giây). k = tiến độ 0..1 cho đòn đánh / kỹ năng / ngã (nếu không truyền thì lặp theo t) */
export function solvePose(pose, t, k) {
  const P = { ...S0, breath: 0, capeSw: 0, mood: 0, slash: 0, charge: 0, shock: 0, fallK: 0, lift: 0, name: pose };
  if (pose === 'idle') {
    const b = Math.sin(t * 2.4);
    Object.assign(P, { breath: b, capeSw: Math.sin(t * 1.6) * 5, a1F: S0.a1F + b * 0.02, a2F: S0.a2F + b * 0.03, lean: S0.lean + b * 0.008 });
    P.mood = t % 3.9 < 0.13 ? 1 : 0;
  } else if (pose === 'walk') {
    const ph = t * 9.5, s = Math.sin(ph), c2 = Math.cos(ph);
    // IK hai khớp: chân trụ đi lùi đều so với thân (không trượt), chân đưa nhấc cao rồi đặt xuống
    const ik = (dx, dy) => { const A1 = 50, B1 = 48; let d = Math.hypot(dx, dy); d = Math.min(d, A1 + B1 - 0.5); const al = Math.acos((A1 * A1 + d * d - B1 * B1) / (2 * A1 * d)), th = Math.atan2(dx, dy) + al; return [th, Math.atan2(dx - A1 * Math.sin(th), dy - A1 * Math.cos(th))]; };
    const leg = (p) => { p = ((p % 1) + 1) % 1; const A = 26, Y = 78; if (p < 0.6) return ik(A - 2 * A * (p / 0.6), Y); const u = (p - 0.6) / 0.4; return ik(-A + 2 * A * u * u * (3 - 2 * u), Y - 18 * Math.sin(Math.PI * u)); };
    const [tF, sF] = leg(ph / 6.2832), [tB, sB] = leg(ph / 6.2832 + 0.5);
    Object.assign(P, { thF: tF, shF: sF, thB: tB, shB: sB,
      a1F: 0.5 - 0.3 * s, a2F: 1.2 - 0.1 * s, a1B: -0.25 + 0.4 * s, a2B: 0.45 + 0.3 * s, lean: 0.12, px: Math.sin(ph) * 3, capeSw: -10 + c2 * 5, breath: Math.abs(s) });
    P.tw = s; P.bob = Math.abs(s) * 3; P.wpn = 2.35 + 0.1 * s;
  } else if (pose === 'attack' || pose === 'skill') {
    const kk = k == null ? (t * 0.9) % 1.15 / 1.15 : k, Q = sample(KF[pose], kk);
    Object.assign(P, Q);
    if (pose === 'attack') { P.slash = kk > 0.28 && kk < 0.56 ? (kk - 0.28) / 0.28 : 0; P.mood = kk > 0.28 && kk < 0.7 ? 2 : 0; P.capeSw = kk > 0.28 ? -12 * Math.sin(Math.min(1, (kk - 0.28) / 0.4) * Math.PI) : 6 * sstep(kk / 0.28); }
    else { P.charge = kk < 0.42 ? sstep(kk / 0.4) : Math.max(0, 1 - (kk - 0.42) / 0.12); P.shock = kk > 0.42 && kk < 0.9 ? (kk - 0.42) / 0.48 : 0; P.slash = kk > 0.42 && kk < 0.66 ? (kk - 0.42) / 0.24 : 0; P.mood = kk > 0.3 && kk < 0.8 ? 2 : 0; P.capeSw = kk < 0.42 ? 14 * P.charge : -16 * Math.sin(Math.min(1, (kk - 0.42) / 0.3) * Math.PI); }
    P.kk = kk;
  } else if (pose === 'hit') {
    Object.assign(P, KF.hit[0][1]); P.mood = 3; P.capeSw = 14; P.hit = 1;
  } else if (pose === 'death') {
    const kk = k == null ? (t * 0.45) % 1.6 / 1.6 * 1.25 : k, kd = Math.min(1, kk); // dừng ở cuối một lúc rồi lặp
    Object.assign(P, sample(KF.death, kd));
    P.fallK = sstep((kd - 0.5) / 0.5); P.mood = kd > 0.82 ? 4 : kd > 0.1 ? 3 : 0; P.capeSw = 16 * (1 - P.fallK); P.hit = kd < 0.5 ? 1 : 0; P.drop = sstep((kd - 0.34) / 0.3); P.kk = kd;
  }
  return P;
}
const POSES = ['idle', 'walk', 'attack', 'skill', 'hit', 'death'];
export const KNIGHT_POSES = POSES;

/** Vật liệu giáp theo class: e = giáp chính, d = viền / khớp */
const CLS_MATS = {
  knight: { 0: { e: 'leather', d: 'leatherD' }, 2: { e: 'bone', d: 'darkmetal' }, 5: { e: 'angel', d: 'gold' } },
  wizard: { 0: { e: 'robe0', d: 'leatherD' }, 2: { e: 'robe2', d: 'bone' }, 5: { e: 'angel', d: 'gold' } },
  archer: { 0: { e: 'arch0', d: 'leatherD' }, 2: { e: 'arch2', d: 'bone' }, 5: { e: 'angel', d: 'gold' } },
};
const CLS_T = {
  wizard: { 0: { cloth: 'robe0', pants: 'robe0', boots: 'leatherD', cape: 'robe0' }, 2: { cloth: 'robe2', pants: 'robe2', boots: 'darkmetal', cape: 'robe2' }, 5: { cloth: 'clothW', pants: 'clothW', boots: 'angel', cape: 'capeWhite' } },
  archer: { 0: { cloth: 'arch0', pants: 'arch0', boots: 'leather', cape: 'arch0' }, 2: { cloth: 'arch2', pants: 'arch2', boots: 'leatherD', cape: 'arch2' }, 5: { cloth: 'clothW', pants: 'clothW', boots: 'angel', cape: 'capeWhite' } },
};
const lerpN = (a, b, u) => a + (b - a) * u;
/** Tư thế riêng cho pháp sư (chống trượng, thi triển) và xạ thủ (giương cung): ghi đè tay + vũ khí, giữ nguyên chân / thân */
function adjustPose(cls, pose, P, wt) {
  if (cls === 'knight' || pose === 'hit' || pose === 'death') return;
  const wiz = cls === 'wizard', kk = P.kk == null ? 0 : P.kk;
  const base = { a1F: wiz ? 0.5 : 0.6, a2F: wiz ? 1.15 : 1.2, a1B: -0.3, a2B: 0.45 }, rWpn = wiz ? 0.12 : 0.05;
  Object.assign(P, base); P.wpn = Math.PI - rWpn;
  if (pose === 'walk') { P.a1F += Math.sin((P.tw || 0)) * 0.05; P.a1B += (P.tw || 0) * 0.35; }
  if (pose === 'attack' || pose === 'skill') {
    const u = kk < 0.28 ? kk / 0.28 : kk < 0.56 ? 1 : 1 - (kk - 0.56) / 0.44;
    if (wiz) {
      if (pose === 'attack') { P.a1F = lerpN(0.5, 1.4, u); P.a2F = lerpN(1.15, 1.6, u); P.wpn = Math.PI - lerpN(0.12, 1.15, u); }
      else { const up = kk < 0.42 ? kk / 0.42 : 1 - (kk - 0.42) / 0.58; P.a1F = lerpN(0.5, 2.6, Math.max(0, up)); P.a2F = lerpN(1.15, 2.9, Math.max(0, up)); P.wpn = Math.PI - lerpN(0.12, kk < 0.42 ? 0.1 : 1.0, kk < 0.42 ? 1 : (kk - 0.42) / 0.58); P.a1B = lerpN(-0.3, 1.4, Math.max(0, up)); P.a2B = lerpN(0.45, 1.9, Math.max(0, up)); }
    } else {
      const pull = pose === 'skill' ? (kk < 0.4 ? kk / 0.4 : kk < 0.6 ? 1 : Math.max(0, 1 - (kk - 0.6) / 0.15)) : (kk < 0.3 ? kk / 0.3 : kk < 0.5 ? 1 : Math.max(0, 1 - (kk - 0.5) / 0.15));
      P.pull = pull; const ex = Math.min(1, Math.max(pull, u * 0.6));
      P.a1F = lerpN(0.6, 1.3, ex); P.a2F = lerpN(1.2, 1.45, ex); P.a1B = lerpN(-0.3, 0.35, pull); P.a2B = lerpN(0.45, 1.75, pull);
      P.lean = lerpN(P.lean, 0.02, pull);
      if (wt === 'crossbow') P.wpn = Math.PI - lerpN(0.9, 1.45, ex);
    }
  } else if (!wiz && wt === 'crossbow') P.wpn = Math.PI - 0.9;
}

// ---------------- DỰNG TOÀN BỘ CÁC LỚP ----------------
export const LAYER_ORDER = ['cape_back', 'arm_back', 'legs', 'body', 'armor_chest', 'armor_shoulder', 'head', 'hair', 'helmet', 'arm_front', 'weapon', 'effects'];

/**
 * @param o { tier: 0|2|5, gender: 'm'|'f', pose, t, k }  — trả về { layers, joints, root } (toạ độ cuối cùng, đã tính xoay ngã)
 */
export function buildHero(o) {
  const cls = o.cls || 'knight', wt = o.wtype || (cls === 'wizard' ? 'staff' : cls === 'archer' ? 'bow' : 'sword');
  const T = { ...(TIERS[o.tier] || TIERS[0]), ...((CLS_T[cls] || {})[o.tier] || {}) }, fem = o.gender === 'f', P = o.P || solvePose(o.pose || 'idle', o.t || 0, o.k);
  if (!o.P) adjustPose(cls, o.pose || 'idle', P, wt);
  if (o.mood != null) P.mood = o.mood;
  const layers = {}; for (const n of LAYER_ORDER) layers[n] = [];
  const add = (layer, sh) => layers[layer].push(sh);
  const part = (layer, d, m, k) => add(layer, { t: 'part', d, m, k });
  const fill = (layer, d, fl, extra = {}) => add(layer, { t: 'fill', d, fill: fl, ...extra });
  const stroke = (layer, d, s, w, extra = {}) => add(layer, { t: 'stroke', d, stroke: s, w, ...extra });

  // ---- bộ xương ----
  const sk = fem ? { sx: 33, sy: -76, hip: 16, up: 42, fo: 38 } : { sx: 52, sy: -78, hip: 21, up: 44, fo: 42 };
  const TH = 50, SHN = 48, ANK = 12;
  const legFK = (hx, th, shn) => { const hip = [hx, 0], knee = [hx + TH * Math.sin(th), TH * Math.cos(th)], ank = [knee[0] + SHN * Math.sin(shn), knee[1] + SHN * Math.cos(shn)]; return { hip, knee, ank, drop: ank[1] + ANK }; };
  const lF0 = legFK(sk.hip, P.thF, P.shF), lB0 = legFK(-sk.hip, P.thB, P.shB);
  const py = -Math.max(lF0.drop, lB0.drop) - (P.bob || 0) + 0;
  const pel = [P.px, py + (P.drop || 0) * 46];
  // gốc xoay khi ngã: xoay quanh bàn chân sau chạm đất, hạ xuống để nằm trên mặt đất
  const fall = P.fallK || 0;
  const rootA = -1.5 * fall, pivot = [pel[0] - 10, 0], lift = -34 * fall;
  const W = (x, y) => {
    if (!fall) return [x, y];
    const dx = x - pivot[0], dy = y - pivot[1], c = Math.cos(rootA), s = Math.sin(rootA);
    return [pivot[0] + dx * c - dy * s, pivot[1] + dx * s + dy * c + lift];
  };
  const TR = (x, y) => { const [a, b] = rot(x, y, P.lean); return W(pel[0] + a, pel[1] + b); };               // khung thân (gốc = hông)
  const HD = (x, y) => { const [nx, ny] = [4, -74], [a, b] = rot(x, y + 208, P.lean + P.tilt); const [c0, c1] = rot(nx, ny, P.lean); return W(pel[0] + c0 + a, pel[1] + c1 + b); }; // khung đầu (toạ độ nghỉ tuyệt đối)
  const wp = (p) => W(pel[0] + p[0], pel[1] + p[1]);
  const legPts = (L) => ({ hip: wp(L.hip), knee: wp(L.knee), ank: wp(L.ank) });
  const lF = legPts(lF0), lB = legPts(lB0);
  const tw = (P.tw || 0) * 7, shF = TR(sk.sx - tw, sk.sy), shB = TR(-sk.sx - tw, sk.sy);
  const armFK = (sh, a1, a2) => { const el = [sh[0] + sk.up * Math.sin(a1), sh[1] + sk.up * Math.cos(a1)]; const wr = [el[0] + sk.fo * Math.sin(a2), el[1] + sk.fo * Math.cos(a2)]; return { sh, el, wr, hand: [wr[0] + 9 * Math.sin(a2), wr[1] + 9 * Math.cos(a2)] }; };
  // khi ngã, xoay thêm góc root cho các góc tuyệt đối của chi
  const ra = (a) => a + rootA;
  const aF = armFK(shF, ra(P.a1F), ra(P.a2F)), aB = armFK(shB, ra(P.a1B), ra(P.a2B));
  const neck = TR(4, -74);
  const J = { pel: wp([0, 0]), neck, shF, shB, aF, aB, lF, lB, head: HD(6, -270) };

  const outfit = T;
  // ============ cape_back (+ tóc dài sau lưng của nữ) ============
  {
    if (fem) {
      const sway = (x, y) => { const [u, v] = HD(x, y), kk = Math.min(1, Math.max(0, (y + 322) / 136)); return [u - (P.capeSw || 0) * 1.1 * kk * kk, v]; }; // đuôi tóc đung đưa trễ, càng gần ngọn càng nhiều
      const h = (d, m, k) => part('cape_back', xf(d, sway), m, k);
      h('M -40 -322 Q -92 -352 -124 -300 Q -140 -240 -100 -186 Q -106 -236 -84 -270 Q -64 -296 -36 -294 Z', 'hairF', 0.8); h('M -64 -300 Q -104 -300 -112 -250 Q -100 -222 -90 -214 Q -92 -250 -74 -274 Z', 'hairF', 0.5);
      stroke('cape_back', xf('M -60 -326 Q -108 -318 -118 -268', sway), M('hairF').l, 6, { a: 0.7 }); part('cape_back', xf('M -52 -330 Q -40 -338 -34 -322 Q -42 -306 -54 -312 Z', HD), 'gold', 0.4);
    }
    const sw = P.capeSw || 0, len = outfit.capeLen * (cls === 'knight' ? 1 : 0.65), flare = 26 + len * 0.3;
    const top1 = TR(-46, -92), top2 = TR(10, -96);
    const hem = (x, y) => TR(x, y);
    const bl = hem(-44 - flare, len + 6), bm = hem(-20 - flare * 0.5, len + 16), br = hem(14 - flare * 0.2, len + 8);
    const sx = sw * 0.7, sy = Math.abs(sw) * 0.15;
    const d = 'M' + f1(top1[0]) + ' ' + f1(top1[1]) + 'Q' + f1(top1[0] - 10 + sx * 0.3) + ' ' + f1((top1[1] + bl[1]) / 2) + ' ' + f1(bl[0] + sx) + ' ' + f1(bl[1] + sy) +
      'Q' + f1(bm[0] + sx * 0.8) + ' ' + f1(bm[1] + 14 + sy) + ' ' + f1((bl[0] + bm[0]) / 2 + sx) + ' ' + f1(bm[1] + 4 + sy) + 'Q' + f1(bm[0] + 6 + sx) + ' ' + f1(bm[1] + 16 + sy) + ' ' + f1(br[0] + sx * 0.8) + ' ' + f1(br[1] + sy) +
      'Q' + f1(top2[0] + 6) + ' ' + f1((top2[1] + br[1]) / 2) + ' ' + f1(top2[0]) + ' ' + f1(top2[1]) + 'Z';
    part('cape_back', d, outfit.cape, 0.8);
    { const li = 'M' + f1(top2[0]) + ' ' + f1(top2[1]) + 'L' + f1(br[0] + sx * 0.8) + ' ' + f1(br[1] + sy) + 'L' + f1(br[0] - 26 + sx * 0.8) + ' ' + f1(br[1] + 6 + sy) + 'L' + f1(top2[0] - 22) + ' ' + f1(top2[1] + 4) + 'Z'; fill('cape_back', li, M(outfit.cape).o, { a: 0.55, clip: d }); } // mặt trong tối hơn
    // nếp gấp: 3 đường từ vai xuống gấu
    for (const [fx, w] of [[-8, 4], [8, 3.5], [24, 3]]) {
      const a = TR(-20 + fx * 0.5, -88), b = [(bl[0] + br[0]) / 2 + (fx - 4) * 1.2 + sx, (bl[1] + br[1]) / 2 + sy];
      stroke('cape_back', 'M' + f1(a[0]) + ' ' + f1(a[1]) + 'Q' + f1((a[0] + b[0]) / 2 - 4 + sx * 0.3) + ' ' + f1((a[1] + b[1]) / 2) + ' ' + f1(b[0]) + ' ' + f1(b[1] - 6), M(outfit.cape).o, w, { a: 0.45 });
    }
    if (o.tier === 5) { // viền vàng
      stroke('cape_back', 'M' + f1(bl[0] + sx) + ' ' + f1(bl[1] + sy) + 'Q' + f1(bm[0] + sx) + ' ' + f1(bm[1] + 10 + sy) + ' ' + f1(br[0] + sx * 0.8) + ' ' + f1(br[1] + sy), M('gold').b, 6, {});
    }
  }

  const tier = o.tier, fw = fem ? 0.8 : 1, T2 = (x, y) => TR(x * fw, y);
  const baseTF = (origin, a, sc = 1) => (x, y) => { const [u, v] = rot(x * sc, y * sc, a); return [origin[0] + u, origin[1] + v]; };
  const circ = (cx, cy, r) => ell((x, y) => [x, y], cx, cy, r, r);
  const eMat = CLS_MATS[cls][tier].e, dMat = CLS_MATS[cls][tier].d;           // vật liệu giáp chính / viền-khớp theo class
  const gaunM = eMat, gaunT = dMat;

  // ============ [LEGS] chân lệch trước sau, giáp đùi / gối / ống / ủng ============
  {
    const support = lF0.drop >= lB0.drop ? 'F' : 'B';
    const lk = tier === 5 ? 1.2 : tier === 2 ? 1.08 : 1; // bậc cao: chân dày, vững hơn (không kéo dài)
    const leg = (L, sideF) => {
      part('legs', limb(L.hip, L.knee, 18 * lk, 14 * lk), T.pants, 0.8);
      part('legs', limb(L.knee, L.ank, 14 * lk, 10.5 * lk), T.pants, 0.8);
      if (tier > 0 && cls === 'knight') part('legs', limb(lerp2(L.hip, L.knee, 0.1), lerp2(L.hip, L.knee, 0.8), 20.5 * lk, 16 * lk), eMat, 0.7); // giáp đùi
      part('legs', limb(lerp2(L.knee, L.ank, 0.2), lerp2(L.knee, L.ank, 0.92), 15 * lk, 11.5 * lk), tier === 0 ? 'leather' : tier === 2 ? 'darkmetal' : 'angel', 0.7); // giáp ống chân
      part('legs', xf('M -15 -3 Q -13 -17 2 -18 Q 19 -17 18 -2 Q 16 12 1 13 Q -14 11 -15 -3 Z', baseTF(L.knee, 0)), tier === 0 ? 'leatherD' : tier === 2 ? 'bone' : 'gold', 0.6); // mũ gối
      const grounded = (support === 'F') === sideF;
      const fa = (grounded ? (sideF ? -0.04 : Math.max(0, Math.min(0.5, -P.shB * 0.55))) : 0.26) + (fall ? rootA : 0);
      const tf = baseTF(L.ank, fa, 0.92 * (tier === 5 ? 1.12 : tier === 2 ? 1.05 : 1));
      const bm = T.boots;
      part('legs', xf('M -16 -46 L 18 -46 L 20 -12 Q 42 -12 52 5 Q 56 13 46 15 L -14 15 Q -23 15 -23 6 L -18 -10 Z', tf), bm, 0.8); // thân ủng + mũi
      part('legs', xf('M -24 7 L 52 7 L 53 15 Q 51 18 43 18 L -14 18 Q -24 18 -24 8 Z', tf), 'leatherD', 0.6);                          // đế
      part('legs', xf('M -21 -50 L 23 -50 L 22 -30 L -20 -30 Z', tf), dMat, 0.6);                                                       // cổ ủng
      if (tier === 2) { part('legs', xf('M 24 -6 Q 46 -8 51 5 Q 52 13 44 14 L 26 14 Z', tf), 'bone', 0.5); part('legs', xf('M -22 -4 L -38 10 L -22 14 Z', tf), 'darkmetal', 0.5); }
      if (tier === 5) { part('legs', xf('M 24 -6 Q 46 -8 51 5 Q 52 13 44 14 L 26 14 Z', tf), 'gold', 0.5); part('legs', xf('M -18 -40 Q -48 -58 -56 -32 Q -34 -34 -18 -24 Z', tf), 'clothW', 0.5); }
    };
    leg(lB, false); leg(lF, true);
  }

  // ============ [ARMS] tay: tay áo → giáp bắp → khuỷu → găng phân đoạn → nắm tay ============
  const armLayer = (A, layer) => {
    if (cls === 'wizard') { // tay áo rộng, bo cổ tay
      part(layer, limb(A.sh, A.el, 17, 15), eMat, 0.8); part(layer, limb(A.el, A.wr, 16, 12.5), eMat, 0.8);
      part(layer, limb(lerp2(A.el, A.wr, 0.72), A.wr, 13.5, 13), dMat, 0.55); return;
    }
    if (cls === 'archer') { // da nhẹ + găng hở ngón
      part(layer, limb(A.sh, A.el, 14, 12), eMat, 0.8); part(layer, limb(A.el, A.wr, 12, 10.5), eMat, 0.8);
      part(layer, limb(lerp2(A.el, A.wr, 0.3), A.wr, 13.4, 12), dMat, 0.55); part(layer, xf('M -12 2 Q -13 -12 2 -14 Q 16 -13 15 2 Q 14 12 2 13 Q -11 11 -12 2 Z', baseTF(A.el, 0)), dMat, 0.6); return;
    }
    const sleeve = tier === 5 ? 'clothW' : tier === 2 ? 'cloth' : 'leatherD';
    part(layer, limb(A.sh, A.el, 15, 12.5), sleeve, 0.8);
    if (tier > 0) part(layer, limb(lerp2(A.sh, A.el, 0.3), lerp2(A.sh, A.el, 0.86), 16.5, 14.5), eMat, 0.6);
    part(layer, limb(A.el, A.wr, 12.5, 10.5), sleeve, 0.8);
    part(layer, xf('M -13 2 Q -14 -14 2 -16 Q 18 -15 17 2 Q 16 14 2 15 Q -12 13 -13 2 Z', baseTF(A.el, 0)), dMat, 0.6); // khuỷu
    for (const [a, b, r, m] of [[0.22, 0.5, 14, eMat], [0.5, 0.76, 13.4, dMat], [0.76, 1.0, 12.6, eMat]]) part(layer, limb(lerp2(A.el, A.wr, a), lerp2(A.el, A.wr, b), r, r - 0.6), m, 0.55);
  };
  // giáp vai: 3 thiết kế khác hẳn nhau theo bậc (khung gốc tại khớp vai, +x là hướng ra trước)
  const pauldron0 = (layer, sh, ang, sc) => {
    const tf = (x, y) => { const [u, v] = rot(x * sc, y * sc, ang); return [sh[0] + u, sh[1] + v - 4]; };
    fill(layer, ell(tf, 4, 20, 40 * (tier === 0 ? 0.8 : 1), 14), '#10081a', { a: 0.3 }); // bóng tiếp xúc
    const P_ = (d, m, k) => part(layer, xf(d, tf), m, k);
    if (cls === 'wizard') { // áo choàng vai: gọn, mềm
      P_('M -28 8 Q -34 -16 0 -22 Q 34 -20 38 8 Q 6 16 -28 8 Z', eMat, 0.8);
      stroke(layer, xf('M -22 -4 Q 4 8 32 -4', tf), M(dMat).b, 4, { a: 0.9 });
      if (tier === 2) { P_('M 30 -6 Q 52 -12 54 -44 Q 40 -30 24 -22 Z', 'bone', 0.5); P_('M -26 -6 Q -48 -14 -50 -40 Q -36 -28 -20 -20 Z', 'bone', 0.5); }
      if (tier === 5) { P_('M -20 -6 Q -52 -22 -62 -58 Q -34 -52 -10 -24 Z', 'clothW', 0.5); P_('M -14 2 Q -50 -2 -72 -30 Q -42 -30 -8 -8 Z', 'angel', 0.5); }
      return;
    }
    if (cls === 'archer') { // giáp vai da lệch một bên + lông vũ / xương
      P_('M -24 6 Q -30 -16 -2 -22 Q 28 -22 32 2 Q 12 12 -24 6 Z', eMat, 0.8);
      stroke(layer, xf('M -14 -10 Q 2 -2 20 -10', tf), M(dMat).o, 3, { a: 0.75, dash: [6, 5] });
      if (tier === 2) { P_('M 26 -8 Q 54 -16 58 -46 Q 42 -34 22 -24 Z', 'bone', 0.5); P_('M -22 -4 Q -44 -12 -46 -38 Q -34 -26 -16 -18 Z', 'bone', 0.5); }
      if (tier === 5) { P_('M -18 -4 Q -50 -20 -62 -54 Q -32 -48 -8 -22 Z', 'angel', 0.5); P_('M -12 2 Q -48 0 -70 -26 Q -40 -28 -6 -8 Z', 'gold', 0.4); }
      return;
    }
    if (tier === 0) { // da: một mảnh tròn, gọn
      P_('M -24 6 Q -30 -18 -2 -24 Q 28 -24 32 2 Q 12 12 -24 6 Z', 'leather', 0.8);
      stroke(layer, xf('M -14 -12 Q 2 -4 20 -12', tf), M('leatherD').o, 3, { a: 0.75, dash: [6, 5] });
    } else if (tier === 2) { // xương: ba tấm cong chồng tầng, loe ra ngoài + gai cong
      P_('M -36 18 Q -48 -6 -10 -8 Q 32 -8 50 14 Q 12 30 -36 18 Z', 'bone', 0.7);
      P_('M -34 2 Q -42 -22 -6 -26 Q 32 -26 46 -2 Q 8 14 -34 2 Z', 'bone', 0.8);
      P_('M -28 -12 Q -32 -40 0 -44 Q 32 -42 36 -14 Q 4 -2 -28 -12 Z', 'bone', 0.9);
      P_('M 34 -6 Q 66 -14 70 -50 Q 50 -34 28 -26 Z', 'darkmetal', 0.5);
      stroke(layer, xf('M -30 -10 Q 4 4 36 -12', tf), M('darkmetal').o, 3.2, { a: 0.8 });
    } else { // thiên thần: vòm trắng vàng + cánh lông vũ vút lên ra sau
      P_('M -22 -8 Q -50 -26 -62 -70 Q -30 -62 -4 -32 Z', 'clothW', 0.5);
      P_('M -16 0 Q -56 -10 -78 -44 Q -40 -42 -8 -16 Z', 'angel', 0.6);
      P_('M -12 6 Q -52 10 -80 -12 Q -42 -20 -6 -2 Z', 'angel', 0.5);
      P_('M -32 12 Q -38 -24 0 -30 Q 38 -28 40 4 Q 4 18 -32 12 Z', 'angel', 0.95);
      P_('M -34 6 Q 4 22 42 2 L 42 10 Q 4 30 -34 16 Z', 'gold', 0.5);
      stroke(layer, xf('M 2 -28 Q 8 -10 4 14', tf), M('gold').l, 3.5, { a: 0.9 });
    }
  };

  const style = o.set ? o.set.style : null;
  const pauldron = (layer, sh, ang, sc) => {
    pauldron0(layer, sh, ang, sc);
    if (!style) return;
    const tf = (x, y) => { const [u, v] = rot(x * sc, y * sc, ang); return [sh[0] + u, sh[1] + v - 4]; }, P_ = (d, m, k) => part(layer, xf(d, tf), m, k);
    if (style === 'bronze') { for (const x of [-16, 0, 16]) fill(layer, ell(tf, x, -10, 2.6, 2.6), '#f0c080'); stroke(layer, xf('M -26 2 Q 2 14 32 0', tf), M('gold').b, 3, {}); }
    else if (style === 'fur') { for (const [x, y] of [[-20, -6], [-8, -14], [6, -16], [20, -8]]) P_('M ' + (x - 7) + ' ' + y + ' Q ' + (x - 5) + ' ' + (y - 14) + ' ' + x + ' ' + (y - 16) + ' Q ' + (x + 5) + ' ' + (y - 12) + ' ' + (x + 7) + ' ' + y + ' Z', 'clothW', 0.4); }
    else if (style === 'ice') { for (const [x, h, w] of [[-14, 34, 8], [2, 46, 9], [18, 30, 7]]) P_('M ' + (x - w) + ' -14 L ' + x + ' ' + (-14 - h) + ' L ' + (x + w) + ' -14 Z', 'crystal', 0.5); }
    else if (style === 'dragon') { P_('M 28 -8 Q 62 -20 66 -58 Q 46 -38 22 -26 Z', 'darkmetal', 0.5); P_('M -6 -26 Q -14 -52 -4 -72 Q 6 -50 8 -28 Z', 'darkmetal', 0.5); stroke(layer, xf('M -24 -6 Q 2 -16 30 -8', tf), M('gold').l, 2.4, { a: 0.9 }); }
    else if (style === 'leaf') { for (const [x, y, r] of [[-18, -14, -0.6], [0, -22, 0], [18, -14, 0.6]]) P_(ell((a, b) => [a, b], x, y, 6, 14, r), 'arch0', 0.4); }
    else if (style === 'magma') { stroke(layer, xf('M -18 -10 L -6 -2 L -10 8 M 10 -14 L 18 -4 L 12 6', tf), '#ffae3a', 3, { a: 0.95 }); }
    else if (style === 'shadow') { P_('M -10 -24 Q -6 -44 6 -54 Q 8 -36 4 -22 Z', 'orbP', 0.4); }
  };

  // ============ arm_back ============
  armLayer(aB, 'arm_back');
  pauldron('arm_back', shB, P.lean + ra(P.a1B) * 0.3, 0.9);

  // ============ [BODY] cổ + áo lót hình thang thu về eo ============
  part('body', limb(T2(4, -70), HD(6, -226), 12, 12.5), 'skin', 0.7);
  part('body', xf('M -30 8 Q -36 -18 -42 -40 Q -52 -60 -50 -76 Q -22 -88 6 -86 Q 38 -86 54 -74 Q 56 -58 46 -40 Q 38 -20 36 8 Z', T2), T.cloth, 0.8);

  // ============ [CHEST ARMOR] ngực → bụng → hông thành các khối ============
  if (cls === 'knight') {
    const CH = 'M -32 -2 Q -38 -22 -44 -42 Q -54 -62 -50 -76 Q -22 -90 6 -88 Q 40 -88 56 -74 Q 58 -58 48 -40 Q 40 -22 38 -2 Q 4 6 -32 -2 Z';
    const chd = xf(CH, T2);
    part('armor_chest', chd, tier === 2 ? 'darkmetal' : eMat, 0.9);
    fill('armor_chest', xf('M -80 -120 L -4 -120 L -20 8 L -80 8 Z', T2), '#ffffff', { a: tier === 0 ? 0.1 : 0.16, clip: chd });
    fill('armor_chest', xf('M 26 -120 L 80 -120 L 80 8 L 34 8 Z', T2), '#14082a', { a: 0.26, clip: chd });
    if (tier === 0) { // da nhiều lớp: yếm trên, đai chéo, dải dưới
      part('armor_chest', xf('M -34 -26 Q 4 -14 40 -26 L 38 -2 Q 4 6 -32 -2 Z', T2), 'leatherD', 0.5);
      part('armor_chest', xf('M -44 -78 Q -20 -64 6 -68 Q 30 -66 50 -76 L 52 -62 Q 28 -52 4 -54 Q -22 -52 -46 -62 Z', T2), 'leather', 0.6);
      stroke('armor_chest', xf('M -40 -70 L 36 -26', T2), M('leatherD').o, 8, {}); stroke('armor_chest', xf('M -40 -70 L 36 -26', T2), M('leather').b, 5, {});
      part('armor_chest', xf('M -26 -90 Q 6 -102 40 -88 L 34 -76 Q 6 -90 -20 -76 Z', T2), 'leatherD', 0.5);
      for (const [x, y] of [[-34, -60], [38, -58]]) fill('armor_chest', ell(T2, x, y, 2.6, 2.6), '#d9c9a0');
    } else if (tier === 2) { // xương: tấm xương cong chồng lên nền thép tối
      for (let i = 0; i < 4; i++) { const y = -76 + i * 13;
        part('armor_chest', xf('M -46 ' + y + ' Q -24 ' + (y - 12) + ' -4 ' + (y + 2) + ' L -4 ' + (y + 12) + ' Q -24 ' + (y + 2) + ' -44 ' + (y + 14) + ' Z', T2), 'bone', 0.7);
        part('armor_chest', xf('M 12 ' + (y + 2) + ' Q 34 ' + (y - 12) + ' 54 ' + y + ' L 52 ' + (y + 14) + ' Q 34 ' + (y + 2) + ' 12 ' + (y + 12) + ' Z', T2), 'bone', 0.7); }
      part('armor_chest', xf('M -6 -88 Q 8 -94 20 -88 Q 24 -56 16 -28 Q 8 -22 0 -28 Q -10 -56 -6 -88 Z', T2), 'bone', 0.9);
      fill('armor_chest', ell(T2, 7, -70, 4.5, 5), '#1a1410'); fill('armor_chest', xf('M 4 -62 L 10 -62 L 7 -52 Z', T2), '#1a1410');
      part('armor_chest', xf('M -38 -30 Q 4 -20 42 -32 L 42 -20 Q 4 -8 -38 -18 Z', T2), 'bone', 0.5);
    } else { // thiên thần: giáp chữ V trắng bạc, bụng xếp tầng, pha lê lớn
      part('armor_chest', xf('M -48 -78 Q -22 -92 6 -90 Q 34 -92 58 -76 Q 42 -48 6 -20 Q -30 -48 -48 -78 Z', T2), 'angel', 0.95);
      stroke('armor_chest', xf('M -48 -78 Q -30 -48 6 -20 Q 42 -48 58 -76', T2), M('gold').b, 5.5, {});
      stroke('armor_chest', xf('M -34 -74 Q -18 -52 6 -34 Q 28 -52 44 -74', T2), M('gold').l, 2.4, { a: 0.8 });
      for (let i = 0; i < 3; i++) { const y = -30 + i * 9; part('armor_chest', xf('M -30 ' + y + ' Q 6 ' + (y + 8) + ' 42 ' + y + ' L 40 ' + (y + 9) + ' Q 6 ' + (y + 17) + ' -28 ' + (y + 9) + ' Z', T2), i === 1 ? 'gold' : 'angel', 0.4); }
      part('armor_chest', xf('M -38 -98 Q 6 -114 52 -96 L 46 -83 Q 6 -100 -32 -83 Z', T2), 'gold', 0.6);
      part('armor_chest', xf('M 6 -84 L 22 -62 L 6 -36 L -10 -62 Z', T2), 'gold', 0.5);
      part('armor_chest', xf('M 6 -78 L 16 -62 L 6 -44 L -4 -62 Z', T2), 'crystal', 0.5); // pha lê trung tâm lớn
    }
    // thắt lưng + khóa
    part('armor_chest', xf('M -36 -14 Q 4 -4 42 -14 L 42 2 Q 4 12 -36 2 Z', T2), tier === 0 ? 'leatherD' : tier === 2 ? 'darkmetal' : 'gold', 0.6);
    part('armor_chest', xf('M -8 -17 L 18 -17 L 18 7 L -8 7 Z', T2), tier === 0 ? 'steel' : tier === 2 ? 'bone' : 'crystal', 0.5);
    if (fem) { // váy giáp xòe nhẹ
      part('armor_chest', xf('M -44 0 Q 6 14 56 0 L 72 50 Q 8 66 -62 50 Z', TR), eMat, 0.8);
      part('armor_chest', xf('M -62 42 Q 8 58 72 42 L 72 50 Q 8 66 -62 50 Z', TR), dMat, 0.5);
    } else if (tier === 5) { // giáp hông dạng cánh
      part('armor_chest', xf('M -40 0 Q -76 4 -84 44 Q -54 40 -22 6 Z', T2), 'angel', 0.7); part('armor_chest', xf('M -34 10 Q -62 24 -64 58 Q -40 46 -20 12 Z', T2), 'gold', 0.5);
      part('armor_chest', xf('M 44 0 Q 80 4 88 44 Q 58 40 26 6 Z', T2), 'angel', 0.7); part('armor_chest', xf('M 38 10 Q 66 24 68 58 Q 44 46 24 12 Z', T2), 'gold', 0.5);
      part('armor_chest', xf('M -14 2 L 24 2 L 22 52 L 5 62 L -12 52 Z', T2), T.cape, 0.5);
    } else { // giáp hông hai bên + tabard giữa + túi
      part('armor_chest', xf('M -42 0 Q -60 22 -52 46 L -26 44 L -22 2 Z', T2), eMat, 0.7);
      part('armor_chest', xf('M 40 0 Q 62 22 56 46 L 30 44 L 26 2 Z', T2), eMat, 0.7);
      part('armor_chest', xf('M -14 2 L 24 2 L 22 52 L 5 62 L -12 52 Z', T2), T.cape, 0.5);
    }
  }
  else if (cls === 'wizard') { // áo choàng dài: thân hình thang, váy xòe tới gối, đai lưng, cổ áo
    const robe = xf('M -40 -80 Q -18 -92 6 -90 Q 40 -90 54 -76 Q 52 -44 46 -12 Q 62 28 72 66 Q 4 80 -74 66 Q -54 28 -40 -12 Q -48 -46 -40 -80 Z', T2);
    part('armor_chest', robe, eMat, 0.9);
    fill('armor_chest', xf('M -90 -120 L -6 -120 L -20 90 L -90 90 Z', T2), '#ffffff', { a: 0.13, clip: robe });
    fill('armor_chest', xf('M 24 -120 L 90 -120 L 90 90 L 36 90 Z', T2), '#14082a', { a: 0.26, clip: robe });
    for (const x of [-34, -8, 22, 46]) stroke('armor_chest', xf('M ' + (x * 0.5) + ' -4 Q ' + x + ' 30 ' + (x * 1.3) + ' 66', T2), M(eMat).o, 3, { a: 0.4, clip: robe });
    part('armor_chest', xf('M -76 58 Q 4 72 74 58 L 74 68 Q 4 82 -76 68 Z', T2), dMat, 0.5);
    part('armor_chest', xf('M -26 -94 Q 6 -106 40 -92 L 34 -76 Q 6 -90 -20 -76 Z', T2), dMat, 0.5);
    part('armor_chest', xf('M -42 -22 Q 4 -10 48 -22 L 48 -6 Q 4 6 -42 -6 Z', T2), dMat, 0.6);
    part('armor_chest', xf('M 4 -26 L 16 -14 L 4 -2 L -8 -14 Z', T2), tier === 2 ? 'orbP' : 'crystal', 0.5);
    if (tier === 2) { part('armor_chest', xf('M -36 -92 L -48 -118 L -22 -96 Z', T2), 'bone', 0.4); part('armor_chest', xf('M 42 -92 L 54 -118 L 30 -96 Z', T2), 'bone', 0.4); part('armor_chest', xf(ell((x, y) => [x, y], 7, -62, 9, 10), T2), 'bone', 0.5); fill('armor_chest', xf(ell((x, y) => [x, y], 3, -63, 2.2, 3), T2), '#1a1410'); fill('armor_chest', xf(ell((x, y) => [x, y], 11, -63, 2.2, 3), T2), '#1a1410'); }
    if (tier === 5) { stroke('armor_chest', xf('M -36 -84 Q 6 -40 48 -84', T2), M('gold').b, 5, {}); part('armor_chest', xf('M 6 -70 L 18 -54 L 6 -38 L -6 -54 Z', T2), 'crystal', 0.5); part('armor_chest', xf('M -16 8 L 24 8 L 20 64 L 4 72 L -12 64 Z', T2), 'gold', 0.4); }
  } else { // xạ thủ: áo da nhẹ, đai chéo đựng ống tên, thắt lưng + túi, tabard ngắn
    const jk = xf('M -34 -2 Q -40 -24 -46 -44 Q -54 -64 -48 -76 Q -22 -88 6 -86 Q 38 -86 54 -74 Q 56 -58 46 -40 Q 40 -22 38 -2 Q 4 6 -34 -2 Z', T2);
    part('armor_chest', jk, eMat, 0.9);
    fill('armor_chest', xf('M -80 -120 L -4 -120 L -20 8 L -80 8 Z', T2), '#ffffff', { a: 0.12, clip: jk });
    fill('armor_chest', xf('M 26 -120 L 80 -120 L 80 8 L 34 8 Z', T2), '#14082a', { a: 0.25, clip: jk });
    stroke('armor_chest', xf('M -42 -76 L 40 -20', T2), M(dMat).o, 9, {}); stroke('armor_chest', xf('M -42 -76 L 40 -20', T2), M(dMat).b, 5.5, {});
    part('armor_chest', xf('M -26 -92 Q 6 -102 40 -90 L 34 -76 Q 6 -88 -20 -76 Z', T2), dMat, 0.5);
    if (tier === 2) part('armor_chest', xf('M -16 -80 Q 8 -90 32 -80 L 26 -50 Q 8 -42 -10 -50 Z', T2), 'bone', 0.7);
    if (tier === 5) { part('armor_chest', xf('M -44 -76 Q -18 -90 8 -86 Q 6 -62 -4 -42 Q -26 -50 -44 -76 Z', T2), 'angel', 0.8); part('armor_chest', xf('M 8 -86 Q 36 -90 54 -74 Q 48 -52 30 -42 Q 8 -48 8 -86 Z', T2), 'angel', 0.6); part('armor_chest', xf('M 6 -72 L 16 -58 L 6 -44 L -4 -58 Z', T2), 'crystal', 0.5); }
    part('armor_chest', xf('M -36 -16 Q 4 -6 42 -16 L 42 0 Q 4 10 -36 0 Z', T2), dMat, 0.6);
    part('armor_chest', xf('M -6 -19 L 16 -19 L 16 5 L -6 5 Z', T2), tier === 0 ? 'steel' : tier === 2 ? 'bone' : 'crystal', 0.5);
    part('armor_chest', xf('M 24 -4 Q 46 -4 50 8 L 46 26 Q 36 32 26 24 Z', T2), 'leatherD', 0.5);
    part('armor_chest', xf('M -14 2 L 24 2 L 20 40 L 4 48 L -12 40 Z', T2), T.cape, 0.5);
    // ống tên sau lưng (vẽ ở lớp áo choàng, nằm sau thân)
    part('cape_back', xf('M -60 -96 Q -68 -82 -60 -34 L -42 -28 Q -44 -80 -42 -100 Z', T2), 'leatherD', 0.5);
    for (const [x, y, c0] of [[-56, -100, '#d8d0b8'], [-50, -104, '#e84a4a'], [-45, -100, '#d8d0b8']]) stroke('cape_back', xf('M ' + x + ' ' + y + ' L ' + (x + 2) + ' ' + (y - 20), T2), c0, 4, {});
  }

  // ============ armor_shoulder (vai gần camera, lớn hơn) ============
  pauldron('armor_shoulder', shF, P.lean + ra(P.a1F) * 0.3, 1.18);

  // ============ head: đầu + khuôn mặt ============
  {
    part('head', xf('M -48 -280 Q -54 -240 -34 -226 Q -10 -212 16 -216 Q 42 -220 54 -234 Q 64 -250 58 -278 Q 56 -318 6 -322 Q -44 -320 -48 -280 Z', HD), 'skin', 1);
    fill('head', ell(HD, 54, -244, 8, 4), '#ff8a7a', { a: 0.42 }); fill('head', ell(HD, 6, -244, 6, 3.5), '#ff8a7a', { a: 0.42 });
    stroke('head', xf('M 31 -250 Q 34 -246 31 -243', HD), '#c98a68', 2.6, {});
    const iris = fem ? '#3a64b8' : '#a0602a', mood = P.mood || 0, hc = fem ? '#7a2a22' : '#4a2c1c';
    const eye = (cx, cy, rx, ry) => {
      fill('head', ell(HD, cx, cy, rx, ry), '#241210');
      fill('head', ell(HD, cx + 0.6, cy + ry * 0.14, rx * 0.84, ry * 0.8), iris);
      fill('head', ell(HD, cx + 0.8, cy + ry * 0.5, rx * 0.6, ry * 0.3), mix(iris, '#ffffff', 0.5), { a: 0.9 });
      fill('head', ell(HD, cx + 0.8, cy - ry * 0.02, rx * 0.4, ry * 0.46), '#10060a');
      fill('head', ell(HD, cx - rx * 0.28, cy - ry * 0.4, rx * 0.34, rx * 0.34), '#ffffff');
      fill('head', ell(HD, cx + rx * 0.36, cy + ry * 0.42, rx * 0.16, rx * 0.16), '#ffffff');
      stroke('head', xf('M ' + (cx - rx * 1.02) + ' ' + (cy - ry * 0.5) + ' Q ' + cx + ' ' + (cy - ry * 1.22) + ' ' + (cx + rx * 1.05) + ' ' + (cy - ry * 0.62), HD), '#1a0a08', fem ? 6.5 : 5.5, {});
      fill('head', ell(HD, cx + 0.6, cy - ry * 0.12, rx * 0.8, ry * 0.5), mix(iris, '#0a1840', 0.5), { a: 0.75 });
      stroke('head', xf('M ' + (cx - rx * 0.8) + ' ' + (cy + ry * 1.02) + ' Q ' + cx + ' ' + (cy + ry * 1.28) + ' ' + (cx + rx * 0.85) + ' ' + (cy + ry * 0.96), HD), '#b8705a', 2.4, { a: 0.7 });
      if (fem) stroke('head', xf('M ' + (cx + rx * 1.02) + ' ' + (cy - ry * 0.62) + ' L ' + (cx + rx * 1.5) + ' ' + (cy - ry * 1.0), HD), '#1a0a08', 4.5, {});
    };
    if (mood === 1) { stroke('head', xf('M 6 -262 Q 14 -254 23 -262', HD), '#2a1610', 5, {}); stroke('head', xf('M 31 -262 Q 43 -251 53 -262', HD), '#2a1610', 5, {}); }
    else if (mood === 3) { stroke('head', xf('M 6 -272 L 22 -262 L 6 -252', HD), '#2a1610', 5.5, {}); stroke('head', xf('M 54 -274 L 34 -262 L 54 -250', HD), '#2a1610', 5.5, {}); }
    else if (mood === 5) { stroke('head', xf('M 3 -256 Q 14 -276 25 -256', HD), '#1a0a08', 6, {}); stroke('head', xf('M 31 -256 Q 43 -278 56 -256', HD), '#1a0a08', 6, {}); }
    else if (mood === 4) { for (const [x, r] of [[14, 8], [43, 9]]) stroke('head', xf('M ' + (x - r) + ' ' + (-262 - r) + ' L ' + (x + r) + ' ' + (-262 + r) + ' M ' + (x + r) + ' ' + (-262 - r) + ' L ' + (x - r) + ' ' + (-262 + r), HD), '#2a1610', 5.5, {}); }
    else { eye(14, -262, 9, 13.5); eye(43, -262, 11, 15.5); }
    // lông mày quyết đoán: dốc xuống về phía mũi; khi ra đòn nhíu mạnh hơn
    if (mood === 2) { stroke('head', xf('M 3 -284 L 23 -276', HD), '#3a2418', 5.5, {}); stroke('head', xf('M 56 -286 L 32 -277', HD), '#3a2418', 5.5, {}); }
    else if (mood === 3) { stroke('head', xf('M 4 -278 L 24 -282', HD), hc, 4.4, {}); stroke('head', xf('M 34 -289 L 55 -280', HD), hc, 4.4, {}); }
    else { stroke('head', xf('M 4 -281 Q 14 -286 24 -277', HD), hc, fem ? 3.2 : 4.6, {}); stroke('head', xf('M 31 -286 Q 44 -293 56 -280', HD), hc, fem ? 3.2 : 4.6, {}); }
    // miệng
    const lip = fem ? '#b0504e' : '#8a5434';
    if (mood === 5) { fill('head', xf('M 26 -239 Q 37 -219 49 -239 Z', HD), '#5a1a14', { stroke: '#2a0a08', w: 3 }); fill('head', xf('M 31 -229 Q 37 -224 44 -229 Q 37 -233 31 -229 Z', HD), '#e8606a'); }
    else if (mood === 2) { fill('head', ell(HD, 37, -233, 7, 6), '#5a1a14'); fill('head', ell(HD, 37, -230, 4.5, 2.6), '#e8606a'); }
    else if (mood === 3) stroke('head', xf('M 30 -228 Q 37 -238 45 -228', HD), lip, 3.5, {});
    else if (mood === 4) fill('head', ell(HD, 37, -232, 6, 4), '#5a1a14');
    else stroke('head', xf('M 30 -236 Q 37 -228 45 -237', HD), lip, 3.5, {});
  }



  // ============ [HAIR] các mảng tóc có khối: đỉnh, mái, tóc mai, tóc lướt ra sau ============
  {
    const hm = fem ? 'hairF' : 'hair', H = (d, k, m) => part('hair', xf(d, HD), m || hm, k);
    const CROWN = 'M -54 -284 Q -66 -340 -16 -352 Q 36 -358 64 -328 Q 70 -304 62 -290 Q 44 -312 12 -308 Q -24 -306 -54 -284 Z';
    if ((tier === 0 && cls === 'knight') || o.crown) { // không mũ: khối đỉnh phồng + hai mảng lướt cong ra sau
      H('M -38 -334 Q -88 -346 -108 -306 Q -72 -314 -34 -308 Z', 0.7);
      H('M -46 -306 Q -94 -292 -102 -254 Q -68 -270 -44 -276 Z', 0.6);
      H(CROWN, 1);
      const cr = xf(CROWN, HD);
      for (const d of ['M -34 -330 Q -6 -346 30 -334', 'M 8 -344 Q 44 -338 58 -314', 'M -50 -304 Q -54 -328 -30 -340']) stroke('hair', xf(d, HD), M(hm).l, 7, { a: 0.75, clip: cr });
      for (const d of ['M -44 -296 Q -30 -320 -4 -322', 'M 24 -318 Q 40 -318 52 -302']) stroke('hair', xf(d, HD), M(hm).d, 6, { a: 0.5, clip: cr });
    } else { // có mũ: chỉ lộ tóc dưới vành mũ
      H('M -46 -296 Q -92 -286 -100 -250 Q -66 -266 -44 -272 Z', 0.6);
    }
    // mái: ba lọn gọn, kết thúc cao hơn lông mày — lộ trán
    H('M -44 -306 Q -40 -294 -26 -290 Q -18 -298 -18 -308 Z', 0.6); H('M -12 -308 Q -6 -294 9 -290 Q 15 -300 12 -312 Z', 0.6); H('M 20 -310 Q 30 -296 50 -293 Q 54 -304 46 -318 Z', 0.6);
    H('M -52 -282 Q -64 -250 -50 -226 Q -48 -252 -38 -276 Z', 0.6); // tóc mai
  }

  // ============ [HELMET] ôm đầu, lộ mặt: da=băng trán · xương=mũ ôm + hai sừng cong · thiên thần=vương miện mở ============
  if (cls === 'knight') {
    const hx = (d, m, k) => part('helmet', xf(d, HD), m, k);
    const BAND = 'M -52 -292 Q 6 -316 64 -300 L 64 -290 Q 6 -306 -52 -282 Z';
    if (tier === 0) {
      hx(BAND, 'leather', 0.6);
      for (const x of [-30, 0, 30]) fill('helmet', ell(HD, x, -297 + (x === 0 ? -3 : 0), 3.2, 3.2), '#d9c9a0');
    } else if (tier === 2) {
      hx('M -50 -284 Q -56 -336 -4 -346 Q 46 -350 62 -314 Q 64 -300 58 -293 Q 30 -314 0 -310 Q -30 -306 -50 -284 Z', 'bone', 0.9);        // mũ ôm sọ
      hx('M -52 -292 Q 6 -318 62 -300 L 62 -292 Q 6 -308 -52 -283 Z', 'darkmetal', 0.5);                                                    // gờ trán thép tối
      hx('M -44 -322 Q -88 -318 -96 -372 Q -78 -352 -52 -346 Q -34 -336 -34 -326 Z', 'bone', 0.6);                                           // sừng xa
      hx('M 30 -336 Q 74 -340 76 -394 Q 60 -370 40 -362 Q 24 -354 20 -344 Z', 'bone', 0.7);                                                  // sừng gần: cong mảnh
      hx('M -6 -340 L 6 -340 L 6 -318 L -6 -318 Z', 'darkmetal', 0.4);
      fill('helmet', ell(HD, 0, -330, 2.4, 3.2), '#1a1410'); 
    } else {
      hx('M -52 -292 Q 6 -314 64 -298 L 64 -286 Q 6 -302 -52 -280 Z', 'gold', 0.6);                                                         // vòng vương miện
      hx('M -24 -304 Q -22 -330 -10 -346 Q -4 -326 0 -308 Z', 'gold', 0.5); hx('M 22 -304 Q 30 -330 22 -348 Q 10 -330 4 -308 Z', 'gold', 0.5);
      hx('M -6 -306 Q -10 -342 6 -366 Q 22 -342 14 -306 Z', 'gold', 0.6);
      hx('M 6 -334 L 12 -322 L 6 -310 L 0 -322 Z', 'crystal', 0.4);
      hx('M -44 -296 Q -92 -306 -104 -344 Q -72 -340 -40 -318 Z', 'angel', 0.55);                                                            // cánh sau mũ
      hx('M 46 -298 Q 74 -312 82 -340 Q 62 -336 42 -316 Z', 'angel', 0.5);
      { const hp = ell(HD, 6, -392, 48, 12); stroke('helmet', hp, M('gold').o, 6, { halo: true, a: 0.85 }); stroke('helmet', hp, M('gold').b, 3.4, { halo: true, a: 0.9 }); stroke('helmet', hp, M('gold').l, 1.4, { halo: true, a: 0.9 }); }
    }
  }

  else if (cls === 'wizard') { // pháp sư: mũ nhọn vành rộng (bậc 1) · mũ nhọn tím gắn sừng xương (bậc 3) · vương miện pha lê (bậc 6)
    const hx = (d, m, k) => part('helmet', xf(d, HD), m, k);
    if (tier < 5) {
      const hm = tier === 0 ? 'robe0' : 'robe2';
      hx('M -50 -300 Q -40 -352 -16 -386 Q 4 -418 46 -414 Q 30 -394 36 -364 Q 54 -330 58 -300 Q 6 -314 -50 -300 Z', hm, 0.9);
      hx('M -74 -300 Q 6 -324 84 -298 Q 78 -284 6 -290 Q -70 -286 -74 -300 Z', hm, 0.8);
      stroke('helmet', xf('M -50 -306 Q 6 -320 58 -306', HD), M(tier === 0 ? 'gold' : 'bone').b, 7, {});
      if (tier === 0) hx('M 6 -312 L 14 -306 L 6 -300 L -2 -306 Z', 'crystal', 0.4);
      else { hx(ell(HD, 4, -308, 8, 9), 'bone', 0.4); fill('helmet', ell(HD, 1, -309, 2, 2.8), '#1a1410'); fill('helmet', ell(HD, 8, -309, 2, 2.8), '#1a1410'); hx('M -66 -298 Q -100 -304 -106 -346 Q -84 -326 -58 -314 Z', 'bone', 0.5); hx('M 70 -296 Q 100 -306 104 -348 Q 86 -326 62 -312 Z', 'bone', 0.5); }
    } else {
      hx('M -52 -292 Q 6 -314 64 -298 L 64 -286 Q 6 -302 -52 -280 Z', 'gold', 0.6);
      hx('M -10 -306 Q -16 -358 6 -402 Q 28 -358 20 -306 Z', 'crystal', 0.6);
      hx('M -34 -302 Q -40 -330 -26 -352 Q -18 -330 -18 -304 Z', 'gold', 0.5); hx('M 30 -304 Q 42 -330 32 -352 Q 22 -330 20 -304 Z', 'gold', 0.5);
      hx('M -44 -296 Q -92 -306 -104 -344 Q -72 -340 -40 -318 Z', 'angel', 0.55); hx('M 46 -298 Q 74 -312 82 -340 Q 62 -336 42 -316 Z', 'angel', 0.5);
      { const hp = ell(HD, 6, -414, 46, 11); stroke('helmet', hp, M('gold').o, 6, { halo: true, a: 0.85 }); stroke('helmet', hp, M('gold').b, 3.4, { halo: true, a: 0.9 }); stroke('helmet', hp, M('gold').l, 1.4, { halo: true, a: 0.9 }); }
    }
  } else { // xạ thủ: mũ trùm lộ mặt + lông vũ (bậc 1) · mũ trùm gạc xương (bậc 3) · vòng cánh + chùm lông trắng (bậc 6)
    const hx = (d, m, k) => part('helmet', xf(d, HD), m, k);
    if (tier < 5) {
      const hm = tier === 0 ? 'arch0' : 'arch2';
      hx('M -52 -282 Q -62 -338 -4 -350 Q 50 -352 66 -306 Q 68 -296 60 -291 Q 30 -312 0 -308 Q -30 -304 -52 -282 Z', hm, 0.9);
      hx('M -54 -290 Q 6 -316 64 -300 L 64 -290 Q 6 -306 -54 -280 Z', tier === 0 ? 'leatherD' : 'darkmetal', 0.5);
      if (tier === 0) { hx('M 40 -332 Q 82 -366 104 -344 Q 72 -348 52 -318 Z', 'clothW', 0.5); stroke('helmet', xf('M 44 -330 Q 76 -352 98 -346', HD), '#e84a4a', 3, {}); }
      else { hx('M -22 -336 Q -56 -358 -48 -404 Q -38 -374 -14 -354 Z', 'bone', 0.5); hx('M -40 -366 Q -62 -372 -70 -392 Q -52 -388 -38 -374 Z', 'bone', 0.4); hx('M 24 -342 Q 58 -366 52 -412 Q 42 -382 18 -358 Z', 'bone', 0.5); hx('M 40 -378 Q 62 -382 72 -402 Q 54 -400 38 -390 Z', 'bone', 0.4); }
    } else {
      hx('M -52 -292 Q 6 -314 64 -298 L 64 -286 Q 6 -302 -52 -280 Z', 'gold', 0.6);
      hx('M 6 -334 L 12 -322 L 6 -308 L 0 -322 Z', 'crystal', 0.4);
      hx('M -44 -310 Q -104 -322 -138 -296 Q -96 -296 -46 -298 Z', 'angel', 0.55); hx('M -40 -320 Q -96 -346 -126 -330 Q -90 -326 -42 -310 Z', 'clothW', 0.5);
      hx('M 46 -306 Q 78 -320 88 -348 Q 66 -340 44 -318 Z', 'angel', 0.5);
      { const hp = ell(HD, 6, -388, 46, 11); stroke('helmet', hp, M('gold').o, 6, { halo: true, a: 0.85 }); stroke('helmet', hp, M('gold').b, 3.4, { halo: true, a: 0.9 }); stroke('helmet', hp, M('gold').l, 1.4, { halo: true, a: 0.9 }); }
    }
  }

  // ============ [BỘ GIÁP] điểm nhấn theo kiểu bộ giáp của game ============
  if (o.set) {
    const st = o.set.style, ch = (d, m, k) => part('armor_chest', xf(d, T2), m, k), hx2 = (d, m, k) => part('helmet', xf(d, HD), m, k);
    if (cls === 'knight' || cls === 'archer') {
      if (st === 'bronze') { for (const [x, y] of [[-30, -70], [38, -68], [-34, -44], [40, -42]]) fill('armor_chest', ell(T2, x, y, 3, 3), '#f0c080'); stroke('armor_chest', xf('M 6 -86 L 6 -22', T2), M('gold').b, 4, {}); }
      else if (st === 'fur') { for (let i = 0; i < 6; i++) ch('M ' + (-34 + i * 14) + ' -84 Q ' + (-30 + i * 14) + ' -100 ' + (-24 + i * 14) + ' -86 Z', 'clothW', 0.4); }
      else if (st === 'ice') { for (const [x, y, w] of [[-26, -56, 8], [6, -66, 10], [36, -54, 8]]) ch('M ' + (x - w) + ' ' + (y + 18) + ' L ' + x + ' ' + y + ' L ' + (x + w) + ' ' + (y + 18) + ' Z', 'crystal', 0.5); }
      else if (st === 'dragon') { for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) ch('M ' + (-30 + i * 22 + r * 8) + ' ' + (-72 + r * 16) + ' q 9 12 18 0 q -9 -4 -18 0 Z', 'gold', 0.3); }
      else if (st === 'magma') { stroke('armor_chest', xf('M -30 -70 L -14 -56 L -22 -40 L -6 -28 M 22 -74 L 30 -58 L 16 -46', T2), '#ffae3a', 3.4, { a: 0.95 }); }
      else if (st === 'leaf') { for (const [x, y, r] of [[-26, -60, -0.7], [30, -58, 0.7], [-6, -40, 0.3]]) ch(ell((a, b) => [a, b], x, y, 6, 15, r), 'arch0', 0.4); }
      else if (st === 'shadow') { stroke('armor_chest', xf('M -20 -70 L 6 -52 L 32 -70 M 6 -52 L 6 -28', T2), '#a07aff', 3.4, { a: 0.95 }); }
    }
    if (!o.hide?.helmet && st !== 'cloth' && st !== 'demon') {
      if (st === 'ice') { hx2('M -10 -318 L -4 -360 L 6 -322 Z', 'crystal', 0.5); hx2('M 12 -318 L 24 -352 L 30 -314 Z', 'crystal', 0.5); hx2('M -30 -310 L -40 -340 L -16 -312 Z', 'crystal', 0.5); }
      else if (st === 'dragon') { hx2('M 40 -312 Q 80 -330 90 -372 Q 66 -350 36 -334 Z', 'darkmetal', 0.5); hx2('M -42 -316 Q -80 -330 -92 -366 Q -64 -348 -34 -332 Z', 'darkmetal', 0.5); }
      else if (st === 'fur') { for (const x of [-52, 62]) for (let i = 0; i < 3; i++) hx2('M ' + (x - 7) + ' ' + (-270 + i * 12) + ' Q ' + (x + (x < 0 ? -14 : 14)) + ' ' + (-272 + i * 12) + ' ' + (x + 6) + ' ' + (-258 + i * 12) + ' Z', 'clothW', 0.4); }
      else if (st === 'bronze') stroke('helmet', xf('M -40 -304 Q 6 -334 58 -304', HD), M('gold').b, 5, {});
      else if (st === 'leaf') { hx2(ell(HD, 6, -334, 7, 18, 0.2), 'arch0', 0.4); hx2(ell(HD, -14, -326, 6, 14, -0.5), 'arch0', 0.4); }
      else if (st === 'magma') stroke('helmet', xf('M -20 -322 L -6 -346 L 6 -326 L 20 -350 L 30 -320', HD), '#ffae3a', 3.4, { a: 0.95 });
      else if (st === 'shadow') hx2('M -4 -322 L 6 -366 L 16 -322 Z', 'orbP', 0.5);
    }
  }

  // ============ [CỘNG] điểm nhấn theo cấp cộng: ngọc, rune (viền sáng vẽ ở drawChibi) ============
  if (o.pl) {
    const gem = (layer, tf, x, y, r, col) => { part(layer, ell(tf, x, y, r, r), 'crystal', 0.35); fill(layer, ell(tf, x, y, r * 0.55, r * 0.55), col, { a: 0.9 }); };
    const A = o.pl.armor, Hh = o.pl.helm;
    if (A.lv >= 2) gem('armor_chest', T2, -26, -58, 5.5, A.col || '#ffd34a');
    if (A.lv >= 4) for (const [x1, y1, x2, y2] of [[-30, -42, -20, -34], [26, -48, 36, -40], [-8, -34, 6, -30]]) stroke('armor_chest', xf('M ' + x1 + ' ' + y1 + ' L ' + x2 + ' ' + y2, T2), A.col, 3.2, { a: 0.9, glow: false });
    if (A.lv >= 6) { gem('armor_chest', T2, 36, -62, 5, A.col); gem('armor_chest', T2, 8, -22, 4.5, A.col); }
    if (Hh.lv >= 2 && !o.hide?.helmet) { gem('helmet', HD, -28, -296, 4.5, Hh.col || '#ffd34a'); gem('helmet', HD, 44, -296, 4.5, Hh.col || '#ffd34a'); }
    if (Hh.lv >= 4 && !o.hide?.helmet) for (const sx of [-1, 1]) stroke('helmet', xf('M ' + (6 + sx * 40) + ' -310 L ' + (6 + sx * 52) + ' -330', HD), Hh.col, 3, { a: 0.9 });
  }

  // ============ arm_front + bàn tay ============
  armLayer(aF, 'arm_front');
  part('arm_front', circ(aF.hand[0], aF.hand[1], 14.5), gaunM, 0.6);

  // ============ [WEAPON] thanh kiếm lớn, hai mặt lưỡi, chắn tay riêng từng bậc ============
  const hand = aF.hand, wpnA = ra(P.wpn);
  let wTF = baseTF(hand, Math.PI - wpnA);
  const dropK = P.drop || 0;
  if (dropK > 0) { const gx = pel[0] + 96, gy = -10, tx = hand[0] + (gx - hand[0]) * dropK, ty = hand[1] + (gy - hand[1]) * dropK - Math.sin(dropK * Math.PI) * 30; wTF = baseTF([tx, ty], (Math.PI - wpnA) * (1 - dropK) + (Math.PI / 2) * dropK); }
  if (cls === 'knight' && (wt === 'sword' || o.special)) {
    const stier = o.special ? 5 : tier;
    const W_ = (d, m, k) => part('weapon', xf(d, wTF), m, k);
    const BL = stier === 5 ? 186 : stier === 2 ? 182 : 160, bw = stier === 5 ? 17 : stier === 2 ? 15 : 12;
    let bd;
    if (stier === 0) bd = 'M -' + bw + ' -20 L -' + (bw - 1) + ' -' + (BL - 38) + ' L 0 -' + BL + ' L ' + (bw - 1) + ' -' + (BL - 38) + ' L ' + bw + ' -20 Z';
    else if (stier === 2) bd = 'M -15 -20 L -14 -60 L -10 -110 L -4 -156 L 4 -' + BL + ' L 11 -160 L 8 -148 L 15 -128 L 10 -116 L 16 -92 L 11 -80 L 15 -20 Z';
    else bd = 'M -17 -20 Q -22 -' + (BL * 0.55) + ' -9 -' + (BL - 46) + ' L 0 -' + BL + ' L 9 -' + (BL - 46) + ' Q 22 -' + (BL * 0.55) + ' 17 -20 Z';
    const bdx = xf(bd, wTF);
    part('weapon', bdx, (o.special ? 'gold' : T.blade), 0.9);
    fill('weapon', xf('M 0 -' + BL + ' L 40 -' + BL + ' L 40 -20 L 0 -20 Z', wTF), '#1a1030', { a: 0.27, clip: bdx });             // mặt khuất của lưỡi
    stroke('weapon', xf('M 0 -22 L 0 -' + (BL - 8), wTF), stier === 5 ? M('gold').o : M((o.special ? 'gold' : T.blade)).o, 2.4, { a: 0.6 });                  // sống kiếm
    stroke('weapon', xf('M -' + (bw - 3) + ' -24 L -' + (bw - 3) + ' -' + (BL - 40), wTF), '#ffffff', 2.2, { a: 0.8, clip: bdx });       // cạnh phản sáng
    if (stier === 2) for (const y of [-46, -76, -104]) stroke('weapon', xf('M -6 ' + y + ' L 5 ' + (y - 8), wTF), M('bone').o, 2.4, { a: 0.7 });
    if (stier === 5) { stroke('weapon', xf('M 0 -40 L 0 -' + (BL - 50), wTF), '#fff3b0', 7, { a: 0.9, clip: bdx }); stroke('weapon', xf('M 0 -40 L 0 -' + (BL - 50), wTF), '#ffffff', 2.6, { a: 0.95, clip: bdx }); }
    if (stier === 0) { W_('M -28 -20 Q -30 -26 -24 -26 L 24 -26 Q 30 -26 28 -20 L 24 -10 Q 0 -4 -24 -10 Z', 'darkmetal', 0.6); }
    else if (stier === 2) { W_('M -36 -10 Q -46 -34 -24 -32 L -8 -22 L 12 -22 L 28 -32 Q 48 -34 38 -10 Q 18 -8 2 -2 Q -20 -8 -36 -10 Z', 'darkmetal', 0.6); W_(ell((x, y) => [x, y], 2, -16, 10, 9), 'bone', 0.4); fill('weapon', xf(ell((x, y) => [x, y], -1, -17, 2.2, 3), wTF), '#1a1410'); fill('weapon', xf(ell((x, y) => [x, y], 5, -17, 2.2, 3), wTF), '#1a1410'); }
    else { W_('M 0 -20 Q -22 -48 -58 -42 Q -52 -18 -26 -8 Q -8 -4 0 -4 Z', 'gold', 0.6); W_('M 0 -20 Q 22 -48 58 -42 Q 52 -18 26 -8 Q 8 -4 0 -4 Z', 'gold', 0.6); W_('M 0 -26 L 8 -14 L 0 -2 L -8 -14 Z', 'crystal', 0.4); }
    if (o.special) { stroke('weapon', xf('M 0 -40 L 0 -' + (BL - 50), wTF), '#ff5a3a', 3.2, { a: 0.9, clip: bdx }); W_('M -8 24 L 0 36 L 8 24 L 0 14 Z', 'crystal', 0.4); }
    W_('M -6 -4 L 6 -4 L 6 24 L -6 24 Z', 'leatherD', 0.5);
    for (const y of [2, 10, 18]) stroke('weapon', xf('M -6 ' + y + ' L 6 ' + (y + 4), wTF), M('leather').l, 2, { a: 0.8 });
    W_(ell((x, y) => [x, y], 0, 28, 8.5, 7), stier === 0 ? 'steel' : stier === 2 ? 'bone' : 'gold', 0.4);
    for (let i = 0; i < 4; i++) part('weapon', ell(wTF, 2, 0 + i * 6, 10.5, 3.9), gaunM, 0.3);   // bốn ngón nắm chuôi
    part('weapon', ell(wTF, -5, -6, 4.8, 6.4, 0.3), gaunM, 0.3);                                  // ngón cái
  }

  const WP = (d, m, k) => part('weapon', xf(d, wTF), m, k), WF = (d, c0, extra) => fill('weapon', xf(d, wTF), c0, extra || {});
  const wMat = o.special || tier === 5 ? 'gold' : tier === 0 ? 'wood' : tier === 2 ? 'bone' : 'gold', mMat = o.special || tier === 5 ? 'gold' : tier === 0 ? 'steel' : 'darkmetal';
  const sp = !!o.special; // vũ khí Vương Giả: khung vàng + lõi đỏ thẫm
  const fingers = (y0, n = 4) => { for (let i = 0; i < n; i++) part('weapon', ell(wTF, 2, y0 + i * 6, 10.5, 3.9), gaunM, 0.3); part('weapon', ell(wTF, -5, y0 - 6, 4.8, 6.4, 0.3), gaunM, 0.3); };
  if (cls === 'knight' && wt === 'axe') { // rìu: cán dài, lưỡi bản lớn
    WP('M -5 40 L 5 40 L 4.5 -150 L -4.5 -150 Z', 'wood', 0.5);
    const hd = tier === 5 ? 'M -2 -150 Q -66 -190 -58 -118 Q -30 -112 -2 -120 Z' : tier === 2 ? 'M -2 -154 Q -58 -190 -50 -122 L -26 -110 L -2 -124 Z' : 'M -2 -148 Q -56 -178 -50 -118 Q -26 -112 -2 -122 Z';
    WP(hd, mMat, 0.8); WP('M 2 -148 Q 24 -156 30 -136 L 2 -124 Z', mMat, 0.5);
    if (tier === 5) WP('M -30 -150 L -14 -170 L -8 -150 Z', 'gold', 0.4);
    if (tier === 2) WP('M 30 -136 L 46 -150 L 30 -120 Z', 'bone', 0.4);
    stroke('weapon', xf('M -50 -128 Q -52 -160 -36 -172', wTF), '#ffffff', 2.4, { a: 0.8 });
    WP('M -6 -8 L 6 -8 L 6 12 L -6 12 Z', 'leatherD', 0.4); WP(ell((x, y) => [x, y], 0, 44, 8, 6), mMat, 0.4); fingers(0);
  } else if (cls === 'knight' && wt === 'mace') { // chùy: đầu có cánh
    WP('M -5 40 L 5 40 L 4.5 -110 L -4.5 -110 Z', 'wood', 0.5);
    WP(ell((x, y) => [x, y], 0, -134, 24, 28), mMat, 0.8);
    for (const sx of [-1, 1]) WP('M 0 -120 L ' + (sx * 36) + ' -134 L 0 -148 Z', mMat, 0.5);
    WP('M -6 -156 L 0 -176 L 6 -156 Z', mMat, 0.5);
    if (tier === 5) WP(ell((x, y) => [x, y], 0, -134, 10, 12), 'crystal', 0.5); else if (tier === 2) { WP(ell((x, y) => [x, y], 0, -134, 9, 10), 'bone', 0.4); }
    WP(ell((x, y) => [x, y], 0, 44, 8, 6), mMat, 0.4); fingers(0);
  } else if (cls === 'knight' && wt === 'spear') { // thương: cán rất dài, mũi hình lá
    WP('M -4 70 L 4 70 L 3.5 -170 L -3.5 -170 Z', 'wood', 0.5);
    const tp = tier === 5 ? 'M 0 -250 Q -22 -214 -16 -176 L 16 -176 Q 22 -214 0 -250 Z' : tier === 2 ? 'M 0 -246 L -18 -196 L -8 -190 L -14 -176 L 14 -176 L 8 -190 L 18 -196 Z' : 'M 0 -240 Q -16 -206 -10 -176 L 10 -176 Q 16 -206 0 -240 Z';
    WP(tp, tier === 5 ? 'gold' : mMat, 0.8); stroke('weapon', xf('M 0 -234 L 0 -182', wTF), '#ffffff', 2, { a: 0.7 });
    WP('M -14 -176 L 14 -176 L 12 -166 L -12 -166 Z', tier === 0 ? 'leatherD' : mMat, 0.4);
    if (tier === 5) { WP('M -4 -170 Q -34 -180 -38 -150 Q -18 -158 -4 -158 Z', 'angel', 0.4); WP('M 4 -170 Q 34 -180 38 -150 Q 18 -158 4 -158 Z', 'angel', 0.4); } else if (tier === 2) WP('M 0 -166 L 8 -150 L 0 -140 L -8 -150 Z', 'bone', 0.4);
    WP(ell((x, y) => [x, y], 0, 74, 6, 5), mMat, 0.4); fingers(-4);
  } else if (cls === 'wizard' && wt === 'staff') { // trượng: gỗ + ngọc (b1) · xương vuốt + ngọc tím (b3) · vàng cánh + pha lê (b6)
    WP('M -5.5 44 L 5.5 44 L 4.5 -186 L -4.5 -186 Z', wMat, 0.6);
    if (tier === 0) { WP('M -9 -182 Q -22 -196 -12 -214 Q -4 -200 0 -192 Q 4 -200 12 -214 Q 22 -196 9 -182 Z', 'wood', 0.5); WP(ell((x, y) => [x, y], 0, -208, 15, 15), 'crystal', 0.6); }
    else if (tier === 2) { for (const sx of [-1, 1]) WP('M ' + (sx * 3) + ' -180 Q ' + (sx * 30) + ' -196 ' + (sx * 20) + ' -232 Q ' + (sx * 10) + ' -208 0 -194 Z', 'bone', 0.5); WP('M -2 -184 Q 0 -200 -2 -214 Q 4 -200 6 -184 Z', 'bone', 0.4); WP(ell((x, y) => [x, y], 0, -212, 15, 15), 'orbP', 0.6); }
    else { for (const sx of [-1, 1]) { WP('M 0 -186 Q ' + (sx * 38) + ' -192 ' + (sx * 54) + ' -238 Q ' + (sx * 26) + ' -226 0 -204 Z', 'gold', 0.5); WP('M 0 -196 Q ' + (sx * 28) + ' -204 ' + (sx * 40) + ' -234 Q ' + (sx * 18) + ' -224 0 -208 Z', 'angel', 0.4); } WP('M 0 -200 L 14 -218 L 0 -242 L -14 -218 Z', 'crystal', 0.6); }
    if (sp) { WP('M 0 -204 L 16 -222 L 0 -250 L -16 -222 Z', 'crystal', 0.6); fill('weapon', xf(ell((x, y) => [x, y], 0, -222, 5, 8), wTF), '#ff4a3a', { a: 0.9 }); WP('M -10 -150 L 10 -150 L 8 -140 L -8 -140 Z', 'gold', 0.4); }
    WP(ell((x, y) => [x, y], 0, 48, 8, 6), tier === 0 ? 'wood' : wMat, 0.4);
    for (let i = 0; i < 3; i++) stroke('weapon', xf('M -5 ' + (-60 + i * 8) + ' L 5 ' + (-56 + i * 8), wTF), M('wood').o, 2, { a: 0.8 });
    fingers(-4);
  } else if (cls === 'wizard' && wt === 'orb') { // quả cầu lơ lửng trên lòng bàn tay
    const oc = tier === 2 ? 'orbP' : 'crystal';
    WP('M -16 -2 Q 0 14 16 -2 L 12 -8 Q 0 2 -12 -8 Z', dMat, 0.5);
    WP(ell((x, y) => [x, y], 0, -36, 24, 24), oc, 0.8);
    stroke('weapon', xf(ell((x, y) => [x, y], 0, -36, 30, 9, 0.35), wTF), M(tier === 5 ? 'gold' : 'bone').b, 3.4, { a: 0.9 });
    WF(ell((x, y) => [x, y], -7, -44, 6, 4, -0.6), '#ffffff', { a: 0.85 }); fingers(2, 3);
  } else if (cls === 'wizard' && wt === 'tome') { // sách phép + trang bay
    WP('M -24 -30 L 24 -30 L 26 18 L -26 18 Z', tier === 0 ? 'leatherD' : tier === 2 ? 'darkmetal' : 'gold', 0.7);
    WP('M -19 -26 L 20 -26 L 21 14 L -21 14 Z', 'clothW', 0.4); stroke('weapon', xf('M 0 -26 L 0 14', wTF), '#8a7a58', 2.4, {});
    for (const y of [-14, -4, 6]) { stroke('weapon', xf('M -15 ' + y + ' L -4 ' + y, wTF), '#b8a888', 2, {}); stroke('weapon', xf('M 5 ' + y + ' L 16 ' + y, wTF), '#b8a888', 2, {}); }
    WP('M 0 -52 L 8 -42 L 0 -32 L -8 -42 Z', tier === 2 ? 'orbP' : 'crystal', 0.5);
    if (tier >= 2) WP('M 22 -58 L 42 -52 L 38 -36 L 20 -42 Z', 'clothW', 0.3);
    fingers(0, 3);
  } else if (cls === 'archer' && (wt === 'bow' || wt === 'twinbow')) { // cung: thân gỗ / xương / vàng, dây kéo về tay sau
    const bow = (tf2, sc) => {
      const T2_ = (x, y) => tf2(x * sc, y * sc);
      part('weapon', xf('M 0 -92 Q 50 0 0 92 L -7 84 Q 34 0 -7 -84 Z', T2_), wMat, 0.7);
      part('weapon', xf('M -6 -14 L 10 -14 L 10 14 L -6 14 Z', T2_), 'leatherD', 0.4);
      part('weapon', xf('M -4 -96 L 4 -96 L 4 -86 L -4 -86 Z', T2_), mMat, 0.3); part('weapon', xf('M -4 96 L 4 96 L 4 86 L -4 86 Z', T2_), mMat, 0.3);
      if (tier === 5) { part('weapon', xf('M 14 -40 Q 44 -30 52 0 Q 44 -20 16 -22 Z', T2_), 'angel', 0.3); part('weapon', xf('M 14 40 Q 44 30 52 0 Q 44 20 16 22 Z', T2_), 'angel', 0.3); }
      if (tier === 2) { part('weapon', xf('M 24 -34 L 38 -42 L 32 -26 Z', T2_), 'bone', 0.3); part('weapon', xf('M 24 34 L 38 42 L 32 26 Z', T2_), 'bone', 0.3); }
      return [tf2(0, -92 * sc), tf2(0, 92 * sc)];
    };
    if (sp) { WP('M 20 -58 Q 54 -40 58 0 Q 54 40 20 58 Q 38 0 20 -58 Z', 'gold', 0.4); stroke('weapon', xf('M 28 -30 Q 46 0 28 30', wTF), '#ff4a3a', 3, { a: 0.9 }); }
    const tips = bow(wTF, 1), pull = P.pull || 0, stM = [(tips[0][0] + tips[1][0]) / 2, (tips[0][1] + tips[1][1]) / 2], pm = [stM[0] + (aB.hand[0] - stM[0]) * pull, stM[1] + (aB.hand[1] - stM[1]) * pull];
    stroke('weapon', 'M' + f1(tips[0][0]) + ' ' + f1(tips[0][1]) + 'L' + f1(pm[0]) + ' ' + f1(pm[1]) + 'L' + f1(tips[1][0]) + ' ' + f1(tips[1][1]), '#efe6c8', 2.2, {});
    if (wt === 'twinbow') { const wTF2 = baseTF(hand, Math.PI - wpnA + 0.34); const t2 = bow(wTF2, 0.86); stroke('weapon', 'M' + f1(t2[0][0]) + ' ' + f1(t2[0][1]) + 'L' + f1(t2[1][0]) + ' ' + f1(t2[1][1]), '#efe6c8', 2, {}); }
    if (pull > 0.12) { const tipA = wTF(70, 0); stroke('weapon', 'M' + f1(pm[0]) + ' ' + f1(pm[1]) + 'L' + f1(tipA[0]) + ' ' + f1(tipA[1]), '#d8c8a0', 3.4, {}); const th = wTF(84, 0), th1 = wTF(66, -6), th2 = wTF(66, 6); fill('weapon', 'M' + f1(th[0]) + ' ' + f1(th[1]) + 'L' + f1(th1[0]) + ' ' + f1(th1[1]) + 'L' + f1(th2[0]) + ' ' + f1(th2[1]) + 'Z', tier === 5 ? '#ffd75a' : '#cfd6e0'); }
    fingers(-8, 3);
  } else if (cls === 'archer' && wt === 'crossbow') { // nỏ: báng dài, hai cánh ngang, dây + mũi tên
    WP('M -7 46 L 7 46 L 6 -52 L -6 -52 Z', wMat, 0.6); WP('M -4 -10 L 4 -10 L 5 12 L -5 12 Z', 'leatherD', 0.4);
    WP('M -56 -42 Q 0 -72 56 -42 L 54 -34 Q 0 -60 -54 -34 Z', mMat, 0.7);
    if (tier === 5) { WP('M -60 -44 Q -80 -64 -74 -84 Q -62 -62 -44 -48 Z', 'angel', 0.3); WP('M 60 -44 Q 80 -64 74 -84 Q 62 -62 44 -48 Z', 'angel', 0.3); } else if (tier === 2) WP('M -5 -52 L 0 -66 L 5 -52 Z', 'bone', 0.3);
    const pullc = P.pull || 0, l = wTF(-54, -38), r2 = wTF(54, -38), m0 = wTF(0, -38 + 26 * pullc);
    stroke('weapon', 'M' + f1(l[0]) + ' ' + f1(l[1]) + 'L' + f1(m0[0]) + ' ' + f1(m0[1]) + 'L' + f1(r2[0]) + ' ' + f1(r2[1]), '#efe6c8', 2.2, {});
    { const a0 = wTF(0, -30 + 26 * pullc), a1 = wTF(0, -80); stroke('weapon', 'M' + f1(a0[0]) + ' ' + f1(a0[1]) + 'L' + f1(a1[0]) + ' ' + f1(a1[1]), '#d8c8a0', 3.4, {}); }
    fingers(-4, 3);
  }

  // ============ effects ============
  {
    const pc = tier === 5 ? '#ffe27a' : tier === 2 ? '#e8dcc0' : '#dfeaff', tSec = o.t || 0;
    if (o.wglow && !o.noFx) { const g0 = wTF(0, 0), g1 = wTF(0, cls === 'knight' ? -(wt === 'spear' ? 230 : 150) : cls === 'wizard' ? -190 : 84); add('effects', { t: 'stroke', d: 'M' + f1(g0[0]) + ' ' + f1(g0[1]) + 'L' + f1(g1[0]) + ' ' + f1(g1[1]), stroke: o.wglow, w: 9 + (o.pl ? o.pl.weapon.lv * 1.6 : 0), a: 0.55, glow: true }); }
    if (tier === 5 && cls === 'knight' && !o.noFx) add('effects', { t: 'glow', d: 'M ' + f1(hand[0]) + ' ' + f1(hand[1]) + ' L ' + f1(hand[0]) + ' ' + f1(hand[1]), fill: 'rgba(0,0,0,0)', blade: true });
    if (cls !== 'knight' && P.slash > 0 && !o.noFx) { // loé sáng ở đầu trượng / cung khi bắn phép
      const tp = wTF(0, wt === 'staff' ? -214 : wt === 'orb' ? -36 : wt === 'tome' ? -40 : wt === 'crossbow' ? -84 : 84), r0 = (cls === 'archer' ? 9 : 16) + (cls === 'archer' ? 12 : 22) * Math.sin(Math.min(1, P.slash) * Math.PI);
      add('effects', { t: 'glow', d: ell((x, y) => [x, y], tp[0], tp[1], r0, r0), fill: pc, a: 0.8 });
    }
    if (cls === 'knight' && P.slash > 0 && !o.noFx) { // vệt chém: lưỡi liềm quét theo đường đi của mũi kiếm
      const e = P.slash, a0 = P.name === 'skill' ? 3.0 : 3.7, a1 = a0 + (1.15 - a0) * Math.min(1, e * 1.25), R1 = 168, R0 = 128, n = 14, pts1 = [], pts2 = [];
      for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n), u = dirv(ra(a)), w = Math.sin((i / n) * Math.PI); pts1.push([shF[0] + u[0] * R1, shF[1] + u[1] * R1]); pts2.push([shF[0] + u[0] * (R1 - 4 - (R1 - R0 - 4) * (1 - w * 0.2 - (1 - i / n) * 0.8)), shF[1] + u[1] * (R1 - 4 - (R1 - R0 - 4) * (1 - w * 0.2 - (1 - i / n) * 0.8))]); }
      const d = 'M' + pts1.map((p) => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'L' + pts2.reverse().map((p) => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'Z';
      add('effects', { t: 'glow', d, fill: pc, a: 0.85 * (1 - Math.max(0, e - 0.7) / 0.3) });
    }
    if (P.charge > 0.05 && !o.noFx) { // tụ lực: vòng sáng + các hạt bay lên quanh thân
      add('effects', { t: 'stroke', d: ell(TR2(pel), pel[0] + 8, -6, 62 + P.charge * 20, 14), stroke: pc, w: 4, a: 0.7 * P.charge, glow: true });
      for (let i = 0; i < 7; i++) { const q = ((tSec * 0.9 + i / 7) % 1), x = pel[0] + 8 + Math.sin(i * 2.4 + tSec * 2) * 50, y = -q * 190; add('effects', { t: 'glow', d: 'M ' + f1(x) + ' ' + f1(y - 7) + ' L ' + f1(x + 4) + ' ' + f1(y) + ' L ' + f1(x) + ' ' + f1(y + 7) + ' L ' + f1(x - 4) + ' ' + f1(y) + ' Z', fill: pc, a: (1 - q) * P.charge }); }
    }
    if (P.shock > 0 && !o.noFx) add('effects', { t: 'stroke', d: ell((x, y) => [x, y], pel[0] + 60, 0, 40 + P.shock * 190, (40 + P.shock * 190) * 0.3), stroke: pc, w: 8 * (1 - P.shock) + 2, a: 1 - P.shock, glow: true });
    if (P.hit && !o.noFx && (P.name === 'hit' || (P.kk || 0) < 0.3)) { const c0 = TR(40, -60); let d = ''; for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283, r = i % 2 ? 9 : 24; d += (i ? 'L' : 'M') + f1(c0[0] + Math.cos(a) * r) + ' ' + f1(c0[1] + Math.sin(a) * r); } add('effects', { t: 'glow', d: d + 'Z', fill: '#ffffff', a: 0.9 }); }
  }
  return { layers, gm: { boots: T.boots, pants: T.pants, g1: gaunM, g2: gaunT }, joints: J, P, T, fem, W, TR, HD, sk, aF, aB, lF, lB, shF, shB, neck, pel, rootA, fall, hand, wTF, wpnA, add };
}
function TR2() { return (x, y) => [x, y]; }
const ellipsePathAbs = (cx, cy, rx, ry) => ell((x, y) => [x, y], cx, cy, rx, ry);
const ellipsePathLocal = ellipsePathAbs;

// ---------------- VẼ LÊN CANVAS ----------------
let TINT = 0;
/** Vẽ Kiếm Sĩ lên c (đã đặt gốc tại giữa hai bàn chân, 1 đơn vị = 1 đơn vị phác; caller tự scale 0.25 cho cỡ 80px) */
export function drawChibi(c, o) {
  const cl = o.cls || 'knight';
  ALIAS = null;
  if (o.set) { const e = dynMat(o.set.e, o.set.kind), d = dynMat(o.set.d, 'metal'), m = CLS_MATS[cl][o.tier]; ALIAS = { [m.e]: e, [m.d]: d }; if (o.tier === 5) Object.assign(ALIAS, { angel: e, gold: d, clothW: e }); }
  try { return drawChibi0(c, o); } finally { ALIAS = null; }
}
function drawChibi0(c, o) {
  const B = buildHero(o);
  // bóng đổ dưới chân
  c.save(); c.fillStyle = 'rgba(0,0,0,0.38)'; c.beginPath(); c.ellipse(B.fall ? B.pel[0] + 10 : B.pel[0] + 4, 2, B.fall ? 96 : 62, 13, 0, 0, 6.283); c.fill(); c.restore();
  if (o.inject && o.inject.pre) o.inject.pre(c, B);
  TINT = o.pose === 'hit' || (o.pose === 'death' && B.P.hit) ? 1 : 0;
  for (const name of LAYER_ORDER) {
    if (o.noFx && name === 'effects') continue;
    if (o.only && o.only !== name) continue;
    const hd = o.hide || {};
    if ((hd.cape && name === 'cape_back') || (hd.weapon && name === 'weapon') || (hd.armor && (name === 'armor_chest' || name === 'armor_shoulder' || name === 'helmet')) || (hd.chest && (name === 'armor_chest' || name === 'armor_shoulder')) || (hd.helmet && name === 'helmet') || (hd.hair && name === 'hair')) { if (o.inject && o.inject[name]) o.inject[name](c, B); continue; }
    for (const sh of B.layers[name]) {
      if (hd.halo && sh.halo) continue;
      if (o.noGlow && (sh.t === 'glow' || sh.glow || sh.blade)) continue;
      if (sh.glow || sh.blade) { // chỉ canvas: quầng sáng
        if (sh.blade) { drawBladeGlow(c, B); continue; }
        c.save(); c.globalCompositeOperation = 'lighter'; c.shadowColor = sh.stroke; c.shadowBlur = 18; paintShape(c, sh); c.restore(); continue;
      }
      paintShape(c, sh);
      if (o.pl && sh.t === 'part') { const g = plusGroup(name, sh, B.gm, o.pl); if (g && g.lv > 0 && !(o.noGlow && g.lv >= 3)) plusEdge(c, sh, g); }
    }
    if (o.inject && o.inject[name]) o.inject[name](c, B); // điểm chèn cho trang phục / mũ thời trang của game
  }
  TINT = 0;
  return B;
}
/** Viền thưởng theo cấp cộng: ánh bóng → viền vàng → viền phát sáng (xanh / vàng / đỏ / cầu vồng). g = {lv, col} */
function plusEdge(c, sh, g) {
  const p = P2(sh.d); c.save(); c.lineJoin = 'round';
  if (g.lv >= 1) { c.translate(-1.6, -1.8); c.globalAlpha = 0.5; c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.stroke(p); c.translate(1.6, 1.8); }
  if (g.lv >= 2) { c.globalAlpha = 0.95; c.strokeStyle = g.lv >= 3 ? g.col : '#ffd34a'; c.lineWidth = 2 + (g.lv >= 5 ? 0.6 : 0); c.stroke(p); }
  if (g.lv >= 4) { c.globalAlpha = 0.1 + (g.lv - 4) * 0.05; c.lineWidth = 6; c.stroke(p); }
  if (g.lv >= 3) { c.globalAlpha = 0.7; c.strokeStyle = '#ffffff'; c.lineWidth = 0.8; c.stroke(p); }
  c.restore();
}
function plusGroup(name, sh, gm, pl) {
  if (!pl) return null;
  if (name === 'armor_chest' || name === 'armor_shoulder') return pl.armor;
  if (name === 'helmet') return pl.helm;
  if (name === 'weapon') return pl.weapon;
  if (name === 'legs') return sh.m === gm.boots ? pl.boots : sh.m === gm.pants ? null : pl.pants;
  if (name === 'arm_front' || name === 'arm_back') return sh.m === gm.g1 || sh.m === gm.g2 ? pl.gloves : null;
  return null;
}
function drawBladeGlow(c, B) {
  const h = B.hand, tip = (() => { const [x, y] = B.wTF(0, -186); return [x, y]; })(), base = (() => { const [x, y] = B.wTF(0, -20); return [x, y]; })();
  c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.strokeStyle = 'rgba(255,214,90,.5)'; c.shadowColor = '#ffcf4a'; c.shadowBlur = 26; c.lineWidth = 16; c.beginPath(); c.moveTo(base[0], base[1]); c.lineTo(tip[0], tip[1]); c.stroke(); void h; c.restore();
}
