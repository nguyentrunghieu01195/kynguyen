// Nhân vật 3D (KayKit Adventurers, CC0) dựng bằng three.js rồi chụp thành ảnh 2D theo yêu cầu, lưu cache.
// Game vẫn vẽ bằng Canvas 2D: mỗi khung hoạt ảnh chỉ dựng 3D một lần, lần sau chỉ drawImage.
import { mix } from '../../paint.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { makeWings, poseWings } from './wings3d.js';

const FW = 256, FH = 224;                          // kích thước khung ảnh dựng sẵn
const MODEL = { knight: 'Knight', wizard: 'Mage', archer: 'Rogue', sk_warrior: 'Skeleton_Warrior', sk_minion: 'Skeleton_Minion', sk_mage: 'Skeleton_Mage', sk_rogue: 'Skeleton_Rogue' };
const ANIM = {
  knight: { idle: 'Idle', walk: 'Walking_B', attack: '1H_Melee_Attack_Slice_Diagonal', skill: '2H_Melee_Attack_Spin', hit: 'Hit_A', death: 'Death_A' },
  wizard: { idle: 'Idle', walk: 'Walking_B', attack: 'Spellcast_Shoot', skill: 'Spellcast_Long', hit: 'Hit_A', death: 'Death_A' },
  archer: { idle: 'Idle', walk: 'Walking_B', attack: '2H_Ranged_Shoot', skill: '2H_Ranged_Shoot', hit: 'Hit_A', death: 'Death_A' },
  sk_warrior: { idle: 'Idle', walk: 'Walking_B', attack: '1H_Melee_Attack_Slice_Diagonal', skill: '2H_Melee_Attack_Spin', hit: 'Hit_A', death: 'Death_A' },
  sk_minion: { idle: 'Idle', walk: 'Walking_B', attack: '1H_Melee_Attack_Chop', skill: '2H_Melee_Attack_Spin', hit: 'Hit_A', death: 'Death_A' },
  sk_mage: { idle: 'Idle', walk: 'Walking_B', attack: 'Spellcast_Shoot', skill: 'Spellcast_Long', hit: 'Hit_A', death: 'Death_A' },
  sk_rogue: { idle: 'Idle', walk: 'Walking_B', attack: '1H_Ranged_Shoot', skill: '1H_Ranged_Shoot', hit: 'Hit_A', death: 'Death_A' },
};
// loại vũ khí của game → nút có sẵn trong mô hình (b) hoặc tệp vũ khí rời (w)
const WEAPON = {
  sword1: { w: 'sword_1handed' }, xbow: { w: 'crossbow_1handed' },
  sword: { b: '1H_Sword' }, axe: { w: 'axe_1handed' }, mace: { w: 'axe_2handed' }, spear: { w: 'staff' }, special: { w: 'sword_2handed' },
  staff: { b: '2H_Staff' }, orb: { b: '1H_Wand' }, tome: { b: '2H_Staff' },
  bow: { b: '2H_Crossbow' }, crossbow: { b: '1H_Crossbow' }, twinbow: { b: '2H_Crossbow' },
};
const ACCESSORY = /Hood|Sword|Shield|Helmet|Cape|Staff|Wand|Hat|Crossbow|Knife|Spellbook|Throwable/i;
const HELM = { Knight: 'Knight_Helmet', Mage: 'Mage_Hat', Rogue: null, Skeleton_Warrior: 'Skeleton_Warrior_Helmet', Skeleton_Mage: 'Skeleton_Mage_Hat', Skeleton_Rogue: 'Skeleton_Rogue_Hood' }, CAPE = { Knight: 'Knight_Cape', Mage: 'Mage_Cape', Rogue: 'Rogue_Cape', Skeleton_Warrior: 'Skeleton_Warrior_Cloak', Skeleton_Rogue: 'Skeleton_Rogue_Cape' };

