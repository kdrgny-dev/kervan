import Phaser from 'phaser';
import { makeFxTextures } from '../render/fx';
import { createAnims, preloadSprites } from '../render/sprites';
import { textStyle, UI } from '../ui/theme';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2 - 40, 'KERVAN', textStyle(48, { fontStyle: 'bold' })).setOrigin(0.5);
    const barW = 320;
    this.add.rectangle(width / 2, height / 2 + 20, barW, 10, UI.panelEdge);
    const fill = this.add.rectangle(width / 2 - barW / 2, height / 2 + 20, 0, 10, UI.primary).setOrigin(0, 0.5);
    this.load.on('progress', (p: number) => fill.setSize(barW * p, 10));
    preloadSprites(this);
  }

  create() {
    makeFxTextures(this);
    createAnims(this);
    this.scene.start('menu');
  }
}
