// Bảng xử lý xung đột lưu đám mây: tài khoản vừa được lưu từ thiết bị khác.
import { G } from '../../core/state.js';
import { log } from '../../core/events.js';
import { esc } from '../../core/utils.js';
import { CLASSES } from '../../config/classes.js';
import { ACC, pushSave, fetchSave } from '../../net/account.js';
import { btn } from '../components.js';
import { UI } from '../dom.js';

const fmt = (t) => (t ? new Date(t).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '?');
const who = (s) => (s ? esc(s.name) + ' · ' + (CLASSES[s.cls] ? CLASSES[s.cls].name : '') + ' cấp ' + s.lv + (s.resets ? ', Reset ' + s.resets : '') : 'không có nhân vật');

export const cloudPanel = {
  id: 'cloud',
  title: '☁️ Lưu trên máy chủ',
  render() {
    const c = ACC.conflict || {};
    return '<div class="tip">Tài khoản <b>' + esc(ACC.user || '') + '</b> vừa được lưu từ <b>thiết bị khác</b> lúc ' + fmt(c.at) + '. Anh muốn giữ bản nào?</div>' +
      '<div class="tip">☁️ Trên máy chủ: <b>' + who(c.summary) + '</b><br>📱 Trên máy này: <b>' + who(G.S) + '</b></div>' +
      '<div class="row" style="flex-wrap:wrap;gap:8px">' + btn('Dùng bản trên máy chủ', 'cloudUseServer', {}, { cls: 'green' }) + btn('Giữ bản trên máy này', 'cloudKeepLocal', {}, { cls: 'red' }) + '</div>' +
      '<p class="muted" style="margin-top:8px">“Giữ bản trên máy này” sẽ ghi đè tiến độ trên máy chủ. Nên chỉ chơi một tài khoản trên một thiết bị cùng lúc.</p>';
  },
  actions: {
    cloudUseServer: async () => {
      try {
        const j = await fetchSave();
        ACC.rev = j.rev; ACC.status = 'idle'; ACC.conflict = null;
        if (j.data && UI.loadSave) { UI.loadSave(j.data); log('☁️ Đã tải nhân vật từ máy chủ.', '#8f8'); }
        return { close: true };
      } catch (e) { log('⚠ ' + esc(e.message || 'Không tải được'), '#f88'); }
    },
    cloudKeepLocal: async () => {
      const ok = await pushSave(true);
      log(ok ? '☁️ Đã ghi đè bản lưu trên máy chủ bằng bản trên máy này.' : '⚠ Chưa lưu được, thử lại sau.', ok ? '#8f8' : '#f88');
      return { close: ok };
    },
  },
};
