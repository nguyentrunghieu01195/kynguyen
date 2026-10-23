// Âm thanh tổng hợp bằng Web Audio — không cần file âm thanh.
//  - Hiệu ứng (SFX): lắng nghe event bus, mỗi âm có giới hạn tần suất để không bị "ồn".
//  - Nhạc nền: nhạc nền thủ tục (pad + giai điệu nhẹ) theo bản đồ, gấp hơn trong sự kiện/tháp.
// Trình duyệt chỉ cho phát âm thanh sau thao tác đầu tiên của người chơi → unlock() khi chạm/bấm phím.
import { G } from '../core/state.js';
import { on, EV } from '../core/events.js';
import { WEAPON_TYPES } from '../config/gear.js';
import { SIEGE } from '../config/siege.js';
import { GBOSS } from '../config/gboss.js';
import { nightLevel } from '../render/juice.js';

const PREF_KEY = 'kng_audio';
export const AUD = (() => { try { return Object.assign({ sfx: 0.7, music: 0.35 }, JSON.parse(localStorage.getItem(PREF_KEY) || '{}')); } catch (e) { return { sfx: 0.7, music: 0.35 }; } })();
let ctx = null, sfxBus = null, musBus = null, noiseBuf = null;

export function setVolume(k, v) {
  AUD[k] = Math.max(0, Math.min(1, v));
  try { localStorage.setItem(PREF_KEY, JSON.stringify(AUD)); } catch (e) { /* bỏ qua */ }
  if (ctx) { sfxBus.gain.value = AUD.sfx; musBus.gain.value = AUD.music * 0.5; }
}

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6; comp.connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.gain.value = AUD.sfx; sfxBus.connect(comp);
  musBus = ctx.createGain(); musBus.gain.value = AUD.music * 0.5; musBus.connect(comp);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}
export function unlock() { const c = ensure(); if (c && c.state === 'suspended') c.resume(); }

// ---------------- KHỐI TẠO ÂM ----------------
/** Dao động có đường bao âm lượng & cao độ. o: { type, f, f2, t, a, d, vol, at, bus, det } */
function tone(o) {
  const c = ctx, t0 = c.currentTime + (o.at || 0), osc = c.createOscillator(), g = c.createGain();
  osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(o.f, t0);
  if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + (o.glide || o.d || 0.2));
  if (o.det) osc.detune.value = o.det;
  const a = o.a || 0.005, d = o.d || 0.2, v = o.vol || 0.3;
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  osc.connect(g); g.connect(o.bus || sfxBus); osc.start(t0); osc.stop(t0 + a + d + 0.05);
  return g;
}
/** Tiếng ồn qua bộ lọc. o: { filter, f, f2, q, d, vol, at } */
function noise(o) {
  const c = ctx, t0 = c.currentTime + (o.at || 0), src = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
  src.buffer = noiseBuf; src.loop = true;
  fl.type = o.filter || 'bandpass'; fl.frequency.setValueAtTime(o.f || 1000, t0); fl.Q.value = o.q || 1;
  if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t0 + (o.d || 0.2));
  const a = o.a || 0.004, d = o.d || 0.2;
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(o.vol || 0.3, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  src.connect(fl); fl.connect(g); g.connect(o.bus || sfxBus); src.start(t0, Math.random() * 0.5); src.stop(t0 + a + d + 0.05);
}
const arp = (notes, step, o) => notes.forEach((f, i) => tone({ ...o, f, at: (o.at || 0) + i * step }));

