// Icon giao diện: bộ V2 dùng icon vẽ bằng code, bộ Classic dùng emoji.
import { G } from '../core/state.js';
import { SKILLS_BY_ID } from '../config/skills.js';
import { art } from '../render/art/index.js';
import { iconURL } from '../render/art/v2/items.js';
import { $ } from './dom.js';

const MENU = {
  quest: ['ui_quest', '📜'], events: ['ui_event', '⚔️'], char: ['ui_char', '👤'], inv: ['ui_bag', '🎒'],
  skills: ['ui_skill', '📖'], up: ['ui_anvil', '⚒️'], map: ['ui_map', '🗺️'], shop: ['ui_shop', '🏪'], set: ['ui_gear', '⚙️'],
};
const img = (k, a) => '<img src="' + iconURL(k, a) + '" alt="">';

export function applyUiIcons() {
  const v2 = art().id === 'v2';
  document.querySelectorAll('.mb[data-p]').forEach((b) => {
    const m = MENU[b.dataset.p];
    if (m) b.querySelector('b').innerHTML = v2 ? img(m[0]) : m[1];
  });
  document.querySelectorAll('.rb[data-act="pot"] .pi').forEach((e) => {
    const t = e.parentElement.dataset.t;
    e.innerHTML = v2 ? img('potion', t) : t === 'hp' ? '❤️' : '💧';
  });
  barKey = '';
}

/** Icon kỹ năng (V2: vẽ bằng code, Classic: emoji) */
export const skillIconHTML = (id) => (art().id === 'v2' ? img('sk_' + id) : SKILLS_BY_ID[id].icon);

let barKey = '';
/** Vẽ lại icon thanh kỹ năng khi các ô thay đổi */
export function refreshSkillBar() {
  const S = G.S, key = art().id + S.skills.bar.join() + JSON.stringify(S.skills.off);
  if (key === barKey) return;
  barKey = key;
  S.skills.bar.forEach((id, i) => {
    const b = $('sk' + i);
    b.classList.toggle('empty', !id);
    b.classList.toggle('off', !!(id && S.skills.off[id]));
    b.querySelector('.ski').innerHTML = id ? skillIconHTML(id) : '＋';
    b.title = id ? SKILLS_BY_ID[id].name : 'Gắn kỹ năng';
  });
}
