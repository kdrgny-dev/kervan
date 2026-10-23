import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { textStyle, UI } from './theme';

export interface ButtonOptions {
  width?: number;
  height?: number;
  variant?: 'primary' | 'secondary';
  fontSize?: number;
}

export class Button extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private enabled = true;
  private readonly fill: number;
  private readonly hover: number;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, onClick: () => void, opts: ButtonOptions = {}) {
    super(scene, x, y);
    const { width = 260, height = 56, variant = 'secondary', fontSize = 22 } = opts;
    this.fill = variant === 'primary' ? UI.primary : UI.secondary;
    this.hover = variant === 'primary' ? UI.primaryHover : UI.secondaryHover;

    this.bg = scene.add.rectangle(0, 0, width, height, this.fill).setStrokeStyle(3, UI.bg).setInteractive({ useHandCursor: true });
    this.label = scene.add
      .text(0, 0, text, textStyle(fontSize, { color: variant === 'primary' ? '#14121c' : UI.text, fontStyle: 'bold' }))
      .setOrigin(0.5);
    this.add([this.bg, this.label]);

    this.bg.on('pointerover', () => this.enabled && this.bg.setFillStyle(this.hover));
    this.bg.on('pointerout', () => {
      this.bg.setFillStyle(this.fill);
      this.setScale(1);
    });
    this.bg.on('pointerdown', () => this.enabled && this.setScale(0.97));
    this.bg.on('pointerup', () => {
      this.setScale(1);
      if (!this.enabled) return;
      audio.play('click');
      onClick();
    });

    scene.add.existing(this);
  }

  setLabel(text: string) {
    this.label.setText(text);
    return this;
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    this.setAlpha(on ? 1 : 0.45);
    return this;
  }
}