// ---------------- THƯ VIỆN ÂM ----------------
const SFX = {
  swing: () => noise({ f: 1800, f2: 600, q: 0.8, d: 0.12, vol: 0.18 }),
  hit: () => { tone({ type: 'sine', f: 160, f2: 60, d: 0.1, vol: 0.35 }); noise({ f: 2500, q: 0.7, d: 0.04, vol: 0.12 }); },
  crit: () => { tone({ type: 'sine', f: 200, f2: 50, d: 0.16, vol: 0.45 }); noise({ f: 3000, q: 0.6, d: 0.07, vol: 0.2 }); tone({ type: 'triangle', f: 1760, f2: 1320, d: 0.25, vol: 0.12 }); },
  arrow: () => { tone({ type: 'triangle', f: 900, f2: 300, d: 0.09, vol: 0.14 }); noise({ f: 4000, f2: 1500, q: 1.5, d: 0.1, vol: 0.06 }); },
  fire: () => noise({ filter: 'lowpass', f: 2200, f2: 400, q: 0.5, d: 0.25, vol: 0.2 }),
  kill: () => tone({ type: 'triangle', f: 520, f2: 260, d: 0.12, vol: 0.12 }),
  boom: () => { tone({ type: 'sine', f: 90, f2: 30, d: 0.5, vol: 0.6 }); noise({ filter: 'lowpass', f: 1200, f2: 150, q: 0.4, d: 0.45, vol: 0.4 }); },
  whoosh: () => noise({ f: 500, f2: 2600, q: 1.2, d: 0.35, vol: 0.25 }),
  frost: () => { arp([2093, 2637, 3136, 2349], 0.04, { type: 'sine', d: 0.4, vol: 0.08 }); noise({ f: 6000, q: 2, d: 0.3, vol: 0.06 }); },
  zap: () => { for (let i = 0; i < 4; i++) tone({ type: 'square', f: 300 + Math.random() * 900, f2: 120, d: 0.05, vol: 0.07, at: i * 0.035 }); noise({ f: 3500, q: 3, d: 0.15, vol: 0.1 }); },
  vortex: () => { tone({ type: 'sawtooth', f: 70, f2: 40, d: 1.2, a: 0.2, vol: 0.12 }); tone({ type: 'sine', f: 140, f2: 55, d: 1.2, a: 0.2, vol: 0.2 }); },
  laser: () => { tone({ type: 'sawtooth', f: 1400, f2: 200, d: 0.25, vol: 0.12 }); tone({ type: 'sine', f: 700, f2: 100, d: 0.25, vol: 0.15 }); },
  buff: () => arp([392, 523, 659, 784], 0.06, { type: 'triangle', d: 0.35, vol: 0.12 }),
  dash: () => { noise({ f: 800, f2: 3000, q: 1, d: 0.18, vol: 0.25 }); tone({ type: 'sine', f: 120, f2: 60, d: 0.15, vol: 0.3, at: 0.1 }); },
  roar: () => { noise({ filter: 'lowpass', f: 900, f2: 200, q: 0.6, d: 0.6, vol: 0.35 }); tone({ type: 'sawtooth', f: 220, f2: 90, d: 0.5, vol: 0.1 }); },
  zen: () => { tone({ type: 'sine', f: 1568, d: 0.08, vol: 0.1 }); tone({ type: 'sine', f: 2093, d: 0.15, vol: 0.1, at: 0.05 }); },
  jewel: () => arp([1319, 1760, 2217, 2637], 0.045, { type: 'sine', d: 0.3, vol: 0.09 }),
  item: () => arp([660, 880], 0.06, { type: 'triangle', d: 0.15, vol: 0.12 }),
  potion: () => { tone({ type: 'sine', f: 400, f2: 900, d: 0.15, vol: 0.12 }); tone({ type: 'sine', f: 500, f2: 1100, d: 0.12, vol: 0.08, at: 0.12 }); },
  hurt: () => { tone({ type: 'sine', f: 120, f2: 70, d: 0.12, vol: 0.25 }); noise({ filter: 'lowpass', f: 600, q: 0.5, d: 0.08, vol: 0.1 }); },
  die: () => arp([392, 330, 262, 196], 0.18, { type: 'triangle', d: 0.4, vol: 0.18 }),
  level: () => { arp([523, 659, 784, 1047], 0.09, { type: 'triangle', d: 0.35, vol: 0.18 }); arp([1047, 1319, 1568, 2093], 0.09, { type: 'sine', d: 0.5, vol: 0.06, at: 0.04 }); },
  tierup: () => { arp([392, 523, 659, 784, 1047, 1319], 0.11, { type: 'triangle', d: 0.6, vol: 0.18 }); tone({ type: 'sine', f: 98, d: 1.8, a: 0.05, vol: 0.3, at: 0.55 }); arp([1568, 2093, 2637], 0.08, { type: 'sine', d: 1, vol: 0.07, at: 0.66 }); },
  upOk: () => { arp([784, 988, 1175, 1568], 0.07, { type: 'triangle', d: 0.3, vol: 0.15 }); noise({ f: 7000, q: 2, d: 0.4, vol: 0.05, at: 0.2 }); },
  upFail: () => { tone({ type: 'sawtooth', f: 220, f2: 110, d: 0.35, vol: 0.12 }); tone({ type: 'square', f: 233, f2: 116, d: 0.35, vol: 0.05 }); },
  upBreak: () => { noise({ f: 5000, f2: 800, q: 0.6, d: 0.5, vol: 0.35 }); for (let i = 0; i < 6; i++) tone({ type: 'triangle', f: 1500 + Math.random() * 2500, d: 0.12, vol: 0.06, at: i * 0.05 }); },
  bossWarn: () => { tone({ type: 'sawtooth', f: 110, f2: 220, glide: 1.1, d: 1.1, a: 0.15, vol: 0.12 }); tone({ type: 'sine', f: 55, f2: 110, glide: 1.1, d: 1.1, a: 0.15, vol: 0.25 }); },
  bossSpawn: () => { tone({ type: 'sawtooth', f: 65, d: 1.4, a: 0.1, vol: 0.15 }); tone({ type: 'sawtooth', f: 69, d: 1.4, a: 0.1, vol: 0.12 }); noise({ filter: 'lowpass', f: 400, q: 0.5, d: 1.2, vol: 0.2 }); },
  click: () => tone({ type: 'triangle', f: 1200, f2: 900, d: 0.04, vol: 0.06 }),
  // --- vũ khí theo loại ---
  swingAxe: () => { noise({ f: 900, f2: 300, q: 0.6, d: 0.2, vol: 0.26 }); tone({ type: 'sine', f: 90, f2: 50, d: 0.18, vol: 0.25, at: 0.08 }); },
  swingMace: () => { noise({ filter: 'lowpass', f: 700, f2: 200, q: 0.5, d: 0.15, vol: 0.22 }); tone({ type: 'sine', f: 70, f2: 40, d: 0.2, vol: 0.4, at: 0.1 }); },
  swingSpear: () => noise({ f: 3000, f2: 1200, q: 1.6, d: 0.09, vol: 0.2 }),
  twang: () => { tone({ type: 'square', f: 220, f2: 110, d: 0.08, vol: 0.1 }); noise({ f: 2200, q: 2, d: 0.05, vol: 0.08 }); },
  cast: () => { arp([784, 1047, 1319], 0.03, { type: 'sine', d: 0.2, vol: 0.08 }); noise({ f: 5000, q: 2, d: 0.15, vol: 0.05 }); },
  tome: () => { noise({ f: 2500, f2: 1200, q: 1, d: 0.1, vol: 0.12 }); arp([660, 880], 0.05, { type: 'triangle', d: 0.15, vol: 0.08, at: 0.05 }); },
  // --- bước chân theo mặt đất ---
  stepGrass: () => noise({ filter: 'lowpass', f: 700, q: 0.5, d: 0.06, vol: 0.05 }),
  stepStone: () => { noise({ f: 1800, q: 2, d: 0.03, vol: 0.07 }); tone({ type: 'sine', f: 200, f2: 120, d: 0.03, vol: 0.06 }); },
  stepSnow: () => noise({ f: 3500, q: 0.8, d: 0.09, vol: 0.06 }),
  stepSand: () => noise({ filter: 'lowpass', f: 1500, q: 0.4, d: 0.08, vol: 0.045 }),
  stepMud: () => noise({ filter: 'lowpass', f: 400, q: 0.5, d: 0.12, vol: 0.08 }),
  // --- Công thành / Boss bang ---
  horn: () => { tone({ type: 'sawtooth', f: 98, f2: 110, glide: 1.2, d: 1.4, a: 0.25, vol: 0.12 }); tone({ type: 'sawtooth', f: 147, f2: 165, glide: 1.2, d: 1.4, a: 0.25, vol: 0.08, det: 8 }); noise({ filter: 'lowpass', f: 500, q: 0.4, d: 1.2, a: 0.3, vol: 0.1 }); },
  gateHit: () => { tone({ type: 'sine', f: 80, f2: 40, d: 0.25, vol: 0.5 }); noise({ filter: 'lowpass', f: 700, f2: 120, q: 0.5, d: 0.3, vol: 0.35 }); tone({ type: 'triangle', f: 180, f2: 90, d: 0.1, vol: 0.2 }); },
  gateBreak: () => { tone({ type: 'sine', f: 90, f2: 30, d: 0.8, vol: 0.6 }); noise({ filter: 'lowpass', f: 2500, f2: 100, q: 0.4, d: 1.2, vol: 0.45 }); for (let i = 0; i < 8; i++) tone({ type: 'square', f: 300 + Math.random() * 600, f2: 120, d: 0.05, vol: 0.06, at: 0.2 + i * 0.07 }); },
  throneMine: () => { arp([523, 659, 784, 1047, 1319], 0.07, { type: 'triangle', d: 0.4, vol: 0.15 }); tone({ type: 'sine', f: 130, d: 0.7, a: 0.03, vol: 0.25 }); },
  throneLost: () => arp([392, 330, 262], 0.12, { type: 'sawtooth', d: 0.3, vol: 0.1 }),
  victory: () => { arp([523, 659, 784, 1047, 784, 1047, 1319], 0.12, { type: 'triangle', d: 0.5, vol: 0.16 }); arp([1047, 1319, 1568, 2093], 0.12, { type: 'sine', d: 0.7, vol: 0.06, at: 0.3 }); },
  defeat: () => arp([392, 349, 294, 220], 0.2, { type: 'triangle', d: 0.55, vol: 0.15 }),
  mail: () => arp([1047, 1319], 0.08, { type: 'sine', d: 0.3, vol: 0.08 }),
  ping: () => tone({ type: 'sine', f: 1568, d: 0.08, vol: 0.05 }),
  thunder: () => { noise({ filter: 'lowpass', f: 300, f2: 60, q: 0.3, d: 2.2, a: 0.03, vol: 0.35 }); },
};
const SKILL_SOUND = { whirl: 'whoosh', slam: 'boom', warcry: 'buff', charge: 'dash', skyblade: 'whoosh', meteor: 'whoosh', frost: 'frost', manashield: 'buff', chain: 'zap', blackhole: 'vortex', arrowrain: 'arrow', pierce: 'laser', focus: 'buff', icearrow: 'frost', phoenix: 'roar' };

