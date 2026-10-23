// Hệ toạ độ isometric + camera + viewport
import { G } from '../core/state.js';
import { clamp } from '../core/utils.js';
import { TILE } from '../config/constants.js';

/** Toạ độ ô (x,y) → pixel isometric (chưa tính camera) */
export const iso = (x, y) => ({ x: (x - y) * TILE.HW, y: (x + y) * TILE.HH });

/** Bán kính tròn trên mặt đất (đơn vị ô) → bán kính elip trên màn hình */
export const isoRadius = (r) => ({ rx: r * TILE.HW * Math.SQRT2, ry: r * TILE.HH * Math.SQRT2 });

export const VIEW = { W: 0, H: 0, DPR: 1, Z: 1, CAM_OFFSET_Y: 20 };

export function resize(canvas) {
  VIEW.DPR = Math.min(2, window.devicePixelRatio || 1);
  VIEW.W = innerWidth;
  VIEW.H = innerHeight;
  canvas.width = VIEW.W * VIEW.DPR;
  canvas.height = VIEW.H * VIEW.DPR;
  canvas.style.width = VIEW.W + 'px';
  canvas.style.height = VIEW.H + 'px';
  VIEW.Z = clamp(Math.min(VIEW.W, VIEW.H) / 520, 0.85, 1.3);
}

export const camPos = () => iso(G.R.p.x, G.R.p.y);

export function worldToScreen(x, y) {
  const s = iso(x, y), c = camPos();
  return { x: VIEW.W / 2 + (s.x - c.x) * VIEW.Z, y: VIEW.H / 2 + (s.y - c.y + VIEW.CAM_OFFSET_Y) * VIEW.Z };
}

export function screenToWorld(sx, sy) {
  const c = camPos();
  const ix = (sx - VIEW.W / 2) / VIEW.Z + c.x, iy = (sy - VIEW.H / 2) / VIEW.Z + c.y - VIEW.CAM_OFFSET_Y;
  return { x: (ix / TILE.HW + iy / TILE.HH) / 2, y: (iy / TILE.HH - ix / TILE.HW) / 2 };
}
