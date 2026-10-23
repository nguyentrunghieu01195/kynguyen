export const $ = (id) => document.getElementById(id);

/** Trạng thái riêng của giao diện (không lưu vào save) */
export const UI = {
  panel: null,     // id bảng đang mở
  sel: null,       // id vật phẩm đang chọn trong Túi đồ
  up: null,        // id vật phẩm đang chọn để ép
  upMsg: '',
  craftMsg: '',
  useCharm: true,
  exportCode: '',
  wipeConfirm: false,
};