const lastAt = {}, MIN_GAP = { gateHit: 0.12, stepGrass: 0.1, stepStone: 0.1, stepSnow: 0.1, stepSand: 0.1, stepMud: 0.1, ping: 0.4, hit: 0.045, crit: 0.06, kill: 0.05, zen: 0.06, hurt: 0.12, arrow: 0.05, swing: 0.05, fire: 0.06 };
let voices = 0;
export function play(name) {
  if (!ctx || ctx.state !== 'running' || AUD.sfx <= 0) return;
  const f = SFX[name]; if (!f) return;
  const now = ctx.currentTime;
  if (now - (lastAt[name] || -1) < (MIN_GAP[name] || 0.03)) return;
  if (voices > 18) return;
  lastAt[name] = now; voices++; setTimeout(() => voices--, 300);
  f();
}

// ---------------- NHẠC NỀN THỦ TỤC ----------------
// Mỗi vùng: âm chủ (Hz), thang âm (bán cung), nhịp (giây / nốt), chất âm.
const MUSIC = {
  meadow: { root: 220, scale: [0, 2, 4, 7, 9], step: 0.55, chords: [[0, 4, 7], [-3, 0, 4], [5, 9, 12], [7, 11, 14]] },
  darkwood: { root: 196, scale: [0, 3, 5, 7, 10], step: 0.6, chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -2, 2]] },
  crypt: { root: 174.6, scale: [0, 1, 5, 7, 8], step: 0.7, chords: [[0, 3, 7], [1, 5, 8], [-4, 0, 3], [-5, -1, 2]] },
  tundra: { root: 246.9, scale: [0, 2, 3, 7, 10], step: 0.65, chords: [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-5, -2, 2]] },
  desert: { root: 207.6, scale: [0, 1, 4, 5, 7, 8], step: 0.5, chords: [[0, 4, 7], [1, 5, 8], [-4, 0, 4], [0, 4, 7]] },
  swamp: { root: 164.8, scale: [0, 1, 3, 7, 8], step: 0.7, chords: [[0, 3, 7], [1, 4, 8], [-2, 1, 5], [-4, 0, 3]] },
  canyon: { root: 196, scale: [0, 3, 5, 7, 10], step: 0.5, chords: [[0, 3, 7], [5, 8, 12], [-2, 2, 5], [3, 7, 10]] },
  coast: { root: 261.6, scale: [0, 2, 4, 7, 9], step: 0.55, chords: [[0, 4, 7], [5, 9, 12], [-3, 0, 4], [7, 11, 14]] },
  volcano: { root: 155.6, scale: [0, 1, 3, 6, 7, 10], step: 0.45, chords: [[0, 3, 6], [1, 5, 8], [-2, 1, 5], [0, 3, 7]] },
  fallen: { root: 185, scale: [0, 2, 3, 6, 7, 10], step: 0.6, chords: [[0, 3, 7], [-3, 0, 3], [-6, -3, 0], [-5, -1, 2]] },
  siege: { root: 146.8, scale: [0, 3, 5, 6, 7, 10], step: 0.26, chords: [[0, 3, 7], [-2, 1, 5], [-5, -2, 2], [-4, 0, 3]], drums: true, heavy: true },
  bossfight: { root: 130.8, scale: [0, 1, 3, 6, 7, 10], step: 0.3, chords: [[0, 3, 6], [1, 4, 8], [-2, 1, 5], [-6, -3, 0]], drums: true, heavy: true },
  battle: { root: 164.8, scale: [0, 3, 5, 7, 10], step: 0.28, chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -2, 2]], drums: true },
};
const hz = (root, semi) => root * Math.pow(2, semi / 12);
let mus = null, musTimer = null;
function musicKey() {
  const R = G.R;
  if (!R) return null;
  if (R.event) return R.event.id === 'siege' ? 'siege' : R.event.id === 'gboss' ? 'bossfight' : 'battle';
  const id = R.M && R.M.id;
  return MUSIC[id] ? id : 'meadow';
}
function scheduleMusic() {
  if (!ctx || ctx.state !== 'running' || AUD.music <= 0) return;
  const key = musicKey();
  if (!key) return;
  if (!mus || mus.key !== key) mus = { key, cfg: MUSIC[key], beat: 0, next: ctx.currentTime + 0.1, prev: 2 };
  const M = mus.cfg;
  while (mus.next < ctx.currentTime + 0.6) {
    const at = mus.next - ctx.currentTime, b = mus.beat, bar = Math.floor(b / 8), ch = M.chords[bar % M.chords.length];
    if (b % 8 === 0) for (const n of ch) { // pad
      tone({ type: 'sawtooth', f: hz(M.root / 2, n), d: M.step * 8, a: M.step * 2, vol: 0.035, det: -6, at, bus: musBus });
      tone({ type: 'sawtooth', f: hz(M.root / 2, n), d: M.step * 8, a: M.step * 2, vol: 0.035, det: 7, at, bus: musBus });
    }
    if (b % 8 === 0) tone({ type: 'sine', f: hz(M.root / 4, ch[0]), d: M.step * 7, a: 0.05, vol: 0.12, at, bus: musBus }); // bass
    // giai điệu: bước ngẫu nhiên trên thang âm, thỉnh thoảng nghỉ
    if (Math.random() < (M.drums ? 0.75 : 0.55)) {
      mus.prev = Math.max(0, Math.min(M.scale.length * 2 - 1, mus.prev + Math.floor(Math.random() * 5) - 2));
      const semi = M.scale[mus.prev % M.scale.length] + 12 * Math.floor(mus.prev / M.scale.length);
      tone({ type: 'triangle', f: hz(M.root, semi), d: M.step * 1.6, a: 0.01, vol: 0.05, at, bus: musBus });
    }
    if (M.heavy) {
      if (b % 2 === 0) tone({ type: 'sine', f: hz(M.root / 4, ch[0]), f2: hz(M.root / 8, ch[0]), d: 0.12, vol: 0.2, at, bus: musBus });
      if (b % 16 === 0) for (const n of ch) tone({ type: 'sawtooth', f: hz(M.root, n), d: 0.35, a: 0.03, vol: 0.05, at, bus: musBus });
    }
    if (M.drums) {
      if (b % 4 === 0) tone({ type: 'sine', f: 110, f2: 40, d: 0.18, vol: 0.25, at, bus: musBus });
      if (b % 4 === 2) noise({ f: 2000, q: 0.8, d: 0.08, vol: 0.08, at, bus: musBus });
      noise({ f: 8000, q: 1, d: 0.03, vol: 0.025, at, bus: musBus });
    }
    mus.beat++; mus.next += M.step;
  }
}

