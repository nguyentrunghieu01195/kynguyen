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
const RIGHT = [Math.cos(Math.PI / 4), 0, -Math.sin(Math.PI / 4)];
Object.assign(B, {
  bar: (col) => (TH) => { const g = new TH.Group(); const m = new TH.Mesh(new TH.CylinderGeometry(0.5, 0.5, 6, 10), em(TH, col, 1.0, { flatShading: false })); m.quaternion.setFromUnitVectors(new TH.Vector3(0, 1, 0), new TH.Vector3(...RIGHT)); g.add(m); const e1 = new TH.Mesh(new TH.SphereGeometry(0.5, 10, 8), m.material), e2 = e1.clone(); e1.position.set(...RIGHT.map((v) => v * 3)); e2.position.set(...RIGHT.map((v) => v * -3)); g.add(e1, e2); g.position.y = 0; return g; },
  crescent: (col) => (TH) => { const g = new TH.Group(), m = new TH.Mesh(new TH.TorusGeometry(1, 0.16, 8, 28, 2.0), em(TH, col, 1.0, { flatShading: false })); m.lookAt(new TH.Vector3(Math.sin(Math.PI / 4), Math.sin(Math.PI / 6), Math.cos(Math.PI / 4)).multiplyScalar(10)); m.rotateZ(-1.0); g.add(m); g.position.y = 1; return g; },
  spike: (col) => (TH) => { const g = new TH.Group(); const c = new TH.Mesh(new TH.ConeGeometry(0.34, 1.6, 6), em(TH, col, 0.7)); c.position.y = 0.8; g.add(c); const c2 = new TH.Mesh(new TH.ConeGeometry(0.2, 1.0, 5), em(TH, col, 0.7)); c2.position.set(0.3, 0.5, 0.1); c2.rotation.z = -0.4; g.add(c2); return g; },
  disc: (col) => (TH) => { const g = new TH.Group(); g.add(new TH.Mesh(new TH.CylinderGeometry(1, 1, 0.08, 36), new TH.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.8, depthWrite: false }))); return g; },
  sword: () => (TH) => {
    const g = new TH.Group(), steel = new TH.MeshStandardMaterial({ color: '#d8ecff', emissive: '#9ad8ff', emissiveIntensity: 0.5, roughness: 0.25, metalness: 0.8, flatShading: true }), gold = new TH.MeshStandardMaterial({ color: '#f0c040', roughness: 0.3, metalness: 0.8 });
    const bl = new TH.Mesh(new TH.BoxGeometry(0.34, 3.2, 0.1), steel); bl.position.y = 1.9; g.add(bl);
    const tip = new TH.Mesh(new TH.ConeGeometry(0.24, 0.6, 4), steel); tip.position.y = 0.0; tip.rotation.z = Math.PI; tip.rotation.y = Math.PI / 4; g.add(tip);
    const gd = new TH.Mesh(new TH.BoxGeometry(1.5, 0.22, 0.3), gold); gd.position.y = 3.6; g.add(gd);
    const hl = new TH.Mesh(new TH.CylinderGeometry(0.1, 0.1, 0.9, 8), new TH.MeshStandardMaterial({ color: '#6a3a1a' })); hl.position.y = 4.15; g.add(hl);
    const pm = new TH.Mesh(new TH.SphereGeometry(0.2, 8, 6), new TH.MeshStandardMaterial({ color: '#ff5a5a', emissive: '#ff2020', emissiveIntensity: 0.6 })); pm.position.y = 4.65; g.add(pm);
    g.rotation.y = Math.PI / 4; return g;
  },
  arrow: (tip) => (TH) => { const g = new TH.Group(), q = new TH.Quaternion().setFromUnitVectors(new TH.Vector3(0, 1, 0), new TH.Vector3(...RIGHT)); const sh = new TH.Mesh(new TH.CylinderGeometry(0.08, 0.08, 3.4, 6), new TH.MeshStandardMaterial({ color: '#7a5030', roughness: 0.8 })); sh.quaternion.copy(q); g.add(sh);
    const hd = new TH.Mesh(new TH.ConeGeometry(0.22, 0.7, 6), new TH.MeshStandardMaterial({ color: '#dde4ee', roughness: 0.3, metalness: 0.8 })); hd.quaternion.copy(new TH.Quaternion().setFromUnitVectors(new TH.Vector3(0, 1, 0), new TH.Vector3(...RIGHT))); hd.position.set(...RIGHT.map((v) => v * 2.0)); g.add(hd);
    for (const sd of [-1, 1]) { const f = new TH.Mesh(new TH.PlaneGeometry(0.9, 0.5), new TH.MeshStandardMaterial({ color: tip, side: TH.DoubleSide, roughness: 0.9 })); f.position.set(...RIGHT.map((v) => v * -1.4)); f.position.y += sd * 0.12; f.rotation.set(0.6 * sd, Math.PI / 4, 0); g.add(f); }
    return g; },
});
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

