import Phaser from 'phaser';
import { icon, type IconName, SLICES, type SliceKey, TOGGLE, UI_RASTER } from './assets';
import { displayStyle, textStyle, UI } from './theme';

export const fmt = (n: number) => Math.round(n).toLocaleString('tr-TR');

/** 2x dokudan, verilen 1x boyutta 9-slice (üst/alt payı 0 ise yatay 3-slice; yükseklik dokudan gelir). */
export function slice(scene: Phaser.Scene, key: SliceKey, x: number, y: number, w: number, h = SLICES[key].h) {
  const sl = SLICES[key];
  const r = UI_RASTER;
  return scene.add
    .nineslice(x, y, key, undefined, w * r, h * r, sl.left * r, sl.right * r, sl.top * r, sl.bottom * r)
    .setScale(1 / r);
}

// ---------------------------------------------------------------- Buton

type Face = 'normal' | 'hover' | 'pressed' | 'disabled';

export interface ButtonOptions {
  width?: number;
  height?: number;
  variant?: 'primary' | 'secondary';
  fontSize?: number;
  icon?: IconName;
  /** Yalnızca ikon (kare buton). */
  iconOnly?: boolean;
}

export class Button extends Phaser.GameObjects.Container {
  private readonly faces: Record<Face, Phaser.GameObjects.NineSlice>;
  private readonly content: Phaser.GameObjects.Container;
  private readonly label?: Phaser.GameObjects.Text;
  private readonly glyph?: Phaser.GameObjects.Image;
  private readonly textColor: string;
  private readonly contentY: number;
  private enabled = true;
  private face: Face = 'normal';

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, onClick: () => void, opts: ButtonOptions = {}) {
    super(scene, x, y);
    const variant = opts.variant ?? 'secondary';
    const w = opts.width ?? 260;
    const h = opts.height ?? 64;
    const fontSize = opts.fontSize ?? Math.round(h * 0.38);
    this.textColor = variant === 'primary' ? UI.ink : UI.text;

    this.faces = {
      normal: slice(scene, `ui.button_${variant}`, 0, 0, w, h),
      hover: slice(scene, `ui.button_${variant}_hover`, 0, 0, w, h),
      pressed: slice(scene, `ui.button_${variant}_pressed`, 0, 0, w, h),
      disabled: slice(scene, 'ui.button_disabled', 0, 0, w, h),
    };
    this.add(Object.values(this.faces));

    // Buton yüzü üst %89'da; dudak altta. Metin yüzün ortasına oturur.
    this.contentY = -h * 0.055;
    this.content = scene.add.container(0, this.contentY);
    if (opts.icon) {
      const size = opts.iconOnly ? h * 0.5 : fontSize * 1.15;
      this.glyph = scene.add.image(0, 0, icon(opts.icon)).setDisplaySize(size, size);
      this.content.add(this.glyph);
    }
    if (!opts.iconOnly && text) {
      this.label = scene.add.text(0, 0, text, displayStyle(fontSize, { color: this.textColor })).setOrigin(0.5);
      this.content.add(this.label);
    }
    this.layout();
    this.add(this.content);

    const zone = scene.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    this.add(zone);
    zone.on('pointerover', () => {
      if (!this.enabled) return;
      this.show('hover');
      scene.tweens.add({ targets: this, scale: 1.04, duration: 120, ease: 'Quad.Out' });
    });
    zone.on('pointerout', () => {
      if (!this.enabled) return;
      this.show('normal');
      this.content.y = this.contentY;
      scene.tweens.add({ targets: this, scale: 1, duration: 120, ease: 'Quad.Out' });
    });
    zone.on('pointerdown', () => {
      if (!this.enabled) return;
      this.show('pressed');
      this.content.y = this.contentY + 4;
      scene.tweens.add({ targets: this, scale: 0.96, duration: 70, ease: 'Quad.Out' });
    });
    zone.on('pointerup', () => {
      if (!this.enabled) return;
      this.show('hover');
      this.content.y = this.contentY;
      scene.tweens.add({ targets: this, scale: 1, duration: 160, ease: 'Back.Out' });
      onClick();
    });

    this.setSize(w, h);
    this.show('normal');
    scene.add.existing(this);
  }

  private show(face: Face) {
    this.face = face;
    for (const [k, ns] of Object.entries(this.faces)) ns.setVisible(k === face);
  }

  private layout() {
    const gap = 10;
    const iw = this.glyph?.displayWidth ?? 0;
    const tw = this.label?.width ?? 0;
    const total = iw + (iw && tw ? gap : 0) + tw;
    let x = -total / 2;
    if (this.glyph) {
      this.glyph.x = x + iw / 2;
      x += iw + gap;
    }
    if (this.label) this.label.x = x + tw / 2;
  }

  setLabel(text: string) {
    this.label?.setText(text);
    this.layout();
    return this;
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    this.show(on ? 'normal' : 'disabled');
    this.label?.setColor(on ? this.textColor : UI.dim);
    this.glyph?.setAlpha(on ? 1 : 0.4);
    return this;
  }

  get isEnabled() {
    return this.enabled && this.face !== 'disabled';
  }
}