let TH = null, loader = null, rdr = null, scene = null, cam = null, booting = null, failed = false;
const models = new Map(), weapons = new Map(), frames = new Map();
const urlOf = (p) => new URL('assets3d/' + p, typeof document !== 'undefined' ? document.baseURI : 'http://localhost/').href;

async function boot() {
  if (TH || failed) return;
  if (!booting) booting = (async () => {
    try {
      TH = THREE; loader = new GLTFLoader();
      rdr = new TH.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); rdr.setSize(FW, FH); rdr.setClearColor(0x000000, 0); rdr.outputColorSpace = TH.SRGBColorSpace;
      scene = new TH.Scene(); scene.add(new TH.HemisphereLight(0xffffff, 0x6a6a88, 1.9)); const sun = new TH.DirectionalLight(0xfff0dd, 2.2); sun.position.set(-3, 6, 4); scene.add(sun);
      const az = Math.PI / 4, el = Math.PI / 6, R = 10, TOP = 2.55, BOT = -0.35, hw = ((TOP - BOT) * FW) / FH / 2;
      cam = new TH.OrthographicCamera(-hw, hw, TOP, BOT, 0.1, 100); cam.position.set(Math.cos(el) * Math.sin(az) * R, Math.sin(el) * R, Math.cos(el) * Math.cos(az) * R); cam.lookAt(0, 0, 0);
    } catch (e) { failed = true; console.warn('[3D] không khởi động được WebGL — dùng bản vẽ 2D', e); }
  })();
  await booting;
}
export const available3d = () => typeof document !== 'undefined' && !failed;

async function loadModel(name) {
  let m = models.get(name); if (m) return m;
  const p = (async () => {
    const gltf = await loader.loadAsync(urlOf(name + '.glb')), root = gltf.scene;
    const mixer = new TH.AnimationMixer(root), clips = Object.fromEntries(gltf.animations.map((a) => [a.name, a])), acc = new Map(), parts = [];
    root.traverse((o) => {
      if (o.isMesh || o.isSkinnedMesh) {
        if (ACCESSORY.test(o.name)) { acc.set(o.name, o); o.visible = false; if (o.material) o.material = o.material.clone(); }
        else if (/Body|Arm|Leg/.test(o.name)) { o.material = o.material.clone(); parts.push(o); }
        if (o.isSkinnedMesh && !/_outline$/.test(o.name)) { // viền tối: vỏ lật mặt dùng chung bộ xương
          const mt = new TH.MeshBasicMaterial({ color: 0x1a1020, side: TH.BackSide }); mt.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', 'transformed += normalize(objectNormal) * 0.018;\n#include <project_vertex>'); };
          const ol = new TH.SkinnedMesh(o.geometry, mt); ol.bind(o.skeleton, o.bindMatrix); ol.name = o.name + '_outline'; ol.visible = !ACCESSORY.test(o.name); o.parent.add(ol); ol.userData.of = o;
        }
      }
    });
    let hand = null; root.traverse((o) => { if (!hand && /^handslot\.?r$/.test(o.name)) hand = o; });
    const _h = hand, model = { root, mixer, clips, acc, parts, hand: _h, hold: null, name };
    models.set(name, model); return model;
  })();
  models.set(name, p); return p;
}
async function loadWeapon(file) {
  if (weapons.has(file)) return weapons.get(file);
  const p = loader.loadAsync(urlOf('w/' + file + '.gltf')).then((g) => { weapons.set(file, g.scene); return g.scene; }); weapons.set(file, p); return p;
}

