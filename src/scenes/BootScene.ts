import Phaser from 'phaser';
import { makeFxTextures } from '../render/fx';
import { createAnims, preloadSprites } from '../render/sprites';
import { LOGO, loadFonts, preloadUi, SLICES, UI_RASTER } from '../ui/assets';
import { Bar } from '../ui/kit';
import { sharpen, view } from '../render/resolution';

/** Logo, çubuk ve fontları yükler; asıl yükleme ekranı bunlarla çizilir. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    sharpen(this.cameras.main);
    this.load.svg(LOGO, 'assets/ui/brand/logo_kervan.svg', { width: 1024, height: 512 });
    for (const key of ['ui.bar_frame', 'ui.bar_fill_xp'] as const) {
      const sl = SLICES[key];
      this.load.svg(key, `assets/ui/components/${key.replace('ui.', 'ui_')}.svg`, { width: sl.w * UI_RASTER, height: sl.h * UI_RASTER });
    }
  }

  async create() {
    await loadFonts();
    this.scene.start('preload');
  }
}

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('preload');
  }

  preload() {
    sharpen(this.cameras.main);
    const { width, height } = view(this);
    this.cameras.main.setBackgroundColor('#14121c');
    const logo = this.add.image(width / 2, height / 2 - 40, LOGO).setDisplaySize(520, 260);
    const base = logo.scale;
    logo.setAlpha(0).y -= 24;
    this.tweens.add({ targets: logo, y: logo.y + 24, alpha: 1, duration: 420, ease: 'Back.Out' });
    this.tweens.add({ targets: logo, scale: base * 1.02, duration: 1600, ease: 'Sine.InOut', yoyo: true, repeat: -1 });

    const bar = new Bar(this, width / 2, height / 2 + 140, 360, 'xp').setRatio(0, false);
    this.load.on('progress', (p: number) => bar.setRatio(p));

    preloadSprites(this);
    preloadUi(this);
  }

  create() {
    makeFxTextures(this);
    createAnims(this);
    this.time.delayedCall(250, () => this.scene.start('menu'));
  }
}