// ---------------------------------------------------------------- Panel ve başlıklar

export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number) {
  return slice(scene, 'ui.panel', x, y, w, h);
}

/** Kurdele başlık (sarı, kıvrık uçlu). */
export function ribbon(scene: Phaser.Scene, x: number, y: number, text: string, opts: { width?: number; icon?: IconName; size?: number } = {}) {
  const c = scene.add.container(x, y);
  const label = scene.add.text(0, -4, text, displayStyle(opts.size ?? 34, { color: UI.ink })).setOrigin(0.5);
  let iconImg: Phaser.GameObjects.Image | undefined;
  if (opts.icon) iconImg = scene.add.image(0, -4, icon(opts.icon)).setDisplaySize(32, 32);
  const contentW = label.width + (iconImg ? 42 : 0);
  const w = opts.width ?? Math.max(320, contentW + 140);
  c.add(slice(scene, 'ui.panel_header', 0, 0, w));
  if (iconImg) {
    iconImg.x = -contentW / 2 + 16;
    label.x = iconImg.x + 26 + label.width / 2;
    c.add(iconImg);
  }
  c.add(label);
  return c;
}

// ---------------------------------------------------------------- Hap (sayaç) ve pip

export class Pill extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly caption?: Phaser.GameObjects.Text;
  private readonly glyph?: Phaser.GameObjects.Image;
  private readonly value: Phaser.GameObjects.Text;
  private readonly h: number;
  private readonly align: 'left' | 'right';
  private anchorX: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    opts: { caption?: string; icon?: IconName; height?: number; align?: 'left' | 'right'; color?: string },
  ) {
    super(scene, x, y);
    this.anchorX = x;
    this.h = opts.height ?? 44;
    this.align = opts.align ?? 'left';
    this.bg = scene.add.graphics();
    this.add(this.bg);
    if (opts.icon) {
      this.glyph = scene.add.image(0, 0, icon(opts.icon)).setDisplaySize(this.h * 0.68, this.h * 0.68);
      this.add(this.glyph);
    }
    if (opts.caption) {
      const cap = opts.caption.toLocaleUpperCase('tr-TR');
      this.caption = scene.add.text(0, 0, cap, textStyle(12, { color: UI.muted, fontStyle: '800' })).setOrigin(0, 0.5);
      this.add(this.caption);
    }
    this.value = scene.add
      .text(0, 0, '', displayStyle(Math.round(this.h * 0.48), { color: opts.color ?? UI.text }))
      .setOrigin(0, 0.5);
    this.add(this.value);
    scene.add.existing(this);
  }

  setValue(v: string | number, color?: string) {
    const text = typeof v === 'number' ? fmt(v) : v;
    if (color) this.value.setColor(color);
    if (this.value.text === text) return this;
    this.value.setText(text);
    this.layout();
    return this;
  }

  setCaption(text: string) {
    const cap = text.toLocaleUpperCase('tr-TR');
    if (!this.caption || this.caption.text === cap) return this;
    this.caption.setText(cap);
    this.layout();
    return this;
  }

  place(x: number) {
    if (x === this.anchorX) return this;
    this.anchorX = x;
    this.layout();
    return this;
  }

  /** Değer değişince kısa büyüme (HUD sayaçları). */
  bump() {
    this.scene.tweens.add({ targets: this.value, scale: { from: 1.2, to: 1 }, duration: 160, ease: 'Back.Out' });
  }

  private layout() {
    const pad = this.h * 0.34;
    const gap = 8;
    let x = pad;
    if (this.glyph) {
      this.glyph.x = x + this.glyph.displayWidth / 2 - 4;
      x += this.glyph.displayWidth + gap - 4;
    }
    if (this.caption) {
      this.caption.x = x;
      x += this.caption.width + gap;
    }
    this.value.x = x;
    const w = x + this.value.width + pad;
    const r = this.h / 2;
    this.bg.clear();
    this.bg.fillStyle(UI.bg, 0.92).fillRoundedRect(0, -r, w, this.h, r);
    this.bg.lineStyle(3, UI.panelEdge).strokeRoundedRect(0, -r, w, this.h, r);
    this.bg.fillStyle(0xffffff, 0.05).fillRoundedRect(5, -r + 4, w - 10, this.h * 0.38, r * 0.4);
    this.x = this.align === 'right' ? this.anchorX - w : this.anchorX;
    this.pillWidth = w;
  }

  pillWidth = 0;
}

