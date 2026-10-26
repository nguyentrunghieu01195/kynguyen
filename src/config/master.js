// CÂY MASTER (sau khi đạt bậc 3 & cấp tối đa): EXP dư ở cấp 300 chuyển thành cấp Master, mỗi cấp = 1 điểm Master.
// Điểm đầu tư vào cây riêng của từng class (3 nhánh × 4 ô, ô cuối là "đỉnh" mạnh). Có thể tẩy điểm bằng Zen.
import { PROGRESSION as PG } from './balance.js';

export const MASTER = {
  unlockTier: 3,
  maxLv: 50,          // tối đa 50 điểm; tổng cây 54 điểm → phải chọn
  expMul: 2.5,        // 1 cấp Master cần ~2,5 lần EXP của cấp 300 (đo bằng mô phỏng: đủ 50 cấp ≈ 15–20 giờ cày ở cấp tối đa)
  respecZen: 5000000, // phí tẩy điểm
};
/** EXP cần để lên cấp Master m+1 */
export const masterNeed = (m) => Math.floor(PG.expNeed(PG.resetLevel) * MASTER.expMul * (1 + 0.04 * m));

// Mẫu 12 ô: mods cộng cho MỖI cấp ô. 'cd' = giảm hồi chiêu %, 'exp' = EXP nhận thêm %.
const TEMPLATE = [
  { id: 'a1', b: 0, max: 5, req: null, mods: { dmg: 2 } },
  { id: 'a2', b: 0, max: 5, req: ['a1', 3], mods: { crit: 1.5 } },
  { id: 'a3', b: 0, max: 5, req: ['a2', 3], mods: { skill: 3 } },
  { id: 'a4', b: 0, max: 3, req: ['a3', 5], mods: { dmg: 4, crit: 2 }, top: true },
  { id: 'b1', b: 1, max: 5, req: null, mods: { hp: 2 } },
  { id: 'b2', b: 1, max: 5, req: ['b1', 3], mods: { def: 2.5 } },
  { id: 'b3', b: 1, max: 5, req: ['b2', 3], mods: { guard: 1.5 } },
  { id: 'b4', b: 1, max: 3, req: ['b3', 5], mods: { heal: 1, reflect: 2 }, top: true },
  { id: 'c1', b: 2, max: 5, req: null, mods: { cd: 1.5 } },
  { id: 'c2', b: 2, max: 5, req: ['c1', 3], mods: { spd: 1.5 } },
  { id: 'c3', b: 2, max: 5, req: ['c2', 3], mods: { zen: 4 } },
  { id: 'c4', b: 2, max: 3, req: ['c3', 5], mods: { exp: 5, cd: 1 }, top: true },
];

/** Tên nhánh & ô theo class */
const NAMES = {
  knight: {
    branches: [['⚔️', 'Chiến Thần', '#ff7a5a'], ['🛡️', 'Thiết Bích', '#7ab8ff'], ['📯', 'Chiến Thuật', '#ffd54a']],
    nodes: ['Lực Chém', 'Đòn Chí Mạng', 'Kiếm Khí', 'Thần Kiếm Vô Song', 'Thân Thể Sắt', 'Giáp Kiên Cố', 'Hộ Thể', 'Bất Khuất', 'Nhịp Chiến', 'Kiếm Pháp Nhanh', 'Chiến Lợi Phẩm', 'Huyền Thoại Chiến Trường'],
  },
  wizard: {
    branches: [['🔮', 'Tinh Hoa Phép', '#c070ff'], ['✨', 'Kết Giới', '#7ad4ff'], ['📘', 'Trí Tuệ', '#ffd54a']],
    nodes: ['Ma Lực', 'Tâm Pháp Bạo', 'Cộng Hưởng Phép', 'Pháp Thần Giáng Lâm', 'Ma Thể', 'Pháp Giáp', 'Phong Ấn', 'Bất Diệt', 'Tụ Niệm', 'Thi Triển Nhanh', 'Kim Thuật', 'Thông Tuệ'],
  },
  archer: {
    branches: [['🏹', 'Xạ Kích', '#ff9a5a'], ['🍃', 'Linh Hoạt', '#7aff9a'], ['🦅', 'Thợ Săn', '#ffd54a']],
    nodes: ['Lực Cung', 'Nhắm Chuẩn', 'Mũi Tên Phá Giáp', 'Tiễn Thánh Vô Song', 'Thể Lực', 'Áo Giáp Nhẹ', 'Né Tránh', 'Gió Lướt', 'Nhịp Bắn', 'Tay Nhanh', 'Chiến Lợi Phẩm', 'Truy Vết'],
  },
};
const LABEL = { dmg: 'Sát thương', crit: 'Chí mạng', skill: 'Sát thương kỹ năng', hp: 'HP', def: 'Phòng thủ', guard: 'Giảm sát thương nhận', heal: 'Hồi HP khi hạ quái', reflect: 'Phản sát thương', cd: 'Giảm hồi chiêu', spd: 'Tốc đánh', zen: 'Zen rơi ra', exp: 'EXP nhận' };
export const modText = (m) => Object.keys(m).map((k) => LABEL[k] + ' +' + m[k] + (k === 'heal' || k === 'crit' ? '' : '%')).join(', ');

/** Cây của một class: { branches: [{id, icon, name, color, nodes:[...]}], byId } */
export function masterTree(cls) {
  const N = NAMES[cls];
  const nodes = TEMPLATE.map((t, i) => ({ ...t, name: N.nodes[i], desc: modText(t.mods) + ' / cấp' }));
  const branches = N.branches.map(([icon, name, color], b) => ({ id: b, icon, name, color, nodes: nodes.filter((n) => n.b === b) }));
  return { branches, nodes, byId: Object.fromEntries(nodes.map((n) => [n.id, n])) };
}
export const MASTER_TOTAL = TEMPLATE.reduce((a, n) => a + n.max, 0);

export const defaultMaster = () => ({ lv: 0, exp: 0, nodes: {} });
/** Chuẩn hoá từ save: chỉ giữ ô hợp lệ của từng class, giới hạn cấp */
export function migrateMaster(o) {
  const m = defaultMaster();
  if (!o || typeof o !== 'object') return m;
  m.lv = Math.max(0, Math.min(MASTER.maxLv, Math.floor(+o.lv || 0)));
  m.exp = Math.max(0, Math.floor(+o.exp || 0));
  for (const cls of Object.keys(NAMES)) {
    const t = masterTree(cls), src = (o.nodes && o.nodes[cls]) || {}, dst = {};
    for (const n of t.nodes) { const r = Math.floor(+src[n.id] || 0); if (r > 0) dst[n.id] = Math.min(n.max, r); }
    m.nodes[cls] = dst;
  }
  return m;
}
