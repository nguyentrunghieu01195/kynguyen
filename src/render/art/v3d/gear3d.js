// Phụ kiện 3D theo bộ giáp (12 kiểu) và thời trang (trang phục + đồ đầu), dựng bằng khối hình học, đặt theo xương nhân vật.
// Quy ước cục bộ: x = ngang người, y = lên, z = phía trước; nhóm 'chest' / 'hip' / 'head' xoay y = π/2 như mô hình.
const mat = (TH, col, o = {}) => new TH.MeshStandardMaterial({ color: col, roughness: o.r ?? 0.55, metalness: o.m ?? 0.35, flatShading: o.flat ?? true, emissive: o.em || 0x000000, emissiveIntensity: o.em ? o.ei ?? 0.6 : 0, side: o.side === 2 ? TH.DoubleSide : TH.FrontSide });
const mk = (TH, geo, m, x = 0, y = 0, z = 0) => { const o = new TH.Mesh(geo, m); o.position.set(x, y, z); return o; };
const col = (TH, c) => new TH.Color(c);

// ---------- vai theo kiểu giáp ----------
function pad(TH, style, e, d, big, sd) {
  const g = new TH.Group(), E = mat(TH, e), D = mat(TH, d), s = big;
  switch (style) {
    case 'leather': { const p = mk(TH, new TH.SphereGeometry(0.2 * s, 10, 6), mat(TH, e, { m: 0.05, r: 0.9 })); p.scale.y = 0.55; g.add(p); g.add(mk(TH, new TH.TorusGeometry(0.19 * s, 0.02, 5, 12), D, 0, -0.02, 0)).rotation.x = Math.PI / 2; break; }
    case 'cloth': { const p = mk(TH, new TH.SphereGeometry(0.17 * s, 10, 6), mat(TH, e, { m: 0, r: 0.95, flat: false })); p.scale.y = 0.6; g.add(p); break; }
    case 'bronze': { g.add(mk(TH, new TH.SphereGeometry(0.22 * s, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), mat(TH, e, { m: 0.8, r: 0.3 }))); for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2; g.add(mk(TH, new TH.SphereGeometry(0.03 * s, 6, 5), D, Math.cos(a) * 0.17 * s, 0.05, Math.sin(a) * 0.17 * s)); } break; }
    case 'fur': { for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2, f = mk(TH, new TH.SphereGeometry(0.1 * s, 7, 6), mat(TH, k % 2 ? e : '#e8e4dc', { m: 0, r: 1, flat: false }), Math.cos(a) * 0.12 * s, 0.03 * (k % 2), Math.sin(a) * 0.12 * s); g.add(f); } g.add(mk(TH, new TH.SphereGeometry(0.11 * s, 7, 6), mat(TH, '#f4f0e8', { m: 0, r: 1, flat: false }), 0, 0.05, 0)); break; }
    case 'bone': { const sk = mk(TH, new TH.SphereGeometry(0.17 * s, 10, 8), mat(TH, e, { m: 0.05, r: 0.8 })); g.add(sk); for (const ex of [-1, 1]) g.add(mk(TH, new TH.SphereGeometry(0.034 * s, 6, 5), mat(TH, '#1a1418'), ex * 0.06 * s, 0.02, 0.15 * s)); g.add(mk(TH, new TH.ConeGeometry(0.05 * s, 0.2 * s, 5), mat(TH, e, { m: 0.05 }), sd * 0.1 * s, 0.17 * s, 0)).rotation.z = -sd * 0.4; break; }
    case 'shadow': { g.add(mk(TH, new TH.SphereGeometry(0.19 * s, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.6), mat(TH, e, { m: 0.6, r: 0.35 }))); for (let k = 0; k < 3; k++) { const sp = mk(TH, new TH.ConeGeometry(0.045 * s, 0.26 * s, 5), mat(TH, d, { em: d, ei: 0.7 }), sd * (0.02 + k * 0.07) * s, 0.15 * s, (k - 1) * 0.08 * s); sp.rotation.z = -sd * (0.3 + k * 0.15); g.add(sp); } break; }
    case 'ice': { g.add(mk(TH, new TH.SphereGeometry(0.15 * s, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.6), mat(TH, '#cfeeff', { m: 0.1, r: 0.15 }))); for (let k = 0; k < 4; k++) { const cr = mk(TH, new TH.ConeGeometry(0.05 * s, (0.2 + (k % 2) * 0.12) * s, 5), mat(TH, d, { em: '#7ad4ff', ei: 0.8, m: 0.1, r: 0.1 }), (k - 1.5) * 0.06 * s, 0.14 * s, 0); cr.rotation.z = (k - 1.5) * 0.25; g.add(cr); } break; }
    case 'leaf': { for (let k = 0; k < 4; k++) { const l = mk(TH, new TH.SphereGeometry(1, 8, 5), mat(TH, k % 2 ? e : d, { m: 0, r: 0.85, flat: false }), sd * (0.02 + k * 0.05) * s, 0.02 * k, (k - 1.5) * 0.06 * s); l.scale.set(0.2 * s, 0.04 * s, 0.1 * s); l.rotation.z = -sd * (0.2 + k * 0.2); g.add(l); } break; }
    case 'dragon': { g.add(mk(TH, new TH.SphereGeometry(0.2 * s, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.62), mat(TH, e, { m: 0.5, r: 0.3 }))); for (let k = 0; k < 3; k++) { const sp = mk(TH, new TH.ConeGeometry(0.05 * s, 0.3 * s, 5), mat(TH, '#ffd24a', { m: 0.7, r: 0.25 }), sd * 0.04 * s, 0.17 * s, (k - 1) * 0.1 * s); sp.rotation.z = -sd * 0.45; g.add(sp); } break; }
    case 'magma': { const r = mk(TH, new TH.DodecahedronGeometry(0.2 * s), mat(TH, e, { m: 0.1, r: 0.9, em: '#ff5a10', ei: 0.35 })); r.scale.y = 0.7; g.add(r); g.add(mk(TH, new TH.OctahedronGeometry(0.07 * s), mat(TH, '#ffa030', { em: '#ff7a10', ei: 1 }), 0.05 * s, 0.1 * s, 0.1 * s)); break; }
    case 'angel': { g.add(mk(TH, new TH.SphereGeometry(0.19 * s, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.6), mat(TH, e, { m: 0.8, r: 0.25 }))); for (let k = 0; k < 4; k++) { const f = mk(TH, new TH.SphereGeometry(1, 8, 5), mat(TH, '#ffffff', { m: 0, r: 0.6, flat: false }), sd * (0.08 + k * 0.07) * s, 0.02 + 0.05 * k * 0.5, -0.04 * s); f.scale.set(0.2 * s, 0.035 * s, 0.07 * s); f.rotation.z = -sd * (0.3 + k * 0.15); g.add(f); } break; }
    case 'demon': { g.add(mk(TH, new TH.SphereGeometry(0.19 * s, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.6), mat(TH, e, { m: 0.5, r: 0.4 }))); const w = mk(TH, new TH.ConeGeometry(0.16 * s, 0.34 * s, 3), mat(TH, d, { em: d, ei: 0.45, side: 2 }), sd * 0.12 * s, 0.08, -0.08 * s); w.rotation.z = -sd * 1.2; g.add(w); g.add(mk(TH, new TH.ConeGeometry(0.04 * s, 0.22 * s, 5), mat(TH, '#1a0a14'), sd * 0.03 * s, 0.18 * s, 0.05 * s)); break; }
    default: g.add(mk(TH, new TH.SphereGeometry(0.17 * s, 10, 6), E));
  }
  return g;
}

