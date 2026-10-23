// Điều khiển: chạm/chuột trên bản đồ, phím tắt, nút trên HUD.
import { G } from '../core/state.js';
import { art } from '../render/art/index.js';
import { VIEW, worldToScreen, screenToWorld } from '../render/iso.js';
import { openPanel, closePanel, togglePanel, runPanelAction } from './panels/index.js';
import { updateHud } from './hud.js';
import { UI } from './dom.js';
import { act } from '../net/actions.js';

/** Hành động toàn cục (không thuộc bảng nào) */
const GLOBAL_ACTIONS = {
  open: (d) => openPanel(d.p),
  openQuest: (d) => { UI.qtab = d.tab || 'main'; openPanel('quest'); },
  close: () => closePanel(),
  auto: () => act('auto').then(() => updateHud()),
  skill: (d) => {
    const i = +(d && d.i) || 0;
    if (!G.S.skills.bar[i]) { openPanel('skills'); return; }
    act('skill', i);
  },
  pot: (d) => act('pot', d.t),
};
const extraActions = {};
export const registerActions = (acts) => Object.assign(extraActions, acts);

function dispatch(name, data) {
  if (runPanelAction(name, data)) return;
  const f = GLOBAL_ACTIONS[name] || extraActions[name];
  if (f) f(data);
}

function pickMonster(cx, cy) {
  let best = null, bd = 1e9;
  for (const m of G.R.mobs) {
    const s = worldToScreen(m.x, m.y), hy = art().mobHeight(m) * VIEW.Z * 0.5;
    const dd = Math.hypot(cx - s.x, cy - (s.y - hy)), r = Math.max(30, 24 * m.size) * VIEW.Z;
    if (dd < r && dd < bd) { bd = dd; best = m; }
  }
  return best;
}

const KEYS = { ' ': () => GLOBAL_ACTIONS.skill({ i: 0 }), 1: () => GLOBAL_ACTIONS.skill({ i: 0 }), 2: () => GLOBAL_ACTIONS.skill({ i: 1 }), 3: () => GLOBAL_ACTIONS.skill({ i: 2 }), 4: () => GLOBAL_ACTIONS.skill({ i: 3 }),
  a: () => GLOBAL_ACTIONS.auto(), q: () => act('pot', 'hp'), w: () => act('pot', 'mp'), k: () => togglePanel('skills'), n: () => togglePanel('bigmap'),
  c: () => togglePanel('char'), i: () => togglePanel('inv'), u: () => togglePanel('up'), m: () => togglePanel('map') };

export function initInput(canvas) {
  // Chạm trên điện thoại: kích hoạt ngay khi nhấc tay (pointerup/touchend) thay vì chờ 'click'.
  // Một số trình xem nhúng (vd. xem trước trong app) nuốt mất sự kiện click tổng hợp → nút không phản hồi.
  const actOf = (t) => t && t.closest && (t.closest('[data-act]') || (t.closest('label') && t.closest('label').querySelector('input[data-act]')));
  const activate = (b) => {
    if (b.disabled) return;
    if (b.type === 'checkbox') b.checked = !b.checked;
    dispatch(b.dataset.act, b.dataset);
    if (b.tagName === 'BUTTON') document.dispatchEvent(new Event('uitap'));
  };
  let down = null, lastTap = { el: null, t: -1e9 };
  // pointerdown → touchstart → pointerup → touchend: lần chạm nào xử lý xong thì xoá 'down' nên không bị chạy 2 lần
  const tapStart = (x, y, t) => { down = { x, y, el: actOf(t) }; };
  const tapEnd = (x, y, t) => {
    const d = down; down = null;
    if (!d || !d.el || Math.hypot(x - d.x, y - d.y) > 14) return;
    const b = actOf(document.elementFromPoint(x, y) || t);
    if (b !== d.el) return;
    lastTap = { el: b, t: performance.now() };
    activate(b);
  };
  document.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') tapStart(e.clientX, e.clientY, e.target); }, true);
  document.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') tapEnd(e.clientX, e.clientY, e.target); }, true);
  document.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; if (t && !down) tapStart(t.clientX, t.clientY, e.target); }, { capture: true, passive: true });
  document.addEventListener('touchend', (e) => { const t = e.changedTouches[0]; if (t) tapEnd(t.clientX, t.clientY, e.target); }, { capture: true, passive: true });
  // Click tổng hợp theo sau một lần chạm đã xử lý → chặn hẳn (kể cả khi giao diện vừa đổi và click rơi vào nút/nền khác)
  document.addEventListener('click', (e) => {
    if (performance.now() - lastTap.t < 700 && !(e.target.matches && e.target.matches('input[type=text],textarea'))) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  document.addEventListener('click', (e) => {
    const b = actOf(e.target);
    if (b && !b.disabled) dispatch(b.dataset.act, b.dataset);
  });
  document.getElementById('panel').addEventListener('click', (e) => { if (e.target.id === 'panel') closePanel(); });

  canvas.addEventListener('pointerdown', (e) => {
    if (!G.R || G.R.p.dead > 0 || UI.panel) return;
    e.preventDefault();
    const m = pickMonster(e.clientX, e.clientY);
    if (m) act('attack', m.id);
    else { const w = screenToWorld(e.clientX, e.clientY); act('move', w.x, w.y); }
  });

  addEventListener('keydown', (e) => {
    if (!G.R || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const k = e.key.toLowerCase();
    if (k === 'escape') { if (UI.panel) closePanel(); return; }
    if (KEYS[k]) { e.preventDefault(); KEYS[k](); }
  });
}
