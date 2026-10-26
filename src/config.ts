/** Masaüstü arenası; arayüz yerleşimi de bu boyuta göre çizilir. */
export const DESKTOP_GRID = { w: 24, h: 15 };

export let GRID_W = DESKTOP_GRID.w;
export let GRID_H = DESKTOP_GRID.h;

/** Telefonda arena ekrana göre küçülür; açılışta, oyun kurulmadan önce bir kez çağrılır. */
export function setGrid(w: number, h: number) {
  GRID_W = w;
  GRID_H = h;
}

/** Arenanın iç alanının masaüstüne oranı; dalgalar küçük arenada seyrekleşir. */
export const arenaRatio = () => ((GRID_W - 2) * (GRID_H - 2)) / ((DESKTOP_GRID.w - 2) * (DESKTOP_GRID.h - 2));
export const CELL = 48;

export const BASE_TICK_MS = 200;
export const INPUT_BUFFER = 2;
/** Ekran (CSS) pikseli; kaydırma bu kadar ilerleyince yön sayılır. */
export const SWIPE_MIN_PX = 12;
