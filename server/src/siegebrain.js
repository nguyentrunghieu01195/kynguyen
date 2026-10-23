// "Bộ não" một trận Công Thành Chiến: giữ máu Cổng Thành, Ngai Vàng, điểm hạ gục, giờ giữ ngai.
// Không biết gì về máy chủ game: nhận vị trí người chơi + các cú đánh vào cổng, trả về sự kiện.
import { SIEGE } from '../../src/config/siege.js';

export function createBrain(C = SIEGE) {
  let B = null;
  const teamArr = () => (B ? [...B.teams.values()].sort((a, b) => a.slot - b.slot) : []);

  return {
    /** teams: [{ gid, name, role: 'def' | 'att' }]; bang thủ (nếu có) luôn ở ô 0, bang công ở ô 1–3 */
    start(teams, battleSec = C.battleMin * 60, gateHp = C.gate.hp) {
      const ordered = [...teams.filter((t) => t.role === 'def'), ...teams.filter((t) => t.role !== 'def')];
      let next = 1;
      B = {
        t: 0, battleSec, over: false, result: null,
        teams: new Map(ordered.map((t) => [t.gid, { ...t, slot: t.role === 'def' ? 0 : next++, hold: 0, kills: 0, deaths: 0 }])),
        gate: { max: gateHp, hp: gateHp, open: false },
        throne: { holder: null, cap: null, capT: 0 },
      };
      return B;
    },
    active: () => !!B && !B.over,
    exists: () => !!B,
    teamOf: (gid) => (B && B.teams.get(gid)) || null,
    hasDefender: () => teamArr().some((t) => t.role === 'def'),

    /** Cú đánh vào cổng (đơn vị máu cổng); chỉ phe công mới tính. Trả về true nếu cổng vừa vỡ */
    gateHit(gid, units) {
      const t = B && B.teams.get(gid);
      if (!B || B.over || !t || t.role === 'def' || B.gate.open) return false;
      B.gate.hp = Math.max(0, B.gate.hp - Math.max(0, units));
      if (B.gate.hp <= 0) { B.gate.open = true; return true; }
      return false;
    },
    kill(srcGid, tgtGid) {
      const a = B && B.teams.get(srcGid), b = B && B.teams.get(tgtGid);
      if (a) a.kills++;
      if (b) b.deaths++;
    },

    /** Mỗi tick. players: [{ gid, x, y, dead }]. Trả về danh sách sự kiện [{ type, ... }] */
    step(dt, players) {
      const ev = [];
      if (!B || B.over) return ev;
      B.t += dt;
      const T = B.throne, th = C.throne;
      // ai đang đứng trên Ngai Vàng (chỉ người còn sống)
      const on = new Set();
      for (const p of players) if (!p.dead && Math.hypot(p.x - th.x, p.y - th.y) <= th.r) on.add(p.gid);
      if (B.gate.open) { // Ngai Vàng chỉ chiếm được sau khi Cổng Thành vỡ
        if (on.size === 1) {
          const gid = [...on][0];
          if (gid === T.holder) { T.cap = null; T.capT = 0; }
          else {
            if (T.cap !== gid) { T.cap = gid; T.capT = 0; }
            T.capT += dt;
            if (T.capT >= th.captureSec) { T.holder = gid; T.cap = null; T.capT = 0; ev.push({ type: 'throne', gid }); }
          }
        } else if (on.size > 1) { T.cap = null; T.capT = 0; } // giành giật: không ai chiếm được
        if (T.holder) { const h = B.teams.get(T.holder); if (h) h.hold += dt; }
      }
      if (B.t >= B.battleSec) B.over = true;
      return ev;
    },
    gate: () => (B ? { ...B.gate } : null),

    /** Bảng điểm cho HUD */
    board() {
      if (!B) return null;
      const T = B.throne, cap = T.cap && B.teams.get(T.cap);
      return {
        left: Math.max(0, B.battleSec - B.t),
        teams: teamArr().map((t) => ({ name: t.name, slot: t.slot, role: t.role, hold: Math.floor(t.hold), kills: t.kills, holder: T.holder === t.gid })),
        cap: cap ? { name: cap.name, slot: cap.slot, left: Math.max(0, SIEGE.throne.captureSec - T.capT), frac: T.capT / SIEGE.throne.captureSec } : null,
      };
    },

    /** Chốt kết quả: cổng chưa vỡ → bang thủ thắng; đã vỡ → bang có tổng giờ giữ ngai cao nhất (hoà: bang thủ, rồi theo ô) */
    finish() {
      if (!B) return null;
      B.over = true;
      const list = teamArr(), def = list.find((t) => t.role === 'def');
      let win = null;
      if (!B.gate.open) win = def || null;
      else {
        const best = Math.max(...list.map((t) => t.hold));
        win = best > 0 ? list.filter((t) => t.hold === best).sort((a, b) => (a.role === 'def' ? -1 : 0) - (b.role === 'def' ? -1 : 0) || a.slot - b.slot)[0] : def || null;
      }
      B.result = { winnerGid: win ? win.gid : null, winner: win ? win.name : null, gateBroken: B.gate.open, teams: list.map((t) => ({ gid: t.gid, name: t.name, role: t.role, slot: t.slot, hold: Math.floor(t.hold), kills: t.kills, deaths: t.deaths })) };
      return B.result;
    },
    result: () => (B && B.result) || null,
    clear() { B = null; },
  };
}
