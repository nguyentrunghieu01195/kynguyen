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

// Mỗi class một kiểu cánh riêng (bậc cánh vẫn quyết định kích thước, độ rực rỡ)
const CLS = {
  knight: { kind: 'bat', c: ['#e0402a', '#2a0808'], mix: 0.7, k: 0.9, glow: '#ff5a2a' },                                       // Kiếm Sĩ (như Dark Knight): cánh quỷ/rồng đỏ đen
  wizard: { kind: 'feather', c: ['#ffffff', '#7a9aff'], mix: 0.55, n: 2, wid: 0.085, glow: '#9ab8ff' },                        // Pháp Sư (như Soul Master): cánh thiên thần trắng xanh
  archer: { kind: 'fairy', c: ['#d8fff0', '#5ad8a0'], mix: 0.7, k: 1.0, glow: '#9affd0' },                                     // Xạ Thủ (như Elf): cánh tiên mỏng trong suốt
  lord: { kind: 'cape', c: ['#c01838', '#3a0614'], mix: 0.8, k: 1.0 },                                                          // Chúa Tể (như Dark Lord): áo choàng, không có cánh
  gladiator: { kind: 'blade', c: ['#7a3aa8', '#160a22'], mix: 0.7, n: 1, wid: 0.12, lenMul: 0.95, spread: 1.15, glow: '#b050ff' }, // Đấu Sĩ (như Magic Gladiator): cánh tối tím sắc nhọn
};
// Bậc 6 (Thần Quang): mỗi class một bản "thần" riêng, nhiều lớp, rực sáng hơn
const CLS6 = {
  knight: { c: ['#ffd870', '#b81410'], glow: '#ffb040', k: 0.9 },
  wizard: { c: ['#ffffff', '#9a7aff'], glow: '#b8a0ff', n: 3 },
  archer: { c: ['#fff7b0', '#4ad890'], glow: '#d0ffa0', k: 0.82 },
  lord: { c: ['#f0b830', '#7a0a20'], glow: '#ffd24a', k: 1.25, mix: 1 },
  gladiator: { c: ['#ff9a3a', '#4a1070'], glow: '#ff7a2a', n: 3 },
};
const lerpHex = (TH, a, b, k) => '#' + new TH.Color(a).lerp(new TH.Color(b), k).getHexString();
function specFor(TH, tier, cls) {
  const base = TIER[tier]; if (!base) return null;
  let o = CLS[cls]; if (!o) return base;
  const t6 = tier === 6;
  if (t6) o = { ...o, ...CLS6[cls], mix: CLS6[cls].mix || 0.9 };
  const spec = { ...base, c: base.c.map((col, i) => lerpHex(TH, col, o.c[i], o.mix)), glow: o.glow || base.glow, t6 };
  spec.kind = o.kind === 'feather' && t6 ? 'divine' : o.kind === 'blade' && t6 ? 'bladedivine' : o.kind;
  spec.n = Math.max(3, (base.n || 6) + (o.n || 0)); spec.len = (base.len || 1.2) * (o.lenMul || 1); spec.spikes = o.spikes || base.spikes; spec.k = base.k * (o.k || 1);
  spec.wid = o.wid; spec.spread = o.spread; spec.outline = o.outline;
  return spec;
}

function mat(TH, col, em) { return new TH.MeshStandardMaterial({ color: col, roughness: 0.55, metalness: 0.0, side: TH.DoubleSide, emissive: em || 0x000000, emissiveIntensity: em ? 0.55 : 0, flatShading: true }); }

