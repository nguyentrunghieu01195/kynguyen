// Ứng dụng web cài được (PWA): service worker + nút "Cài game vào máy".
// Chỉ hoạt động khi game mở qua http(s) (GitHub Pages, máy chủ game…), không hoạt động khi mở file trực tiếp.
let deferred = null;
const changed = () => dispatchEvent(new Event('pwa-install-change'));

export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isSafari = () => /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios|chrome|android/i.test(navigator.userAgent);

/** 'installed' | 'prompt' (Android/PC có nút cài) | 'ios' (hướng dẫn Thêm vào MH chính) | 'none' */
export function installState() {
  if (isStandalone()) return 'installed';
  if (deferred) return 'prompt';
  if (isIOS() && isSafari() && location.protocol.startsWith('http')) return 'ios';
  return 'none';
}
export async function promptInstall() {
  if (!deferred) return false;
  deferred.prompt();
  const r = await deferred.userChoice.catch(() => null);
  deferred = null; changed();
  return !!(r && r.outcome === 'accepted');
}

export function initPwa() {
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; changed(); });
  addEventListener('appinstalled', () => { deferred = null; changed(); });
  if (isStandalone()) document.documentElement.classList.add('standalone');
  if (!('serviceWorker' in navigator) || !location.protocol.startsWith('http')) return;
  addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      // Có bản mới: service worker mới tự kích hoạt, lần mở sau sẽ dùng bản mới
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        if (w) w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) dispatchEvent(new Event('pwa-update')); });
      });
    }).catch(() => { /* trình duyệt chặn → vẫn chơi bình thường */ });
  });
}
