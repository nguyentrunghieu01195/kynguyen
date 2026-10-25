// Chữ 3D: đường viền glyph (Noto Sans Bold, OFL, đủ dấu tiếng Việt) → ExtrudeGeometry phát sáng, chụp thành ảnh và lưu cache theo (chuỗi, màu).
import * as THREE from 'three';
import * as opentype from 'opentype.js';
import { geoSprite } from './props3d.js';
import { gfx3d } from './flag.js';
import { pixelOn } from '../../pixel.js';

let font = null, loading = false, failed = false;
function loadFont() {
  if (font || loading || failed) return;
  loading = true;
  fetch(new URL('assets3d/fonts/NotoSans-Bold-vi.ttf', document.baseURI).href).then((r) => r.arrayBuffer()).then((b) => { font = opentype.parse(b); }).catch((e) => { failed = true; console.warn('[3D] không tải được phông chữ 3D', e); });
}

const SIZE = 40; // px game trên 1 em khi dựng
const cache = new Set();
function build(txt, color) {
  return (TH) => {
    const path = font.getPath(txt, 0, 0, 1), sp = new TH.ShapePath();
    for (const c of path.commands) {
      if (c.type === 'M') sp.moveTo(c.x, -c.y); else if (c.type === 'L') sp.lineTo(c.x, -c.y);
      else if (c.type === 'Q') sp.quadraticCurveTo(c.x1, -c.y1, c.x, -c.y); else if (c.type === 'C') sp.bezierCurveTo(c.x1, -c.y1, c.x2, -c.y2, c.x, -c.y);
      else if (c.type === 'Z') { /* đóng đường: ShapePath tự đóng khi gặp moveTo */ }
    }
    const geo = new TH.ExtrudeGeometry(sp.toShapes(), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.022, bevelSegments: 2, curveSegments: 5 });
    geo.computeBoundingBox(); const bb = geo.boundingBox; geo.translate(-(bb.min.x + bb.max.x) / 2, 0, 0);
    const col = new TH.Color(color), m = new TH.Mesh(geo, new TH.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.45, roughness: 0.4, metalness: 0.1 }));
    const g = new TH.Group(); g.add(m); g.lookAt(new TH.Vector3(Math.sin(Math.PI / 4) * Math.cos(Math.PI / 6), Math.sin(Math.PI / 6), Math.cos(Math.PI / 4) * Math.cos(Math.PI / 6)).multiplyScalar(10)); return g;
  };
}
const ok = (txt) => { for (const ch of txt) if (ch !== ' ' && font.charToGlyphIndex(ch) === 0) return false; return true; };

/** Vẽ chữ 3D canh giữa tại (x, y = đường cơ sở), cao ~px (px game). Trả true nếu đã vẽ (false → vẽ lại bằng 2D). */
export function text3(c, txt, x, y, px, color) {
  if (!gfx3d() || failed || pixelOn()) return false;
  if (!font) { loadFont(); return false; }
  txt = String(txt); if (!txt || !ok(txt)) return false;
  const col = String(color || '#ffffff'), key = 'tx|' + txt + '|' + col;
  const ppu = Math.min(SIZE, 225 / Math.max(1, font.getAdvanceWidth(txt, 1))), sp = geoSprite(key, build(txt, col), ppu, { rim: true }); if (!sp) return false;
  if (!cache.has(key)) { cache.add(key); if (cache.size > 900) cache.clear(); }
  const k = px / ppu; c.drawImage(sp.cv, x + sp.box.x * k, y + sp.box.y * k, sp.box.w * k, sp.box.h * k); return true;
}
