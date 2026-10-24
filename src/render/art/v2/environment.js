// Môi trường V2: nền bản đồ (vẽ 1 lần) và vật trang trí.
import { CFG } from '../../../config/constants.js';
import { shade, mix } from '../../paint.js';
import { bakePolished } from './monsterFx.js';
import { tones, pEll, pCirc, pPoly, pRR, fs, vgrad, rgrad, gloss, groundShadow, sparkle, hash } from './kit.js';

const diamond = (g, iso, i, j, inset = 0) => {
  const p0 = iso(i + inset, j + inset), p1 = iso(i + 1 - inset, j + inset), p2 = iso(i + 1 - inset, j + 1 - inset), p3 = iso(i + inset, j + 1 - inset);
  pPoly(g, [p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y]);
  return [p0, p1, p2, p3];
};

/** Nhiễu giá trị mượt (0..1) để tạo mảng màu lớn trên mặt đất, tránh cảm giác lát gạch ô vuông */
const vnoise = (x, y) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi * 57 + yi * 131), b = hash((xi + 1) * 57 + yi * 131), c = hash(xi * 57 + (yi + 1) * 131), d = hash((xi + 1) * 57 + (yi + 1) * 131);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};

/** Hoạ tiết mặt đất theo id bản đồ */
const TEXTURE = {
  swamp(g, ct, T, col) {
    g.fillStyle = shade(col, -18); for (let k = 0; k < 2; k++) { pEll(g, ct.x + (hash(T.r * 19 + k) - 0.5) * 28, ct.y + (hash(T.r2 * 29 + k) - 0.5) * 10, 6, 2.5); g.fill(); }
    if (T.r2 < 0.1) { g.strokeStyle = '#6a8a3a'; g.lineWidth = 1.2; g.beginPath(); for (let k = 0; k < 3; k++) { g.moveTo(ct.x - 4 + k * 4, ct.y); g.lineTo(ct.x - 5 + k * 4, ct.y - 6); } g.stroke(); }
  },
  canyon(g, ct, T, col) {
    g.strokeStyle = shade(col, -20); g.lineWidth = 1; g.beginPath(); g.moveTo(ct.x - 14, ct.y + (T.r - 0.5) * 6); g.lineTo(ct.x + 14, ct.y + (T.r2 - 0.5) * 6); g.stroke();
    if (T.r2 < 0.15) { g.fillStyle = shade(col, -30); pEll(g, ct.x + (T.r - 0.5) * 20, ct.y, 3.5, 2); g.fill(); }
  },
  coast(g, ct, T, col) {
    if (T.r2 < 0.12) { g.fillStyle = '#fff4e0'; pEll(g, ct.x + (T.r - 0.5) * 24, ct.y, 2.6, 1.4); g.fill(); }
    g.fillStyle = shade(col, -10); for (let k = 0; k < 3; k++) { pCirc(g, ct.x + (hash(T.r * 9 + k) - 0.5) * 30, ct.y + (hash(T.r2 * 5 + k) - 0.5) * 12, 0.9); g.fill(); }
  },
  volcano(g, ct, T, col) {
    g.strokeStyle = shade(col, -18); g.lineWidth = 1; g.beginPath(); g.moveTo(ct.x - 10, ct.y - 2); g.lineTo(ct.x, ct.y + 2); g.lineTo(ct.x + 9, ct.y - 3); g.stroke();
    if (T.r2 < 0.06) { g.save(); g.shadowColor = '#ff4a10'; g.shadowBlur = 8; g.strokeStyle = '#ff7a2a'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(ct.x - 9, ct.y); g.lineTo(ct.x - 1, ct.y + 3); g.lineTo(ct.x + 8, ct.y - 1); g.stroke(); g.restore(); }
  },
  meadow(g, ct, T, col) {
    g.strokeStyle = shade(col, 22); g.lineWidth = 1.2;
    for (let k = 0; k < 4; k++) { const x = ct.x + (hash(T.r * 99 + k) - 0.5) * 34, y = ct.y + (hash(T.r2 * 77 + k) - 0.5) * 14; g.beginPath(); g.moveTo(x - 2, y); g.lineTo(x - 1, y - 4); g.moveTo(x + 1, y); g.lineTo(x + 2, y - 3.5); g.stroke(); }
    if (T.r2 < 0.06) { g.fillStyle = ['#ffe070', '#ff8aa8', '#ffffff'][Math.floor(T.r * 3)]; for (let k = 0; k < 3; k++) { pCirc(g, ct.x + (k - 1) * 5, ct.y + (k % 2) * 3, 1.6); g.fill(); } }
  },
  darkwood(g, ct, T, col) {
    g.fillStyle = shade(col, -14); for (let k = 0; k < 3; k++) { pEll(g, ct.x + (hash(T.r * 31 + k) - 0.5) * 30, ct.y + (hash(T.r2 * 17 + k) - 0.5) * 12, 4, 1.8); g.fill(); }
    if (T.r2 < 0.04) { g.fillStyle = '#b48cff'; pCirc(g, ct.x, ct.y, 1.4); g.fill(); }
  },
  crypt(g, ct, T, col, pts) {
    g.strokeStyle = shade(col, -22); g.lineWidth = 1;
    g.beginPath(); g.moveTo((pts[0].x + pts[3].x) / 2, (pts[0].y + pts[3].y) / 2); g.lineTo((pts[1].x + pts[2].x) / 2, (pts[1].y + pts[2].y) / 2); g.stroke();
    if (T.r2 < 0.2) { g.beginPath(); g.moveTo(ct.x - 6, ct.y - 2); g.lineTo(ct.x, ct.y + 1); g.lineTo(ct.x + 4, ct.y - 3); g.stroke(); }
    if (T.r2 > 0.9) { g.fillStyle = 'rgba(90,140,70,.4)'; pEll(g, ct.x + 8, ct.y + 2, 7, 3); g.fill(); }
  },
  tundra(g, ct, T) {
    if (T.r2 < 0.3) { g.fillStyle = 'rgba(120,160,200,.18)'; pEll(g, ct.x, ct.y + 2, 14, 5); g.fill(); }
    for (let k = 0; k < 2; k++) sparkle(g, ct.x + (hash(T.r * 13 + k) - 0.5) * 30, ct.y + (hash(T.r2 * 7 + k) - 0.5) * 12, 1.6, '#ffffff', 0.8);
  },
  desert(g, ct, T, col) {
    g.strokeStyle = shade(col, 18); g.lineWidth = 1;
    for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(ct.x - 14, ct.y + k * 5); g.quadraticCurveTo(ct.x, ct.y + k * 5 - 3, ct.x + 14, ct.y + k * 5); g.stroke(); }
    if (T.r2 < 0.07) { g.save(); g.shadowColor = '#ff6a1a'; g.shadowBlur = 6; g.strokeStyle = '#ff9a3a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(ct.x - 10, ct.y); g.lineTo(ct.x - 2, ct.y + 3); g.lineTo(ct.x + 8, ct.y - 2); g.stroke(); g.restore(); }
  },
  fallen(g, ct, T) {
    if (T.r2 < 0.08) { g.save(); g.shadowColor = '#c080ff'; g.shadowBlur = 8; g.strokeStyle = 'rgba(200,150,255,.7)'; g.lineWidth = 1; pEll(g, ct.x, ct.y, 9, 4.5); g.stroke(); g.beginPath(); g.moveTo(ct.x - 5, ct.y); g.lineTo(ct.x + 5, ct.y); g.moveTo(ct.x, ct.y - 3); g.lineTo(ct.x, ct.y + 3); g.stroke(); g.restore(); }
    else if (T.r2 < 0.4) { g.fillStyle = 'rgba(180,140,255,.25)'; pCirc(g, ct.x + (T.r - 0.5) * 30, ct.y, 1); g.fill(); }
  },
};

