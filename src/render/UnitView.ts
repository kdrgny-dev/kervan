import Phaser from 'phaser';
import type { SpriteSet } from './sprites';

const OUTLINE = 0x14121c;
const ATTACK_MS = 220;
const HURT_MS = 160;
const WALK_FRAME_MS = 110;

export interface UnitStyle {
  color: number;
  glyph: string;
  size: number;
  shape: 'square' | 'circle';
  outline?: number;
  sprite?: SpriteSet;
  spriteSize?: number;
}

export class UnitView extends Phaser.GameObjects.Container {
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly shape?: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Arc;
  private readonly image?: Phaser.GameObjects.Image;
  private readonly inner: Phaser.GameObjects.GameObject;
  private readonly baseScale: number;
  private readonly hpBar: Phaser.GameObjects.Container;
  private readonly hpFill: Phaser.GameObjects.Rectangle;
  private flashTimer?: Phaser.Time.TimerEvent;
  private attackUntil = 0;
  private hurtUntil = 0;

  constructor(scene: Phaser.Scene, private readonly style: UnitStyle) {
    super(scene);
    const { size, color } = style;
    const visual = style.spriteSize ?? size;
    this.shadow = scene.add.ellipse(0, visual * 0.4, visual * 0.7, visual * 0.2, 0x000000, 0.28);
    const children: Phaser.GameObjects.GameObject[] = [this.shadow];

    if (style.sprite && scene.textures.exists(style.sprite.idle)) {
      this.image = scene.add.image(0, 0, style.sprite.idle).setDisplaySize(visual, visual);
      this.inner = this.image;
      this.baseScale = this.image.scaleX;
      children.push(this.image);
    } else {
      this.shape =
        style.shape === 'square' ? scene.add.rectangle(0, 0, size, size, color) : scene.add.circle(0, 0, size / 2, color);
      this.shape.setStrokeStyle(3, style.outline ?? OUTLINE);
      this.inner = this.shape;
      this.baseScale = 1;
      const label = scene.add
        .text(0, 0, style.glyph, { fontFamily: 'system-ui, sans-serif', fontSize: `${Math.round(size * 0.42)}px`, color: '#14121c', fontStyle: 'bold' })
        .setOrigin(0.5);
      children.push(this.shape, label);
    }

    const barW = size;
    const barY = -visual / 2 - 6;
    const bg = scene.add.rectangle(-barW / 2, barY, barW, 5, 0x000000, 0.6).setOrigin(0, 0.5);
    this.hpFill = scene.add.rectangle(-barW / 2, barY, barW, 5, 0x6be36b).setOrigin(0, 0.5);
    this.hpBar = scene.add.container(0, 0, [bg, this.hpFill]).setVisible(false);
    children.push(this.hpBar);

    this.add(children);
    scene.add.existing(this);
  }

  setHp(ratio: number) {
    const r = Phaser.Math.Clamp(ratio, 0, 1);
    this.hpBar.setVisible(r < 1);
    this.hpFill.setScale(r, 1);
    this.hpFill.setFillStyle(r > 0.5 ? 0x6be36b : r > 0.25 ? 0xf0c23b : 0xe5533d);
  }

  /** Lider/kalkan işareti: şekillerde kontur, sprite'larda ayak altı halkası. */
  setMarker(color: number | null) {
    if (this.shape) this.shape.setStrokeStyle(color === null ? 3 : 4, color ?? this.style.outline ?? OUTLINE);
    if (color === null) this.shadow.setFillStyle(0x000000, 0.28).setStrokeStyle();
    else this.shadow.setFillStyle(color, 0.35).setStrokeStyle(2, color);
  }

  face(dx: number) {
    if (this.image && dx !== 0) this.image.setFlipX(dx < 0);
  }

  animate(now: number, moving: boolean) {
    const s = this.style.sprite;
    if (!this.image || !s) return;
    let key = s.idle;
    if (s.hurt && now < this.hurtUntil) key = s.hurt;
    else if (s.attack && now < this.attackUntil) {
      const progress = 1 - (this.attackUntil - now) / ATTACK_MS;
      key = s.attack[Math.min(s.attack.length - 1, Math.floor(progress * s.attack.length))];
    } else if (s.walk && moving) key = s.walk[Math.floor(now / WALK_FRAME_MS) % s.walk.length];
    if (this.image.texture.key !== key) this.image.setTexture(key);
  }

  playAttack(now: number) {
    this.attackUntil = now + ATTACK_MS;
    if (this.style.sprite?.attack && this.image) return;
    this.scene.tweens.add({ targets: this.inner, scale: { from: this.baseScale * 1.18, to: this.baseScale }, duration: 140 });
  }

  playHurt(now: number) {
    this.hurtUntil = now + HURT_MS;
  }

  flash(color = 0xffffff, ms = 80, mode: 'fill' | 'tint' = 'fill') {
    this.flashTimer?.remove();
    if (this.image) {
      if (mode === 'fill') this.image.setTintFill(color);
      else this.image.setTint(color);
      this.flashTimer = this.scene.time.delayedCall(ms, () => this.image?.clearTint());
    } else if (this.shape) {
      this.shape.setFillStyle(color);
      this.flashTimer = this.scene.time.delayedCall(ms, () => this.shape?.setFillStyle(this.style.color));
    }
  }
}
