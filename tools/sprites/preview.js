// Thử nghiệm: mô hình 3D (KayKit, CC0) dựng bằng three.js → ảnh sprite isometric. So sánh với bộ vẽ code hiện tại.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { drawChibi } from '../../src/render/art/v2/chibi.js';

const W = 220, H = 260;
const bar = document.getElementById('bar'), wrap = document.getElementById('wrap');
const Q = new URLSearchParams(location.search), S = { cls: Q.get('cls') || 'Knight', anim: Q.get('anim') || 'Idle', dir: +Q.get('dir') || 0, weapon: true };
const ANIMS = { Idle: 'Idle', 'Đi bộ': 'Walking_B', 'Chạy': 'Running_A', 'Đánh chém': '1H_Melee_Attack_Slice_Diagonal', 'Đánh 2 tay': '2H_Melee_Attack_Spin', 'Phép': 'Spellcast_Shoot', 'Bị đánh': 'Hit_A', 'Chết': 'Death_A', 'Mừng': 'Cheer' };
const GLB = { Knight: './assets/Knight.glb', Mage: './assets/Mage.glb', Rogue: './assets/Rogue.glb', Barbarian: './assets/Barbarian.glb' };
const CLS_OLD = { Knight: 'knight', Mage: 'wizard', Rogue: 'archer', Barbarian: 'knight' };
// ẩn bớt đồ đeo thừa theo từng nhân vật
const SHOW = { Knight: ['1H_Sword', 'Round_Shield', 'Knight_Helmet', 'Knight_Cape'], Mage: ['2H_Staff', 'Mage_Hat', 'Mage_Cape'], Rogue: ['2H_Crossbow', 'Rogue_Cape'], Barbarian: ['2H_Axe', 'Barbarian_Round_Shield'] };

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setClearColor(0x000000, 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0x6a6a88, 1.9));
const sun = new THREE.DirectionalLight(0xfff0dd, 2.2); sun.position.set(-3, 6, 4); scene.add(sun);
// camera isometric 2:1: góc phương vị 45°, góc nâng 30°
const az = Math.PI / 4, el = Math.PI / 6, R = 10, viewH = 3.0;
const TOP = 2.55, BOT = -0.35, cam = new THREE.OrthographicCamera(-(TOP - BOT) * W / H / 2, (TOP - BOT) * W / H / 2, TOP, BOT, 0.1, 100);
cam.position.set(Math.cos(el) * Math.sin(az) * R, Math.sin(el) * R, Math.cos(el) * Math.cos(az) * R); cam.lookAt(0, 0, 0);

const loader = new GLTFLoader(), models = {};
async function load(name) {
  if (models[name]) return models[name];
  const gltf = await loader.loadAsync(GLB[name]);
  const root = gltf.scene, mixer = new THREE.AnimationMixer(root), clips = Object.fromEntries(gltf.animations.map((a) => [a.name, a]));
  const keep = SHOW[name];
  root.traverse((o) => {
    if (o.isMesh || o.isSkinnedMesh) {
      const nm = o.name; const accessory = /Sword|Shield|Helmet|Cape|Staff|Wand|Hat|Axe|Crossbow|Knife|Spellbook|Throwable|Badge|Rectangle|Spike|Round/i.test(nm);
      if (accessory && !keep.includes(nm)) o.visible = false;
      if (o.isSkinnedMesh && o.visible) { // viền: vỏ lật mặt phình ra theo pháp tuyến, dùng chung bộ xương
        const m = new THREE.MeshBasicMaterial({ color: 0x1a1020, side: THREE.BackSide });
        m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', 'transformed += normalize(objectNormal) * 0.018;\n#include <project_vertex>'); };
        const ol = new THREE.SkinnedMesh(o.geometry, m); ol.bind(o.skeleton, o.bindMatrix); o.parent.add(ol); ol.name = nm + '_outline';
      }
    }
  });
  root.scale.setScalar(1.0);
  models[name] = { root, mixer, clips, name };
  return models[name];
}

