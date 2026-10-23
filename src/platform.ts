import { getCurrentWindow } from '@tauri-apps/api/window';
import type Phaser from 'phaser';

export const isDesktop = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

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