function featherFan(TH, spec, g, scale, rot0) {
  const root = new TH.Group();
  for (let i = spec.n - 1; i >= 0; i--) {
    const a = rot0 + i * ((spec.spread || 1.55) / spec.n), len = spec.len * (1 - i * 0.06) * scale;
    const geo = new TH.SphereGeometry(1, 10, 6); geo.scale(len / 2, len * (spec.wid || 0.075), 0.012); geo.translate(len / 2, 0, 0);
    const col = i % 2 ? spec.c[0] : spec.c[1];
    const m = new TH.Mesh(geo, mat(TH, col, spec.glow ? new TH.Color(spec.glow).multiplyScalar(spec.fire ? 0.7 : 0.35) : null));
    const ol = new TH.Mesh(geo, new TH.MeshBasicMaterial({ color: spec.outline || OUT, side: TH.BackSide })); ol.scale.set(1.06, 1.35, 4);
    const f = new TH.Group(); f.add(ol, m); f.rotation.z = a; f.position.z = i * 0.004; root.add(f);
  }
  g.add(root);
}

// Cánh pha lê: các mảnh tinh thể hình thoi xếp quạt, phát sáng
function crystalFan(TH, spec, g, scale) {
  for (let i = 0; i < spec.n; i++) {
    const a = -0.15 + i * (1.7 / spec.n), len = spec.len * (1 - i * 0.07) * scale;
    const geo = new TH.OctahedronGeometry(1, 0); geo.scale(len / 2, len * 0.11, 0.05); geo.translate(len / 2, 0, 0);
    const col = i % 2 ? spec.c[0] : spec.c[1];
    const m = new TH.Mesh(geo, new TH.MeshStandardMaterial({ color: col, roughness: 0.15, metalness: 0.2, flatShading: true, transparent: true, opacity: 0.92, emissive: new TH.Color(spec.glow || col), emissiveIntensity: 0.45 }));
    const ol = new TH.Mesh(geo, new TH.MeshBasicMaterial({ color: 0x1a1040, side: TH.BackSide })); ol.scale.set(1.05, 1.3, 3);
    const f = new TH.Group(); f.add(ol, m); f.rotation.z = a; f.position.z = i * 0.006; g.add(f);
  }
}

// Cánh tiên: hai cặp cánh tròn mỏng trong suốt, có gân sáng
function fairyWing(TH, spec, g, scale) {
  const lobe = (rx, ry, cx, cy, rot, col) => {
    const geo = new TH.CircleGeometry(1, 20); geo.scale(rx * scale, ry * scale, 1);
    const m = new TH.Mesh(geo, new TH.MeshStandardMaterial({ color: col, transparent: true, opacity: 0.62, side: TH.DoubleSide, roughness: 0.3, emissive: new TH.Color(spec.glow || col), emissiveIntensity: 0.4 }));
    const ol = new TH.Mesh(geo, new TH.MeshBasicMaterial({ color: 0x0c3a2a, side: TH.BackSide, transparent: true, opacity: 0.8 })); ol.scale.set(1.05, 1.07, 1); ol.position.z = -0.004;
    const grp = new TH.Group(); grp.add(ol, m);
    for (let i = -1; i <= 1; i++) { const v = new TH.Mesh(new TH.BoxGeometry(rx * scale * 1.8, 0.012, 0.004), new TH.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 })); v.rotation.z = i * 0.4; grp.add(v); }
    grp.position.set(cx * scale, cy * scale, 0); grp.rotation.z = rot; g.add(grp);
  };
  lobe(0.62, 0.34, 0.62, 0.42, 0.55, spec.c[0]);
  lobe(0.42, 0.24, 0.42, -0.1, -0.35, spec.c[1]);
  if (spec.t6) { lobe(0.95, 0.5, 0.9, 0.62, 0.7, spec.c[0]); lobe(0.62, 0.3, 0.62, -0.35, -0.6, spec.c[1]); }
}