// ---------------- MÔI TRƯỜNG: gió, mưa, chim ban ngày, dế ban đêm ----------------
const WIND = { tundra: 0.5, canyon: 0.45, desert: 0.4, coast: 0.3, meadow: 0.12, volcano: 0.35, fallen: 0.3, swamp: 0.1, darkwood: 0.18, crypt: 0.08 };
const RAIN = { darkwood: 0.35 };
let amb = null, nextBird = 0, nextCricket = 0;
function ambEnsure() {
  if (amb || !ctx) return;
  const mk = (type, f, q) => { const sr = ctx.createBufferSource(); sr.buffer = noiseBuf; sr.loop = true; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = ctx.createGain(); g.gain.value = 0; sr.connect(fl); fl.connect(g); g.connect(musBus); sr.start(); return { g, fl }; };
  amb = { wind: mk('lowpass', 500, 0.7), rain: mk('highpass', 3500, 0.5) };
}
function ambTick() {
  if (!ctx || ctx.state !== 'running') return;
  ambEnsure();
  const R = G.R, id = R && !R.event && R.M && R.M.id, now = ctx.currentTime, on_ = AUD.music > 0 && id;
  amb.wind.g.gain.setTargetAtTime(on_ ? (WIND[id] || 0.1) * 0.6 : 0, now, 0.8);
  amb.wind.fl.frequency.setTargetAtTime(350 + 250 * Math.sin(now * 0.4) + 120 * Math.sin(now * 1.1), now, 0.3);
  amb.rain.g.gain.setTargetAtTime(on_ ? (RAIN[id] || 0) * 0.5 : 0, now, 0.8);
  if (!on_) return;
  const night = nightLevel(), green = id === 'meadow' || id === 'coast' || id === 'swamp';
  if (green && night < 0.3 && now > nextBird) { nextBird = now + 2.5 + Math.random() * 4; const f0 = 2200 + Math.random() * 800; for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) tone({ type: 'sine', f: f0, f2: f0 * 1.4, d: 0.07, vol: 0.035, at: i * 0.11, bus: musBus }); }
  if (green && night > 0.5 && now > nextCricket) { nextCricket = now + 0.9 + Math.random() * 1.5; for (let i = 0; i < 3; i++) tone({ type: 'sine', f: 4200, d: 0.03, vol: 0.02, at: i * 0.06, bus: musBus }); }
}
const SURFACE = { tundra: 'stepSnow', desert: 'stepSand', swamp: 'stepMud', crypt: 'stepStone', volcano: 'stepStone', fallen: 'stepStone', canyon: 'stepStone' };
let stepAcc = 0;
function stepTick() {
  const R = G.R, p = R && R.p;
  if (!p || p.dead > 0 || !p.moving) { stepAcc = 0.25; return; }
  stepAcc += 0.05;
  if (stepAcc >= 0.33) { stepAcc = 0; const id = R.event ? 'arena' : R.M && R.M.id; play(SURFACE[id] || (R.event ? 'stepStone' : 'stepGrass')); }
}

