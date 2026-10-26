// Màn hình bắt đầu: tài khoản (đăng nhập / đăng ký / chơi khách), tiếp tục nhân vật, tạo nhân vật mới.
import { pixelOn, pixelate } from '../render/pixel.js';
import { esc, rint } from '../core/utils.js';
import { CLASSES, FEMALE_CLASSES } from '../config/classes.js';
import { loadRaw, isValidSave, GUEST_SLOTS, guestKey, setGuestSlot } from '../core/save.js';
import { art } from '../render/art/index.js';
import { $ } from './dom.js';
import { registerActions } from './input.js';
import { ACC, loggedIn, login, register, logout, apiBase, setServer, apiReq, setActiveChar } from '../net/account.js';
import { installState, promptInstall } from '../pwa.js';

const NAME_A = ['Long', 'Phong', 'Vân', 'Hổ', 'Ưng', 'Kiếm', 'Thiên', 'Hắc', 'Bạch', 'Lôi'];
const NAME_B = ['Vương', 'Thần', 'Hiệp', 'Ảnh', 'Tử', 'Nhân', 'Ma', 'Sát'];
export const randomName = () => NAME_A[rint(0, NAME_A.length - 1)] + NAME_B[rint(0, NAME_B.length - 1)] + rint(1, 99);

const PREVIEW_TIER = { knight: 1, wizard: 5, archer: 3, lord: 4, gladiator: 2 };
let selected = 'knight', gender = 'm';
let chars = [];            // danh sách nhân vật: khách = [{slot, save}], tài khoản = [{id, ...tóm tắt}]
let maxChars = GUEST_SLOTS;
let authMode = null;       // null | 'login' | 'register'
let busy = false;

/** Chọn giới tính (chỉ hiện với class đã có bản nữ) */
function renderGender() {
  const el = $('genderRow');
  if (!el) return;
  el.style.display = FEMALE_CLASSES.includes(selected) ? '' : 'none';
  el.innerHTML = [['m', '♂ Nam'], ['f', '♀ Nữ']].map(([g, n]) => '<button class="btn sm ' + (gender === g ? 'green' : '') + '" data-act="pickGender" data-g="' + g + '">' + n + '</button>').join('');
}

function drawPreviews() {
  document.querySelectorAll('.cc canvas').forEach((cv) => {
    const k = cv.dataset.c, g = cv.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cv.width, cv.height);
    g.setTransform(2.2, 0, 0, 2.2, 90, 182);
    const eq = {};
    for (const sl of ['helm', 'armor', 'pants', 'gloves', 'boots']) eq[sl] = { slot: sl, tier: PREVIEW_TIER[k], plus: 7 };
    eq.weapon = { slot: 'weapon', tier: PREVIEW_TIER[k], plus: 7, cls: k };
    art().drawHero(g, k, eq, 0.3, { face: 1, moving: false, atk: 0, gd: FEMALE_CLASSES.includes(k) && selected === k ? gender : 'm' });
    if (pixelOn()) pixelate(g, cv.width, cv.height, 3, true);
  });
}

const desc = (s) => esc(s.name) + ' · ' + (CLASSES[s.cls] ? CLASSES[s.cls].name : '') + ' cấp ' + s.lv + (s.resets ? ', Reset ' + s.resets : '');

// ---------------- KHỐI TÀI KHOẢN ----------------
function renderAcc() {
  const box = $('accbox');
  if (!box) return;
  if (loggedIn()) {
    box.innerHTML = '<div class="accline">👤 Tài khoản <b>' + esc(ACC.user) + '</b>' +
      (ACC.status === 'offline' ? ' <span class="warn">· ngoại tuyến</span>' : '') +
      ' · <button class="link" data-act="accLogout">Đăng xuất</button></div>';
  } else {
    box.innerHTML = '<div class="accrow"><button class="btn" data-act="authOpen" data-m="login">Đăng nhập</button>' +
      '<button class="btn alt" data-act="authOpen" data-m="register">Đăng ký</button></div>' +
      '<p class="muted acchint">Có tài khoản thì nhân vật được lưu trên máy chủ — đổi điện thoại hay máy tính vẫn chơi tiếp.<br>Hoặc chơi ngay bên dưới (chỉ lưu trên máy này).</p>';
  }
  renderInstall();
}

function renderInstall() {
  const el = $('installbox');
  if (!el) return;
  const st = installState();
  el.innerHTML = st === 'prompt' ? '<button class="btn sm" data-act="pwaInstall">📲 Cài game vào máy</button>'
    : st === 'ios' ? '<div class="muted iosinst">📲 Cài game: bấm <b>Chia sẻ ⇪</b> ở thanh Safari → <b>Thêm vào MH chính</b></div>' : '';
}

