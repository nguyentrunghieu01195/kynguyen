// Công trình 3D dựng từ khối hình học (ngai vàng, tàn tích cổng, đuốc, cờ) — dùng với props3d.geoSprite (40 px game / đơn vị)
const std = (TH, color, o = {}) => new TH.MeshStandardMaterial({ color, roughness: o.r ?? 0.8, metalness: o.m ?? 0, flatShading: !!o.flat, side: o.side });
const mesh = (TH, geo, mat, x = 0, y = 0, z = 0) => { const m = new TH.Mesh(geo, mat); m.position.set(x, y, z); return m; };

export function throneBase(TH) {
  const g = new TH.Group(); let y = 0;
  for (const [r, h, col] of [[1.4, 0.17, '#5a5662'], [1.1, 0.17, '#726d7c'], [0.8, 0.18, '#8c869a']]) { g.add(mesh(TH, new TH.CylinderGeometry(r, r * 1.03, h, 28), std(TH, col, { r: 0.9 }), 0, y + h / 2, 0)); y += h; }
  return g;
}
export function throneChair(TH) {
  const g = new TH.Group(), gold = std(TH, '#e8b838', { r: 0.32, m: 0.65 }), goldD = std(TH, '#a07818', { r: 0.4, m: 0.6 }), y0 = 0.52;
  g.add(mesh(TH, new TH.BoxGeometry(0.85, 0.22, 0.8), goldD, 0, y0 + 0.11, 0));
  g.add(mesh(TH, new TH.BoxGeometry(0.66, 0.08, 0.6), std(TH, '#8a1428', { r: 0.9 }), 0, y0 + 0.26, 0.02));
  g.add(mesh(TH, new TH.BoxGeometry(0.9, 1.75, 0.16), gold, 0, y0 + 0.22 + 0.875, -0.36));
  g.add(mesh(TH, new TH.ConeGeometry(0.34, 0.5, 4), gold, 0, y0 + 0.22 + 1.75 + 0.22, -0.36)).rotation.y = Math.PI / 4;
  g.add(mesh(TH, new TH.BoxGeometry(0.62, 1.35, 0.06), std(TH, '#8a1428', { r: 0.9 }), 0, y0 + 0.22 + 0.85, -0.27));
  for (const sx of [-1, 1]) g.add(mesh(TH, new TH.BoxGeometry(0.14, 0.42, 0.7), gold, sx * 0.5, y0 + 0.4, 0));
  g.add(mesh(TH, new TH.OctahedronGeometry(0.12), std(TH, '#d8262a', { r: 0.2 }), 0, y0 + 1.15, -0.26));
  g.rotation.y = Math.PI / 4; return g;
}
export function flagPole(TH, col) {
  const g = new TH.Group();
  g.add(mesh(TH, new TH.CylinderGeometry(0.045, 0.055, 2.4, 8), std(TH, '#2a2230'), 0, 1.2, 0));
  g.add(mesh(TH, new TH.SphereGeometry(0.09, 10, 8), std(TH, '#ffd34a', { r: 0.3, m: 0.6 }), 0, 2.45, 0));
  const flag = mesh(TH, new TH.PlaneGeometry(0.62, 0.82), std(TH, col, { r: 0.85, side: TH.DoubleSide }), 0.33, 2.0, 0); g.add(flag);
  g.rotation.y = Math.PI / 4; return g;
}
export function gateRuins(TH) {
  const g = new TH.Group(), st = (c) => std(TH, c, { r: 0.95, flat: true });
  for (const [x, h, w, ry, tilt] of [[-1.35, 1.25, 0.46, 0.2, 0], [1.3, 0.8, 0.46, -0.3, 0.12]]) {
    const p = mesh(TH, new TH.BoxGeometry(w, h, w), st('#8a7a68'), x, h / 2, 0); p.rotation.y = ry; p.rotation.z = tilt; g.add(p);
    g.add(mesh(TH, new TH.BoxGeometry(w + 0.12, 0.14, w + 0.12), st('#6a5a4a'), x, 0.07, 0));
  }
  const slab = mesh(TH, new TH.BoxGeometry(1.1, 0.16, 0.42), st('#7a6a58'), -0.2, 0.1, 0.5); slab.rotation.y = 0.5; g.add(slab);
  let s = 7; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 12; i++) { const r = 0.1 + rnd() * 0.12, d = new THREE_Dodeca(TH, r); d.position.set((rnd() - 0.5) * 2.6, r * 0.6, (rnd() - 0.3) * 1.0); d.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); g.add(d); }
  g.rotation.y = 0; return g;
}
function THREE_Dodeca(TH, r) { return new TH.Mesh(new TH.DodecahedronGeometry(r), new TH.MeshStandardMaterial({ color: '#8a7a68', roughness: 0.95, flatShading: true })); }
export function torchPole(TH) {
  const g = new TH.Group();
  g.add(mesh(TH, new TH.CylinderGeometry(0.045, 0.06, 0.88, 8), std(TH, '#6a4428'), 0, 0.44, 0));
  g.add(mesh(TH, new TH.CylinderGeometry(0.17, 0.1, 0.14, 10), std(TH, '#7a7a84', { r: 0.4, m: 0.5 }), 0, 0.93, 0));
  return g;
}
