// Hướng dẫn tân thủ: vài bước ngắn có vòng sáng chỉ vào đúng nút cần bấm.
// S.tut = số bước đang làm (0..), -1 = đã xong / bỏ qua. Save cũ không có S.tut → coi như đã xong.
import { G } from '../core/state.js';
import { log, on, EV } from '../core/events.js';
import { UI } from './dom.js';
import { registerActions } from './input.js';
import { act } from '../net/actions.js';

const tap = () => (matchMedia('(pointer: coarse)').matches ? 'Chạm' : 'Bấm');

/**
 * Mỗi bước: text, target (selector nút cần chỉ, null = chỉ hiện lời nhắn),
 * done(S, R) → true khi đã làm xong, panel: bước làm bên trong bảng (không ẩn khi bảng mở).
 */
const STEPS = [
  { text: () => tap() + ' vào <b>mặt đất</b> để di chuyển nhân vật.', target: null, done: (S, R) => T.moved > 2.5 },
  { text: () => tap() + ' vào <b>một con quái</b> gần đó để tấn công. Hạ 3 con nhé!', target: null, done: (S) => S.kills - T.kills0 >= 3 },
  { text: () => 'Bật <b>AUTO</b> để nhân vật tự đánh quái, tự nhặt đồ và tự dùng kỹ năng.', target: '[data-act="auto"]', done: (S, R) => R.auto },
  { text: () => 'Lên cấp sẽ có <b>điểm</b>. Mở bảng <b>Nhân vật</b> để cộng điểm.', target: '#menubar [data-p="char"], [data-act="open"][data-p="char"]', done: () => UI.panel === 'char', wait: (S) => S.pts > 0 },
  { text: () => 'Bấm <b>+1 / +10 / +100</b> để cộng điểm vào chỉ số (Sức mạnh, Nhanh nhẹn…). Cộng hết rồi đóng bảng.', target: '[data-act="addpt"]', panel: 'char', done: (S) => S.pts === 0 || UI.panel !== 'char' },
  { text: () => tap() + ' <b>⤢</b> trên bản đồ nhỏ để mở bản đồ khu vực — chạm vào đâu là nhân vật tự đi tới đó.', target: '.mmexp', done: () => UI.panel === 'bigmap' },
  { text: () => 'Ô <b>kỹ năng</b> tự dùng khi bật AUTO, hoặc ' + tap().toLowerCase() + ' để tung chiêu. Học thêm kỹ năng ở bảng <b>Kỹ năng</b> khi lên cấp.', target: '#sk0', done: () => T.stepT > 7 || T.skillUsed },
];
const T = { moved: 0, kills0: 0, lastX: null, lastY: null, stepT: 0, skillUsed: false, step: -2 };

let box = null, ring = null;
function ensureDom() {
  if (box) return;
  box = document.createElement('div'); box.id = 'tut';
  ring = document.createElement('div'); ring.id = 'tutring';
  document.body.append(ring, box);
}
const hide = () => { if (box) { box.classList.add('hidden'); ring.classList.add('hidden'); } };

function beginStep(S) {
  T.step = S.tut; T.stepT = 0; T.moved = 0; T.kills0 = S.kills || 0; T.skillUsed = false;
  T.lastX = G.R ? G.R.p.x : null; T.lastY = G.R ? G.R.p.y : null;
  box && (box.dataset.step = '');
}

// Đổi bước / nhận thưởng đi qua act() (chơi bằng tài khoản thì máy chủ quyết định, thưởng chỉ nhận 1 lần)
let waitT = 0;
function setStep(S, n) { S.tut = n; waitT = 0.6; act('tut', n); }
function finish(S, skipped) { S.tut = -1; hide(); waitT = 0.6; act('tutFinish', !!skipped); }

let tickT = 0;
export function tutorialTick(dt) {
  const S = G.S, R = G.R;
  if (!S || !R || S.tut == null || S.tut < 0) { hide(); return; }
  waitT -= dt;
  if (S.tut >= STEPS.length) { if (waitT <= 0) finish(S); return; }
  if (T.step !== S.tut) beginStep(S);
  // đo quãng đường đã đi (bước 1)
  const p = R.p;
  if (T.lastX != null) T.moved += Math.hypot(p.x - T.lastX, p.y - T.lastY);
  T.lastX = p.x; T.lastY = p.y;
  T.stepT += dt;
  const st = STEPS[S.tut];
  if (st.wait && !st.wait(S)) { hide(); return; }          // chờ điều kiện (vd. có điểm để cộng)
  if (st.done(S, R)) { if (waitT <= 0 || S.tut !== T.step) { setStep(S, S.tut + 1); hide(); } return; }
  if ((tickT -= dt) > 0) return;
  tickT = 0.1;
  // đang mở bảng khác (không thuộc bước này) → tạm ẩn
  if (UI.panel && UI.panel !== st.panel) { hide(); return; }
  if (!UI.panel && st.panel) { hide(); return; }
  ensureDom();
  if (box.dataset.step !== String(S.tut)) {
    box.dataset.step = String(S.tut);
    box.innerHTML = '<div class="tutn">Hướng dẫn ' + (S.tut + 1) + '/' + STEPS.length + '</div><div class="tutt">' + st.text() + '</div>' +
      '<button class="link tutskip" data-act="tutSkip">Bỏ qua hướng dẫn</button>';
  }
  box.classList.remove('hidden');
  const el = st.target && [...document.querySelectorAll(st.target)].find((e) => e.offsetParent !== null);
  const vw = innerWidth, vh = innerHeight, bw = Math.min(300, vw - 24);
  box.style.width = bw + 'px';
  if (el) {
    const r = el.getBoundingClientRect(), pad = 6;
    ring.classList.remove('hidden');
    Object.assign(ring.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
    // đặt lời nhắn phía trên hoặc dưới nút, không che nút
    const bh = box.offsetHeight || 90, cx = Math.min(vw - bw - 12, Math.max(12, r.left + r.width / 2 - bw / 2));
    const top = st.panel ? vh - bh - 10 : r.top - bh - 16 > 8 ? r.top - bh - 16 : Math.min(vh - bh - 8, r.bottom + 16);
    Object.assign(box.style, { left: cx + 'px', top: top + 'px' });
  } else {
    ring.classList.add('hidden');
    Object.assign(box.style, { left: (vw - bw) / 2 + 'px', top: Math.round(vh * 0.2) + 'px' });
  }
}

export function initTutorial() {
  registerActions({
    tutSkip: () => { if (G.S && G.S.tut >= 0) { finish(G.S, true); log('Đã tắt hướng dẫn. Mở lại được trong Cài đặt.', '#aaa'); } },
    tutRestart: () => { if (G.S) { setStep(G.S, 0); T.step = -2; log('Bắt đầu lại hướng dẫn tân thủ.', '#f3d58a'); } },
  });
  on(EV.SKILL, () => { T.skillUsed = true; });
}