function renderAuth() {
  const el = $('authbox');
  if (!authMode) { el.classList.add('hidden'); el.innerHTML = ''; return; }
  const reg = authMode === 'register', needServer = !apiBase() || UI_SERVER.show;
  el.classList.remove('hidden');
  el.innerHTML = '<div class="authcard"><div class="authhead">' + (reg ? 'Đăng ký tài khoản' : 'Đăng nhập') +
    '<button class="x" data-act="authClose">✕</button></div>' +
    '<input id="auser" autocomplete="username" autocapitalize="off" autocorrect="off" spellcheck="false" maxlength="20" placeholder="Tên đăng nhập">' +
    '<input id="apass" type="password" autocomplete="' + (reg ? 'new-password' : 'current-password') + '" maxlength="72" placeholder="Mật khẩu' + (reg ? ' (ít nhất 6 ký tự)' : '') + '">' +
    (reg ? '<input id="apass2" type="password" autocomplete="new-password" maxlength="72" placeholder="Nhập lại mật khẩu">' : '') +
    (needServer ? '<input id="aserver" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Địa chỉ máy chủ (vd: game.tenmien.com)" value="' + esc(ACC.base) + '">' : '') +
    '<div id="aerr" class="aerr"></div>' +
    '<button class="btn big" data-act="authSubmit">' + (reg ? 'Tạo tài khoản' : 'Đăng nhập') + '</button>' +
    '<div class="authfoot">' + (reg ? 'Đã có tài khoản? <button class="link" data-act="authOpen" data-m="login">Đăng nhập</button>'
      : 'Chưa có tài khoản? <button class="link" data-act="authOpen" data-m="register">Đăng ký</button>') +
    (needServer ? '' : ' · <button class="link" data-act="authServer">Đổi máy chủ</button>') + '</div>' +
    (reg ? '<p class="muted" style="margin-top:8px">Tên đăng nhập: 3–20 ký tự, chữ không dấu, số, _ hoặc . — khác với tên nhân vật trong game.</p>' : '') +
    '</div>';
  setTimeout(() => { const u = $('auser'); if (u) u.focus(); }, 50);
}
const UI_SERVER = { show: false };
const authErr = (m) => { const e = $('aerr'); if (e) e.textContent = m || ''; };

async function submitAuth() {
  if (busy) return;
  const user = $('auser').value.trim(), pass = $('apass').value, reg = authMode === 'register';
  if (!user || !pass) return authErr('Nhập tên đăng nhập và mật khẩu.');
  if (reg && pass !== $('apass2').value) return authErr('Hai mật khẩu không khớp.');
  if ($('aserver')) setServer($('aserver').value);
  busy = true; authErr('Đang ' + (reg ? 'tạo tài khoản' : 'đăng nhập') + '…');
  try {
    await (reg ? register(user, pass) : login(user, pass));
    authMode = null; UI_SERVER.show = false; renderAuth();
    await refreshCont();
  } catch (e) {
    if ((e.noServer || e.status === 0) && !$('aserver')) { // chưa có ô nhập máy chủ → hiện ra, giữ lại chữ đã gõ
      const keep = { u: user, p: pass, p2: $('apass2') ? $('apass2').value : '' };
      UI_SERVER.show = true; renderAuth();
      $('auser').value = keep.u; $('apass').value = keep.p; if ($('apass2')) $('apass2').value = keep.p2;
    }
    authErr(e.message || 'Có lỗi, thử lại nhé.');
  }
  finally { busy = false; renderAcc(); }
}