/** Ô biên bản đồ */
const EDGE = {
  swamp(g, ct, T) { g.fillStyle = 'rgba(20,30,10,.35)'; pEll(g, ct.x, ct.y, 22, 10); g.fill(); if (T.r2 < 0.18) { g.fillStyle = '#4a7a2a'; pEll(g, ct.x + (T.r - 0.5) * 16, ct.y, 6, 2.6); g.fill(); g.fillStyle = '#e87aa8'; pCirc(g, ct.x + (T.r - 0.5) * 16 + 2, ct.y - 1, 1.4); g.fill(); } else if (T.r2 > 0.85) { g.strokeStyle = 'rgba(200,220,150,.4)'; g.lineWidth = 1; g.beginPath(); g.arc(ct.x, ct.y, 3, 0, 6.283); g.stroke(); } },
  sea(g, ct, T) { g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 1.4; g.beginPath(); g.arc(ct.x + (T.r - 0.5) * 18, ct.y + 2, 7, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); if (T.r2 < 0.2) { g.fillStyle = 'rgba(255,255,255,.25)'; pEll(g, ct.x - 6, ct.y - 2, 5, 1.6); g.fill(); } },
  cliff(g, ct, T, col, pts) {
    // khối đá nhô lên: mặt trên sáng, sườn tối
    const up = 10 + T.r * 8;
    pPoly(g, [pts[3].x, pts[3].y - up, pts[2].x, pts[2].y - up, pts[2].x, pts[2].y, pts[3].x, pts[3].y]); g.fillStyle = shade(col, -28); g.fill();
    pPoly(g, [pts[1].x, pts[1].y - up, pts[2].x, pts[2].y - up, pts[2].x, pts[2].y, pts[1].x, pts[1].y]); g.fillStyle = shade(col, -18); g.fill();
    pPoly(g, [pts[0].x, pts[0].y - up, pts[1].x, pts[1].y - up, pts[2].x, pts[2].y - up, pts[3].x, pts[3].y - up]); g.fillStyle = shade(col, 12 + Math.round(T.r2 * 10)); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; g.stroke();
  },
  water(g, ct, T, col) { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.2; g.beginPath(); g.arc(ct.x + (T.r - 0.5) * 16, ct.y, 6, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); },
  lava(g, ct, T) { g.save(); g.fillStyle = rgrad(g, ct.x, ct.y, 1, 26, '#ffd060', 'rgba(255,80,10,0)'); pEll(g, ct.x, ct.y, 26, 13); g.fill(); g.restore(); g.fillStyle = '#3a1004'; pEll(g, ct.x + (T.r - 0.5) * 20, ct.y + (T.r2 - 0.5) * 6, 5, 2.5); g.fill(); },
  wall(g, ct, T, col) { g.strokeStyle = shade(col, 25); g.lineWidth = 1; g.beginPath(); g.moveTo(ct.x - 14, ct.y); g.lineTo(ct.x + 14, ct.y); g.moveTo(ct.x, ct.y - 7); g.lineTo(ct.x, ct.y); g.stroke(); },
  bush(g, ct, T, col) { for (let k = 0; k < 3; k++) { pCirc(g, ct.x - 10 + k * 10, ct.y - 4 - (k % 2) * 3, 8); fs(g, shade(col, 10 + k * 6), shade(col, -20), 1); } },
  void(g, ct, T) { if (T.r2 < 0.5) sparkle(g, ct.x + (T.r - 0.5) * 30, ct.y, 1.5 + T.r2 * 2, '#d8c8ff', 0.7); },
};