// ---------- đồ đầu theo bộ giáp (đặt trên đỉnh đầu; hw = nửa rộng đầu) ----------
function headOf(TH, style, e, d, tier) {
  const g = new TH.Group(), E = mat(TH, e), D = mat(TH, d), hw = 0.34;
  const horn = (sd, len, c, y = 0, em) => { const h = mk(TH, new TH.ConeGeometry(0.07, len, 6), mat(TH, c, em ? { em, ei: 0.6 } : { m: 0.2, r: 0.6 }), sd * hw, y, 0); h.rotation.z = -sd * 0.6; g.add(h); };
  switch (style) {
    case 'bone': for (const sd of [-1, 1]) horn(sd, 0.3, '#e8e0c8', 0.06); break;
    case 'shadow': for (let k = 0; k < 5; k++) { const sp = mk(TH, new TH.ConeGeometry(0.04, 0.22, 5), mat(TH, d, { em: d, ei: 0.8 }), 0, 0.02, (k - 2) * 0.11); sp.rotation.x = (k - 2) * 0.15; g.add(sp); } break;
    case 'ice': for (let k = 0; k < 5; k++) { const sp = mk(TH, new TH.ConeGeometry(0.05, 0.22 + (k % 2) * 0.12, 5), mat(TH, '#cfeeff', { em: '#7ad4ff', ei: 0.8, m: 0.1, r: 0.1 }), 0, 0.02, (k - 2) * 0.12); sp.rotation.x = (k - 2) * 0.25; g.add(sp); } break;
    case 'leaf': { for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2, l = mk(TH, new TH.SphereGeometry(1, 8, 5), mat(TH, k % 2 ? e : d, { m: 0, r: 0.85, flat: false }), Math.cos(a) * hw, 0.0, Math.sin(a) * hw); l.scale.set(0.12, 0.03, 0.06); l.rotation.y = -a; l.rotation.z = 0.4; g.add(l); } break; }
    case 'dragon': for (const sd of [-1, 1]) horn(sd, 0.45, '#ffd24a', 0.05); break;
    case 'magma': for (const sd of [-1, 1]) horn(sd, 0.34, '#4a2a22', 0.04, '#ff5a10'); break;
    case 'angel': { const r = mk(TH, new TH.TorusGeometry(0.28, 0.025, 8, 24), mat(TH, '#ffe27a', { em: '#ffd24a', ei: 1, m: 0.6, r: 0.2 }), 0, 0.22, 0); r.rotation.x = Math.PI / 2; g.add(r); break; }
    case 'demon': for (const sd of [-1, 1]) horn(sd, 0.5, '#1a0a14', 0.05); g.add(mk(TH, new TH.OctahedronGeometry(0.05), mat(TH, d, { em: d, ei: 1 }), 0, 0.02, 0.28)); break;
    case 'bronze': { const f = mk(TH, new TH.BoxGeometry(0.05, 0.2, 0.34), mat(TH, d, { m: 0.6, r: 0.4 }), 0, 0.08, -0.02); g.add(f); break; }
    case 'fur': { for (let k = 0; k < 4; k++) g.add(mk(TH, new TH.SphereGeometry(0.1, 7, 6), mat(TH, '#f0ece4', { m: 0, r: 1, flat: false }), 0, 0.04, (k - 1.5) * 0.14)); break; }
    default: return g;
  }
  return g;
}

