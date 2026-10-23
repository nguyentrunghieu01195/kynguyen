// Khung xem trước nhân vật (dùng trong bảng Nhân vật & Thời trang).
// Tự chạy hoạt ảnh khi canvas có trên trang, tự dừng khi bảng đóng.
import { G } from '../core/state.js';
import { art } from '../render/art/index.js';
import { fashionLook } from '../systems/fashion.js';

let running = false;

/** HTML của khung xem trước */
export const previewHTML = (h = 170) => '<div class="pv"><canvas class="pvc" width="320" height="' + h * 2 + '" style="height:' + h + 'px"></canvas><div class="pvhint">Chạm để xoay · đổi tư thế</div></div>';

const state = { face: 1, mode: 0, t0: 0 };
const MODES = ['Đứng', 'Chạy', 'Tấn công'];

function frame(now) {
  const cvs = document.querySelectorAll('.pvc');
  if (!cvs.length || !G.S) { running = false; return; }
  const t = now / 1000;
  for (const cv of cvs) {
    if (!cv.dataset.bound) { cv.dataset.bound = 1; cv.addEventListener('click', () => { state.mode = (state.mode + 1) % 3; if (state.mode === 0) state.face *= -1; }); }
    const g = cv.getContext('2d'), w = cv.width, h = cv.height, sc = h / 120;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h);
    // Bệ đứng
    const grd = g.createRadialGradient(w / 2, h * 0.86, 4, w / 2, h * 0.86, w * 0.42);
    grd.addColorStop(0, 'rgba(232,194,106,.28)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.beginPath(); g.ellipse(w / 2, h * 0.86, w * 0.42, h * 0.1, 0, 0, Math.PI * 2); g.fill();
    g.setTransform(sc, 0, 0, sc, w / 2, h * 0.86);
    const atk = state.mode === 2 ? Math.max(0, 0.25 - (t % 1.1)) : 0;
    art().drawHero(g, G.S.cls, G.S.equip, t, { face: state.face, moving: state.mode === 1, atk, fa: fashionLook(G.S) });
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.font = 'bold 20px sans-serif'; g.fillStyle = 'rgba(255,255,255,.45)'; g.textAlign = 'left'; g.fillText(MODES[state.mode], 12, 28);
  }
  requestAnimationFrame(frame);
}

/** Gọi sau khi vẽ lại bảng */
export function startPreview() { if (!running) { running = true; requestAnimationFrame(frame); } }