/** Chuẩn bị mô hình theo yêu cầu: bật / tắt đồ đeo, gắn vũ khí, nhuộm màu giáp */
function prep(m, r) {
  const mn = m.name;
  for (const [n, o] of m.acc) { o.visible = false; }
  for (const o of m.root.children) { /* viền của đồ đeo tắt theo bản gốc */ }
  m.root.traverse((o) => { if (o.userData && o.userData.of) o.visible = o.userData.of.visible; });
  const show = (n) => { const o = m.acc.get(n); if (o) { o.visible = true; } };
  if (r.helm && HELM[mn]) show(HELM[mn]); if (r.cape !== false) show(CAPE[mn]);
  const wp = WEAPON[r.weapon] || WEAPON.sword;
  if (wp.b) show(wp.b);
  if (wp.w && r.wobj) { if (m.hold) m.hand.remove(m.hold); const o = r.wobj.clone(true); const ref = m.acc.get('1H_Sword') || m.acc.get('2H_Staff') || m.acc.get('1H_Crossbow'); if (ref) { o.position.copy(ref.position); o.quaternion.copy(ref.quaternion); } m.hand.add(o); m.hold = o; }
  else if (m.hold) { m.hand.remove(m.hold); m.hold = null; }
  if (mn === 'Knight' && r.shield) show(r.shield);
  if (mn === 'Mage' && r.weapon === 'tome') show('Spellbook_open');
  m.root.traverse((o) => { if (o.userData && o.userData.of) o.visible = o.userData.of.visible; });
  const col = new TH.Color(r.tint || '#ffffff'); for (const p of m.parts) p.material.color.copy(col);
  const cape = m.acc.get(CAPE[mn]); if (cape && cape.material) cape.material.color.set(r.capeTint || '#ffffff');
}

/**
 * Lấy khung hoạt ảnh dựng sẵn (canvas 2D) hoặc null nếu mô hình chưa tải xong (khi đó gọi lại sau).
 * r = { cls, pose, f (0..1 tiến độ), weapon, tint, capeTint, helm, shield }
 */
