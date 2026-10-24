// Kiểm tra & làm sạch dữ liệu client gửi lên. Không bao giờ tin dữ liệu từ client.
import { PET_BY_ID } from '../../src/config/pets.js';
export const LIMITS = {
  msgBytes: 4096,
  chatLen: 120,
  chatCooldownMs: 1500,
  annCooldownMs: 3000,
  nameLen: 12,
  chatHistory: 50,
  maxSpeed: 8,          // ô/giây — vượt quá coi như dịch chuyển bất thường
  helloTimeoutMs: 5000,
};

export const CLASSES = ['knight', 'wizard', 'archer'];
const SLOTS = ['weapon', 'helm', 'armor', 'pants', 'gloves', 'boots', 'wings'];

const num = (v, min, max, def = min) => (Number.isFinite(+v) ? Math.min(max, Math.max(min, +v)) : def);
export const int = (v, min, max, def = min) => Math.round(num(v, min, max, def));

/** Bỏ ký tự điều khiển, cắt độ dài, gộp khoảng trắng */
export function cleanText(s, max) {
  return String(s ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}
export const cleanName = (s) => cleanText(s, LIMITS.nameLen) || 'Hiệp Sĩ';

/** Ngoại hình: { cls, eq: { slot: [tier, plus] } } */
export function cleanLook(look) {
  const out = { cls: CLASSES.includes(look?.cls) ? look.cls : 'knight', eq: {} };
  for (const s of SLOTS) {
    const v = look?.eq?.[s];
    if (Array.isArray(v)) out.eq[s] = [int(v[0], s === 'wings' ? 1 : 0, s === 'wings' ? 6 : 5), int(v[1], 0, 15), int(v[2], 0, s === 'weapon' ? 9 : 3)]; // loại vũ khí tới 9 (gồm vũ khí đặc biệt)
  }
  // Thời trang: chỉ nhận id dạng chữ thường ngắn
  const id = (x) => (typeof x === 'string' && /^[a-z]{2,16}$/.test(x) ? x : null);
  if (look?.fa) out.fa = { o: id(look.fa.o), h: id(look.fa.h), a: id(look.fa.a) };
  out.tr = int(look?.tr, 1, 3, 1); // bậc nhân vật (hào quang)
  const gn = cleanText(look?.g, 12); if (gn) out.g = gn; // tên bang hội
  if (look?.gd === 'f') out.gd = 'f'; // nhân vật nữ
  if (look?.ct) out.ct = 1; // bang đang giữ thành
  if (typeof look?.pt === 'string' && PET_BY_ID[look.pt]) out.pt = look.pt; // pet đang theo
  return out;
}

export const cleanStats = (s) => ({ lv: int(s?.lv, 1, 400, 1), resets: int(s?.resets, 0, 9999), tower: int(s?.tower, 0, 100000), power: int(s?.power, 0, 1e12) });

/** Tên phòng hợp lệ: 'm0'..'m99' (bản đồ thường). null = không ở phòng công khai (sự kiện/tháp) */
export const cleanRoom = (r) => (typeof r === 'string' && /^(m\d{1,2}|gb_[0-9a-f]{10}|sg)$/.test(r) ? r : null);

export const cleanPos = (m) => ({ x: num(m?.x, 0, 128), y: num(m?.y, 0, 128), tx: m?.tx == null ? null : num(m.tx, 0, 128), ty: m?.ty == null ? null : num(m.ty, 0, 128), f: m?.f === -1 ? -1 : 1, mv: !!m?.mv });

/** Thông báo hệ thống: client báo thành tích, server tự soạn câu chữ (không nhận câu chữ từ client) */
export const ANNOUNCE = {
  upgrade: (d, who) => '✨ ' + who + ' vừa ép thành công ' + cleanText(d.item, 40) + '!',
  tower: (d, who) => '🗼 ' + who + ' vừa chinh phục tầng ' + int(d.floor, 1, 100000) + ' Tháp Vô Tận!',
  boss: (d, who) => '🏆 ' + who + ' đã hạ gục BOSS ' + cleanText(d.boss, 30) + '!',
  siege: (d) => cleanText(d.text, 120),
  reset: (d, who) => '🔄 ' + who + ' đã Reset lần thứ ' + int(d.n, 1, 9999) + '!',
  event: (d, who) => '⚔️ ' + who + ' đã hoàn thành ' + (d.id === 'ds' ? 'Quảng Trường Quỷ' : 'Huyết Lâu') + '!',
  wings: (d, who) => '🪽 ' + who + ' vừa chế tạo thành công ' + cleanText(d.name, 30) + '!',
};

/** Bảng xếp hạng từ danh sách hồ sơ */
export function buildRank(players, top = 20) {
  const pub = (p) => ({ id: p.id, name: p.name, cls: p.cls, lv: p.lv, resets: p.resets, tower: p.tower, power: p.power });
  const sort = (f) => players.slice().sort(f).slice(0, top).map(pub);
  return {
    level: sort((a, b) => b.resets - a.resets || b.lv - a.lv),
    tower: sort((a, b) => b.tower - a.tower || b.power - a.power).filter((p) => p.tower > 0),
    power: sort((a, b) => b.power - a.power),
    total: players.length,
    at: Date.now(),
  };
}
