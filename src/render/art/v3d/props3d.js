// Bản đồ 3D: vật trang trí (cây, đá, mộ…) và ô nền được dựng bằng three.js rồi chụp thành ảnh 2D lưu cache.
// Mô hình: Kenney Nature Kit + Graveyard Kit, KayKit Halloween Bits (CC0). Ô nền là khối vuông bo góc dựng bằng mã.
import * as TH from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const loader = new GLTFLoader(), D = 2, SZ = 512, OY = 420;
const AZ = Math.PI / 4, EL = Math.PI / 6, DIR = new TH.Vector3(Math.cos(EL) * Math.sin(AZ), Math.sin(EL), Math.cos(EL) * Math.cos(AZ));
let ok = null, rdr = null, scene = null, cam = null, trdr = null, tscene = null, tcam = null;
const urlOf = (p) => new URL('assets3d/' + p, document.baseURI).href;

function lights(sc, k = 1) { sc.add(new TH.HemisphereLight(0xffffff, 0x6a6a88, 1.9 * k)); const s = new TH.DirectionalLight(0xfff0dd, 2.2 * k); s.position.set(-3, 6, 4); sc.add(s); }
function init() {
  if (ok !== null) return ok;
  try {
    rdr = new TH.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); rdr.setSize(SZ, SZ); rdr.setClearColor(0x000000, 0); rdr.outputColorSpace = TH.SRGBColorSpace;
    scene = new TH.Scene(); scene.add(new TH.HemisphereLight(0xffffff, 0x8a8aa8, 2.9)); { const d = new TH.DirectionalLight(0xfff0dd, 1.5); d.position.set(-3, 6, 4); scene.add(d); } cam = new TH.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    trdr = new TH.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); trdr.setSize(128, 96); trdr.setClearColor(0x000000, 0); trdr.outputColorSpace = TH.SRGBColorSpace;
    tscene = new TH.Scene(); lights(tscene, 0.95); tcam = new TH.OrthographicCamera(-0.7071, 0.7071, 0.5304, -0.5304, 0.1, 50);
    ok = true;
  } catch (e) { ok = false; console.warn('[3D] bản đồ: không khởi động được WebGL — dùng bản vẽ 2D', e); }
  return ok;
}
export const props3dOk = () => init();

// ---------- mô hình ----------
const models = new Map();
function patch(mat) { // đổi màu theo sắc độ (như quái): chỉ vùng có màu đậm bị đổi
  const u = { uTint: { value: new TH.Color(1, 1, 1) }, uAmt: { value: 0 }, uAll: { value: 0 } }; mat.userData.u = u;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTint = u.uTint; sh.uniforms.uAmt = u.uAmt; sh.uniforms.uAll = u.uAll;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uTint; uniform float uAmt; uniform float uAll;').replace('#include <map_fragment>', '#include <map_fragment>\n{ float l = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11)); float sat = max(max(diffuseColor.r, diffuseColor.g), diffuseColor.b) - min(min(diffuseColor.r, diffuseColor.g), diffuseColor.b); float w = uAmt * mix(smoothstep(0.08, 0.28, sat), 1.0, uAll); diffuseColor.rgb = mix(diffuseColor.rgb, uTint * (0.55 + l * 1.4), w); }');
  };
}
function load(file) {
  let m = models.get(file); if (m !== undefined) return m;
  m = null; models.set(file, 'loading');
  loader.loadAsync(urlOf('p/' + file)).then((g) => {
    const root = g.scene, parts = [];
    root.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.userData.c0 = o.material.color.clone(); patch(o.material); parts.push(o); o.frustumCulled = false; } });
    root.updateMatrixWorld(true); const b = new TH.Box3().setFromObject(root), sz = b.getSize(new TH.Vector3()), ct = b.getCenter(new TH.Vector3());
    root.position.set(-ct.x, -b.min.y, -ct.z); const wrap = new TH.Group(); wrap.add(root);
    models.set(file, { wrap, parts, h: Math.max(0.01, sz.y), w: Math.max(sz.x, sz.z) });
  }).catch((e) => { models.set(file, 'fail'); console.warn('[3D] thiếu mô hình', file, e && e.message); });
  return 'loading';
}

