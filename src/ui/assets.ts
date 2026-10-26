import type Phaser from 'phaser';
import { RASTER } from '../render/resolution';
import type { HeroKind } from '../data/heroes';

/** 9-slice kenar payları, docs/design/stage4/components.json'dan (1x px). */
export interface Slice {
  w: number;
  h: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const s = (w: number, h: number, left: number, right: number, top: number, bottom: number): Slice => ({ w, h, left, right, top, bottom });

const BUTTON = s(240, 72, 22, 22, 20, 26);
const CARD = s(200, 280, 34, 34, 34, 34);
const FILL = s(312, 24, 12, 12, 0, 0);

export const SLICES = {
  'ui.button_primary': BUTTON,
  'ui.button_primary_hover': BUTTON,
  'ui.button_primary_pressed': BUTTON,
  'ui.button_secondary': BUTTON,
  'ui.button_secondary_hover': BUTTON,
  'ui.button_secondary_pressed': BUTTON,
  'ui.button_disabled': BUTTON,
  'ui.panel': s(256, 256, 32, 32, 32, 32),
  'ui.panel_header': s(320, 72, 56, 56, 0, 0),
  'ui.banner': s(640, 128, 60, 60, 0, 0),
  'ui.banner_danger': s(640, 128, 60, 60, 0, 0),
  'ui.card': CARD,
  'ui.card_selected': CARD,
  'ui.card_locked': CARD,
  'ui.tab_active': s(200, 56, 20, 20, 20, 0),
  'ui.tab_idle': s(200, 56, 20, 20, 24, 4),
  'ui.bar_frame': s(320, 32, 16, 16, 0, 0),
  'ui.bar_fill_hp': FILL,
  'ui.bar_fill_xp': FILL,
  'ui.bar_fill_boss': FILL,
} satisfies Record<string, Slice>;

export type SliceKey = keyof typeof SLICES;

export const ICONS = [
  'back', 'coin', 'exit', 'fullscreen', 'gem', 'heart', 'lock', 'music',
  'pause', 'range', 'settings', 'shop', 'sound', 'sword', 'trophy',
] as const;
export type IconName = (typeof ICONS)[number];
export const icon = (name: IconName) => `icon.${name}`;

/** Ayrı portresi olmayan kahramanlar karakter çizimini kullanır. */
const SPRITE_PORTRAIT: HeroKind[] = ['fatih'];
export const portrait = (kind: HeroKind) => (SPRITE_PORTRAIT.includes(kind) ? `${kind}.idle` : `portrait.${kind}`);
export const LOGO = 'brand.logo';
export const TOGGLE = { on: 'ui.toggle_on', off: 'ui.toggle_off' };

/** Bileşenler 2x rasterleştirilir; NineSlice bunu bilip yarı ölçekle çizer. */
export const UI_RASTER = RASTER;

export function preloadUi(scene: Phaser.Scene) {
  for (const [key, sl] of Object.entries(SLICES)) {
    const file = key.replace('ui.', 'ui_');
    if (scene.textures.exists(key)) continue;
    scene.load.svg(key, `assets/ui/components/${file}.svg`, { width: sl.w * UI_RASTER, height: sl.h * UI_RASTER });
  }
  for (const t of ['toggle_on', 'toggle_off']) {
    scene.load.svg(`ui.${t}`, `assets/ui/components/ui_${t}.svg`, { width: 96 * UI_RASTER, height: 48 * UI_RASTER });
  }
  for (const name of ICONS) scene.load.svg(icon(name), `assets/ui/icons/icon_${name}.svg`, { width: 128, height: 128 });
  for (const kind of ['knight', 'archer', 'mage', 'priest', 'rogue'] as const) {
    scene.load.svg(portrait(kind), `assets/ui/portraits/portrait_${kind}.svg`, { width: 256, height: 256 });
  }
  if (!scene.textures.exists(LOGO)) scene.load.svg(LOGO, 'assets/ui/brand/logo_kervan.svg', { width: 1024, height: 512 });
}

const FONTS = [
  { family: 'Grandstander', file: 'assets/ui/fonts/Grandstander.ttf', weight: '100 900' },
  { family: 'Nunito', file: 'assets/ui/fonts/Nunito.ttf', weight: '200 1000' },
];

/** Fontlar yüklenmeden metin çizilirse Phaser yedek fontla önbelleğe alır; o yüzden menüden önce beklenir. */
export async function loadFonts(timeoutMs = 4000) {
  if (typeof FontFace === 'undefined') return;
  const load = Promise.all(
    FONTS.map(async (f) => {
      const face = new FontFace(f.family, `url(${f.file})`, { weight: f.weight });
      document.fonts.add(await face.load());
    }),
  );
  await Promise.race([load, new Promise((r) => setTimeout(r, timeoutMs))]).catch(() => undefined);
}