// ---------- thời trang: trang phục (chest/hip/head; chest & hip được thu 0.6 khi đặt) ----------
function outfitOf(TH, style, c0, c1) {
  const chest = new TH.Group(), hip = new TH.Group(), head = new TH.Group(), A = (c, o) => mat(TH, c, { m: 0.05, r: 0.85, flat: false, side: 2, ...o }), plane = (w, h, c, x, y, z, rx = 0, o) => { const p = mk(TH, new TH.PlaneGeometry(w, h), A(c, o), x, y, z); p.rotation.x = rx; return p; };
  const ring = (r, t, c, y, o) => { const m = mk(TH, new TH.TorusGeometry(r, t, 7, 20), A(c, o), 0, y, 0); m.rotation.x = Math.PI / 2; return m; };
  const box = (w, h, d, c, x, y, z, o) => mk(TH, new TH.BoxGeometry(w, h, d), mat(TH, c, { m: 0.1, r: 0.8, ...o }), x, y, z);
  switch (style) {
    case 'cloak': {
      chest.add(plane(1.15, 1.5, c0, 0, -0.62, -0.5, 0.1)); chest.add(plane(1.15, 0.08, c1, 0, -1.37, -0.58, 0.1, { m: 0.6 }));
      chest.add(ring(0.55, 0.12, c0, 0.1)); chest.add(ring(0.56, 0.03, c1, 0.2, { m: 0.7 })); chest.add(mk(TH, new TH.SphereGeometry(0.09, 8, 6), mat(TH, c1, { m: 0.8, r: 0.25 }), 0, 0.1, 0.52));
      const hood = mk(TH, new TH.SphereGeometry(0.42, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.55), A(c0), 0, 0.25, -0.35); hood.rotation.x = -0.5; chest.add(hood); break;
    }
    case 'aodai': {
      chest.add(plane(0.95, 1.65, c0, 0, -0.62, 0.45)); chest.add(plane(0.95, 1.65, c0, 0, -0.62, -0.45)); chest.add(plane(0.09, 1.65, c1, 0, -0.62, 0.46)); chest.add(plane(0.95, 0.08, c1, 0, -1.43, 0.46));
      chest.add(mk(TH, new TH.CylinderGeometry(0.3, 0.33, 0.16, 12, 1, true), A(c1, { m: 0.3 }), 0, 0.18, 0)); chest.add(ring(0.48, 0.06, c1, -0.5, { m: 0.2 })); break;
    }
    case 'royal': {
      chest.add(plane(1.2, 1.9, c1, 0, -0.8, -0.5, 0.1)); chest.add(plane(1.2, 0.1, '#ffd54a', 0, -1.75, -0.6, 0.1, { m: 0.7 }));
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; chest.add(mk(TH, new TH.SphereGeometry(0.1, 7, 6), mat(TH, c0, { m: 0, r: 1, flat: false }), Math.cos(a) * 0.5, 0.1, Math.sin(a) * 0.5)); }
      chest.add(ring(0.42, 0.035, '#ffd54a', -0.12, { m: 0.8, r: 0.2 })); for (const sd of [-1, 1]) chest.add(mk(TH, new TH.SphereGeometry(0.2, 8, 6), mat(TH, '#ffd54a', { m: 0.8, r: 0.25 }), sd * 0.58, 0.1, 0)).scale.y = 0.5; break;
    }
    case 'ninja': {
      chest.add(ring(0.42, 0.1, c1, 0.12)); for (const sd of [-1, 1]) chest.add(plane(0.2, 1.0, c1, sd * 0.14, -0.35, -0.5, 0.45));
      chest.add(ring(0.5, 0.07, c1, -0.5)); chest.add(box(0.14, 0.14, 0.06, '#ffd54a', 0, -0.5, 0.52, { m: 0.7 }));
      head.add(box(0.5, 0.2, 0.5, c0, 0.0, -0.4, 0.04, { r: 0.95, m: 0 })); head.add(ring(0.34, 0.05, c1, -0.1)); break;
    }
    case 'winter': {
      chest.add(mk(TH, new TH.CylinderGeometry(0.46, 0.64, 0.95, 16, 1, true), A(c0), 0, -0.75, 0));
      const fur = (y, r, t) => chest.add(ring(r, t, c1, y, { m: 0, r: 1 }));
      fur(-1.22, 0.64, 0.1); fur(-0.0, 0.48, 0.1); fur(-0.56, 0.5, 0.045, { }); chest.add(ring(0.5, 0.045, '#1a1418', -0.55)); chest.add(box(0.16, 0.14, 0.05, '#ffd54a', 0, -0.55, 0.52, { m: 0.8 })); break;
    }
    case 'jade': {
      for (const sd of [-1, 1]) { const p = new TH.Group(); p.add(mk(TH, new TH.SphereGeometry(0.26, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.6), mat(TH, c0, { m: 0.5, r: 0.3, em: c1, ei: 0.4 }))); for (let k = 0; k < 3; k++) { const sp = mk(TH, new TH.ConeGeometry(0.05, 0.3, 5), mat(TH, c1, { em: c1, ei: 0.9 }), sd * 0.06, 0.2, (k - 1) * 0.11); sp.rotation.z = -sd * 0.5; p.add(sp); } p.position.set(0, 0.02, sd * 0.62); chest.add(p); }
      chest.add(mk(TH, new TH.OctahedronGeometry(0.14), mat(TH, c1, { em: c1, ei: 1 }), 0, -0.2, 0.46));
      for (let k = 0; k < 7; k++) { const a = (k - 3) * 0.45; hip.add(box(0.22, 0.44, 0.05, c0, Math.sin(a) * 0.5, -0.25, Math.cos(a) * 0.5, { m: 0.5, r: 0.3, em: c1, ei: 0.25 })).rotation.y = a; }
      break;
    }
    default: break;
  }
  return { chest, hip, head };
}

