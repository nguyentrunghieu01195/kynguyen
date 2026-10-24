// Bảng Thú cưng: chuồng pet, trứng đang ấp, cửa hàng, công dụng từng loại
import { G } from '../../core/state.js';
import { fmt } from '../../core/utils.js';
import { PET, PETS, PET_BY_ID, RARITY, petFx, petFight } from '../../config/pets.js';
import { drawPet } from '../../render/art/v2/pets.js';
import { btn } from '../components.js';
import { act } from '../../net/actions.js';

const icons = {};
/** Ảnh nhỏ của pet (vẽ 1 lần, lưu cache) */
function petIcon(kind, v = 0, band = 1) {
  const key = kind + v + band;
  if (icons[key]) return icons[key];
  const cv = document.createElement('canvas'); cv.width = 96; cv.height = 96; const c = cv.getContext('2d');
  c.translate(48, 78); c.scale(2.4, 2.4); drawPet(c, kind, 0.6, { v, band });
  return (icons[key] = cv.toDataURL());
}
const LBL = { dmg: 'Sát thương', crit: 'Chí mạng', def: 'Phòng thủ', hp: 'HP', zen: 'Zen rơi', exp: 'EXP', heal: 'Hồi máu/hạ quái' };
function effectText(kind, lv) {
  const fx = petFx(kind, lv), parts = Object.keys(fx).map((k) => (k === 'pickup' ? 'Nhặt đồ +' + fx[k] + ' ô' : LBL[k] + ' +' + fx[k] + (k === 'crit' ? '' : '%')));
  const f = petFight(kind, lv); if (f) parts.push('Đánh ' + Math.round(f.pct * 100) + '% sát thương / ' + f.every + 's');
  return parts.join(' · ');
}
const col = (r) => '<span style="color:' + RARITY[r].color + '">' + RARITY[r].name + '</span>';

function ownedCard(p) {
  const d = PET_BY_ID[p.kind], act_ = G.S.pets.active === p.id;
  const need = p.lv >= PET.maxLv ? 0 : PET.expNeed(p.lv), pct = need ? Math.min(100, (100 * p.exp) / need) : 100;
  return '<div class="fa' + (act_ ? ' worn' : ' have') + '"><img src="' + petIcon(p.kind, p.v || 0, p.lv >= 10 ? 4 : p.lv >= 7 ? 3 : p.lv >= 4 ? 2 : 1) + '"><b>' + d.name + ' <small>Cấp ' + p.lv + '</small></b>' +
    '<small>' + col(d.rarity) + ' · ' + d.role + '</small><small>' + effectText(p.kind, p.lv) + '</small>' +
    '<div class="qbar" style="margin-top:4px"><i style="width:' + pct + '%;background:#6ab8ff"></i><span>' + (need ? p.exp + '/' + need : 'Tối đa') + '</span></div>' +
    (act_ ? btn('Cho nghỉ', 'petUse', { id: '' }, { cls: 'sm' }) : btn('Đi theo', 'petUse', { id: p.id }, { cls: 'sm green' })) +
    btn('Thả (+' + fmt(Math.round(PET.releaseZen[d.rarity] * (1 + (p.lv - 1) * 0.2))) + ')', 'petRelease', { id: p.id }, { cls: 'sm' }) + '</div>';
}
function shopCard(d) {
  const price = PET.shop[d.rarity];
  return '<div class="fa have"><img src="' + petIcon(d.id) + '"><b>' + d.name + '</b><small>' + col(d.rarity) + ' · ' + d.role + '</small><small>' + effectText(d.id, 1) + '</small>' +
    btn('Mua ' + fmt(price), 'petBuy', { id: d.id }, { cls: 'sm', disabled: G.S.zen < price || G.S.pets.list.length >= PET.maxPets }) + '</div>';
}

export default {
  id: 'pets',
  title: '🐾 Thú cưng',
  render() {
    const P = G.S.pets, eggs = P.eggs;
    return '<div class="tip">Mỗi lúc chỉ <b>1 pet đi theo</b>. Pet lên cấp khi anh hạ quái (tối đa cấp ' + PET.maxLv + '). Trứng ấp nở dần khi hạ quái — trứng rơi từ Boss, quái tinh anh, Tháp, sự kiện; pet <b style="color:#ffd34a">Vương Giả</b> chỉ có từ Công Thành Chiến.</div>' +
      '<h4>🥚 Trứng đang ấp (' + eggs.length + '/' + PET.maxEggs + ')</h4>' +
      (eggs.length ? '<div class="mklist">' + eggs.map((e, i) => '<div class="mkrow"><div class="mkinfo"><b>' + col(e.r) + ' Trứng Pet' + (i === 0 ? ' <small class="muted">· đang ấp</small>' : '') + '</b><div class="bar" style="height:8px"><div style="width:' + Math.min(100, (100 * e.prog) / e.need) + '%;background:linear-gradient(#ffe070,#c08a20)"></div></div><div class="muted">' + fmt(e.prog) + '/' + fmt(e.need) + ' quái</div></div></div>').join('') + '</div>' : '<p class="muted">Chưa có trứng. Hạ Boss hoặc quái tinh anh để có cơ hội nhận.</p>') +
      '<h4>🐾 Chuồng pet (' + P.list.length + '/' + PET.maxPets + ')</h4>' +
      (P.list.length ? '<div class="fagrid">' + P.list.map(ownedCard).join('') + '</div>' : '<p class="muted">Chưa có pet nào. Mua ở cửa hàng bên dưới hoặc ấp trứng.</p>') +
      '<h4>🛒 Cửa hàng pet</h4><div class="fagrid">' + PETS.filter((d) => PET.shop[d.rarity]).map(shopCard).join('') + '</div>' +
      '<h4>📖 Tất cả loại pet</h4><div class="muted" style="font-size:12px">' + PETS.map((d) => '<div>' + col(d.rarity) + ' <b>' + d.name + '</b> — ' + d.desc + '</div>').join('') + '</div>';
  },
  actions: {
    petUse: (d) => act('petUse', d.id || null),
    petBuy: (d) => act('petBuy', d.id),
    petRelease: (d) => { if (confirm('Thả pet này? Pet sẽ biến mất và anh nhận lại ít Zen.')) return act('petRelease', d.id); },
  },
};
