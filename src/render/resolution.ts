import type Phaser from 'phaser';
import { CELL, GRID_H, GRID_W } from '../config';

/** Masaüstü yerleşim boyutu ve oyun dünyasının (arena) boyutu. */
export const LOGICAL_W = GRID_W * CELL;
export const LOGICAL_H = GRID_H * CELL;

const hasWindow = typeof window !== 'undefined';

/** Yatay tutulan telefon: kısa kenarı küçük dokunmatik ekran (tabletler hariç). Açılışta belirlenir. */
export const PHONE_LAYOUT =
  hasWindow && window.matchMedia('(pointer: coarse)').matches && Math.min(window.innerWidth, window.innerHeight) < 500;

/**
 * Tuvalin mantıksal boyuta oranı. Tuval ekranın gerçek piksel yoğunluğunda açılır, sahneler
 * kamerayla bu kadar büyütülür; yoksa tarayıcı küçük tuvali esnetir ve her şey bulanık görünür.
 */
export const RES = (() => {
  if (!hasWindow) return 1;
  // Geliştirmede piksel yoğunluğu düşük ekranda denemek için: ?res=2
  const forced = import.meta.env?.DEV ? Number(new URLSearchParams(window.location.search).get('res')) : 0;
  if (forced) return forced;
  const fit = Math.min(window.innerWidth / LOGICAL_W, window.innerHeight / LOGICAL_H);
  return Math.min(2.5, Math.max(1, Math.ceil(fit * (window.devicePixelRatio || 1) * 2) / 2));
})();

/** Telefonda arayüz bu kadar büyük çizilir; görünür yerleşim yüksekliği 720 yerine 600 olur. */
export const UI_SCALE = PHONE_LAYOUT ? 1.2 : 1;

/** Bir yerleşim biriminin tuval pikseli. */
export const UNIT = RES * UI_SCALE;

/** Telefonda tuval ekranın oranında açılır (yanlarda boşluk kalmaz); masaüstünde 16:10. */
export const CANVAS = (() => {
  const height = LOGICAL_H * RES;
  if (!PHONE_LAYOUT) return { width: LOGICAL_W * RES, height };
  const aspect = Math.max(window.innerWidth, window.innerHeight) / Math.min(window.innerWidth, window.innerHeight);
  return { width: Math.round(height * Math.min(2.4, Math.max(LOGICAL_W / LOGICAL_H, aspect))), height };
})();

/** Yüksek çözünürlükte çizimler de daha büyük rasterleştirilir. */
export const RASTER = UNIT >= 2 ? 3 : 2;

/** 'fit' kullanan sahnelerin yerleşim kutusu; diğerleri görünür alanın tamamını kullanır. */
const fitted = new WeakMap<Phaser.Scene, number>();

/** Sahnenin yerleşim boyutu; konumlar buna göre verilir. */
export const view = (scene: Phaser.Scene) =>
  fitted.has(scene) ? { width: LOGICAL_W, height: LOGICAL_H } : { width: scene.scale.width / UNIT, height: scene.scale.height / UNIT };

/** Kameranın gösterdiği alan, yerleşim koordinatlarında (arka planların kaplaması gereken alan). */
export function visibleArea(scene: Phaser.Scene) {
  const cam = scene.cameras.main;
  const w = cam.width / cam.zoom;
  const h = cam.height / cam.zoom;
  return { x: cam.midPoint.x - w / 2, y: cam.midPoint.y - h / 2, width: w, height: h };
}

/** Bir yerleşim biriminin ekrandaki CSS piksel karşılığı. */
export const cssPerUnit = (scene: Phaser.Scene) => (scene.scale.displaySize.width / scene.scale.width) * (fitted.get(scene) ?? UNIT);

/**
 * Kamerayı yerleşim koordinatlarına oturtur.
 * fill: görünür alanın tamamı yerleşim alanıdır, arayüz UI_SCALE kadar büyük.
 * fit: 1152×720 için tasarlanmış yoğun ekranlar; kutu ekrana sığar ve ortalanır.
 */
export function sharpen(cam: Phaser.Cameras.Scene2D.Camera, mode: 'fill' | 'fit' = 'fill') {
  if (mode === 'fit' && PHONE_LAYOUT) {
    const zoom = Math.min(cam.width / LOGICAL_W, cam.height / LOGICAL_H);
    fitted.set(cam.scene, zoom);
    cam.setZoom(zoom);
    cam.centerOn(LOGICAL_W / 2, LOGICAL_H / 2);
    return cam;
  }
  fitted.delete(cam.scene);
  cam.setZoom(UNIT);
  cam.centerOn(cam.width / UNIT / 2, cam.height / UNIT / 2);
  return cam;
}