/** Lấy ô (ngoài bản đồ = ô biên giả, ngẫu nhiên ổn định) */
function tileAt(map, i, j) {
  const w = map.w || CFG.MAP_W, h = map.h || CFG.MAP_H;
  if (i >= 0 && j >= 0 && i < w && j < h) return map.tiles[i][j];
  return { kind: 'edge', r: hash(i * 31 + j * 17), r2: hash(i * 7 + j * 53) };
}
const isEdge = (map, i, j) => tileAt(map, i, j).kind === 'edge';

export function makePaintMap(iso) {
  /**
   * Vẽ nền các ô trong vùng rect = {i0,j0,i1,j1} (mặc định cả bản đồ) lên canvas phụ.
   * Renderer chia bản đồ rộng thành nhiều mảnh (chunk) và vẽ dần khi cần.
   */
  return function paintMap(g, map, M, rect) {
    const th = M.theme, w = map.w || CFG.MAP_W, h = map.h || CFG.MAP_H, tex = TEXTURE[M.id], edge = EDGE[th.edgeKind];
    const R = rect || { i0: 0, j0: 0, i1: w, j1: h };
    const pathCol = th.path || mix(th.g, th.town, 0.6), lairCol = mix(th.g, '#2a0606', 0.45);
    // vẽ theo đường chéo (i+j) để chi tiết ô sau đè ô trước đúng chiều sâu
    for (let s = R.i0 + R.j0; s <= R.i1 + R.j1 - 2; s++)
      for (let i = Math.max(R.i0, s - R.j1 + 1); i <= Math.min(R.i1 - 1, s - R.j0); i++) {
        const j = s - i, T = tileAt(map, i, j), kind = T.kind;
        const col = kind === 'path' ? pathCol : kind === 'lair' ? lairCol : kind === 'g2' && th.g2 ? mix(th.g2, th.g, 0.55) : th[kind] || th.g, ct = iso(i + 0.5, j + 0.5);
        // màu ô = ngẫu nhiên nhẹ từng ô + mảng màu lớn mượt (2 tầng nhiễu) → mặt đất có vùng sáng / tối tự nhiên
        const patch = (vnoise(i * 0.14, j * 0.14) - 0.5) * 20 + (vnoise(i * 0.45 + 40, j * 0.45) - 0.5) * 8;
        const base = shade(col, Math.round((T.r - 0.5) * 9 + (kind === 'town' ? patch * 0.4 : patch)));
        const pts = diamond(g, iso, i, j); g.fillStyle = base; g.fill();
        if (kind === 'edge') { edge && edge(g, ct, T, col, pts); continue; }
        if (kind === 'town') {
          for (const [di, dj] of [[0, 0], [0.5, 0], [0, 0.5], [0.5, 0.5]]) {
            const q0 = iso(i + di + 0.04, j + dj + 0.04), q1 = iso(i + di + 0.46, j + dj + 0.04), q2 = iso(i + di + 0.46, j + dj + 0.46), q3 = iso(i + di + 0.04, j + dj + 0.46);
            pPoly(g, [q0.x, q0.y, q1.x, q1.y, q2.x, q2.y, q3.x, q3.y]); g.fillStyle = shade(col, Math.round((hash(i * 7 + j * 3 + di * 10 + dj * 20) - 0.5) * 22)); g.fill();
          }
        } else if (kind === 'path') {
          // đường mòn: sỏi nhỏ + mép cỏ
          g.fillStyle = shade(col, -16);
          for (let k = 0; k < 4; k++) { pEll(g, ct.x + (hash(T.r * 41 + k) - 0.5) * 30, ct.y + (hash(T.r2 * 23 + k) - 0.5) * 12, 2.2, 1.2); g.fill(); }
          if (T.r2 < 0.3) { g.fillStyle = shade(col, 14); pEll(g, ct.x + (T.r - 0.5) * 20, ct.y, 4, 1.6); g.fill(); }
        } else if (kind === 'lair') {
          g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.2;
          g.beginPath(); g.moveTo(ct.x - 10, ct.y - 2); g.lineTo(ct.x - 2, ct.y + 2); g.lineTo(ct.x + 6, ct.y - 3); g.moveTo(ct.x - 2, ct.y + 2); g.lineTo(ct.x + 1, ct.y + 6); g.stroke();
          if (T.r2 < 0.12) { g.fillStyle = '#e8e0c8'; pEll(g, ct.x + 6, ct.y + 2, 4, 1.6); g.fill(); pCirc(g, ct.x + 3, ct.y + 2, 1.8); g.fill(); }
        } else tex && tex(g, ct, T, col, pts);
        // Mép bờ: bóng đổ + viền sáng ở cạnh giáp ô chặn (nước/vách)
        const sides = [[isEdge(map, i, j - 1), pts[0], pts[1]], [isEdge(map, i + 1, j), pts[1], pts[2]], [isEdge(map, i, j + 1), pts[2], pts[3]], [isEdge(map, i - 1, j), pts[3], pts[0]]];
        for (const [e, a, b] of sides) {
          if (!e) continue;
          g.strokeStyle = th.edgeKind === 'cliff' || th.edgeKind === 'wall' ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.28)'; g.lineWidth = th.edgeKind === 'cliff' ? 3 : 2;
          g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
        }
        g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 1; g.beginPath(); g.moveTo(pts[3].x, pts[3].y); g.lineTo(pts[0].x, pts[0].y); g.lineTo(pts[1].x, pts[1].y); g.stroke();
        g.strokeStyle = 'rgba(0,0,0,.08)'; g.beginPath(); g.moveTo(pts[1].x, pts[1].y); g.lineTo(pts[2].x, pts[2].y); g.lineTo(pts[3].x, pts[3].y); g.stroke();
      }
  };
}

