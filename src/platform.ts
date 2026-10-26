import { getCurrentWindow } from '@tauri-apps/api/window';
import type Phaser from 'phaser';
import { cssPerUnit } from './render/resolution';

export const isDesktop = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
export const isTouch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

/** Dokunmatik ekranda bir hedefin en az 44 pt olması için gereken oyun pikseli. */
export const minTouchPx = (scene: Phaser.Scene) => (isTouch ? 44 / cssPerUnit(scene) : 0);

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
