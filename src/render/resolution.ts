import type Phaser from 'phaser';
import { CELL, DESKTOP_GRID } from '../config';

/** Masaüstü yerleşim boyutu ve oyun dünyasının (arena) boyutu. */
export const LOGICAL_W = DESKTOP_GRID.w * CELL;
export const LOGICAL_H = DESKTOP_GRID.h * CELL;

const hasWindow = typeof window !== 'undefined';

/** Yatay tutulan telefon: kısa kenarı küçük dokunmatik ekran (tabletler hariç). Açılışta belirlenir. */
export const PHONE_LAYOUT =
  hasWindow &&
  ((import.meta.env?.DEV && new URLSearchParams(window.location.search).has('phone')) ||
    (window.matchMedia('(pointer: coarse)').matches && Math.min(window.innerWidth, window.innerHeight) < 500));

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

/** Çentik payları düşüldükten sonra tuvale kalan alan (CSS px, yatay). */
function screenBox() {
  const css = getComputedStyle(document.body);
  const pad = (side: string) => parseFloat(css.getPropertyValue(`padding-${side}`)) || 0;
  const w = window.innerWidth - pad('left') - pad('right');
  const h = window.innerHeight - pad('top') - pad('bottom');
  return { w: Math.max(w, h), h: Math.min(w, h) };
}

/** Telefonda tuval kalan alanın oranında açılır (siyah bant kalmaz); masaüstünde 16:10. */
export const CANVAS = (() => {
  const height = LOGICAL_H * RES;
  if (!PHONE_LAYOUT) return { width: LOGICAL_W * RES, height };
  const box = screenBox();
  return { width: Math.round(height * Math.min(2.4, Math.max(LOGICAL_W / LOGICAL_H, box.w / box.h))), height };
})();

/** Telefon arenasının satır sayısı; kareler ekranda ~32 pt olur. */
const PHONE_ROWS = 11;

/**
 * Telefonda masaüstü arenası ekrana ancak çok küçük karelerle sığıyor; satır sayısı sabit tutulur,
 * sütunlar ekranın genişliğine göre seçilir.
 */
export function phoneGrid(hudBand: number) {
  const box = screenBox();
  const band = (hudBand * UI_SCALE * box.h) / LOGICAL_H;
  const cell = (box.h - band) / PHONE_ROWS;
  return { w: Math.max(16, Math.min(DESKTOP_GRID.w, Math.floor(box.w / cell))), h: PHONE_ROWS };
}

/** Masaüstünde kare ekranda yaklaşık bu kadar CSS px; büyük ekran arenaya satır ekler. */
const DESKTOP_CELL_CSS = 60;
const DESKTOP_MAX_ROWS = 20;

/**
 * Büyük ekranda 24×15 arena sadece büyür, kafile ve düşmanlar yine aynı alana sıkışır.
 * Ekran izin verdikçe satır eklenir, en-boy 16:10 kalır.
 */
export function desktopGrid() {
  // Geliştirmede küçük pencerede denemek için: ?rows=20
  const forced = import.meta.env?.DEV ? Number(new URLSearchParams(window.location.search).get('rows')) : 0;
  const fit = Math.min(window.innerWidth / LOGICAL_W, window.innerHeight / LOGICAL_H);
  const rows = forced || Math.floor((LOGICAL_H * fit) / DESKTOP_CELL_CSS);
  const h = Math.min(DESKTOP_MAX_ROWS, Math.max(DESKTOP_GRID.h, rows));
  return { w: Math.round((h * DESKTOP_GRID.w) / DESKTOP_GRID.h), h };
}

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