/** Thanh sáng (viên nang) nằm ngang trên màn hình, kéo giãn theo (x0,y0)→(x1,y1) với độ dày w */
export function bar(c, x0, y0, x1, y1, w, col) {
  if (!gfx3d()) return false; const sp = get('bar|' + norm(col), B.bar(norm(col)), 20); if (!sp) return false;
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) + w; c.save(); c.translate((x0 + x1) / 2, (y0 + y1) / 2); c.rotate(Math.atan2(dy, dx));
  c.drawImage(sp.cv, -len / 2, -w / 2, len, w); c.restore(); return true;
}
export function crescent(c, r, col) { if (!gfx3d()) return false; const sp = get('crescent|' + norm(col), B.crescent(norm(col)), 20); if (!sp) return false; const k = r / 20; put(c, sp, 0, 0, k, k); return true; }
export function spike(c, x, y, h, col) { if (!gfx3d()) return false; const sp = get('spike|' + norm(col), B.spike(norm(col)), 30); if (!sp) return false; const k = h / 50; put(c, sp, x, y, k, k); return true; }
export function disc(c, rx, col) { if (!gfx3d()) return false; const sp = get('disc|' + norm(col), B.disc(norm(col)), 40); if (!sp) return false; const k = rx / 40; put(c, sp, 0, 0, k, k); return true; }
export function swordSprite(c, h) { if (!gfx3d()) return false; const sp = get('sword', B.sword(), 20); if (!sp) return false; const k = h / (sp.box.h || 1); put(c, sp, 0, 0, k, k); return true; }
export function arrowSprite(c, len, tipCol) { if (!gfx3d()) return false; const sp = get('arrow|' + norm(tipCol), B.arrow(norm(tipCol)), 20); if (!sp) return false; const k = len / (sp.box.w || 1); put(c, sp, 0, 0, k, k); return true; }

// Thanh máu 3D: khung tối bo góc + phần máu phát sáng (khối), quay mặt về camera; làm tròn theo 1/24 để dùng lại ảnh
Object.assign(B, {
  hp: (col, step, ratio) => (TH) => {
    const g = new TH.Group(), W = 1, H = ratio, rb = (w, h, d, r) => { const sh = new TH.Shape(), x = -w / 2, y = -h / 2; sh.moveTo(x + r, y); sh.lineTo(x + w - r, y); sh.quadraticCurveTo(x + w, y, x + w, y + r); sh.lineTo(x + w, y + h - r); sh.quadraticCurveTo(x + w, y + h, x + w - r, y + h); sh.lineTo(x + r, y + h); sh.quadraticCurveTo(x, y + h, x, y + h - r); sh.lineTo(x, y + r); sh.quadraticCurveTo(x, y, x + r, y); return new TH.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelSize: d * 0.3, bevelThickness: d * 0.3, bevelSegments: 2 }); };
    g.add(new TH.Mesh(rb(W, H, 0.05, H * 0.4), new TH.MeshStandardMaterial({ color: '#15101a', roughness: 0.6, metalness: 0.2 })));
    const fw = Math.max(0.0001, (W - H * 0.35) * step), fh = H * 0.62;
    if (step > 0.001) { const f = new TH.Mesh(rb(fw, fh, 0.06, fh * 0.45), new TH.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.6, roughness: 0.35 })); f.position.set(-W / 2 + H * 0.175 + fw / 2, 0, 0.04); g.add(f); }
    g.lookAt(new TH.Vector3(Math.sin(Math.PI / 4) * Math.cos(Math.PI / 6), Math.sin(Math.PI / 6), Math.cos(Math.PI / 4) * Math.cos(Math.PI / 6)).multiplyScalar(10)); return g;
  },
});
/** Vẽ thanh máu 3D tâm tại (x,y), rộng w px, cao h px, tỉ lệ máu frac (0..1). Trả true nếu đã vẽ. */
export function hpBar(c, x, y, w, frac, col, h = 7) {
  if (!gfx3d()) return false; const st = Math.round(Math.max(0, Math.min(1, frac)) * 24) / 24, ratio = h / w, rk = Math.round(ratio * 40) / 40;
  const sp = get('hp|' + norm(col) + '|' + st + '|' + rk, B.hp(norm(col), st, rk), 120 / 1); if (!sp) return false;
  const k = w / 120; c.drawImage(sp.cv, x + sp.box.x * k, y + sp.box.y * k, sp.box.w * k, sp.box.h * k); return true;
}
