// Điểm khởi động: nối các tầng lại với nhau.
//   config/  → dữ liệu & số cân bằng
//   core/    → trạng thái, sự kiện, lưu game, tiện ích
//   systems/ → luật chơi (không đụng DOM/canvas)
//   render/  → vẽ (chọn bộ đồ hoạ trong render/art)
//   ui/      → HUD, bảng, điều khiển
import './styles/fonts.css';
import './styles/main.css';
import './styles/theme.css'; // Design System V1 (Claude Design)
import './styles/pixel.css'; // phiên bản giao diện pixel (chỉ có tác dụng với html.pixel)
import { initPixel } from './render/pixel.js';
initPixel();
import { G } from './core/state.js';
import { log } from './core/events.js';
import { esc } from './core/utils.js';
import { CFG } from './config/constants.js';
import { saveGame, migrate } from './core/save.js';
import { createCharacter } from './systems/character.js';
import { calcStats } from './systems/stats.js';
import { enterMap } from './systems/world.js';
import { update } from './systems/game.js';
import { resize } from './render/iso.js';
import { initRenderer, render } from './render/renderer.js';
import { initHud, showHud, updateHud } from './ui/hud.js';
import { initJuice } from './render/juice.js';
import { initParticles } from './render/particles.js';
import { initAudio } from './audio/audio.js';
import { initMinimap, drawMinimap, drawBigMap } from './ui/minimap.js';
import { initInput } from './ui/input.js';
import { initStartScreen, setPlayStatus } from './ui/startScreen.js';
import { startRemote, reclaim, REMOTE } from './net/remote.js';
import { viewTick } from './net/sync.js';
import { isRemote, act } from './net/actions.js';
import { openPanel } from './ui/panels/index.js';
import { UI } from './ui/dom.js';
import { initQuests, ensureDaily, canCheckin } from './systems/quests.js';
import { initFashion, checkUnlocks } from './systems/fashion.js';
import { initPets } from './systems/pets.js';
import { initSkills, castSkillId, learnSkill } from './systems/skills.js';
import { computeOffline, markSeen } from './systems/offline.js';
import { initEvents, leaveEvent } from './systems/events.js';
import { on, EV } from './core/events.js';
import { setArt } from './render/art/index.js';
import { applyUiIcons } from './ui/icons.js';
import { PANELS, renderPanel, initTradeUi } from './ui/panels/index.js';
import { registerActions } from './ui/input.js';
import { initNet, autoConnect, netTick, NET } from './net/client.js';
import { initOnlinePanels, netActions } from './ui/panels/online.js';
import { ACC, initAccount, loggedIn, pushSave, cloudTick, flushCloud, setConflictHandler, logSync } from './net/account.js';
import { initPwa } from './pwa.js';
import { claimMail } from './ui/panels/market.js';
import { initTutorial, tutorialTick } from './ui/tutorial.js';

const canvas = document.getElementById('cv');
resize(canvas);
addEventListener('resize', () => resize(canvas));
initRenderer(canvas);
initHud();
initJuice();
initParticles();
initMinimap();
initAudio();
initInput(canvas);
initQuests();
initFashion();
initPets();
initSkills();
initEvents();
on(EV.EVENT_END, (res) => { if (!res) return; UI.evResult = res; openPanel('evresult'); });
on(EV.TOWER_END, (res) => { if (!res) return; UI.towerResult = res; openPanel('towerres'); });
registerActions({ leaveEvent: () => act('leaveEvent'), ...netActions });
initPwa();
initNet();
initAccount();
initOnlinePanels();
initTutorial();
initTradeUi();
setConflictHandler(() => { if (G.S && UI.panel !== 'cloud') openPanel('cloud'); });
UI.loadSave = (raw) => startGame(migrate(raw), { checkOffline: false });
on(EV.NET, () => {
  if (UI.panel === 'set' || UI.panel === 'rank') renderPanel();
  else if (UI.panel === 'chat' && !document.getElementById('chatin')) renderPanel();
});

/** Mở bảng chào mừng: thưởng offline trước, sau đó nhắc điểm danh */
function showWelcome(offline) {
  if (offline) { UI.offline = offline; if (!isRemote()) G.pendingOffline = offline; openPanel('offline'); }
  else if (canCheckin()) { UI.qtab = 'checkin'; openPanel('quest'); }
}

function startGame(S, { checkOffline = false } = {}) {
  G.S = S;
  G.R = null;
  setArt(S.art || CFG.ART_STYLE);
  calcStats();
  ensureDaily();
  checkUnlocks(true);
  const offline = checkOffline ? computeOffline(Date.now() - (S.lastSeen || Date.now())) : null;
  showHud();
  applyUiIcons();
  enterMap(S.map || 0);
  G.R.saveOk = saveGame();
  updateHud();
  showWelcome(offline);
  autoConnect();
}

