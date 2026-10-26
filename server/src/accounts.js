// Tài khoản người chơi: đăng ký / đăng nhập / phiên đăng nhập / lưu game trên máy chủ.
// Lưu ra file JSON (accounts.json + saves/<id>.json). Mật khẩu băm bằng scrypt + muối riêng.
// Khi lên quy mô lớn: thay module này bằng cơ sở dữ liệu, giữ nguyên các hàm bên dưới.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const ACC_LIMITS = {
  userRe: /^[a-zA-Z0-9_.]{3,20}$/,
  passMin: 6,
  passMax: 72,
  saveBytes: 1024 * 1024,          // tối đa 1MB mỗi bản lưu
  sessionDays: 90,                 // phiên đăng nhập hết hạn sau 90 ngày không dùng
  sessionsPerAccount: 8,           // tối đa 8 thiết bị đăng nhập cùng lúc
  maxChars: 5,                     // tối đa 5 nhân vật mỗi tài khoản
};

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 32 };
const hashPass = (pass, salt) => crypto.scryptSync(pass, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p }).toString('hex');
const sha = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');

export class AuthError extends Error { constructor(code, msg, status = 400) { super(msg); this.code = code; this.status = status; } }

export function createAccounts(dir) {
  fs.mkdirSync(path.join(dir, 'saves'), { recursive: true });
  const file = path.join(dir, 'accounts.json');
  let data = { accounts: {}, sessions: {}, chars: {} };
  try { data = Object.assign(data, JSON.parse(fs.readFileSync(file, 'utf8'))); } catch (e) { /* file mới */ }
  data.chars = data.chars || {};
  const byUser = new Map(Object.values(data.accounts).map((a) => [a.ul, a]));
  let dirty = false, timer = null;

  function flush() {
    if (!dirty) return;
    dirty = false;
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, file);
  }
  const touch = () => { dirty = true; if (!timer) timer = setTimeout(() => { timer = null; flush(); }, 1500); };

  function newSession(acc, ua) {
    const token = crypto.randomBytes(32).toString('hex');
    data.sessions[sha(token)] = { id: acc.id, at: Date.now(), ua: String(ua || '').slice(0, 80) };
    // giữ tối đa N phiên mới nhất cho mỗi tài khoản
    const mine = Object.entries(data.sessions).filter(([, s]) => s.id === acc.id).sort((a, b) => b[1].at - a[1].at);
    for (const [k] of mine.slice(ACC_LIMITS.sessionsPerAccount)) delete data.sessions[k];
    touch();
    return token;
  }

  function checkCreds(user, pass) {
    if (typeof user !== 'string' || !ACC_LIMITS.userRe.test(user)) throw new AuthError('bad_user', 'Tên đăng nhập 3–20 ký tự, chỉ gồm chữ không dấu, số, dấu _ hoặc .');
    if (typeof pass !== 'string' || pass.length < ACC_LIMITS.passMin || pass.length > ACC_LIMITS.passMax) throw new AuthError('bad_pass', 'Mật khẩu cần từ ' + ACC_LIMITS.passMin + ' đến ' + ACC_LIMITS.passMax + ' ký tự.');
  }

  const savePath = (id) => path.join(dir, 'saves', id + '.json');
  const summaryOf = (d) => (d ? { name: String(d.name || '').slice(0, 20), cls: d.cls, lv: d.lv | 0, resets: d.resets | 0 } : null);

  // Nhân vật chính dùng chính bản ghi tài khoản (id trùng); nhân vật phụ là bản ghi riêng trong data.chars
  const ownerOf = (rec) => data.accounts[rec.owner || rec.id];
  const charsOf = (acc) => [acc, ...Object.values(data.chars).filter((c) => c.owner === acc.id).sort((a, b) => a.created - b.created)];
  const charList = (acc) => charsOf(acc).filter((c) => c.summary).map((c) => ({ id: c.id, ...c.summary }));

  return {
    register(user, pass, ua) {
      checkCreds(user, pass);
      const ul = user.toLowerCase();
      if (byUser.has(ul)) throw new AuthError('taken', 'Tên đăng nhập này đã có người dùng.', 409);
      const salt = crypto.randomBytes(16).toString('hex');
      const acc = { id: crypto.randomBytes(8).toString('hex'), user, ul, salt, hash: hashPass(pass, salt), created: Date.now(), lastLogin: Date.now(), rev: 0, saveAt: 0, summary: null };
      data.accounts[acc.id] = acc;
      byUser.set(ul, acc);
      touch();
      return { acc, token: newSession(acc, ua) };
    },
    login(user, pass, ua) {
      if (typeof user !== 'string' || typeof pass !== 'string') throw new AuthError('bad', 'Thiếu tên đăng nhập hoặc mật khẩu.');
      const acc = byUser.get(user.toLowerCase());
      // luôn băm để thời gian phản hồi như nhau dù tài khoản có tồn tại hay không
      const h = hashPass(pass.slice(0, ACC_LIMITS.passMax), acc ? acc.salt : 'x'.repeat(32));
      if (!acc || !crypto.timingSafeEqual(Buffer.from(h, 'hex'), Buffer.from(acc.hash, 'hex'))) throw new AuthError('wrong', 'Sai tên đăng nhập hoặc mật khẩu.', 401);
      if (acc.banned) throw new AuthError('banned', 'Tài khoản đã bị khoá' + (acc.banReason ? ': ' + acc.banReason : '') + '.', 403);
      acc.lastLogin = Date.now(); touch();
      return { acc, token: newSession(acc, ua) };
    },
    /** Tài khoản từ token phiên (null nếu không hợp lệ / hết hạn) */
    auth(token, charId) {
      if (typeof token !== 'string' || token.length !== 64) return null;
      const k = sha(token), s = data.sessions[k];
      if (!s) return null;
      if (Date.now() - s.at > ACC_LIMITS.sessionDays * 864e5) { delete data.sessions[k]; touch(); return null; }
      const acc = data.accounts[s.id];
      if (!acc || acc.banned) return null;
      if (Date.now() - s.at > 36e5) { s.at = Date.now(); touch(); } // gia hạn (tối đa 1 lần/giờ)
      if (charId && charId !== acc.id) { const c = data.chars[charId]; return c && c.owner === acc.id ? c : null; }
      return acc;
    },
    logout(token) { if (typeof token === 'string') { delete data.sessions[sha(token)]; touch(); } },
    changePassword(acc, oldPass, newPass, keepToken) {
      const h = hashPass(String(oldPass || '').slice(0, ACC_LIMITS.passMax), acc.salt);
      if (!crypto.timingSafeEqual(Buffer.from(h, 'hex'), Buffer.from(acc.hash, 'hex'))) throw new AuthError('wrong', 'Mật khẩu cũ không đúng.', 401);
      checkCreds(acc.user, newPass);
      acc.salt = crypto.randomBytes(16).toString('hex');
      acc.hash = hashPass(newPass, acc.salt);
      // đăng xuất mọi thiết bị khác
      const keep = keepToken && sha(keepToken);
      for (const [k, s] of Object.entries(data.sessions)) if (s.id === acc.id && k !== keep) delete data.sessions[k];
      touch();
    },
    info: (acc) => { const o = ownerOf(acc); return { user: acc.user, created: acc.created, rev: acc.rev, saveAt: acc.saveAt, summary: acc.summary, chars: charList(o), maxChars: ACC_LIMITS.maxChars }; },
    /** Bản ghi cho nhân vật mới: dùng chỗ nhân vật chính nếu đang trống, không thì thêm nhân vật phụ */
    newChar(acc) {
      const o = ownerOf(acc);
      if (!o.summary) return o;
      const list = charsOf(o);
      if (list.filter((c) => c.summary).length >= ACC_LIMITS.maxChars) throw new AuthError('chars_full', 'Tài khoản đã đủ ' + ACC_LIMITS.maxChars + ' nhân vật. Hãy xoá bớt để tạo mới.', 409);
      const empty = list.find((c) => c !== o && !c.summary); // nhân vật phụ tạo dở dang
      if (empty) return empty;
      const c = { id: crypto.randomBytes(8).toString('hex'), owner: o.id, user: o.user, ul: o.ul, created: Date.now(), rev: 0, saveAt: 0, summary: null };
      data.chars[c.id] = c; touch();
      return c;
    },
    getSave(acc) {
      if (!acc.rev || !acc.summary) return null;
      try { return { rev: acc.rev, at: acc.saveAt, data: JSON.parse(fs.readFileSync(savePath(acc.id), 'utf8')) }; } catch (e) { return null; }
    },
    /**
     * Ghi bản lưu. baseRev = rev mà client đã tải về; khác rev hiện tại → xung đột (thiết bị khác đã lưu sau đó)
     * trừ khi force = true.
     */
    putSave(acc, d, baseRev, force) {
      const json = JSON.stringify(d);
      if (json.length > ACC_LIMITS.saveBytes) throw new AuthError('too_big', 'Bản lưu quá lớn.', 413);
      if (!force && (baseRev | 0) !== acc.rev) return { conflict: true, rev: acc.rev, at: acc.saveAt, summary: acc.summary };
      const tmp = savePath(acc.id) + '.tmp';
      fs.writeFileSync(tmp, json);
      fs.renameSync(tmp, savePath(acc.id));
      acc.rev++; acc.saveAt = Date.now(); acc.summary = summaryOf(d);
      touch();
      return { rev: acc.rev, at: acc.saveAt };
    },
    /** Xoá nhân vật trên máy chủ (người chơi chọn chơi lại từ đầu) */
    deleteSave(acc) {
      try { fs.unlinkSync(savePath(acc.id)); } catch (e) { /* chưa có */ }
      if (acc.owner) { delete data.chars[acc.id]; touch(); return { rev: acc.rev + 1, removed: true }; } // nhân vật phụ: xoá hẳn
      acc.rev++; acc.saveAt = Date.now(); acc.summary = null; touch();
      return { rev: acc.rev };
    },
    // ---------------- QUẢN TRỊ ----------------
    list: () => Object.values(data.accounts),
    get: (id) => data.accounts[id] || data.chars[id] || null,
    sessionCount: (acc) => Object.values(data.sessions).filter((s) => s.id === acc.id).length,
    /** Quản trị đặt mật khẩu mới (người chơi quên mật khẩu) → đăng xuất mọi thiết bị */
    setPassword(acc, pass) {
      checkCreds(acc.user, pass);
      acc.salt = crypto.randomBytes(16).toString('hex');
      acc.hash = hashPass(pass, acc.salt);
      this.logoutAll(acc);
    },
    logoutAll(acc) { for (const [k, s] of Object.entries(data.sessions)) if (s.id === acc.id) delete data.sessions[k]; touch(); },
    setBanned(acc, banned, reason) {
      acc.banned = !!banned; acc.banReason = banned ? String(reason || '').slice(0, 120) : '';
      if (banned) this.logoutAll(acc); else touch();
    },
    /** Dữ liệu thô để sao lưu (gồm cả bản lưu nhân vật) */
    dump() {
      const saves = {};
      for (const a of [...Object.values(data.accounts), ...Object.values(data.chars)]) { const sv = this.getSave(a); if (sv) saves[a.id] = sv.data; }
      return { accounts: data, saves };
    },
    touch,
    count: () => Object.keys(data.accounts).length,
    flush,
  };
}