export function frame(r) {
  if (!TH) { boot(); return null; }
  const name = MODEL[r.cls]; if (!name) return null;
  const q = Math.round((r.f % 1.0001) * 11), key = [r.cls, r.pose, q, r.weapon, r.tint, r.capeTint, r.helm ? 1 : 0, r.shield || '', r.wing ? r.wing.tier + '.' + r.wing.ph + (r.wing.glow ? 'g' : '') : '', r.gear ? r.gear.tier + r.gear.col : ''].join('|');
  const hit = frames.get(key); if (hit) return hit;
  const mm = models.get(name);
  if (!mm) { loadModel(name); return null; }
  if (mm.then) return null;                                  // đang tải
  const wp = WEAPON[r.weapon] || WEAPON.sword;
  if (wp.w) { const ww = weapons.get(wp.w); if (!ww) { loadWeapon(wp.w); return null; } if (ww.then) return null; r = { ...r, wobj: ww }; }
  prep(mm, r);
  const clip = mm.clips[ANIM[r.cls][r.pose] || 'Idle']; mm.mixer.stopAllAction(); const a = mm.mixer.clipAction(clip); a.play(); a.paused = true;
  const loop = r.pose === 'idle' || r.pose === 'walk'; a.time = loop ? ((q / 12) % 1) * clip.duration : Math.min(clip.duration - 0.001, (q / 11) * clip.duration); mm.mixer.update(0);
  mm.root.rotation.y = Math.PI / 2; scene.add(mm.root);
  let wg = null;
  if (r.wing) { // cánh dựng riêng, đặt theo vị trí ngực nhân vật (không phụ thuộc trục xương)
    wg = wingsOf(r.wing.tier); if (wg) { poseWings(wg, r.wing.ph / 6); const ch = mm.root.getObjectByName('chest') || mm.root.getObjectByName('spine'); const pv = new TH.Group(); const v = new TH.Vector3(); mm.root.updateMatrixWorld(true); if (ch) ch.getWorldPosition(v); pv.position.copy(v); pv.rotation.y = Math.PI / 2; wg.position.set(0, 0.0, -0.2); pv.add(wg); wg.userData.pv = pv; scene.add(pv); }
  }
  let gr = null;
  if (r.gear && r.gear.tier >= 2) { // phụ kiện giáp: đặt theo vị trí xương trong toạ độ thế giới
    gr = gearOf(r.gear.tier, r.gear.col); mm.root.updateMatrixWorld(true);
    const fb = (re) => { let f = null; mm.root.traverse((o) => { if (!f && re.test(o.name)) f = o; }); return f; };
    const bl = mm.bl || (mm.bl = { l: fb(/^upperarm\.?l$/), r: fb(/^upperarm\.?r$/), h: fb(/^head$/) }), v = new TH.Vector3();
    if (bl.l && bl.r) { const a = new TH.Vector3(), b2 = new TH.Vector3(); bl.l.getWorldPosition(a); bl.r.getWorldPosition(b2); const ctr = a.clone().add(b2).multiplyScalar(0.5);
      gr.pads.forEach((p, i) => { const q = i ? b2 : a, out = q.clone().sub(ctr); out.y = 0; if (out.lengthSq() > 1e-6) out.normalize().multiplyScalar(0.12); p.position.copy(q).add(out); p.position.y += 0.08; scene.add(p); }); }
    if (gr.head.children.length && r.cls !== 'wizard') { // đặt theo khối bao đầu (pháp sư đã có mũ rộng vành) / mũ đang hiển thị
      const hb = new TH.Box3(); mm.root.traverse((o) => { if (o.isMesh && o.visible && /(Head|Helmet|Hat)$/.test(o.name) && !/_outline$/.test(o.name)) { hb.expandByObject(o); } });
      if (!hb.isEmpty()) { const c3 = hb.getCenter(new TH.Vector3()), sz = hb.getSize(new TH.Vector3()); gr.head.position.set(c3.x, hb.max.y - 0.2, c3.z); gr.head.rotation.y = Math.PI / 2; gr.head.scale.setScalar(Math.max(0.7, Math.min(1.5, sz.z / 0.75))); scene.add(gr.head); }
    }
  }
  rdr.render(scene, cam); scene.remove(mm.root); if (wg) scene.remove(wg.userData.pv);
  if (gr) { for (const p of gr.pads) scene.remove(p); scene.remove(gr.head); }
  const cv = document.createElement('canvas'); cv.width = FW; cv.height = FH; cv.getContext('2d').drawImage(rdr.domElement, 0, 0);
  if (frames.size > 240) frames.clear(); frames.set(key, cv); return cv;
}

