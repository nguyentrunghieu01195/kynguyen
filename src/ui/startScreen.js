// Màn hình bắt đầu: tài khoản (đăng nhập / đăng ký / chơi khách), tiếp tục nhân vật, tạo nhân vật mới.
import { esc, rint } from '../core/utils.js';
import { CLASSES } from '../config/classes.js';
import { loadRaw, isValidSave, guestSlot, currentSlot } from '../core/save.js';
import { art } from '../render/art/index.js';
import { $ } from './dom.js';
import { registerActions } from './input.js';
import { ACC, loggedIn, login, register, logout, apiBase, setServer, apiReq } from '../net/account.js';
import { installState, promptInstall } from '../pwa.js';

const NAME_A = ['Long', 'Phong', 'Vân', 'Hổ', 'Ưng', 'Kiếm', 'Thiên', 'Hắc', 'Bạch', 'Lôi'];
const NAME_B = ['Vương', 'Thần', 'Hiệp', 'Ảnh', 'Tử', 'Nhân', 'Ma', 'Sát'];
export const randomName = () => NAME_A[rint(0, NAME_A.length - 1)] + NAME_B[rint(0, NAME_B.length - 1)] + rint(1, 99);

const PREVIEW_TIER = { knight: 1, wizard: 5, archer: 3 };
let selected = 'knight';
let cont = null;           // bản lưu sẽ dùng khi bấm "Tiếp tục"
let guestSave = null;      // nhân vật khách trên máy (để đưa vào tài khoản)
let authMode = null;       // null | 'login' | 'register'
let busy = false;

function drawPreviews() {
  document.querySelectorAll('.cc canvas').forEach((cv) => {
    const k = cv.dataset.c, g = cv.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cv.width, cv.height);
    g.setTransform(2.2, 0, 0, 2.2, 90, 182);
    const eq = {};
    for (const sl of ['helm', 'armor', 'pants', 'gloves', 'boots']) eq[sl] = { slot: sl, tier: PREVIEW_TIER[k], plus: 7 };
    eq.weapon = { slot: 'weapon', tier: PREVIEW_TIER[k], plus: 7, cls: k };
    art().drawHero(g, k, eq, 0.3, { face: 1, moving: false, atk: 0 });
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
async function refreshCont() {
  const box = $('contbox');
  cont = null;
  guestSave = isValidSave(loadRaw(guestSlot)) ? loadRaw(guestSlot) : null;
  if (!loggedIn()) {
    cont = guestSave;
    box.innerHTML = cont ? '<button class="btn big green" data-act="continue">▶ Tiếp tục: ' + desc(cont) + '</button><p class="muted" style="margin-top:6px">hoặc tạo nhân vật mới bên dưới</p>' : '';
    return;
  }
  box.innerHTML = '<p class="muted">☁️ Đang tải nhân vật từ máy chủ…</p>';
  try {
    // Chơi bằng tài khoản: nhân vật nằm & chạy trên máy chủ → chỉ cần thông tin tóm tắt
    const me = await apiReq('GET', '/api/me');
    cont = me.summary && me.summary.cls ? me.summary : null;
    box.innerHTML = (cont ? '<button class="btn big green" data-act="continue">▶ Vào game: ' + desc(cont) + '</button>'
      : '<p class="muted">Tài khoản chưa có nhân vật — chọn lớp nhân vật bên dưới để bắt đầu.</p>') +
      '<p class="muted" style="margin-top:6px">🛡 Nhân vật chạy và được lưu trên máy chủ — cần có mạng khi chơi.</p>' + (playErr ? '<p class="warn">' + esc(playErr) + '</p>' : '');
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
  drawPreviews();
  $('cname').value = randomName();
  renderAcc();
  refreshCont();
  $('authbox').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submitAuth(); } });
  addEventListener('pwa-install-change', renderInstall);

  registerActions({
    pickClass: (d) => { selected = d.c; document.querySelectorAll('.cc').forEach((e) => e.classList.toggle('sel', e.dataset.c === selected)); },
    create: () => {
      if (loggedIn() && cont && !confirm('Tài khoản đã có nhân vật ' + cont.name + ' (cấp ' + cont.lv + '). Tạo nhân vật mới sẽ THAY THẾ nhân vật đó. Tiếp tục?')) return;
      const name = ($('cname').value.trim() || randomName()).slice(0, 12);
      playErr = '';
      if (loggedIn()) onPlay({ cls: selected, name }); else onCreate(selected, name);
    },
    continue: () => { if (!cont) return; playErr = ''; if (loggedIn()) onPlay(null); else onContinue(cont); },
    retryCont: () => refreshCont(),
    authOpen: (d) => { authMode = d.m; renderAuth(); },
    authClose: () => { authMode = null; UI_SERVER.show = false; renderAuth(); },
    authServer: () => { UI_SERVER.show = true; renderAuth(); },
    authSubmit: () => submitAuth(),
    accLogout: async () => { await logout(); renderAcc(); refreshCont(); },
    pwaInstall: () => promptInstall(),
  });
}