let cur = null;
function setModel(m) { if (cur) scene.remove(cur.root); cur = m; scene.add(m.root); }
function pose(t) { // t giây trong hoạt ảnh hiện tại (lặp)
  const clip = cur.clips[ANIMS[S.anim] || S.anim]; cur.mixer.stopAllAction();
  const a = cur.mixer.clipAction(clip); a.play(); a.paused = true;
  const loop = !/Death|Hit|Cheer|Attack|Spell/.test(clip.name), tt = loop ? t % clip.duration : Math.min(clip.duration - 0.001, t % (clip.duration + 0.6));
  a.time = tt; cur.mixer.update(0); cur.root.rotation.y = Math.PI / 2 + (S.dir * Math.PI) / 4; // dir 0 = quay mặt sang phải (như nhân vật trong game)
}
// ---------- giao diện ----------
const cv3 = renderer.domElement;
const oldCv = Object.assign(document.createElement('canvas'), { width: W * 2, height: H * 2 }); oldCv.style.width = W + 'px';
function card(title, el) { const d = document.createElement('div'); d.className = 'card'; d.innerHTML = '<b>' + title + '</b>'; d.appendChild(el); wrap.appendChild(d); return d; }
const c3card = card('3D → sprite (three.js, CC0 KayKit)', cv3);
const ocard = card('Bộ vẽ code hiện tại', oldCv);
const sheetCv = Object.assign(document.createElement('canvas'), { width: 160, height: 190 });
const scard = card('Chạy từ sprite sheet 2D (cách game sẽ dùng)', sheetCv);
const info = document.createElement('div'); info.style.cssText = 'max-width:300px;padding:8px;line-height:1.5'; wrap.appendChild(info);

function group(label, opts, key, cb) { const d = document.createElement('span'); d.textContent = label + ' '; for (const [v, t] of opts) { const b = document.createElement('button'); b.textContent = t; b.onclick = () => { S[key] = v; cb && cb(); refresh(); }; b.dataset.k = key; b.dataset.v = String(v); d.appendChild(b); } bar.appendChild(d); }
group('Nhân vật', [['Knight', 'Kiếm Sĩ'], ['Mage', 'Pháp Sư'], ['Rogue', 'Xạ Thủ'], ['Barbarian', 'Man Tộc']], 'cls', async () => { setModel(await load(S.cls)); });
group('Hoạt ảnh', Object.keys(ANIMS).map((k) => [k, k]), 'anim');
group('Hướng', [0, 1, 2, 3, 4, 5, 6, 7].map((d) => [d, d * 45 + '°']), 'dir');
const exportBtn = Object.assign(document.createElement('button'), { textContent: '⬇ Xuất sprite sheet (8 hướng)' }); bar.appendChild(exportBtn);
const status = document.createElement('span'); bar.appendChild(status);
function refresh() { for (const b of bar.querySelectorAll('button[data-k]')) b.classList.toggle('on', String(S[b.dataset.k]) === b.dataset.v); }

// ---------- vòng lặp ----------
let sheet = null; // { img, frames, dirs, fw, fh, fps }
function drawOld(t) {
  const c = oldCv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, oldCv.width, oldCv.height); c.fillStyle = '#2a3a22'; c.fillRect(0, 0, oldCv.width, oldCv.height);
  const pose_ = { 'Idle': 'idle', 'Đi bộ': 'walk', 'Chạy': 'walk', 'Đánh chém': 'attack', 'Đánh 2 tay': 'attack', 'Phép': 'skill', 'Bị đánh': 'hit', 'Chết': 'death', 'Mừng': 'idle' }[S.anim];
  c.translate(W * 0.9, H * 1.78); c.scale(1.35, 1.35);
  drawChibi(c, { cls: CLS_OLD[S.cls], tier: 2, gender: 'm', pose: pose_, t, k: pose_ === 'attack' || pose_ === 'skill' ? (t * 0.8) % 1 : pose_ === 'death' ? Math.min(1, (t * 0.4) % 1.5) : undefined, wtype: S.cls === 'Mage' ? 'staff' : S.cls === 'Rogue' ? 'bow' : 'sword', mood: S.anim === 'Mừng' ? 5 : undefined });
}
function drawSheet(t) {
  const g = sheetCv.getContext('2d'); g.clearRect(0, 0, 160, 190); g.fillStyle = '#2a3a22'; g.fillRect(0, 0, 160, 190);
  if (!sheet) { g.fillStyle = '#e9e2d0'; g.font = '12px sans-serif'; g.fillText('Bấm "Xuất sprite sheet"', 12, 90); return; }
  const f = Math.floor(t * sheet.fps) % sheet.frames; g.imageSmoothingEnabled = true;
  g.drawImage(sheet.img, f * sheet.fw, S.dir * sheet.fh, sheet.fw, sheet.fh, 0, 0, 160, 190);
}
function loop() { const t = performance.now() / 1000; if (cur) { pose(t); renderer.render(scene, cam); } drawOld(t); drawSheet(t); requestAnimationFrame(loop); }

