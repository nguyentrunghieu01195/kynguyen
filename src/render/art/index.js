// Bộ chọn bộ đồ hoạ. Mỗi bộ (art pack) phải export object có các hàm:
//   paintMap(g, map, M)              vẽ nền bản đồ lên canvas phụ (đã dịch gốc toạ độ)
//   drawDeco(ctx, deco, t)           cây, đá, cột…
//   drawHero(ctx, cls, equip, t, o)  nhân vật; o = { face, moving, atk }
//   drawMob(ctx, mob, t)             quái (mob.tpl chứa thông tin phụ kiện)
//   drawDrop(ctx, drop, t)           vật phẩm rơi trên đất
//   drawFx(ctx, fx, t)               hiệu ứng kỹ năng
//   drawProjectile(ctx, proj, t)     đạn, tên, cầu lửa
//   itemIconHTML(item)               icon HTML dùng trong túi đồ
//   mobHeight(mob), heroHeight       chiều cao để đặt thanh máu / tên
import { CFG } from '../../config/constants.js';
import classic from './classic/index.js';
import v2 from './v2/index.js';

export const ART_PACKS = { classic, v2 };

let current = ART_PACKS[CFG.ART_STYLE] || classic;
export const art = () => current;
export function setArt(id) {
  if (ART_PACKS[id]) current = ART_PACKS[id];
  return current;
}