// ---------------- VẬT TRANG TRÍ ----------------
const DECO = {
  tree(c, d) {
    const L = tones(d.col);
    pRR(c, -3.5, -28, 7, 28, 2); fs(c, vgrad(c, -28, 0, '#8a5a30', '#4a2a14'), '#2a1408');
    c.beginPath(); c.moveTo(-2, -6); c.lineTo(-7, 0); c.moveTo(2, -6); c.lineTo(7, 0); c.strokeStyle = '#4a2a14'; c.lineWidth = 2; c.stroke();
    for (const [x, y, r, k] of [[-11, -34, 12, 's'], [11, -34, 12, 's'], [0, -40, 15, 'b'], [-6, -50, 11, 'b'], [7, -49, 10, 'h']]) { pCirc(c, x, y, r); fs(c, L[k], L.o); }
    gloss(c, -6, -54, 4, 2.5, 0.25);
    if (d.seed < 0.25) for (const [x, y] of [[-8, -38], [6, -44], [9, -32]]) { pCirc(c, x, y, 2); fs(c, '#e8403a', '#6a1008', 0.8); }
  },
  pine(c, d) {
    const L = tones(d.col), snow = d.col === '#2f6a5a';
    pRR(c, -3, -16, 6, 16, 2); fs(c, '#5a3418', '#2a1408');
    for (const [y0, y1, w] of [[-12, -38, 19], [-28, -54, 15], [-44, -70, 10]]) {
      pPoly(c, [-w, y0, w, y0, 0, y1]); fs(c, vgrad(c, y1, y0, L.h, L.s), L.o);
      if (snow) { c.beginPath(); c.moveTo(-w * 0.55, y0 - (y0 - y1) * 0.45); c.lineTo(0, y1); c.lineTo(w * 0.55, y0 - (y0 - y1) * 0.45); c.quadraticCurveTo(0, y0 - (y0 - y1) * 0.35, -w * 0.55, y0 - (y0 - y1) * 0.45); fs(c, '#f4fbff', '#9ab8d0', 0.8); }
    }
  },
  mushroom(c, d) {
    for (const [x, s, col] of [[0, 1, '#8a2be2'], [-11, 0.6, '#c050ff'], [9, 0.5, '#6a1ab2']]) {
      c.save(); c.translate(x, 0); c.scale(s, s);
      pRR(c, -4, -18, 8, 18, 3); fs(c, vgrad(c, -18, 0, '#fff8e8', '#c8b898'), '#5a4a30');
      c.save(); c.shadowColor = col; c.shadowBlur = 10; c.beginPath(); c.ellipse(0, -18, 16, 11, 0, Math.PI, 0); c.quadraticCurveTo(0, -14, -16, -18); fs(c, vgrad(c, -29, -16, mix(col, '#ffffff', 0.3), col), '#2a0a40'); c.restore();
      for (const [sx, sy] of [[-7, -22], [2, -25], [8, -20]]) { pCirc(c, sx, sy, 1.8); c.fillStyle = '#fff'; c.fill(); }
      c.restore();
    }
  },
  rock(c, d) {
    const R = tones('#7a6656');
    pPoly(c, [-17, 0, -14, -13, -4, -21, 9, -18, 17, -6, 15, 0]); fs(c, R.s, R.o);
    pPoly(c, [-14, -13, -4, -21, 9, -18, 3, -9, -8, -7]); fs(c, R.h, R.o, 1);
    pPoly(c, [3, -9, 9, -18, 17, -6, 12, -3]); fs(c, R.b, R.o, 1);
  },
  cactus(c, d) {
    const L = tones(d.col);
    const arm = (x, y, w, h) => { pRR(c, x, y, w, h, w / 2); fs(c, vgrad(c, y, y + h, L.h, L.s), L.o); };
    arm(-5, -40, 10, 40); arm(-15, -30, 7, 16); arm(-15, -18, 13, 6); arm(8, -34, 7, 14); arm(4, -24, 10, 6);
    c.strokeStyle = L.d; c.lineWidth = 0.8; c.beginPath(); c.moveTo(0, -36); c.lineTo(0, -4); c.stroke();
    if (d.seed < 0.4) { pCirc(c, 0, -41, 3.2); fs(c, '#ff5a8a', '#6a1030', 0.8); }
  },
  tomb(c, d) {
    const S = tones('#7a7684');
    c.beginPath(); c.moveTo(-10, 0); c.lineTo(-10, -24); c.arc(0, -24, 10, Math.PI, 0); c.lineTo(10, 0); c.closePath(); fs(c, vgrad(c, -34, 0, S.h, S.s), S.o);
    c.strokeStyle = S.d; c.lineWidth = 2.2; c.beginPath(); c.moveTo(0, -30); c.lineTo(0, -14); c.moveTo(-5, -25); c.lineTo(5, -25); c.stroke();
    c.lineWidth = 1; c.beginPath(); c.moveTo(6, -32); c.lineTo(3, -26); c.lineTo(7, -20); c.stroke();
    c.fillStyle = 'rgba(90,140,70,.6)'; pEll(c, -6, -2, 6, 3); c.fill();
  },
  pillar(c, d) {
    const S = tones(d.col), top = d.seed < 0.5 ? -58 : -44;
    pRR(c, -11, -6, 22, 6, 1.5); fs(c, S.s, S.o);
    pRR(c, -7.5, top, 15, -top - 6, 1); fs(c, vgrad(c, top, 0, S.h, S.s), S.o);
    c.strokeStyle = S.s; c.lineWidth = 1; for (const x of [-3.5, 0, 3.5]) { c.beginPath(); c.moveTo(x, top + 3); c.lineTo(x, -8); c.stroke(); }
    if (d.seed < 0.5) { pRR(c, -10, top - 5, 20, 5, 1.5); fs(c, S.h, S.o, 1); }
    else { pPoly(c, [-7.5, top, -3, top - 6, 1, top - 2, 5, top - 7, 7.5, top]); fs(c, S.b, S.o, 1); }
  },
  ice(c, d) {
    c.globalAlpha = 0.9;
    for (const [x, h, w] of [[-9, 30, 6], [1, 46, 8], [10, 24, 5]]) { pPoly(c, [x - w, 0, x - w * 0.6, -h * 0.75, x, -h, x + w * 0.6, -h * 0.75, x + w, 0]); fs(c, vgrad(c, -h, 0, '#ffffff', '#6fb8e8'), '#2a6a9a', 1.2);
      c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x - 1, -2); c.lineTo(x - 1, -h * 0.8); c.stroke(); }
    c.globalAlpha = 1;
  },
  crystal(c, d, t) {
    const pulse = 0.6 + 0.4 * Math.sin(t * 2 + d.seed * 9);
    c.save(); c.shadowColor = d.col; c.shadowBlur = 14 * pulse;
    for (const [x, h, w] of [[-9, 32, 5], [1, 48, 7], [10, 22, 4.5]]) { pPoly(c, [x - w, 0, x - w * 0.7, -h * 0.8, x, -h, x + w * 0.7, -h * 0.8, x + w, 0]); fs(c, vgrad(c, -h, 0, mix(d.col, '#ffffff', 0.5), mix(d.col, '#200040', 0.4)), '#1a0430', 1.2); }
    c.restore();
    sparkle(c, 4, -40 + pulse * 4, 2.5, '#fff', pulse);
  },
  bush(c, d) {
    const L = tones(d.col);
    for (const [x, y, r, k] of [[-8, -7, 8, 's'], [8, -7, 8, 's'], [0, -11, 10, 'b'], [-3, -15, 6, 'h']]) { pCirc(c, x, y, r); fs(c, L[k], L.o); }
    if (d.seed < 0.3) for (const [x, y] of [[-6, -10], [5, -13], [8, -6]]) { pCirc(c, x, y, 1.6); fs(c, '#ff5a7a', '#6a1030', 0.6); }
  },
  reed(c, d, t) {
    const sw = Math.sin(t * 1.6 + d.seed * 9) * 1.5;
    for (let i = 0; i < 6; i++) { const x = -8 + i * 3.2, h = 18 + hash(i + d.seed * 10) * 14;
      c.strokeStyle = i % 2 ? '#7a8a3a' : '#5a7a2a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x + sw * 0.5, -h * 0.5, x + sw, -h); c.stroke();
      if (i % 2 === 0) { pEll(c, x + sw, -h - 3, 1.8, 4); fs(c, '#6a4a2a', '#2a1a0a', 0.6); } }
  },
  deadtree(c, d) {
    c.strokeStyle = '#2a1e14'; c.lineCap = 'round';
    c.lineWidth = 6; c.beginPath(); c.moveTo(0, 0); c.lineTo(-1, -26); c.stroke();
    c.lineWidth = 3; c.beginPath(); c.moveTo(-1, -18); c.lineTo(-11, -30); c.moveTo(-1, -24); c.lineTo(9, -36); c.moveTo(-6, -24); c.lineTo(-8, -38); c.moveTo(5, -30); c.lineTo(12, -30); c.stroke();
    c.strokeStyle = '#4a3a2a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-2, -4); c.lineTo(-2, -24); c.stroke();
  },
  bones(c, d) {
    c.fillStyle = '#e8e0c8'; c.strokeStyle = '#6a6250'; c.lineWidth = 1;
    pRR(c, -10, -3, 16, 3, 1.5); c.fill(); c.stroke(); pCirc(c, -11, -1.5, 2.2); c.fill(); c.stroke(); pCirc(c, 7, -1.5, 2.2); c.fill(); c.stroke();
    pCirc(c, 6, -7, 5); fs(c, '#f0e8d0', '#6a6250', 1); c.fillStyle = '#2a2420'; pCirc(c, 4.5, -7.5, 1.2); c.fill(); pCirc(c, 7.5, -7.5, 1.2); c.fill();
  },
  boulder(c, d) {
    const R = tones('#8a5a3a');
    pPoly(c, [-22, 0, -20, -18, -8, -30, 10, -28, 22, -14, 20, 0]); fs(c, R.s, R.o);
    pPoly(c, [-20, -18, -8, -30, 10, -28, 4, -14, -10, -12]); fs(c, R.h, R.o, 1);
    c.strokeStyle = R.d; c.lineWidth = 1; c.beginPath(); c.moveTo(-6, -8); c.lineTo(2, -16); c.stroke();
  },
  snowrock(c, d) {
    const R = tones('#7a8a9a');
    pPoly(c, [-16, 0, -13, -12, -4, -19, 9, -16, 16, -5, 14, 0]); fs(c, R.s, R.o);
    c.beginPath(); c.moveTo(-13, -12); c.lineTo(-4, -19); c.lineTo(9, -16); c.quadraticCurveTo(0, -12, -13, -12); fs(c, '#f4fbff', '#9ab8d0', 0.8);
  },
  palm(c, d, t) {
    const sw = Math.sin(t * 1.2 + d.seed * 7) * 0.08;
    c.save(); c.rotate(sw);
    c.strokeStyle = '#7a5a30'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(6, -24, 2, -46); c.stroke();
    c.strokeStyle = '#5a3a1a'; c.lineWidth = 1; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(-1 + k * 0.6, -6 - k * 7); c.lineTo(5 + k * 0.4, -7 - k * 7); c.stroke(); }
    const L = tones(d.col);
    for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * 0.55; c.save(); c.translate(2, -46); c.rotate(a); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(12, -6, 24, 4); c.quadraticCurveTo(12, 0, 0, 3); fs(c, k % 2 ? L.h : L.b, L.o, 1); c.restore(); }
    pCirc(c, 0, -44, 2.6); fs(c, '#6a4a1a', '#2a1a0a', 0.8); pCirc(c, 4, -43, 2.4); fs(c, '#6a4a1a', '#2a1a0a', 0.8);
    c.restore();
  },
  coral(c, d) {
    const cols = ['#ff7a8a', '#ffb060', '#c070ff'], col = cols[Math.floor(d.seed * 3)], L = tones(col);
    c.strokeStyle = L.b; c.lineCap = 'round';
    for (const [x, h, a] of [[0, 22, 0], [-6, 15, -0.5], [6, 17, 0.5]]) { c.lineWidth = 4; c.beginPath(); c.moveTo(0, 0); c.lineTo(x + Math.sin(a) * h, -h); c.stroke(); pCirc(c, x + Math.sin(a) * h, -h, 2.6); fs(c, L.h, L.o, 0.8); }
  },
  shell(c, d) {
    c.beginPath(); c.moveTo(-6, 0); c.quadraticCurveTo(0, -12, 6, 0); c.closePath(); fs(c, vgrad(c, -10, 0, '#fff0e0', '#e8b090'), '#8a5a40', 1);
    c.strokeStyle = '#c08a6a'; c.lineWidth = 0.8; for (const x of [-3, 0, 3]) { c.beginPath(); c.moveTo(0, -8); c.lineTo(x, 0); c.stroke(); }
  },
  skull(c, d) {
    pCirc(c, 0, -7, 6.5); fs(c, vgrad(c, -13, 0, '#f4ecd8', '#b8ac90'), '#5a5040', 1); pRR(c, -3.5, -3, 7, 4, 1.5); fs(c, '#d8d0b8', '#5a5040', 0.8);
    c.fillStyle = '#1a1410'; pEll(c, -2.4, -7.5, 1.7, 2.1); c.fill(); pEll(c, 2.4, -7.5, 1.7, 2.1); c.fill();
    c.strokeStyle = '#d8d0b8'; c.lineWidth = 2.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(-10, 1); c.lineTo(10, -2); c.moveTo(-10, -2); c.lineTo(10, 1); c.stroke();
  },
  basalt(c, d, t) {
    const R = tones('#2a2228');
    for (const [x, h, w] of [[-8, 26, 6], [0, 36, 7], [8, 22, 6]]) { pPoly(c, [x - w, 0, x - w, -h + 4, x, -h, x + w, -h + 4, x + w, 0]); fs(c, vgrad(c, -h, 0, R.h, R.d), R.o, 1); }
    c.save(); c.shadowColor = '#ff4a10'; c.shadowBlur = 8 + Math.sin(t * 3 + d.seed * 5) * 4; c.strokeStyle = '#ff6a1a'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(-1, -30); c.lineTo(1, -18); c.lineTo(-2, -6); c.stroke(); c.restore();
  },
  torch(c, d, t) {
    pRR(c, -2, -30, 4, 30, 1); fs(c, '#4a3020', '#1a0a04', 1);
    c.beginPath(); c.moveTo(-7, -30); c.lineTo(7, -30); c.lineTo(4, -36); c.lineTo(-4, -36); c.closePath(); fs(c, '#6a6a72', '#1a1a20', 1);
    const f = Math.sin(t * 15 + d.x) * 1.5;
    c.save(); c.globalCompositeOperation = 'lighter';
    c.fillStyle = rgrad(c, 0, -44, 1, 26, 'rgba(255,170,60,.55)', 'rgba(255,100,0,0)'); pCirc(c, 0, -44, 26); c.fill();
    c.beginPath(); c.moveTo(-5, -36); c.quadraticCurveTo(-6, -46, 0, -52 - f); c.quadraticCurveTo(6, -46, 5, -36); c.closePath(); c.fillStyle = '#ff7a10'; c.fill();
    c.beginPath(); c.moveTo(-2.5, -36); c.quadraticCurveTo(-3, -42, 0, -46 - f); c.quadraticCurveTo(3, -42, 2.5, -36); c.closePath(); c.fillStyle = '#ffe890'; c.fill();
    c.restore();
    for (let i = 0; i < 3; i++) { const k = (t * 1.2 + i / 3) % 1; c.globalAlpha = 1 - k; pCirc(c, Math.sin(t * 3 + i * 2) * 4, -50 - k * 22, 1.2); c.fillStyle = '#ffb040'; c.fill(); }
    c.globalAlpha = 1;
  },
};

