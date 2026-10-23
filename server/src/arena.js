// "Bộ não" của Boss Bang Hội: mỗi bang có một đấu trường và MỘT Boss duy nhất, điều khiển ở đây (không tính trong thế giới từng người chơi).
// Boss chọn người gần nhất để đuổi và đánh thường; định kỳ báo trước rồi đập đất (trúng nhiều người cùng lúc).
// Module này không biết gì về máy chủ game: nhận vị trí người chơi, trả về hành động qua apply().
import { ARENA, BOSS_AI } from '../../src/config/gboss.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const fresh = () => ({ x: ARENA.bossStart.x, y: ARENA.bossStart.y, face: 1, moving: false, lunge: 0, target: null, atkT: 1, slamT: rnd(...BOSS_AI.slamEvery), cast: null });
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createArena() {
  const states = new Map(); // gid -> trạng thái Boss của đấu trường bang đó

  /**
   * dt (giây); groups: Map gid -> [{ ref, x, y, dead }]; apply(ref, kind, info) áp sát thương lên người chơi.
   * Đấu trường không còn ai thì xoá Boss (lần sau vào lại Boss xuất hiện từ đầu).
   */
  function update(dt, groups, apply) {
    for (const gid of [...states.keys()]) if (!groups.has(gid)) states.delete(gid);
    for (const [gid, list] of groups) {
      const B = states.get(gid) || (states.set(gid, fresh()), states.get(gid));
      step(B, dt, list, apply);
    }
  }

  function step(B, dt, list, apply) {
    B.lunge = Math.max(0, B.lunge - dt);
    const alive = list.filter((o) => !o.dead);
    // đang gồng chiêu: đứng yên, hết giờ thì đập
    if (B.cast) {
      B.cast.t += dt; B.moving = false;
      if (B.cast.t >= B.cast.d) {
        const c = B.cast; B.cast = null;
        for (const o of list) apply(o.ref, 'slam', { x: c.x, y: c.y, r: c.r, hit: !o.dead && Math.hypot(o.x - c.x, o.y - c.y) <= c.r, frac: BOSS_AI.slamFrac });
        B.slamT = rnd(...BOSS_AI.slamEvery);
      }
      return;
    }
    if (!alive.length) { B.moving = false; B.target = null; return; }
    // chọn mục tiêu: gần nhất, nhưng giữ mục tiêu cũ trừ khi người khác gần hơn hẳn
    const dist = (o) => Math.hypot(o.x - B.x, o.y - B.y);
    let best = alive[0];
    for (const o of alive) if (dist(o) < dist(best)) best = o;
    const cur = alive.find((o) => o.ref === B.target);
    const tgt = cur && dist(cur) <= dist(best) * BOSS_AI.retarget ? cur : best;
    B.target = tgt.ref;
    B.slamT -= dt;
    if (B.slamT <= 0) { B.cast = { t: 0, d: BOSS_AI.slamWarn, x: tgt.x, y: tgt.y, r: BOSS_AI.slamR }; B.moving = false; return; }
    const d = dist(tgt);
    B.face = tgt.x - B.x - (tgt.y - B.y) > 0 ? 1 : -1;
    if (d > BOSS_AI.reach) {
      const k = Math.min(1, (BOSS_AI.spd * dt) / (d || 1));
      B.x = clamp(B.x + (tgt.x - B.x) * k, ARENA.x0 + 0.4, ARENA.x1 - 0.4);
      B.y = clamp(B.y + (tgt.y - B.y) * k, ARENA.y0 + 0.4, ARENA.y1 - 0.4);
      B.moving = true;
    } else {
      B.moving = false;
      B.atkT -= dt;
      if (B.atkT <= 0) { B.atkT = BOSS_AI.hitCd; B.lunge = 0.25; apply(tgt.ref, 'hit', { frac: BOSS_AI.hitFrac }); }
    }
  }

  return { update, state: (gid) => states.get(gid) || null };
}
