// Hiệu ứng 3D: hạt, ngọn lửa, cánh hoa, vòng sáng, cột sáng… dựng bằng khối phát sáng (three.js) rồi chụp thành ảnh nhỏ, vẽ chồng ('lighter').
import { geoSprite } from './props3d.js';
import { gfx3d } from './flag.js';

const em = (TH, col, k = 0.85, o = {}) => new TH.MeshStandardMaterial({ color: new TH.Color(col).lerp(new TH.Color('#ffffff'), 0.08), emissive: col, emissiveIntensity: k * 0.62, roughness: 0.4, metalness: 0.1, flatShading: true, ...o });
const get = (key, build, ppu = 32) => geoSprite('fx|' + key, build, ppu, { rim: false });

const B = {
  gem: (col) => (TH) => { const g = new TH.OctahedronGeometry(0.5); g.scale(0.7, 1.15, 0.7); const grp = new TH.Group(); grp.add(new TH.Mesh(g, em(TH, col))); return grp; },
  orb: (col) => (TH) => { const grp = new TH.Group(); grp.add(new TH.Mesh(new TH.SphereGeometry(0.34, 12, 9), em(TH, col, 1.0, { flatShading: false }))); grp.add(new TH.Mesh(new TH.SphereGeometry(0.55, 12, 9), new TH.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.16, depthWrite: false }))); return grp; },
  flame: (a, b) => (TH) => {
    const pts = [[0, 0], [0.34, 0.12], [0.4, 0.4], [0.28, 0.85], [0.1, 1.3], [0, 1.6]].map(([r, y]) => new TH.Vector2(r, y)), grp = new TH.Group();
    grp.add(new TH.Mesh(new TH.LatheGeometry(pts, 10), em(TH, a, 0.95, { flatShading: false })));
    const inner = new TH.Mesh(new TH.LatheGeometry(pts, 8), em(TH, b, 1.0, { flatShading: false })); inner.scale.set(0.55, 0.7, 0.55); grp.add(inner); return grp;
  },
  petal: (col) => (TH) => { const m = new TH.Mesh(new TH.SphereGeometry(1, 10, 6), em(TH, col, 0.35, { flatShading: false })); m.scale.set(0.5, 0.09, 0.3); m.rotation.set(0.5, 0.3, 0.4); const g = new TH.Group(); g.add(m); return g; },
  ring: (col, thick) => (TH) => { const t = new TH.Mesh(new TH.TorusGeometry(1.0, thick, 6, 48), em(TH, col, 1.0, { flatShading: false })); t.rotation.x = Math.PI / 2; t.position.y = thick; const g = new TH.Group(); g.add(t); return g; },
  beam: (col) => (TH) => { const g = new TH.Group(); g.add(new TH.Mesh(new TH.CylinderGeometry(0.42, 0.5, 3, 20, 1, true), new TH.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.4, side: TH.DoubleSide, depthWrite: false }))).position.y = 1.5; return g; },
};
const norm = (c) => {
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  let m = /hsl\((\d+),\s*(\d+)%?,\s*(\d+)%/.exec(c || '');
  if (m) { const h = Math.round(+m[1] / 15) * 15 % 360, s = +m[2] / 100, l = +m[3] / 100, k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)))).toString(16).padStart(2, '0'); return '#' + f(0) + f(8) + f(4); }
  m = /(\d+)[, ]+(\d+)[, ]+(\d+)/.exec(c || ''); return m ? '#' + [m[1], m[2], m[3]].map((v) => (+v).toString(16).padStart(2, '0')).join('') : '#ffffff';
};

function put(c, sp, x, y, sx, sy) { c.drawImage(sp.cv, x + sp.box.x * sx, y + sp.box.y * sy, sp.box.w * sx, sp.box.h * sy); }
/** Mỗi hàm vẽ 1 hiệu ứng 3D tại (x,y) với kích thước ~px game; trả true nếu đã vẽ (false → gọi nơi vẽ lại bằng 2D) */
export const fx3dOn = () => gfx3d();
export function gem(c, x, y, h, col, rot = 0) { if (!gfx3d()) return false; const sp = get('gem|' + norm(col), B.gem(norm(col))); if (!sp) return false; const k = h / 36; if (rot) { c.save(); c.translate(x, y); c.rotate(rot); put(c, sp, 0, 0, k, k); c.restore(); } else put(c, sp, x, y, k, k); return true; }
export function orb(c, x, y, r, col) { if (!gfx3d()) return false; const sp = get('orb|' + norm(col), B.orb(norm(col))); if (!sp) return false; const k = r / 17; put(c, sp, x, y, k, k); return true; }
export function flame(c, x, y, h, a, b = '#ffe890') { if (!gfx3d()) return false; const sp = get('flame|' + norm(a) + norm(b), B.flame(norm(a), norm(b))); if (!sp) return false; const k = h / 54; put(c, sp, x, y, k, k); return true; }
export function petal(c, x, y, w, col, rot = 0) { if (!gfx3d()) return false; const sp = get('petal|' + norm(col), B.petal(norm(col))); if (!sp) return false; const k = w / 30; c.save(); c.translate(x, y); c.rotate(rot); put(c, sp, 0, 0, k, k); c.restore(); return true; }
/** Vòng sáng trên mặt đất, bán kính ngang rx (px game) — đã có phối cảnh iso */
export function ring(c, rx, col, thick = 0.035) { if (!gfx3d()) return false; const sp = get('ring|' + norm(col) + '|' + thick, B.ring(norm(col), thick), 40); if (!sp) return false; const k = rx / 40; put(c, sp, 0, 0, k, k); return true; }
export function beam(c, w, h, col) { if (!gfx3d()) return false; const sp = get('beam|' + norm(col), B.beam(norm(col)), 40); if (!sp) return false; put(c, sp, 0, 0, w / 34, h / 104); return true; }