// Áo choàng (Dark Lord): tấm vải dài rủ sau lưng, cổ áo dựng cao, viền vàng
function capePanel(TH, spec, g, scale) {
  const sh = new TH.Shape(); sh.moveTo(0, 0.12); sh.lineTo(0.5 * scale, 0.02); sh.quadraticCurveTo(0.72 * scale, -0.8 * scale, 0.6 * scale, -1.55 * scale); sh.lineTo(0.3 * scale, -1.38 * scale); sh.lineTo(0.12 * scale, -1.6 * scale); sh.lineTo(0, -1.45 * scale); sh.closePath();
  const geo = new TH.ShapeGeometry(sh), pos = geo.attributes.position, cols = [], c0 = new TH.Color(spec.c[0]), c1 = new TH.Color(spec.c[1]);
  for (let i = 0; i < pos.count; i++) { const c = c0.clone().lerp(c1, Math.min(1, -pos.getY(i) / (1.6 * scale) + 0.1)); cols.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new TH.Float32BufferAttribute(cols, 3));
  const cloth = new TH.Mesh(geo, new TH.MeshStandardMaterial({ vertexColors: true, side: TH.DoubleSide, roughness: 0.75, flatShading: true }));
  const ol = new TH.Mesh(geo, new TH.MeshBasicMaterial({ color: 0x1a0610, side: TH.BackSide })); ol.scale.set(1.04, 1.03, 1); ol.position.z = -0.004;
  g.add(ol, cloth);
  const trim = new TH.Mesh(new TH.BoxGeometry(0.62 * scale, 0.03, 0.02), new TH.MeshStandardMaterial({ color: '#f0c850', metalness: 0.6, roughness: 0.3, emissive: new TH.Color('#a07820'), emissiveIntensity: 0.3 })); trim.position.set(0.28 * scale, 0.07, 0.012); trim.rotation.z = -0.15; g.add(trim);
  const col = new TH.Mesh(new TH.ConeGeometry(0.1 * scale, 0.42 * scale, 4), new TH.MeshStandardMaterial({ color: spec.c[0], flatShading: true, roughness: 0.6 })); col.position.set(0.12 * scale, 0.28 * scale, 0); col.rotation.z = -0.25; g.add(col); // cổ áo dựng
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
export function makeWings(TH, tier, cls) {
  const spec = specFor(TH, tier, cls); if (!spec) return null;
  const out = new TH.Group(), sides = [];
  for (const sd of [1, -1]) {
    const pivot = new TH.Group(), wing = new TH.Group();
    if (spec.kind === 'bat') { membrane(TH, spec, wing, spec.k); if (spec.t6) { const w2 = new TH.Group(); membrane(TH, { ...spec, spikes: false }, w2, spec.k * 0.7); w2.rotation.z = -0.55; w2.position.set(0.05, -0.1, -0.03); wing.add(w2); } }
    else if (spec.kind === 'crystal') crystalFan(TH, spec, wing, spec.k);
    else if (spec.kind === 'fairy') fairyWing(TH, spec, wing, spec.k);
    else if (spec.kind === 'cape') capePanel(TH, spec, wing, spec.k);
    else if (spec.kind === 'divine' || spec.kind === 'bladedivine') { featherFan(TH, spec, wing, spec.k, -0.1); const w2 = new TH.Group(); featherFan(TH, { ...spec, n: 6, len: spec.len * 0.8 }, w2, spec.k, -0.5); w2.position.set(0.04, -0.1, 0.02); wing.add(w2); const w3 = new TH.Group(); featherFan(TH, { ...spec, n: 5, len: spec.len * 0.6 }, w3, spec.k, -0.95); w3.position.set(0.06, -0.22, 0.04); wing.add(w3); }
    else featherFan(TH, spec, wing, spec.k, -0.15);
    wing.rotation.z = 0.25; pivot.add(wing); pivot.scale.x = sd; pivot.userData.sd = sd; out.add(pivot); sides.push(pivot);
  }
  out.scale.setScalar(1.0); out.userData.sides = sides; out.userData.tier = tier; out.userData.cape = spec.kind === 'cape';
  return out;
}
/** Nhịp vỗ: ph 0..1 */
export function poseWings(g, ph) {
  const a = g.userData.cape ? Math.sin(ph * Math.PI * 2) * 0.07 + 0.32 : Math.sin(ph * Math.PI * 2) * 0.25 + 0.7;
  for (const s of g.userData.sides) s.rotation.y = a * s.userData.sd, s.rotation.x = -0.15;
}
