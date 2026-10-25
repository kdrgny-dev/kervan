import { getCurrentWindow } from '@tauri-apps/api/window';
import type Phaser from 'phaser';

export const isDesktop = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
export const isTouch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

/** Yatay tutulan telefon: kısa kenarı küçük dokunmatik ekran (tabletler hariç). */
export const isPhone = () => isTouch && Math.min(window.innerWidth, window.innerHeight) < 500;

/** Dokunmatik ekranda bir hedefin en az 44 pt olması için gereken oyun pikseli. */
export const minTouchPx = (scale: Phaser.Scale.ScaleManager) => (isTouch ? 44 / (scale.displaySize.width / scale.width) : 0);

export async function quitApp() {
  if (isDesktop) await getCurrentWindow().close();
}

export async function isFullscreen(scale: Phaser.Scale.ScaleManager) {
  return isDesktop ? getCurrentWindow().isFullscreen() : scale.isFullscreen;
}

// Masaüstünde tarayıcı Fullscreen API'si yerine pencerenin kendisi tam ekran olur
export async function toggleFullscreen(scale: Phaser.Scale.ScaleManager) {
  if (!isDesktop) return scale.toggleFullscreen();
  const win = getCurrentWindow();
  await win.setFullscreen(!(await win.isFullscreen()));
}
