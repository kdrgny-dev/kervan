import Phaser from 'phaser';

const OUTLINE = 0x14121c;

export interface UnitStyle {
  color: number;
  glyph: string;
  size: number;
  shape: 'square' | 'circle';
  outline?: number;
}

export class UnitView extends Phaser.GameObjects.Container {
  private readonly shape: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Arc;
  private readonly hpBar: Phaser.GameObjects.Container;
  private readonly hpFill: Phaser.GameObjects.Rectangle;
  private flashTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, private readonly style: UnitStyle) {
    super(scene);
    const { size, color, shape } = style;
    this.shape =
      shape === 'square'
        ? scene.add.rectangle(0, 0, size, size, color)
        : scene.add.circle(0, 0, size / 2, color);
    this.shape.setStrokeStyle(3, style.outline ?? OUTLINE);

    const label = scene.add
      .text(0, 0, style.glyph, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${Math.round(size * 0.42)}px`,
        color: '#14121c',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const barW = size;
    const bg = scene.add.rectangle(-barW / 2, -size / 2 - 8, barW, 5, 0x000000, 0.6).setOrigin(0, 0.5);
    this.hpFill = scene.add.rectangle(-barW / 2, -size / 2 - 8, barW, 5, 0x6be36b).setOrigin(0, 0.5);
    this.hpBar = scene.add.container(0, 0, [bg, this.hpFill]).setVisible(false);

    this.add([this.shape, label, this.hpBar]);
    scene.add.existing(this);
  }

  setHp(ratio: number) {
    const r = Phaser.Math.Clamp(ratio, 0, 1);
    this.hpBar.setVisible(r < 1);
    this.hpFill.setScale(r, 1);
    this.hpFill.setFillStyle(r > 0.5 ? 0x6be36b : r > 0.25 ? 0xf0c23b : 0xe5533d);
  }

  setOutline(width: number, color: number) {
    this.shape.setStrokeStyle(width, color);
  }

  flash(color = 0xffffff, ms = 80) {
    this.shape.setFillStyle(color);
    this.flashTimer?.remove();
    this.flashTimer = this.scene.time.delayedCall(ms, () => this.shape.setFillStyle(this.style.color));
  }
}
