// Di chuyển có va chạm địa hình + tìm đường A* trên lưới ô (thuần dữ liệu, không vẽ).
// map.block: Uint8Array(w*h), 1 = không đi được (nước, dung nham, vách đá…). Bản đồ không có block → đi tự do.
import { G } from '../core/state.js';

/** Ô (x,y) có bị chặn không (ngoài bản đồ = chặn) */
export function blockedAt(map, x, y) {
  if (!map || !map.block) return false;
  const i = Math.floor(x), j = Math.floor(y);
  if (i < 0 || j < 0 || i >= map.w || j >= map.h) return true;
  return map.block[i * map.h + j] === 1;
}
const R0 = 0.22; // bán kính thân khi kiểm tra va chạm
const freeAt = (map, x, y) => !blockedAt(map, x, y) && !blockedAt(map, x + R0, y) && !blockedAt(map, x - R0, y) && !blockedAt(map, x, y + R0) && !blockedAt(map, x, y - R0);

/** Đường thẳng a→b có bị chặn không (lấy mẫu mỗi 0.3 ô) */
export function lineClear(map, ax, ay, bx, by) {
  if (!map || !map.block) return true;
  const d = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(d / 0.3));
  for (let k = 1; k <= n; k++) { const t = k / n; if (!freeAt(map, ax + (bx - ax) * t, ay + (by - ay) * t)) return false; }
  return true;
}

/** Bước đi về (tx,ty) có trượt dọc vật cản. Trả về true khi đã tới nơi */
export function moveCollide(o, tx, ty, spd, dt, map = G.R && G.R.map) {
  const dx = tx - o.x, dy = ty - o.y, d = Math.hypot(dx, dy);
  if (d < 0.05) return true;
  const s = Math.min(d, spd * dt), mx = (dx / d) * s, my = (dy / d) * s;
  const sd = dx - dy;
  if (Math.abs(sd) > 0.02) o.face = sd > 0 ? 1 : -1;
  if (!map || !map.block) { o.x += mx; o.y += my; return d <= s + 0.001; }
  if (!freeAt(map, o.x, o.y)) { // đang nằm sát / lún vào vật cản (mọi bước đi đều bị coi là chặn) → đẩy ra chỗ trống gần nhất
    for (let r = 0.1; r <= 1.3; r += 0.1) for (let a = 0; a < 16; a++) {
      const nx = o.x + Math.cos((a / 16) * 6.283) * r, ny = o.y + Math.sin((a / 16) * 6.283) * r;
      if (freeAt(map, nx, ny)) { o.x = nx; o.y = ny; r = 9; break; }
    }
  }
  if (freeAt(map, o.x + mx, o.y + my)) { o.x += mx; o.y += my; o.stuck = 0; return d <= s + 0.001; }
  // trượt theo trục
  if (Math.abs(mx) > 0.001 && freeAt(map, o.x + mx, o.y)) { o.x += mx; o.stuck = 0; return false; }
  if (Math.abs(my) > 0.001 && freeAt(map, o.x, o.y + my)) { o.y += my; o.stuck = 0; return false; }
  o.stuck = (o.stuck || 0) + dt;
  return false;
}

/** Ô trống gần (x,y) nhất (tìm theo vòng) */
export function nearestFree(map, x, y, maxR = 8) {
  if (!map || !map.block || !blockedAt(map, x, y)) return { x, y };
  for (let r = 1; r <= maxR; r++)
    for (let a = 0; a < 16; a++) {
      const nx = x + Math.cos((a / 16) * 6.283) * r, ny = y + Math.sin((a / 16) * 6.283) * r;
      if (freeAt(map, nx, ny)) return { x: nx, y: ny };
    }
  return { x, y };
}

// ---------------- A* ----------------
/** Tìm đường từ (sx,sy) tới (tx,ty). Trả về mảng điểm [{x,y}] đã làm mượt (không gồm điểm đầu), hoặc null */
export function findPath(map, sx, sy, tx, ty, maxNodes = 12000) {
  if (!map || !map.block) return [{ x: tx, y: ty }];
  const W = map.w, H = map.h, B = map.block;
  const si = Math.floor(sx), sj = Math.floor(sy);
  let goal = nearestFree(map, tx, ty);
  const ti = Math.floor(goal.x), tj = Math.floor(goal.y);
  if (si === ti && sj === tj) return [goal];
  const N = W * H, gS = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const heap = []; // [f, idx]
  const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  const hh = (i, j) => { const dx = Math.abs(i - ti), dy = Math.abs(j - tj); return dx + dy - 0.586 * Math.min(dx, dy); };
  const s = si * H + sj; gS[s] = 0; push(hh(si, sj), s);
  let found = -1, n = 0;
  while (heap.length && n++ < maxNodes) {
    const [, cur] = pop();
    if (closed[cur]) continue;
    closed[cur] = 1;
    const ci = (cur / H) | 0, cj = cur % H;
    if (ci === ti && cj === tj) { found = cur; break; }
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      if (!di && !dj) continue;
      const ni = ci + di, nj = cj + dj;
      if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
      const nb = ni * H + nj;
      if (B[nb] || closed[nb]) continue;
      if (di && dj && (B[ci * H + nj] || B[ni * H + cj])) continue; // không cắt góc
      const g2 = gS[cur] + (di && dj ? 1.414 : 1);
      if (g2 < gS[nb]) { gS[nb] = g2; from[nb] = cur; push(g2 + hh(ni, nj), nb); }
    }
  }
  if (found < 0) return null;
  const pts = [];
  for (let k = found; k !== s && k >= 0; k = from[k]) pts.push({ x: ((k / H) | 0) + 0.5, y: (k % H) + 0.5 });
  pts.reverse();
  pts[pts.length - 1] = goal;
  // Làm mượt: bỏ điểm trung gian khi nhìn thẳng được
  const out = []; let ax = sx, ay = sy, i = 0;
  while (i < pts.length) {
    let j = pts.length - 1;
    while (j > i && !lineClear(map, ax, ay, pts[j].x, pts[j].y)) j--;
    out.push(pts[j]); ax = pts[j].x; ay = pts[j].y; i = j + 1;
  }
  return out;
}

/**
 * Đi tới (gx,gy): thẳng nếu không vướng, ngược lại theo đường A* (tính lại khi đích đổi xa hoặc sau 1 giây).
 * Trả về true khi đã tới nơi.
 */
export function navStep(o, gx, gy, spd, dt, map = G.R && G.R.map) {
  if (!map || !map.block || lineClear(map, o.x, o.y, gx, gy)) { o.path = null; return moveCollide(o, gx, gy, spd, dt, map); }
  o.pathT = (o.pathT || 0) - dt;
  if (!o.path || !o.path.length || o.pathT <= 0 || Math.hypot((o.pathGoal ? o.pathGoal.x : 1e9) - gx, (o.pathGoal ? o.pathGoal.y : 1e9) - gy) > 1.5) {
    o.path = findPath(map, o.x, o.y, gx, gy) || [{ x: gx, y: gy }];
    o.pathGoal = { x: gx, y: gy }; o.pathT = 1;
  }
  const wp = o.path[0];
  if (moveCollide(o, wp.x, wp.y, spd, dt, map)) { o.path.shift(); if (!o.path.length) { o.path = null; return Math.hypot(o.x - gx, o.y - gy) < 0.3; } }
  return false;
}