/** Vật trang trí đung đưa nhẹ theo gió (nghiêng ngang, gốc đứng yên) */
const SWAY = new Set(['tree', 'pine', 'bush', 'cactus', 'mushroom', 'coral']);
// Vật trang trí tĩnh: dựng sẵn 1 lần (kèm viền + khối sáng-tối) rồi chỉ drawImage — vừa đẹp hơn vừa nhẹ hơn.
const STATIC_DECO = new Set(['tree', 'pine', 'mushroom', 'rock', 'cactus', 'tomb', 'pillar', 'ice', 'bush', 'deadtree', 'bones', 'boulder', 'snowrock', 'shell', 'skull', 'coral']);
const BAKED = new Map();
function baked(d) {
  const key = d.kind + '|' + d.col + '|' + Math.floor(d.seed * 8);
  let b = BAKED.get(key);
  if (b === undefined) {
    const dd = { ...d, seed: (Math.floor(d.seed * 8) + 0.5) / 8 }, fn = DECO[d.kind] || DECO.rock;
    b = bakePolished((g) => fn(g, dd, 0), tones(d.col || '#6a5a4a').o);
    BAKED.set(key, b);
  }
  return b;
}
export function makeDrawDeco(iso) {
  return function drawDeco(c, d, t) {
    const s = iso(d.x, d.y);
    c.save(); c.translate(s.x, s.y); c.scale(d.s, d.s);
    groundShadow(c, 18, 7, 0.3);
    if (SWAY.has(d.kind)) c.transform(1, 0, Math.sin(t * 1.35 + d.seed * 11) * 0.03 + Math.sin(t * 0.55 + d.seed * 5) * 0.015, 1, 0, 0);
    const b = STATIC_DECO.has(d.kind) ? baked(d) : null;
    if (b) c.drawImage(b.cv, b.box.x, b.box.y, b.box.w, b.box.h); else (DECO[d.kind] || DECO.rock)(c, d, t);
    c.restore();
  };
}