// ---------- Quái (Quaternius Ultimate Monsters, CC0) ----------
const mobs = new Map(), mobFrames = new Map(), mobLast = new Map();
const wingCache = new Map(); const wingsOf = (t) => { let g = wingCache.get(t); if (!g) { g = makeWings(TH, t); wingCache.set(t, g || null); } return g; };
// Phụ kiện giáp theo bậc: vai, sừng, mào, vương miện — dựng bằng khối hình học, đặt theo xương vai / đầu
const gearCache = new Map();
function gearOf(tier, col) {
  const key = tier + '|' + col; let g = gearCache.get(key); if (g) return g;
  const trim = new TH.Color(col || '#c8c8d0'), gold = new TH.Color('#ffd24a'), M = (c, r = 0.45, m = 0.5) => new TH.MeshStandardMaterial({ color: c, roughness: r, metalness: m, flatShading: true });
  const mk = (geo, mat, x, y, z) => { const o = new TH.Mesh(geo, mat); o.position.set(x, y, z); return o; };
  g = { pads: [], head: new TH.Group() };
  const big = (tier >= 5 ? 1.35 : tier >= 4 ? 1.15 : 1) * 1.7;
  for (const sd of [-1, 1]) {
    const pad = new TH.Group(); pad.add(mk(new TH.SphereGeometry(0.17 * big, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.62), M(trim), 0, 0, 0));
    pad.add(mk(new TH.TorusGeometry(0.16 * big, 0.022, 6, 14), M(gold, 0.3, 0.7), 0, -0.02, 0)).rotation.x = Math.PI / 2;
    if (tier >= 4) for (let k = 0; k < (tier >= 5 ? 3 : 1); k++) { const sp = mk(new TH.ConeGeometry(0.045 * big, 0.2 * big, 6), M(gold, 0.3, 0.7), sd * (0.05 + k * 0.05), 0.15 * big, (k - 1) * 0.07); sp.rotation.z = -sd * 0.5; pad.add(sp); }
    pad.userData.sd = sd; g.pads.push(pad);
  }
  if (tier >= 3 && tier < 6) for (const sd of [-1, 1]) { const h = mk(new TH.ConeGeometry(0.08, tier >= 4 ? 0.5 : 0.36, 6), M('#e8e0c8', 0.6, 0.1), sd * 0.34, tier >= 4 ? -0.05 : -0.1, 0); h.rotation.z = -sd * 0.55; g.head.add(h); }
  if (tier === 5) { const f = mk(new TH.BoxGeometry(0.05, 0.36, 0.44), M(trim), 0, 0.12, -0.04); g.head.add(f); }
  if (tier === 6) { const cr = new TH.Group(); cr.add(mk(new TH.CylinderGeometry(0.3, 0.32, 0.12, 12, 1, true), new TH.MeshStandardMaterial({ color: gold, roughness: 0.25, metalness: 0.8, side: TH.DoubleSide }), 0, 0.1, 0)); for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2, sp = mk(new TH.ConeGeometry(0.05, 0.2, 5), M(gold, 0.25, 0.8), Math.cos(a) * 0.31, 0.26, Math.sin(a) * 0.31); cr.add(sp); } g.head.add(cr); }
  gearCache.set(key, g); return g;
}
let mbud = 0, mbudPending = false;
const MPOSE = { idle: /(^|[|_])(Flying_Idle|Idle)(\||$)/, walk: /(Fast_Flying|Walk|Run)(\||$)/, attack: /(Bite_Front|Punch|Headbutt|Attack)\d?(\||$)/, hit: /HitRe/, death: /Death(\||$)/ };
function setupMat(mat) { // đổi màu theo sắc độ: chỉ vùng có màu (độ bão hoà cao) bị đổi sang màu quái, vùng trắng / xám (mắt, răng) giữ nguyên
  mat.userData.c0 = mat.color.clone();
  const u = { uTint: { value: new THREE.Color(1, 1, 1) }, uAmt: { value: 0 } }; mat.userData.u = u;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTint = u.uTint; sh.uniforms.uAmt = u.uAmt;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uTint; uniform float uAmt;').replace('#include <map_fragment>', '#include <map_fragment>\n{ float l = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11)); float sat = max(max(diffuseColor.r, diffuseColor.g), diffuseColor.b) - min(min(diffuseColor.r, diffuseColor.g), diffuseColor.b); float w = uAmt * smoothstep(0.08, 0.28, sat); diffuseColor.rgb = mix(diffuseColor.rgb, uTint * (0.55 + l * 1.4), w); }');
  };
}
// Quái dựng hoàn toàn bằng hình học (không có mô hình sẵn): sâu cát
const PROC = {
  G_Hydra: () => { // thân tròn + 3 cổ rắn có đầu, uốn lượn
    const wrap = new THREE.Group(), parts = [], necks = [];
    const mk = (geo, col, rough = 0.8) => { const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: col, roughness: rough, flatShading: true })); setupMat(m.material); m.frustumCulled = false; parts.push(m); return m; };
    const body = mk(new THREE.IcosahedronGeometry(0.8, 1), new THREE.Color('#4f9a52')); body.scale.set(1.15, 0.75, 1); body.position.y = 0.6; wrap.add(body);
    const belly = mk(new THREE.IcosahedronGeometry(0.62, 1), new THREE.Color('#d9d28a')); belly.scale.set(1.0, 0.5, 0.9); belly.position.set(0.1, 0.42, 0); wrap.add(belly);
    for (const sd of [-1, 1]) for (const sx of [-0.5, 0.5]) { const leg = mk(new THREE.CylinderGeometry(0.14, 0.18, 0.4, 7), new THREE.Color('#3d7a40')); leg.position.set(sx, 0.2, sd * 0.55); wrap.add(leg); }
    for (let n = 0; n < 3; n++) {
      const segs = [], N = 6, g = new THREE.Group();
      for (let i = 0; i < N; i++) { const sg = mk(new THREE.IcosahedronGeometry(0.2 - i * 0.012, 1), new THREE.Color(i % 2 ? '#5aac5e' : '#4a8f4e')); g.add(sg); segs.push(sg); }
      const head = new THREE.Group(); head.add(mk(new THREE.IcosahedronGeometry(0.27, 1), new THREE.Color('#5aac5e')));
      const snout = mk(new THREE.ConeGeometry(0.15, 0.3, 6), new THREE.Color('#4a8f4e')); snout.rotation.z = -Math.PI / 2; snout.position.x = 0.28; head.add(snout);
      for (const e of [-1, 1]) { const ey = mk(new THREE.SphereGeometry(0.06, 8, 6), new THREE.Color('#ffe060'), 0.3); ey.position.set(0.12, 0.12, e * 0.13); head.add(ey); }
      const tg = mk(new THREE.BoxGeometry(0.2, 0.02, 0.05), new THREE.Color('#d83a3a')); tg.position.set(0.45, -0.02, 0); head.add(tg);
      g.add(head); wrap.add(g); necks.push({ g, segs, head, ang: (n - 1) * 0.75 });
    }
    const anim = (ph) => {
      necks.forEach((nk, n) => {
        const base = new THREE.Vector3(Math.sin(nk.ang) * 0.3, 0.9, Math.cos(nk.ang) * 0.3 * 0 + (n - 1) * 0.35);
        nk.segs.forEach((sg, i) => { const k = (i + 1) / nk.segs.length, sw = Math.sin(ph * 6.283 + n * 2 + k * 2.5) * 0.18 * k; sg.position.set(base.x + k * 0.55 + sw * 0.4, base.y + Math.sin(k * 2.2) * 0.9, base.z + (n - 1) * k * 0.55 + sw); });
        const k = 1.05, sw = Math.sin(ph * 6.283 + n * 2 + k * 2.5) * 0.18; nk.head.position.set(base.x + k * 0.58 + sw * 0.4, base.y + Math.sin(k * 2.2) * 0.9 + 0.05, base.z + (n - 1) * k * 0.55 + sw); nk.head.rotation.z = -0.5 + Math.sin(ph * 6.283 + n) * 0.15;
      });
    };
    anim(0); wrap.scale.setScalar(0.8); return { wrap, parts, anim };
  },
  G_Worm: () => {
    const wrap = new THREE.Group(), parts = [], segs = [], N = 9;
    const mk = (geo, col, rough = 0.85) => { const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: col, roughness: rough, flatShading: true })); setupMat(m.material); m.frustumCulled = false; parts.push(m); return m; };
    for (let i = 0; i < N; i++) { const r = 0.62 - i * 0.045, sg = mk(new THREE.IcosahedronGeometry(r, 1), i % 2 ? new THREE.Color('#d9a560') : new THREE.Color('#b9854a')); segs.push(sg); wrap.add(sg); }
    const head = new THREE.Group(); const hs = mk(new THREE.IcosahedronGeometry(0.72, 1), new THREE.Color('#c99350')); head.add(hs);
    const mouth = mk(new THREE.TorusGeometry(0.42, 0.1, 6, 14), new THREE.Color('#6a2a1a')); mouth.position.set(0.5, -0.05, 0); mouth.rotation.y = Math.PI / 2; head.add(mouth);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2, t = mk(new THREE.ConeGeometry(0.07, 0.3, 5), new THREE.Color('#f4ecd6'), 0.4); t.position.set(0.5, -0.05 + Math.cos(a) * 0.36, Math.sin(a) * 0.36); t.rotation.z = -Math.PI / 2; t.rotation.x = a; head.add(t); }
    for (const sd of [-1, 1]) { const e = mk(new THREE.SphereGeometry(0.1, 8, 6), new THREE.Color('#ffffff'), 0.3); e.position.set(0.3, 0.38, sd * 0.38); head.add(e); }
    wrap.add(head);
    const anim = (ph) => { // thân uốn lượn đi lên, đầu ngẩng
      for (let i = 0; i < N; i++) { const k = i / (N - 1), y = 0.35 + k * 1.9, x = Math.sin(ph * 6.283 + k * 3.2) * 0.22 * (0.4 + k); segs[i].position.set(-x - 0.1 * k, y, Math.cos(ph * 6.283 + k * 2.2) * 0.1); }
      head.position.set(0.22 + Math.sin(ph * 6.283 + 3.2) * 0.1, 2.45 + Math.sin(ph * 12.566) * 0.04, 0); head.rotation.z = -0.35 + Math.sin(ph * 6.283) * 0.12;
    };
    anim(0); wrap.scale.setScalar(0.72); return { wrap, parts, anim };
  },
};

