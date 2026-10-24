// Cánh 3D dựng bằng hình học three.js (không cần mô hình ngoài): 6 bậc, mỗi bậc một kiểu.
// Cánh phải nằm trong mặt phẳng x–y, gốc ở vai; cánh trái là bản lật gương.
const OUT = 0x1a1020;
const TIER = {
  1: { kind: 'feather', n: 5, len: 0.95, c: ['#ffffff', '#dfe6ff'], k: 0.9 },
  2: { kind: 'bat', c: ['#7a30d8', '#2a0a5a'], k: 1.05 },
  3: { kind: 'feather', n: 7, len: 1.25, c: ['#fff4b0', '#ffd24a'], k: 1.15, glow: '#ffe08a' },
  4: { kind: 'feather', n: 9, len: 1.3, c: ['#ffd060', '#ff5a1a'], k: 1.15, glow: '#ff7a2a', fire: true },
  5: { kind: 'bat', c: ['#bdeaff', '#3a86c8'], k: 1.3, spikes: true, glow: '#7ad4ff' },
  6: { kind: 'divine', n: 7, len: 1.35, c: ['#ffffff', '#ffe9a0'], k: 1.3, glow: '#fff2b0' },
};

function mat(TH, col, em) { return new TH.MeshStandardMaterial({ color: col, roughness: 0.55, metalness: 0.0, side: TH.DoubleSide, emissive: em || 0x000000, emissiveIntensity: em ? 0.55 : 0, flatShading: true }); }

function featherFan(TH, spec, g, scale, rot0) {
  const root = new TH.Group();
  for (let i = spec.n - 1; i >= 0; i--) {
    const a = rot0 + i * (1.55 / spec.n), len = spec.len * (1 - i * 0.06) * scale;
    const geo = new TH.SphereGeometry(1, 10, 6); geo.scale(len / 2, len * 0.075, 0.012); geo.translate(len / 2, 0, 0);
    const col = i % 2 ? spec.c[0] : spec.c[1];
    const m = new TH.Mesh(geo, mat(TH, col, spec.glow ? new TH.Color(spec.glow).multiplyScalar(spec.fire ? 0.7 : 0.35) : null));
    const ol = new TH.Mesh(geo, new TH.MeshBasicMaterial({ color: OUT, side: TH.BackSide })); ol.scale.set(1.06, 1.35, 4);
    const f = new TH.Group(); f.add(ol, m); f.rotation.z = a; f.position.z = i * 0.004; root.add(f);
  }
  g.add(root);
}

function membrane(TH, spec, g, scale) {
  const P = [[0, 0], [0.35, 0.75], [1.5, 0.9], [1.2, 0.5], [1.58, 0.22], [1.15, 0.05], [1.32, -0.4], [0.8, -0.2], [0.78, -0.65], [0.34, -0.28], [0, -0.22]].map(([x, y]) => [x * scale, y * scale]);
  const sh = new TH.Shape(); sh.moveTo(...P[0]); for (const p of P.slice(1)) sh.lineTo(...p); sh.closePath();
  const geo = new TH.ShapeGeometry(sh), cols = [], pos = geo.attributes.position, c0 = new TH.Color(spec.c[0]), c1 = new TH.Color(spec.c[1]);
  for (let i = 0; i < pos.count; i++) { const k = Math.min(1, Math.hypot(pos.getX(i), pos.getY(i)) / (1.6 * scale)); const c = c0.clone().lerp(c1, k); cols.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new TH.Float32BufferAttribute(cols, 3));
  const mem = new TH.Mesh(geo, new TH.MeshStandardMaterial({ vertexColors: true, side: TH.DoubleSide, roughness: 0.6, flatShading: true, emissive: spec.glow ? new TH.Color(spec.glow) : 0x000000, emissiveIntensity: spec.glow ? 0.25 : 0 }));
  const ol = new TH.Mesh(geo, new TH.MeshBasicMaterial({ color: OUT, side: TH.BackSide })); ol.scale.set(1.03, 1.03, 1); ol.position.z = -0.004;
  g.add(ol, mem);
  const bone = (a, b, r) => { const va = new TH.Vector3(a[0], a[1], 0.01), vb = new TH.Vector3(b[0], b[1], 0.01), d = vb.clone().sub(va); const cy = new TH.Mesh(new TH.CylinderGeometry(r, r * 0.7, d.length(), 6), new TH.MeshStandardMaterial({ color: spec.spikes ? '#e8fbff' : '#2a1030', roughness: 0.5 })); cy.position.copy(va).add(vb).multiplyScalar(0.5); cy.quaternion.setFromUnitVectors(new TH.Vector3(0, 1, 0), d.normalize()); g.add(cy); };
  bone(P[0], P[1], 0.035 * scale); bone(P[1], P[2], 0.03 * scale); for (const i of [4, 6, 8]) bone(P[1], P[i], 0.018 * scale);
  if (spec.spikes) for (const i of [2, 4, 6, 8]) { const sp = new TH.Mesh(new TH.ConeGeometry(0.05 * scale, 0.22 * scale, 5), new TH.MeshStandardMaterial({ color: '#f4fdff', emissive: new TH.Color('#9fe0ff'), emissiveIntensity: 0.7, flatShading: true })); sp.position.set(P[i][0], P[i][1], 0); sp.rotation.z = -Math.atan2(P[i][0] - P[1][0], P[i][1] - P[1][1]); g.add(sp); }
}

/** Tạo bộ cánh (cả hai bên). Trả về Group có hai nhánh L / R để xoay theo nhịp vỗ. */
export function makeWings(TH, tier) {
  const spec = TIER[tier]; if (!spec) return null;
  const out = new TH.Group(), sides = [];
  for (const sd of [1, -1]) {
    const pivot = new TH.Group(), wing = new TH.Group();
    if (spec.kind === 'bat') membrane(TH, spec, wing, spec.k);
    else if (spec.kind === 'divine') { featherFan(TH, spec, wing, spec.k, -0.1); const w2 = new TH.Group(); featherFan(TH, { ...spec, n: 6, len: spec.len * 0.8 }, w2, spec.k, -0.5); w2.position.set(0.04, -0.1, 0.02); wing.add(w2); const w3 = new TH.Group(); featherFan(TH, { ...spec, n: 5, len: spec.len * 0.6 }, w3, spec.k, -0.95); w3.position.set(0.06, -0.22, 0.04); wing.add(w3); }
    else featherFan(TH, spec, wing, spec.k, -0.15);
    wing.rotation.z = 0.25; pivot.add(wing); pivot.scale.x = sd; pivot.userData.sd = sd; out.add(pivot); sides.push(pivot);
  }
  out.scale.setScalar(1.0); out.userData.sides = sides; out.userData.tier = tier;
  return out;
}
/** Nhịp vỗ: ph 0..1 */
export function poseWings(g, ph) {
  const a = Math.sin(ph * Math.PI * 2) * 0.25 + 0.7;
  for (const s of g.userData.sides) s.rotation.y = a * s.userData.sd, s.rotation.x = -0.15;
}
