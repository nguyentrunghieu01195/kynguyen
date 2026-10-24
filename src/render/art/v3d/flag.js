// Công tắc đồ hoạ 3D — MẶC ĐỊNH BẬT (tự lùi về bản vẽ 2D khi máy không có WebGL / mô hình chưa tải xong).
// Tắt: thêm ?gfx3d=0 vào địa chỉ (được ghi nhớ); bật lại: ?gfx3d=1.
let on = null;
export const gfx3d = () => {
  if (on === null) {
    try {
      const q = new URLSearchParams(location.search).get('gfx3d');
      if (q !== null) localStorage.setItem('kng_gfx3d', q === '0' ? '0' : '1');
      on = localStorage.getItem('kng_gfx3d') !== '0';
    } catch (e) { on = typeof document !== 'undefined'; }
  }
  return on;
};
export const setGfx3d = (v) => { on = !!v; try { localStorage.setItem('kng_gfx3d', on ? '1' : '0'); } catch (e) { /* bỏ qua */ } };
