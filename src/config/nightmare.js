// HỖN MANG CHI VƯƠNG: boss "thích nghi" ở bản đồ cuối cho người đã Reset nhiều. Chỉ số tính theo SỨC MẠNH HIỆN TẠI của người chơi
// (không phải theo cấp quái) nên luôn là một trận khó dù Reset bao nhiêu lần; càng Reset nhiều càng khó thêm.
export const NIGHTMARE = {
  minResets: 8,        // từ lần Reset này trở đi mới xuất hiện
  minMapTier: 4,       // chỉ ở bản đồ đồ-bậc 5 trở lên (Sa Mạc Lửa, Núi Lửa, Thiên Giới)
  firstSec: 90,        // giây đầu tiên sau khi vào bản đồ
  respawnSec: 1500,    // 25 phút sau khi bị hạ (≈2 lần / giờ)
  lifeSec: 330,        // không hạ được sau 5,5 phút thì biến mất (hẹn lại lần sau)
  fightSec: 48,        // thời gian "mục tiêu" để hạ boss với sát thương hiện tại (đã tính kỹ năng ×1,6)
  growPerReset: 0.05,  // mỗi Reset vượt ngưỡng: +5% máu và sát thương (cộng dồn)
  hitPct: 0.13,        // mỗi đòn thường lấy ~13% HP tối đa của người chơi (sau giáp), cao nhất ×2 khi Reset rất nhiều
  hitCap: 2,
  drop: { shards: [1, 3], chaos: [4, 8], soul: [3, 6], bless: [4, 8], items: 2, plusMin: 9, plusMax: 12, excLines: [2, 3], expMul: 3 },
  tpl: { id: 'chaoslord', name: 'Hỗn Mang Chi Vương', shape: 'dragon', c1: '#3a1060', c2: '#ff40e0', size: 1.6, spd: 1.1 },
};
