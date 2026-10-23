import { AUD, setVolume, play } from '../../audio/audio.js';
import { FXP, setFxPref } from '../../render/juice.js';
import { G } from '../../core/state.js';
import { log } from '../../core/events.js';
import { PROGRESSION } from '../../config/balance.js';
import { saveGame, exportCode, importCode, deleteSave } from '../../core/save.js';
import { enterMap } from '../../systems/world.js';
import { ART_PACKS, art, setArt } from '../../render/art/index.js';
import { btn } from '../components.js';
import { applyUiIcons } from '../icons.js';
import { NET, connect, disconnect, setAuto, defaultUrl } from '../../net/client.js';
import { UI, $ } from '../dom.js';
import { ACC, loggedIn, pushSave, logout, changePassword, statusText, logSync, deleteCloudSave } from '../../net/account.js';
import { esc } from '../../core/utils.js';
import { act, isRemote } from '../../net/actions.js';
import { requestWipe } from '../../net/remote.js';

export default {
  id: 'set',
  title: '⚙️ Cài đặt',
  render() {
    const S = G.S, ok = G.R.saveOk !== false;
    return (
      '<h4>Tài khoản</h4><div class="tip">' + (loggedIn() ? '👤 <b>' + esc(ACC.user) + '</b><br>' + statusText() : statusText() + '<br>Đăng nhập hoặc đăng ký ở màn hình bắt đầu để lưu nhân vật lên máy chủ.') + '</div><div class="row" style="flex-wrap:wrap">' +
      (loggedIn() ? (isRemote() ? '' : btn('Lưu lên máy chủ ngay', 'cloudSave', {}, { cls: 'sm green' })) + btn('Đổi mật khẩu', 'pwToggle', {}, { cls: 'sm' }) + btn('Đăng xuất', 'cloudLogout', {}, { cls: 'sm red' }) +
        (ACC.status === 'expired' ? btn('Đăng nhập lại', 'toStart', {}, { cls: 'sm' }) : '') + (ACC.status === 'conflict' ? btn('Xử lý xung đột', 'openCloud', {}, { cls: 'sm' }) : '')
        : btn('Đăng nhập / Đăng ký', 'toStart', {}, { cls: 'sm green' })) + '</div>' +
      (loggedIn() && UI.pwOpen ? '<div style="display:flex;flex-direction:column;gap:6px;margin-top:6px"><input id="pwold" type="password" placeholder="Mật khẩu hiện tại" autocomplete="current-password"><input id="pwnew" type="password" placeholder="Mật khẩu mới (ít nhất 6 ký tự)" autocomplete="new-password">' +
        '<div>' + btn('Đổi mật khẩu', 'pwChange', {}, { cls: 'sm green' }) + '</div><div class="muted" id="pwmsg">' + esc(UI.pwMsg || '') + '</div></div>' : '') +
      '<h4>Trực tuyến</h4><div class="tip">' +
      (NET.status === 'online' ? '🟢 Đã kết nối · ' + NET.online + ' người trực tuyến · Tên: <b>' + NET.name + '</b>' : NET.status === 'connecting' ? '🟡 Đang kết nối…' : '⚪ Ngoại tuyến (vẫn chơi được bình thường)') +
      (isRemote() ? '' : '<div class="row" style="margin-top:8px;flex-wrap:nowrap"><input id="neturl" placeholder="ws://địa-chỉ-máy-chủ/ws" value="' + (NET.prefs.url || defaultUrl()) + '" style="flex:1">' +
      (NET.status === 'off' ? btn('Kết nối', 'netConnectUrl', {}, { cls: 'sm green' }) : btn('Ngắt', 'netDisconnect', {}, { cls: 'sm red' })) + '</div>' +
      '<label class="row" style="margin-top:6px"><input type="checkbox" data-act="netAuto" ' + (NET.prefs.auto ? 'checked' : '') + '> Tự kết nối khi vào game</label>') + '</div>' +
      '<h4>Tốc độ EXP của server</h4><div class="row">' +
      PROGRESSION.expRates.map((v) => btn('x' + v, 'expRate', { v }, { cls: 'sm ' + (S.expRate === v ? 'green' : ''), disabled: G.online && v > PROGRESSION.onlineMaxExpRate })).join('') + '</div>' +
      '<p class="muted" style="margin-top:4px">' + (G.online ? '🔒 Đang chơi trực tuyến: EXP tối đa x' + PROGRESSION.onlineMaxExpRate + ', tắt chế độ thử sự kiện (công bằng cho mọi người).' : 'x3 là mặc định. Chọn x50 để thử nhanh các bản đồ cao, Reset… (chỉ khi chơi ngoại tuyến)') + '</p>' +
      '<h4>Âm thanh</h4>' + ['sfx', 'music'].map((k) => '<div class="row" style="margin-bottom:4px"><span style="width:84px">' + (k === 'sfx' ? '🔊 Hiệu ứng' : '🎵 Nhạc nền') + '</span>' +
        [0, 0.25, 0.5, 0.75, 1].map((v) => btn(v ? Math.round(v * 100) + '%' : 'Tắt', 'vol', { k, v }, { cls: 'sm ' + (Math.abs(AUD[k] - v) < 0.13 ? 'green' : '') })).join('') + '</div>').join('') +
      '<h4>Hiệu ứng màn hình</h4><div class="row">' + btn('Rung màn hình: ' + (FXP.shake ? 'BẬT' : 'TẮT'), 'fxPref', { k: 'shake' }, { cls: 'sm ' + (FXP.shake ? 'green' : '') }) +
        btn('Thời tiết: ' + (FXP.weather ? 'BẬT' : 'TẮT'), 'fxPref', { k: 'weather' }, { cls: 'sm ' + (FXP.weather ? 'green' : '') }) +
        btn('Sáng hơn (ngoài trời): ' + (FXP.outdoor ? 'BẬT' : 'TẮT'), 'fxPref', { k: 'outdoor' }, { cls: 'sm ' + (FXP.outdoor ? 'green' : '') }) + '</div>' +
      '<h4>Đồ hoạ</h4><div class="row">' +
      Object.values(ART_PACKS).map((a) => btn(a.name, 'artStyle', { v: a.id }, { cls: 'sm ' + (art().id === a.id ? 'green' : '') })).join('') + '</div>' +
      '<h4>Sự kiện</h4><label class="row"><input type="checkbox" data-act="eventTest" ' + (S.eventTest ? 'checked' : '') + (G.online ? ' disabled' : '') + '> Chế độ thử: vào sự kiện bất cứ lúc nào (không cần chờ giờ mở cổng)</label>' +
      '<h4>Lưu trữ</h4><div class="tip">' +
      (ok ? 'Tiến độ được tự động lưu trên trình duyệt này mỗi 15 giây.' : '⚠ Trình duyệt này không cho lưu tự động. Hãy dùng <b>Xuất mã lưu</b> để giữ tiến độ, hoặc tải file về mở bằng Chrome/Safari.') + '</div>' +
      '<div class="row">' + btn('Lưu ngay', 'saveNow', {}, { cls: 'sm' }) + btn('Xuất mã lưu', 'export', {}, { cls: 'sm' }) + '</div>' +
      (UI.exportCode ? '<textarea readonly id="expcode" style="margin-top:6px">' + UI.exportCode + '</textarea>' + btn('Sao chép', 'copy', {}, { cls: 'sm' }) : '') +
      '<h4>Nhập mã lưu</h4><textarea id="impcode" placeholder="Dán mã lưu vào đây"></textarea><div style="margin-top:4px">' + btn('Nhập', 'import', {}, { cls: 'sm' }) + '</div>' +
      '<h4>Phím tắt (PC)</h4><div class="muted">Chuột trái: di chuyển/tấn công · 1–4 (hoặc Space): kỹ năng ô 1–4 · A: Auto · Q/W: bình máu/mana · K: kỹ năng · N: bản đồ khu vực · C: nhân vật · I: túi đồ · U: ép đồ · M: bản đồ · Esc: đóng</div>' +
      '<h4>Hướng dẫn</h4>' + btn('Xem lại hướng dẫn tân thủ', 'tutRestart', {}, { cls: 'sm' }) +
      '<h4>Nhân vật</h4>' + btn(UI.wipeConfirm ? 'Bấm lần nữa để XÓA và tạo nhân vật mới' : 'Xóa nhân vật, chơi lại từ đầu', 'wipe', {}, { cls: 'sm red' })
    );
  },
  actions: {
    expRate: (d) => act('setPref', 'expRate', +d.v),
    vol: (d) => { setVolume(d.k, +d.v); if (d.k === 'sfx') play('zen'); },
    fxPref: (d) => { setFxPref(d.k, !FXP[d.k]); document.documentElement.classList.toggle('outdoor', !!FXP.outdoor); },
    artStyle: (d) => { setArt(d.v); applyUiIcons(); return act('setPref', 'art', d.v); },
    eventTest: () => act('setPref', 'eventTest', !G.S.eventTest),
    netConnectUrl: () => { connect($('neturl').value.trim()); },
    netDisconnect: () => disconnect(),
    netAuto: () => setAuto(!NET.prefs.auto),
    saveNow: () => {
      if (isRemote()) { log('☁️ Nhân vật được máy chủ lưu tự động.', '#8f8'); return; } G.R.saveOk = saveGame(); log(G.R.saveOk ? 'Đã lưu tiến độ.' : 'Không lưu được trên trình duyệt này — hãy dùng Xuất mã lưu.', G.R.saveOk ? '#8f8' : '#f88'); },
    export: () => (UI.exportCode = exportCode(G.S)),
    copy: () => { $('expcode').select(); try { navigator.clipboard.writeText(UI.exportCode); log('Đã sao chép mã lưu.', '#8f8'); } catch (e) { document.execCommand('copy'); } },
    import: () => {
      if (isRemote()) { log('Chơi bằng tài khoản thì không nhập mã lưu được (máy chủ giữ nhân vật).', '#f88'); return; }
      try { G.S = importCode($('impcode').value); enterMap(G.S.map); G.R.saveOk = saveGame(); log('Đã nhập mã lưu thành công!', '#8f8'); return { close: true }; }
      catch (e) { log('Mã lưu không hợp lệ.', '#f66'); }
    },
    wipe: async () => {
      if (!UI.wipeConfirm) { UI.wipeConfirm = true; return; }
      if (isRemote()) { UI.noSave = true; requestWipe(() => { deleteSave(); location.reload(); }); return; }
      if (loggedIn()) { try { await deleteCloudSave(); } catch (e) { log('⚠ Không xoá được nhân vật trên máy chủ: ' + esc(e.message || ''), '#f88'); return; } }
      UI.noSave = true; deleteSave(); location.reload();
    },
    cloudSave: async () => { if (isRemote()) { log('☁️ Nhân vật được máy chủ lưu tự động.', '#8f8'); return; } logSync(await pushSave()); },
    cloudLogout: async () => { await logout(); UI.noSave = true; location.reload(); },
    toStart: () => { saveGame(); UI.noSave = true; location.reload(); },
    openCloud: () => ({ open: 'cloud' }),
    pwToggle: () => { UI.pwOpen = !UI.pwOpen; UI.pwMsg = ''; },
    pwChange: async () => {
      try { await changePassword($('pwold').value, $('pwnew').value); UI.pwMsg = '✔ Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất.'; UI.pwOpen = false; log(UI.pwMsg, '#8f8'); }
      catch (e) { UI.pwMsg = '⚠ ' + (e.message || 'Không đổi được'); }
    },
  },
};