// ---------- thời trang: đồ đầu ----------
function fheadOf(TH, style, c0, c1) {
  const g = new TH.Group(), M = (c, o) => mat(TH, c, { m: 0.1, r: 0.7, ...o });
  switch (style) {
    case 'nonla': { const h = mk(TH, new TH.ConeGeometry(0.62, 0.34, 16), M(c0, { m: 0, r: 0.9, flat: false }), 0, 0.1, 0); g.add(h); const st = mk(TH, new TH.TorusGeometry(0.3, 0.012, 5, 16), M(c1), 0, -0.06, 0); st.rotation.x = Math.PI / 2; g.add(st); break; }
    case 'crown': { g.add(mk(TH, new TH.CylinderGeometry(0.3, 0.32, 0.14, 14, 1, true), M(c0, { m: 0.8, r: 0.2, side: 2 }), 0, 0.06, 0)); for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; g.add(mk(TH, new TH.ConeGeometry(0.05, 0.2, 5), M(c0, { m: 0.8, r: 0.2 }), Math.cos(a) * 0.31, 0.2, Math.sin(a) * 0.31)); g.add(mk(TH, new TH.SphereGeometry(0.035, 6, 5), M(c1, { em: c1, ei: 0.8 }), Math.cos(a) * 0.31, 0.32, Math.sin(a) * 0.31)); } break; }
    case 'pumpkin': { const p = mk(TH, new TH.SphereGeometry(0.46, 14, 10), M(c0, { m: 0, r: 0.8, flat: false }), 0, -0.12, 0); p.scale.y = 0.85; g.add(p); g.add(mk(TH, new TH.CylinderGeometry(0.04, 0.06, 0.14, 6), M(c1, { m: 0 }), 0, 0.3, 0)); for (const ex of [-1, 1]) g.add(mk(TH, new TH.ConeGeometry(0.07, 0.1, 3), M('#2a1008', { em: '#ffcc40', ei: 0.9 }), ex * 0.16, -0.08, 0.5)).rotation.x = Math.PI / 2; g.add(mk(TH, new TH.BoxGeometry(0.28, 0.06, 0.06), M('#2a1008', { em: '#ffcc40', ei: 0.9 }), 0, -0.26, 0.5)); break; }
    case 'horns': for (const sd of [-1, 1]) { const h = mk(TH, new TH.ConeGeometry(0.09, 0.52, 7), M(c0, { m: 0.2 }), sd * 0.3, 0.06, 0); h.rotation.z = -sd * 0.6; g.add(h); g.add(mk(TH, new TH.ConeGeometry(0.04, 0.16, 6), M(c1, { em: c1, ei: 0.9 }), sd * 0.5, 0.26, 0)).rotation.z = -sd * 0.9; } break;
    default: break;
  }
  return g;
}

