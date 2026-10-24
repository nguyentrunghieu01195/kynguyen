// Công tắc đồ hoạ nhân vật 3D (mặc định tắt; bật trong Cài đặt)
let on = null;
export const gfx3d = () => { if (on === null) { try { const q = new URLSearchParams(location.search).get('gfx3d'); if (q !== null) localStorage.setItem('kng_gfx3d', q === '1' ? '1' : '0'); on = localStorage.getItem('kng_gfx3d') === '1'; } catch (e) { on = false; } } return on; };
export const setGfx3d = (v) => { on = !!v; try { localStorage.setItem('kng_gfx3d', on ? '1' : '0'); } catch (e) { /* bỏ qua */ } };