export function pips(scene: Phaser.Scene, x: number, y: number, total: number, filled: number, size = 16, gap = 6) {
  const g = scene.add.graphics({ x, y });
  for (let i = 0; i < total; i++) {
    const px = i * (size + gap);
    if (i < filled) {
      g.fillStyle(UI.goldNum).fillRoundedRect(px, -size / 2, size, size, 4);
      g.lineStyle(2, 0x7a4f19).strokeRoundedRect(px, -size / 2, size, size, 4);
      g.fillStyle(0xffffff, 0.35).fillRect(px + 3, -size / 2 + 3, size - 6, 3);
    } else {
      g.fillStyle(UI.bgRaised).fillRoundedRect(px, -size / 2, size, size, 4);
      g.lineStyle(2, UI.panelEdge).strokeRoundedRect(px, -size / 2, size, size, 4);
    }
  }
  return g;
}

// ---------------------------------------------------------------- Çubuk

export class Bar extends Phaser.GameObjects.Container {
  private readonly fill: Phaser.GameObjects.NineSlice;
  private readonly innerW: number;
  private ratio = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, kind: 'hp' | 'xp' | 'boss') {
    super(scene, x, y);
    this.innerW = w - 8;
    this.add(slice(scene, 'ui.bar_frame', 0, 0, w));
    this.fill = slice(scene, `ui.bar_fill_${kind}`, -w / 2 + 4, 0, this.innerW).setOrigin(0, 0.5);
    this.add(this.fill);
    scene.add.existing(this);
  }

  setRatio(r: number, animate = true) {
    const next = Phaser.Math.Clamp(r, 0, 1);
    if (Math.abs(next - this.ratio) < 0.001) return this;
    this.ratio = next;
    const minW = 24;
    const target = next <= 0 ? 0 : Math.max(minW, this.innerW * next);
    this.fill.setVisible(target > 0);
    if (target <= 0) return this;
    if (!animate) this.fill.setSize(target * UI_RASTER, this.fill.height);
    else {
      const from = { w: this.fill.width / UI_RASTER };
      this.scene.tweens.add({
        targets: from,
        w: target,
        duration: 250,
        ease: 'Quad.Out',
        onUpdate: () => this.fill.setSize(from.w * UI_RASTER, this.fill.height),
      });
    }
    return this;
  }
}

// ---------------------------------------------------------------- Toggle ve sekme

export class Toggle extends Phaser.GameObjects.Image {
  constructor(scene: Phaser.Scene, x: number, y: number, private value: boolean, onChange: (v: boolean) => void) {
    super(scene, x, y, value ? TOGGLE.on : TOGGLE.off);
    this.setDisplaySize(96, 48).setInteractive({ useHandCursor: true });
    const base = this.scale;
    this.on('pointerup', () => {
      this.set(!this.value);
      scene.tweens.add({ targets: this, scale: { from: base * 1.08, to: base }, duration: 140, ease: 'Back.Out' });
      onChange(this.value);
    });
    scene.add.existing(this);
  }

  set(v: boolean) {
    this.value = v;
    this.setTexture(v ? TOGGLE.on : TOGGLE.off);
    return this;
  }
}

export function tab(scene: Phaser.Scene, x: number, y: number, w: number, text: string, active: boolean, onClick: () => void) {
  const c = scene.add.container(x, y);
  c.add(slice(scene, active ? 'ui.tab_active' : 'ui.tab_idle', 0, 0, w));
  c.add(scene.add.text(0, 2, text, displayStyle(22, { color: active ? UI.text : UI.muted })).setOrigin(0.5));
  if (!active) {
    const zone = scene.add.zone(0, 0, w, 56).setInteractive({ useHandCursor: true });
    zone.on('pointerup', onClick);
    c.add(zone);
  }
  return c;
}

// ---------------------------------------------------------------- Yardımcı hareketler

export function enter(scene: Phaser.Scene, target: Phaser.GameObjects.GameObject, from: { x?: number; y?: number }, delay = 0, ms = 220) {
  const t = target as unknown as { x: number; y: number; alpha: number };
  const to = { x: t.x, y: t.y };
  t.x += from.x ?? 0;
  t.y += from.y ?? 0;
  t.alpha = 0;
  scene.tweens.add({ targets: t, x: to.x, y: to.y, alpha: 1, duration: ms, delay, ease: 'Back.Out' });
}

export function shake(scene: Phaser.Scene, target: Phaser.GameObjects.GameObject) {
  const t = target as unknown as { x: number };
  const x = t.x;
  scene.tweens.add({ targets: t, x: { from: x - 6, to: x + 6 }, duration: 40, yoyo: true, repeat: 2, ease: 'Sine.InOut', onComplete: () => (t.x = x) });
}