// ---------------- NỐI VỚI SỰ KIỆN GAME ----------------
export function initAudio() {
  const go = () => { unlock(); if (!musTimer) { musTimer = setInterval(() => { scheduleMusic(); ambTick(); }, 200); setInterval(stepTick, 50); } };
  addEventListener('pointerdown', go, { passive: true });
  addEventListener('keydown', go);
  document.addEventListener('click', (e) => { if (e.target.closest('button')) play('click'); });
  document.addEventListener('uitap', () => play('click'));

  on(EV.BASIC, (k) => {
    const S = G.S, w = S && S.equip && S.equip.weapon, wt = S && WEAPON_TYPES[S.cls] && WEAPON_TYPES[S.cls][(w && w.wt) || 0], id = wt && wt.id;
    play({ axe: 'swingAxe', mace: 'swingMace', spear: 'swingSpear', crossbow: 'twang', orb: 'cast', staff: 'cast', tome: 'tome' }[id] || (k === 'melee' ? 'swing' : k === 'fire' ? 'fire' : 'arrow'));
  });
  on(EV.HIT, (m, d, crit) => play(m && m.name === 'Cổng Thành' ? 'gateHit' : crit ? 'crit' : 'hit'));
  on(EV.KILL, (m) => play(m.boss ? 'boom' : 'kill'));
  on(EV.SKILL, (id) => play(SKILL_SOUND[id] || 'whoosh'));
  on(EV.SHAKE, (n) => { if (n >= 5) play('boom'); });
  on(EV.PICKUP, (kind) => play(kind === 'zen' ? 'zen' : kind === 'jewel' || kind === 'ticket' ? 'jewel' : kind === 'item' ? 'item' : 'zen'));
  on(EV.POTION, () => play('potion'));
  on(EV.PLAYER_HIT, () => play('hurt'));
  on(EV.PLAYER_DIE, () => play('die'));
  on(EV.LEVEL_UP, () => play('level'));
  on(EV.TIER_UP, () => play('tierup'));
  on(EV.UPGRADE, (o) => play(o === 'success' ? 'upOk' : o === 'break' ? 'upBreak' : 'upFail'));
  on(EV.CRAFT, (ok) => play(ok ? 'upOk' : 'upFail'));
  on(EV.BOSS_CAST, () => play('bossWarn'));
  on(EV.ANNOUNCE, (msg) => { if (typeof msg === 'string' && (msg.startsWith(SIEGE.icon) || msg.startsWith(GBOSS.icon))) play('horn'); if (/BOSS .* xuất hiện/.test(msg)) play('bossSpawn'); });
  on(EV.MAP_ENTER, () => { mus = null; });
  on(EV.SIEGE_GATE, () => play('gateBreak'));
  on(EV.SIEGE_THRONE, (mine) => play(mine ? 'throneMine' : 'throneLost'));
  on(EV.SIEGE_END, (r) => play(r && r.winner && G.S && G.S.guild && G.S.guild.name === r.winner ? 'victory' : 'defeat'));
  on(EV.GBOSS_END, () => play('victory'));
  on(EV.MAIL, () => play('mail'));
  on(EV.CHAT, () => play('ping'));
  on(EV.TRADE, () => play('ping'));
  // sấm ở Rừng Hắc Ám, khớp với chớp sáng của thời tiết (chu kỳ 17 giây)
  let lastThunder = -1;
  setInterval(() => { const R = G.R; if (!R || !R.M || R.M.id !== 'darkwood') return; const k = Math.floor(R.t / 17); if (k !== lastThunder) { lastThunder = k; setTimeout(() => play('thunder'), 400); } }, 250);
}