// ---------- xuất sprite sheet: 8 hướng × N khung ----------
exportBtn.onclick = async () => {
  const FW = 160, FH = 190, N = 12, clip = cur.clips[ANIMS[S.anim] || S.anim], loopAnim = !/Death|Hit|Cheer|Attack|Spell/.test(clip.name);
  const sc = Object.assign(document.createElement('canvas'), { width: FW * N, height: FH * 8 }), g = sc.getContext('2d');
  const old = [renderer.getSize(new THREE.Vector2()).clone(), S.dir]; renderer.setSize(FW, FH);
  const aspect = FW / FH; cam.left = -(TOP - BOT) * aspect / 2; cam.right = (TOP - BOT) * aspect / 2; cam.updateProjectionMatrix();
  for (let d = 0; d < 8; d++) for (let f = 0; f < N; f++) { S.dir = d; pose((f / N) * clip.duration * (loopAnim ? 1 : (clip.duration + 0.6) / clip.duration * 0.999)); renderer.render(scene, cam); g.drawImage(cv3, f * FW, d * FH, FW, FH); }
  renderer.setSize(W, H); cam.left = -(TOP - BOT) * W / H / 2; cam.right = (TOP - BOT) * W / H / 2; cam.updateProjectionMatrix(); S.dir = old[1];
  const blob = await new Promise((r) => sc.toBlob(r, 'image/png')), name = S.cls + '_' + (ANIMS[S.anim] || S.anim) + '.png';
  sheet = { img: sc, frames: N, fw: FW, fh: FH, fps: loopAnim ? N / clip.duration : N / (clip.duration + 0.6) };
  status.textContent = name + ' · ' + (blob.size / 1024).toFixed(0) + ' KB · ' + FW * N + '×' + FH * 8;
  try { await fetch('http://localhost:5190/save?name=' + name, { method: 'POST', body: blob }); status.textContent += ' · đã lưu tools/sprites/out/'; } catch (e) { /* không có máy nhận ảnh */ }
  info.innerHTML = '<b>Sprite sheet</b><br>' + status.textContent;
};

// ---------- chế độ lưới so sánh: ?grid=1 (chụp ảnh tĩnh nhiều nhân vật / hoạt ảnh) ----------
if (Q.get('grid')) {
  document.body.innerHTML = ''; document.body.style.background = '#12101a';
  const cols = [['Knight', 'Idle', 0.3], ['Knight', 'Đánh chém', 0.45], ['Mage', 'Phép', 0.5], ['Rogue', 'Idle', 0.2], ['Barbarian', 'Đánh 2 tay', 0.6]];
  const TW = 200, TH = 240, g = Object.assign(document.createElement('canvas'), { width: cols.length * TW, height: TH * 2 + 30 }); document.body.appendChild(g);
  const c = g.getContext('2d'); c.fillStyle = '#12101a'; c.fillRect(0, 0, g.width, g.height); c.font = '13px sans-serif';
  renderer.setSize(TW, TH); cam.left = -(TOP - BOT) * TW / TH / 2; cam.right = (TOP - BOT) * TW / TH / 2; cam.updateProjectionMatrix();
  const POSE = { 'Idle': 'idle', 'Đánh chém': 'attack', 'Phép': 'skill', 'Đánh 2 tay': 'attack' };
  for (let i = 0; i < cols.length; i++) {
    const [cls, anim, ph] = cols[i]; S.cls = cls; S.anim = anim; S.dir = +Q.get('dir') || 0; setModel(await load(cls)); const clip = cur.clips[ANIMS[anim]]; pose(ph * clip.duration); renderer.render(scene, cam);
    c.fillStyle = '#2a3a22'; c.fillRect(i * TW, 0, TW, TH); c.drawImage(cv3, i * TW, 0, TW, TH); c.fillStyle = '#e9e2d0'; c.fillText('3D · ' + cls + ' · ' + anim, i * TW + 6, 16);
    c.save(); c.beginPath(); c.rect(i * TW, TH + 30, TW, TH); c.clip(); c.fillStyle = '#2a3a22'; c.fillRect(i * TW, TH + 30, TW, TH); c.translate(i * TW + TW * 0.4, TH + 30 + TH * 0.92); c.scale(0.58, 0.58);
    const pk = POSE[anim]; drawChibi(c, { cls: CLS_OLD[cls], tier: 2, gender: 'm', pose: pk, t: ph * 1.2, k: pk === 'attack' || pk === 'skill' ? ph : undefined, wtype: cls === 'Mage' ? 'staff' : cls === 'Rogue' ? 'bow' : 'sword' }); c.restore();
    c.fillStyle = '#e9e2d0'; c.fillText('Hiện tại (vẽ bằng code)', i * TW + 6, TH + 24);
  }
  document.title = 'grid-done'; throw new Error('grid-done');
}
setModel(await load(S.cls)); refresh(); loop();
if (Q.get('auto')) { // chế độ tự động: xuất sprite sheet cho danh sách hoạt ảnh rồi báo xong (dùng với Chrome không giao diện)
  for (const an of Q.get('auto').split(',')) { S.anim = an; await exportBtn.onclick(); }
  document.title = 'auto-done';
}
info.innerHTML = 'Mô hình: KayKit Adventurers (CC0). Chuyển hướng bằng hàng "Hướng". Khung bên phải: bộ vẽ code hiện tại cùng hoạt ảnh để so sánh.';
