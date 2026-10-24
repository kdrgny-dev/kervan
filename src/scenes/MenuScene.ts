import Phaser from 'phaser';
import { HEROES, type HeroKind } from '../data/heroes';
import { bindPad } from '../input/gamepad';
import { profile } from '../meta/profile';
import { isDesktop, quitApp } from '../platform';
import { HERO_SPRITES } from '../render/sprites';
import { UnitView } from '../render/UnitView';
import { LOGO } from '../ui/assets';
import { Button, enter, fmt, panel, ribbon } from '../ui/kit';
import { backdrop, fadeIn, heroBadge, wallet } from '../ui/screen';
import { displayStyle, textStyle, UI } from '../ui/theme';

const PARADE: HeroKind[] = ['knight', 'rogue', 'archer', 'mage', 'priest'];

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  create() {
    fadeIn(this);
    backdrop(this);
    wallet(this);

    const logo = this.add.image(285, 165, LOGO).setDisplaySize(420, 210);
    enter(this, logo, { y: -40 }, 0, 360);

    const play = new Button(this, 265, 322, 'Oyna', () => this.play(), { variant: 'primary', width: 336, height: 80, fontSize: 36 });
    const buttons = [
      play,
      new Button(this, 247, 416, 'Dükkan', () => this.scene.start('shop'), { width: 300, height: 64, icon: 'shop' }),
      new Button(this, 247, 500, 'Ayarlar', () => this.scene.start('settings'), { width: 300, height: 64, icon: 'settings' }),
    ];
    if (isDesktop) buttons.push(new Button(this, 247, 584, 'Çıkış', () => void quitApp(), { width: 300, height: 64, icon: 'exit' }));
    buttons.forEach((b, i) => enter(this, b, { x: -60 }, 120 + i * 60, 240));
    this.tweens.add({ targets: play, scale: 1.03, duration: 900, delay: 800, ease: 'Sine.InOut', yoyo: true, repeat: -1 });

    this.records(905, 325);
    this.parade(this.scale.height - 62);

    this.input.keyboard?.on('keydown-ENTER', () => this.play());
    this.input.keyboard?.on('keydown-SPACE', () => this.play());
    bindPad(this, { confirm: () => this.play() });
  }

  private play() {
    this.scene.start('heroSelect');
  }

  private records(x: number, y: number) {
    const box = this.add.container(x, y);
    box.add(panel(this, 0, 0, 396, 410));
    box.add(ribbon(this, 0, -200, 'Rekorlar', { icon: 'trophy', width: 300 }));
    enter(this, box, { x: 80 }, 200, 260);

    const best = profile.data.best.slice(0, 5);
    if (best.length === 0) {
      box.add(this.add.text(0, 10, 'Henüz tur yok.\nİlk kafileni yola çıkar!', textStyle(20, { color: UI.muted, align: 'center' })).setOrigin(0.5));
      return;
    }
    best.forEach((b, i) => {
      const ry = -120 + i * 66;
      const row = this.add.container(0, ry);
      row.add(this.add.text(-150, 0, `${i + 1}`, displayStyle(26, { color: i === 0 ? UI.gold : UI.muted })).setOrigin(0.5));
      row.add(heroBadge(this, -98, 0, b.hero, 50));
      row.add(this.add.text(-62, -12, fmt(b.score), displayStyle(24)).setOrigin(0, 0.5));
      row.add(this.add.text(-62, 13, `Dalga ${b.wave}`, textStyle(15, { color: UI.muted })).setOrigin(0, 0.5));
      if (i < best.length - 1) row.add(this.add.rectangle(0, 33, 344, 2, UI.panelEdge));
      box.add(row);
      row.setAlpha(0);
      this.tweens.add({ targets: row, alpha: 1, duration: 160, delay: 360 + i * 50, ease: 'Quad.Out' });
    });
  }

  /** Ekran altında soldan sağa yürüyen kafile. */
  private parade(y: number) {
    const { width } = this.scale;
    const spacing = 96;
    const views = PARADE.map((k) => {
      const def = HEROES[k];
      return new UnitView(this, { color: def.color, glyph: def.glyph, size: 60, shape: 'square', sprite: HERO_SPRITES[k], spriteSize: 92 });
    });
    const span = width + 480 + spacing * views.length;
    let x = -480;
    const tick = (_t: number, dt: number) => {
      x += (span / 14000) * dt;
      if (x - spacing * views.length > width) x = -480 + spacing;
      const now = this.time.now;
      views.forEach((v, i) => {
        v.setPosition(x - i * spacing, y);
        v.animate(now, true);
      });
    };
    this.events.on(Phaser.Scenes.Events.UPDATE, tick);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.UPDATE, tick));
  }
}