// ---------------- TIẾP TỤC / ĐƯA NHÂN VẬT VÀO TÀI KHOẢN ----------------
const charRow = (c, i) => '<div class="charrow"><button class="btn big green" data-act="continue" data-i="' + i + '">▶ ' + desc(c) + '</button></div>';
function renderChars(note) {
  const box = $('contbox');
  const full = chars.length >= maxChars;
  box.innerHTML = (chars.length ? '<div class="charlist">' + chars.map(charRow).join('') + '</div>' : '') +
    '<p class="muted" style="margin-top:6px">' + (chars.length ? 'Nhân vật ' + chars.length + '/' + maxChars + (full ? ' — đã đầy, hãy xoá bớt trong Cài đặt để tạo mới.' : ' — hoặc tạo nhân vật mới bên dưới.') : 'Chưa có nhân vật — chọn lớp nhân vật bên dưới để bắt đầu.') + '</p>' + (note || '');
  const btn = document.querySelector('[data-act="create"]');
  if (btn) btn.disabled = full;
}
async function refreshCont() {
  const box = $('contbox');
  chars = [];
  if (!loggedIn()) {
    maxChars = GUEST_SLOTS;
    for (let i = 0; i < GUEST_SLOTS; i++) { const raw = loadRaw(guestKey(i)); if (isValidSave(raw)) chars.push({ ...raw, slot: i }); }
    renderChars();
    return;
  }
  box.innerHTML = '<p class="muted">☁️ Đang tải nhân vật từ máy chủ…</p>';
  setActiveChar(''); // màn hình này tự chọn nhân vật
  try {
    // Chơi bằng tài khoản: nhân vật nằm & chạy trên máy chủ → chỉ cần thông tin tóm tắt
    const me = await apiReq('GET', '/api/me');
    maxChars = me.maxChars || 5;
    chars = (me.chars || []).filter((c) => c && c.cls);
    renderChars('<p class="muted">🛡 Nhân vật chạy và được lưu trên máy chủ — cần có mạng khi chơi.</p>' + (playErr ? '<p class="warn">' + esc(playErr) + '</p>' : ''));
  } catch (e) {
    if (e.status === 401) { await logout(); renderAcc(); refreshCont(); return; }
    box.innerHTML = '<p class="warn">⚠ ' + esc(e.message || 'Không kết nối được máy chủ') + '</p><p class="muted">Chơi bằng tài khoản cần kết nối máy chủ. Có thể đăng xuất để chơi khách (chỉ lưu trên máy này).</p>' +
      btnHtml('Thử lại', 'retryCont');
  }
}
let playErr = '';
const btnHtml = (label, act) => '<button class="btn sm" data-act="' + act + '">' + label + '</button>';
/** Hiện trạng thái khi đang vào game bằng tài khoản */
export function setPlayStatus(text, isErr) {
  const box = $('contbox');
  if (isErr) { playErr = text; refreshCont(); return; }
  box.innerHTML = '<p class="muted">' + esc(text) + '</p>';
}

/**
 * @param {{onCreate:(cls,name)=>void, onContinue:(save, opts)=>void}} handlers
 */
export function initStartScreen({ onCreate, onContinue, onPlay }) {
  const L = $('clsList');
  L.innerHTML = Object.entries(CLASSES).map(([k, c]) =>
    '<div class="cc' + (k === selected ? ' sel' : '') + '" data-act="pickClass" data-c="' + k + '"><canvas width="180" height="200" data-c="' + k + '"></canvas><b>' + c.name + '</b><p>' + c.desc + '</p></div>').join('');
  L.insertAdjacentHTML('afterend', '<div id="genderRow" class="row" style="justify-content:center;gap:8px;margin:8px 0"></div>');
  renderGender();
  drawPreviews(); setTimeout(drawPreviews, 1500); setTimeout(drawPreviews, 3500); // vẽ lại khi mô hình 3D đã tải xong
  $('cname').value = randomName();
  renderAcc();
  refreshCont();
  $('authbox').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submitAuth(); } });
  addEventListener('pwa-install-change', renderInstall);

  registerActions({
    pickClass: (d) => { selected = d.c; document.querySelectorAll('.cc').forEach((e) => e.classList.toggle('sel', e.dataset.c === selected)); renderGender(); drawPreviews(); },
    pickGender: (d) => { gender = d.g; renderGender(); drawPreviews(); },
    create: () => {
      if (chars.length >= maxChars) return;
      const name = ($('cname').value.trim() || randomName()).slice(0, 12);
      playErr = '';
      const gd = FEMALE_CLASSES.includes(selected) ? gender : 'm';
      if (loggedIn()) onPlay({ cls: selected, name, gender: gd });
      else {
        let slot = 0; while (slot < GUEST_SLOTS && isValidSave(loadRaw(guestKey(slot)))) slot++;
        if (slot >= GUEST_SLOTS) return;
        setGuestSlot(slot); onCreate(selected, name, gd);
      }
    },
    continue: (d) => {
      const c = chars[+d.i]; if (!c) return; playErr = '';
      if (loggedIn()) { setActiveChar(c.id); onPlay(null); } else { setGuestSlot(c.slot); const { slot, ...raw } = c; onContinue(raw); }
    },
    retryCont: () => refreshCont(),
    authOpen: (d) => { authMode = d.m; renderAuth(); },
    authClose: () => { authMode = null; UI_SERVER.show = false; renderAuth(); },
    authServer: () => { UI_SERVER.show = true; renderAuth(); },
    authSubmit: () => submitAuth(),
    accLogout: async () => { await logout(); renderAcc(); refreshCont(); },
    pwaInstall: () => promptInstall(),
  });
}
