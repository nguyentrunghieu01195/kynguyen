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
  const q = Math.round((r.f % 1.0001) * 11), key = [r.cls, r.pose, q, r.weapon, r.tint, r.capeTint, r.helm ? 1 : 0, r.shield || '', r.wing ? r.wing.tier + '.' + r.wing.ph + (r.wing.glow ? 'g' : '') : ''].join('|');
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
  rdr.render(scene, cam); scene.remove(mm.root); if (wg) scene.remove(wg.userData.pv);
  const cv = document.createElement('canvas'); cv.width = FW; cv.height = FH; cv.getContext('2d').drawImage(rdr.domElement, 0, 0);
  if (frames.size > 240) frames.clear(); frames.set(key, cv); return cv;
}

// ---------- Quái (Quaternius Ultimate Monsters, CC0) ----------
const mobs = new Map(), mobFrames = new Map(), mobLast = new Map();
const wingCache = new Map(); const wingsOf = (t) => { let g = wingCache.get(t); if (!g) { g = makeWings(TH, t); wingCache.set(t, g || null); } return g; };
let mbud = 0, mbudPending = false;
const MPOSE = { idle: /(^|[|_])(Flying_Idle|Idle)(\||$)/, walk: /(Fast_Flying|Walk|Run)(\||$)/, attack: /(Bite_Front|Punch|Headbutt|Attack)\d?(\||$)/, hit: /HitRe/, death: /Death(\||$)/ };
async function loadMob(name) {
  if (mobs.has(name)) return;
  const p = (async () => {
    const gltf = await loader.loadAsync(urlOf('m/' + name + '.glb')), root = gltf.scene, parts = [], hulls = [];
    root.traverse((o) => {
      if (o.isMesh || o.isSkinnedMesh) {
        o.material = o.material.clone(); o.material.userData.c0 = o.material.color.clone(); parts.push(o); o.frustumCulled = false;
        { // đổi màu theo sắc độ: chỉ vùng có màu (độ bão hoà cao) bị đổi sang màu quái, vùng trắng / xám (mắt, răng) giữ nguyên
          const u = { uTint: { value: new TH.Color(1, 1, 1) }, uAmt: { value: 0 } }; o.material.userData.u = u;
          o.material.onBeforeCompile = (sh) => {
            sh.uniforms.uTint = u.uTint; sh.uniforms.uAmt = u.uAmt;
            sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uTint; uniform float uAmt;').replace('#include <map_fragment>', '#include <map_fragment>\n{ float l = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11)); float sat = max(max(diffuseColor.r, diffuseColor.g), diffuseColor.b) - min(min(diffuseColor.r, diffuseColor.g), diffuseColor.b); float w = uAmt * smoothstep(0.08, 0.28, sat); diffuseColor.rgb = mix(diffuseColor.rgb, uTint * (0.55 + l * 1.4), w); }');
          };
        }
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
  const clip = m.clips.find((a) => MPOSE[r.pose] && MPOSE[r.pose].test(a.name)) || m.clips.find((a) => MPOSE.idle.test(a.name)) || m.clips[0];
  const col = new TH.Color(r.tint || '#ffffff'); for (const p of m.parts) { p.material.color.copy(p.material.userData.c0 || new TH.Color(1, 1, 1)).multiplyScalar(1.2); const u = p.material.userData.u; if (u) { u.uTint.value.copy(col); u.uAmt.value = r.amt || 0; } }
  m.mixer.stopAllAction();
  if (clip) { const a = m.mixer.clipAction(clip); a.play(); a.paused = true; const loop = r.pose === 'idle' || r.pose === 'walk'; a.time = loop ? ((q / 12) % 1) * clip.duration : Math.min(clip.duration - 0.001, (q / 11) * clip.duration); m.mixer.update(0); }
  m.wrap.rotation.y = Math.PI / 2; scene.add(m.wrap); rdr.render(scene, cam); scene.remove(m.wrap);
  const cv = document.createElement('canvas'); cv.width = FW; cv.height = FH; const cg = cv.getContext('2d');
  if (r.model.startsWith('Q_')) rim(cg, rdr.domElement); else cg.drawImage(rdr.domElement, 0, 0);
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