// ---------------- CHƠI BẰNG TÀI KHOẢN (máy chủ chạy game) ----------------
let remoteStarted = false;
function netOverlay(st) {
  const el = document.getElementById('netwait');
  if (!REMOTE.ready) { // chưa vào game: báo ở màn hình bắt đầu
    if (st.status === 'connecting') setPlayStatus('⏳ Đang kết nối máy chủ…');
    else if (st.status === 'error') setPlayStatus((st.error && st.error.message) || 'Không vào được game.', true);
    return;
  }
  const show = st.status === 'reconnecting' || st.status === 'connecting' || st.status === 'kicked' || st.status === 'error';
  el.classList.toggle('hidden', !show);
  if (!show) return;
  el.innerHTML = '<div class="nwcard">' + (st.status === 'kicked'
    ? '<b>⚠ ' + esc(REMOTE.kicked || 'Bị ngắt kết nối') + '</b><p>Mỗi tài khoản chỉ chơi được trên 1 thiết bị cùng lúc.</p><button class="btn green" data-act="reclaim">Chơi tiếp trên máy này</button>'
    : st.status === 'error' ? '<b>⚠ ' + esc((st.error && st.error.message) || 'Lỗi máy chủ') + '</b><button class="btn" data-act="reload">Tải lại</button>'
    : '<b>📡 Mất kết nối máy chủ</b><p>Đang kết nối lại… Nhân vật vẫn an toàn trên máy chủ.</p><div class="spin"></div>') + '</div>';
}
registerActions({ reclaim: () => reclaim(), reload: () => location.reload() });
function playRemote(create) {
  if (remoteStarted) return;
  remoteStarted = true;
  startRemote(create, {
    onStatus: (st) => { netOverlay(st); if (st.status === 'error' && !REMOTE.ready) remoteStarted = false; },
    onReady: (m) => {
      const S = G.S;
      setArt(S.art || CFG.ART_STYLE);
      showHud();
      applyUiIcons();
      updateHud();
      if (create) {
        log('Chào mừng <b>' + esc(S.name) + '</b>! Chạm mặt đất để đi, chạm quái để đánh.', '#f3d58a');
        log('Bật <b>AUTO</b> để tự động cày. Nhớ cộng điểm ở <b>Nhân vật</b>!', '#f3d58a');
      } else log('Chào mừng trở lại, <b>' + esc(S.name) + '</b>!', '#f3d58a');
      log('🛡 Đang chơi trên máy chủ — tiến độ được máy chủ lưu tự động.', '#8fd0ff');
      showWelcome(m.offline);
    },
  });
}

{ const nj = document.getElementById('nojs'); if (nj) nj.remove(); } // JS chạy được → ẩn hướng dẫn dự phòng
initStartScreen({
  onCreate(cls, name, gender) {
    const S = createCharacter(cls, name, gender);
    S.tut = 0; // nhân vật mới → bật hướng dẫn tân thủ
    startGame(S);
    log('Chào mừng <b>' + esc(name) + '</b>! Chạm mặt đất để đi, chạm quái để đánh.', '#f3d58a');
    log('Bật <b>AUTO</b> để tự động cày. Nhớ cộng điểm ở <b>Nhân vật</b>!', '#f3d58a');
  },
  onContinue(raw) {
    startGame(migrate(raw), { checkOffline: true });
    log('Chào mừng trở lại, <b>' + esc(G.S.name) + '</b>!', '#f3d58a');
  },
  onPlay: (create) => playRemote(create),
});

document.addEventListener('visibilitychange', () => {
  if (!G.S || isRemote()) return; // chế độ máy chủ: máy chủ tự lưu & tính thưởng vắng mặt
  if (document.hidden) { if (!UI.noSave) { saveGame(); flushCloud(); } return; }
  // Quay lại sau khi rời tab/ứng dụng: tính thưởng offline
  const res = computeOffline(Date.now() - G.S.lastSeen);
  markSeen();
  if (res && G.R && !UI.panel) showWelcome(res);
});
addEventListener('beforeunload', () => { if (UI.noSave || isRemote()) return; saveGame(); flushCloud(); });

// Vòng lặp chính
let last = performance.now(), hudT = 0, panelT = 0;
let bmT = 0;
function loop(t) {
  const dt = Math.min(CFG.MAX_DT, (t - last) / 1000);
  last = t;
  if (G.R && G.S) {
    if (G.R.remote) viewTick(G.R, dt); else update(dt); // chế độ máy chủ: chỉ nội suy hình ảnh, không tính luật chơi
    netTick(dt);
    cloudTick(dt);
    tutorialTick(dt);
    render();
    drawMinimap(G.R.t);
    if (UI.panel === 'bigmap' && (bmT -= dt) <= 0) { bmT = 0.15; drawBigMap(G.R.t); }
    if ((hudT -= dt) <= 0) { hudT = 0.1; updateHud(); }
    // Bảng có đếm ngược (vd. Sự kiện) được vẽ lại mỗi giây
    if ((panelT -= dt) <= 0) { panelT = 1; if (UI.panel && PANELS[UI.panel].live) renderPanel(); }
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Cho phép kiểm thử/gỡ lỗi từ console
window.__game = G;
window.__net = NET;
window.__acc = ACC;
window.__skills = { castSkillId, learnSkill }; // hỗ trợ kiểm thử