async function loadMob(name) {
  if (mobs.has(name)) return;
  if (PROC[name]) { const pr = PROC[name](), outer = new THREE.Group(); pr.wrap.rotation.y = -Math.PI / 2; outer.add(pr.wrap); mobs.set(name, { wrap: outer, root: outer, mixer: null, clips: [], parts: pr.parts, anim: pr.anim, k: 1 }); return; }
  const p = (async () => {
    const gltf = await loader.loadAsync(urlOf('m/' + name + '.glb')), root = gltf.scene, parts = [], hulls = [];
    root.traverse((o) => {
      if (o.isMesh || o.isSkinnedMesh) {
        o.material = o.material.clone(); parts.push(o); o.frustumCulled = false;
        setupMat(o.material);
        if (o.isSkinnedMesh && !name.startsWith('Q_')) {
          o.geometry.computeBoundingSphere(); const th = Math.min(0.02, o.geometry.boundingSphere.radius * 0.012);
          const mt = new TH.MeshBasicMaterial({ color: 0x1a1020, side: TH.BackSide }); mt.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', 'transformed += normalize(objectNormal) * ' + th.toFixed(5) + ';\n#include <project_vertex>'); };
          const ol = new TH.SkinnedMesh(o.geometry, mt); ol.bind(o.skeleton, o.bindMatrix); hulls.push([o.parent, ol]);
        }
      }
    });
    for (const [par, ol] of hulls) par.add(ol);
    // chuẩn hoá kích thước theo tư thế đầu tiên của hoạt ảnh nghỉ
    const mixer = new TH.AnimationMixer(root), clips = gltf.animations, idle = clips.find((a) => MPOSE.idle.test(a.name)) || clips[0];
    if (idle) { mixer.clipAction(idle).play(); mixer.update(0.0001); }
    root.updateMatrixWorld(true); let b = new TH.Box3().setFromObject(root);
    if (!Number.isFinite(b.min.x + b.max.x + b.min.y + b.max.y + b.min.z + b.max.z)) { // khung xương lỗi → lấy khối bao theo hình học gốc
      b = new TH.Box3(); root.traverse((o) => { if (o.geometry) { o.geometry.computeBoundingBox(); if (o.geometry.boundingBox) b.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)); } });
    }
    const sz = b.getSize(new TH.Vector3()), ct = b.getCenter(new TH.Vector3());
    const k = 1.75 / Math.max(sz.x * 0.8, sz.y, sz.z * 0.8), fly = /^Flying_/.test(name);
    const wrap = new TH.Group(); wrap.add(root); root.scale.setScalar(k); root.position.set(-ct.x * k, fly ? -ct.y * k + 0.95 : -b.min.y * k, -ct.z * k);
    mixer.stopAllAction();
    mobs.set(name, { wrap, root, mixer, clips, parts, hulls, k });
  })().catch((e) => { mobs.delete(name); });
  mobs.set(name, p);
}
/** Khung quái dựng sẵn; r = { model, pose, f, tint }. Trả về null khi chưa tải xong. */
export function mobFrame(r) {
  if (!TH) { boot(); return null; }
  const m = mobs.get(r.model); if (!m) { loadMob(r.model); return null; } if (m.then) return null;
  const q = Math.round((r.f % 1.0001) * 11), key = r.model + '|' + r.pose + '|' + q + '|' + r.tint + '|' + (r.amt || 0), lk = r.model + '|' + r.pose;
  const hit = mobFrames.get(key); if (hit) { mobLast.set(lk, hit); return hit; }
  if (!mbudPending) { mbudPending = true; requestAnimationFrame(() => { mbud = 0; mbudPending = false; }); }
  if (mbud >= 3) return mobLast.get(lk) || null;
  mbud++;
  const clip = m.anim ? null : (m.clips.find((a) => MPOSE[r.pose] && MPOSE[r.pose].test(a.name)) || m.clips.find((a) => MPOSE.idle.test(a.name)) || m.clips[0]);
  const col = new TH.Color(r.tint || '#ffffff'); for (const p of m.parts) { p.material.color.copy(p.material.userData.c0 || new TH.Color(1, 1, 1)).multiplyScalar(1.2); const u = p.material.userData.u; if (u) { u.uTint.value.copy(col); u.uAmt.value = r.amt || 0; } }
  if (m.anim) m.anim((r.f % 1.0001) * (r.pose === 'walk' ? 2 : 1));
  else m.mixer.stopAllAction();
  if (clip && !m.anim) { const a = m.mixer.clipAction(clip); a.play(); a.paused = true; const loop = r.pose === 'idle' || r.pose === 'walk'; a.time = loop ? ((q / 12) % 1) * clip.duration : Math.min(clip.duration - 0.001, (q / 11) * clip.duration); m.mixer.update(0); }
  m.wrap.rotation.y = Math.PI / 2; scene.add(m.wrap); rdr.render(scene, cam); scene.remove(m.wrap);
  const cv = document.createElement('canvas'); cv.width = FW; cv.height = FH; const cg = cv.getContext('2d');
  if (/^(Q_|G_)/.test(r.model)) rim(cg, rdr.domElement); else cg.drawImage(rdr.domElement, 0, 0);
  if (mobFrames.size > 360) mobFrames.clear(); mobFrames.set(key, cv); mobLast.set(lk, cv); return cv;
}
/** Viền tối 2D quanh hình (cho mô hình không dùng được viền vỏ lật mặt) */
function rim(g, src) {
  const t = document.createElement('canvas'); t.width = FW; t.height = FH; const tg = t.getContext('2d');
  for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) tg.drawImage(src, dx, dy);
  tg.globalCompositeOperation = 'source-in'; tg.fillStyle = '#1a1020'; tg.fillRect(0, 0, FW, FH);
  g.drawImage(t, 0, 0); g.drawImage(src, 0, 0);
}
// Quái: khung dựng sẵn cho họ xương (cờ 3D); trả null nếu chưa có mô hình / chưa tải xong
export const MOB3D = { warrior: ['sk_warrior', 'sword1'], minion: ['sk_minion', 'axe'], mage: ['sk_mage', 'spear'], rogue: ['sk_rogue', 'xbow'] };
export const FRAME = { w: FW, h: FH };
export const tint3d = (hex, k = 0.6) => mix('#ffffff', hex, k);
