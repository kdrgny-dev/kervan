import type Phaser from 'phaser';
import { CELL, GRID_H, GRID_W } from '../config';

/** Sahnelerin yerleşim koordinatları (mantıksal piksel). */
export const LOGICAL_W = GRID_W * CELL;
export const LOGICAL_H = GRID_H * CELL;

/**
 * Tuvalin mantıksal boyuta oranı. Tuval ekranın gerçek piksel yoğunluğunda açılır, sahneler
 * kamerayla bu kadar büyütülür; yoksa tarayıcı küçük tuvali esnetir ve her şey bulanık görünür.
 */
export const RES = (() => {
  if (typeof window === 'undefined') return 1;
  // Geliştirmede piksel yoğunluğu düşük ekranda denemek için: ?res=2
  const forced = import.meta.env?.DEV ? Number(new URLSearchParams(window.location.search).get('res')) : 0;
  if (forced) return forced;
  const fit = Math.min(window.innerWidth / LOGICAL_W, window.innerHeight / LOGICAL_H);
  return Math.min(2.5, Math.max(1, Math.ceil(fit * (window.devicePixelRatio || 1) * 2) / 2));
})();

/** Yüksek çözünürlükte çizimler de daha büyük rasterleştirilir. */
export const RASTER = RES >= 2 ? 3 : 2;

/** Sahnenin mantıksal boyutu (telefonda oyun sahnesi daha geniş olabilir). */
export const view = (scene: Phaser.Scene) => ({ width: scene.scale.width / RES, height: scene.scale.height / RES });

/** Bir mantıksal pikselin ekrandaki CSS piksel karşılığı. */
export const cssPerUnit = (scene: Phaser.Scene) => scene.scale.displaySize.width / view(scene).width;

/** Kamerayı mantıksal koordinatlara oturtur: tüm sahne RES kat büyük çizilir. */
export function sharpen(cam: Phaser.Cameras.Scene2D.Camera, extraZoom = 1) {
  cam.setZoom(RES * extraZoom);
  cam.centerOn(cam.width / RES / 2, cam.height / RES / 2);
  return cam;
}