const cache = new Map();
/** spec = { style, tier, e, d (màu bộ giáp), outfit: {style, colors}|null, head: {style, colors}|null } */
export function makeGear(TH, spec) {
  const key = JSON.stringify(spec); let g = cache.get(key); if (g) return g;
  const big = (spec.tier >= 5 ? 1.35 : spec.tier >= 3 ? 1.15 : 1) * 1.6;
  g = { pads: [], chest: new TH.Group(), hip: new TH.Group(), head: new TH.Group() };
  if (!spec.outfit || spec.outfit.style === 'jade') for (const sd of [-1, 1]) { const p = pad(TH, spec.style, spec.e, spec.d, big, sd); p.userData.sd = sd; g.pads.push(p); }
  let oh = null; if (spec.outfit) { const o = outfitOf(TH, spec.outfit.style, spec.outfit.colors[0], spec.outfit.colors[1]); g.chest = o.chest; g.hip = o.hip; oh = o.head; }
  if (spec.head) g.head.add(fheadOf(TH, spec.head.style, spec.head.colors[0], spec.head.colors[1]));
  else if (!spec.outfit) g.head.add(headOf(TH, spec.style, spec.e, spec.d, spec.tier));
  if (oh) g.head.add(oh);
  cache.set(key, g); return g;
}