function rim(src, pad) {
  const w = src.width + pad * 2, h = src.height + pad * 2, o = document.createElement('canvas'); o.width = w; o.height = h; const g = o.getContext('2d');
  const t = document.createElement('canvas'); t.width = w; t.height = h; const tg = t.getContext('2d');
  for (const [dx, dy] of [[-3, 0], [3, 0], [0, -3], [0, 3], [-2, -2], [2, -2], [-2, 2], [2, 2]]) tg.drawImage(src, pad + dx, pad + dy);
  tg.globalCompositeOperation = 'source-in'; tg.fillStyle = '#1a1020'; tg.fillRect(0, 0, w, h);
  g.drawImage(t, 0, 0); g.drawImage(src, pad, pad); return o;
}

const sprites = new Map();
/** Ảnh dựng sẵn của vật trang trí. spec = { file, h (cao, px game), tint, amt, rot }. Trả {cv, box:{x,y,w,h}} hoặc null nếu chưa sẵn sàng. */
export function propSprite(spec) {
  if (!init()) return null;
  const key = spec.file + '|' + spec.h + '|' + (spec.w || 0) + '|' + spec.tint + '|' + (spec.amt || 0) + (spec.full ? 'F' : '') + '|' + spec.rot;
  const hit = sprites.get(key); if (hit) return hit;
  const m = load(spec.file); if (!m || typeof m === 'string') return null;
  const ppu = Math.min(spec.h / (0.866 * m.h), spec.w ? spec.w / (m.w * 1.25) : 1e9), S = SZ / 2 / (ppu * D);
  cam.left = -S; cam.right = S; cam.top = S; cam.bottom = -S; cam.updateProjectionMatrix();
  const ty = (OY - SZ / 2) / (0.866 * ppu * D), tgt = new TH.Vector3(0, ty, 0); cam.position.copy(tgt).addScaledVector(DIR, 60); cam.lookAt(tgt);
  const col = new TH.Color(spec.tint || '#ffffff');
  for (const p of m.parts) { p.material.color.copy(p.material.userData.c0).multiply(col).multiplyScalar(1.2); const u = p.material.userData.u; u.uTint.value.copy(col); u.uAmt.value = spec.amt || 0; u.uAll.value = spec.full ? 1 : 0; }
  m.wrap.rotation.y = spec.rot || 0; scene.add(m.wrap); rdr.render(scene, cam); scene.remove(m.wrap);
  const full = document.createElement('canvas'); full.width = SZ; full.height = SZ; const fg = full.getContext('2d', { willReadFrequently: true }); fg.drawImage(rdr.domElement, 0, 0);
  const px = fg.getImageData(0, 0, SZ, SZ).data; let x0 = SZ, y0 = SZ, x1 = -1, y1 = -1;
  for (let y = 0; y < SZ; y++) for (let x = 0; x < SZ; x++) if (px[(y * SZ + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) { const e = { cv: document.createElement('canvas'), box: { x: 0, y: 0, w: 1, h: 1 } }; sprites.set(key, e); return e; }
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, c1 = document.createElement('canvas'); c1.width = cw; c1.height = ch; c1.getContext('2d').drawImage(full, x0, y0, cw, ch, 0, 0, cw, ch);
  const pad = 4, c2 = rim(c1, pad), e = { cv: c2, box: { x: (x0 - pad - SZ / 2) / D, y: (y0 - pad - OY) / D, w: c2.width / D, h: c2.height / D } };
  if (sprites.size > 260) sprites.clear(); sprites.set(key, e); return e;
}
export const propPreload = (files) => { if (init()) for (const f of files) load(f); };

// ---------- ô nền ----------
const tiles = new Map(); let tileGeo = null;
/** Ô nền 3D (khối vuông bo góc, mặt trên là hình thoi 64×32 game px). Trả canvas 128×96 (vẽ ở 64×48) hoặc null. */
export function tileSprite(hex) {
  const hit = tiles.get(hex); if (hit) return hit;
  if (!init()) return null;
  if (!tileGeo) tileGeo = new RoundedBoxGeometry(1, 0.2, 1, 3, 0.045);
  const mesh = new TH.Mesh(tileGeo, new TH.MeshStandardMaterial({ color: hex, roughness: 0.95, metalness: 0 })); mesh.position.y = -0.1;
  const ppuPx = 64 * D / Math.SQRT2; // gốc hình thoi nằm ở y = 32px (khung 96px, tâm 48px)
  const tgt = new TH.Vector3(0, -((48 - 32) / (0.866 * ppuPx)), 0); tcam.position.copy(tgt).addScaledVector(DIR, 20); tcam.lookAt(tgt);
  tscene.add(mesh); trdr.render(tscene, tcam); tscene.remove(mesh);
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 96; cv.getContext('2d').drawImage(trdr.domElement, 0, 0);
  if (tiles.size > 700) tiles.clear(); tiles.set(hex, cv); return cv;
}
