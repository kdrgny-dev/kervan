import Phaser from 'phaser';
import { HEROES } from '../data/heroes';
import { profile } from '../meta/profile';
import { isDesktop, quitApp } from '../platform';
import { drawArena } from '../render/arena';
import { HERO_SPRITES } from '../render/sprites';
import { UnitView } from '../render/UnitView';
import { bindPad } from '../input/gamepad';
import { Button } from '../ui/Button';
import { textStyle, UI } from '../ui/theme';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  create() {
    const { width, height } = this.scale;
    const save = profile.data;
    drawArena(this);
    this.add.rectangle(width / 2, height / 2, width, height, UI.bg, 0.55);

    this.add
      .text(width / 2 - 170, 150, 'KERVAN', textStyle(104, { fontStyle: 'bold' }))
      .setOrigin(0.5)
      .setStroke('#14121c', 10);
    this.add
      .text(width / 2 - 170, 225, 'Kafileni büyüt, dalgalara dayan.', textStyle(24, { color: UI.muted }))
      .setOrigin(0.5);

    this.add
      .text(width - 24, 20, `Altın ${save.gold}    Mücevher ${save.gems}`, textStyle(22))
      .setOrigin(1, 0);

    const bx = width / 2 - 170;
    new Button(this, bx, 330, 'Oyna', () => this.scene.start('heroSelect'), { variant: 'primary', width: 300, height: 64, fontSize: 28 });
    new Button(this, bx, 410, 'Dükkan', () => this.scene.start('shop'), { width: 300 });
    new Button(this, bx, 480, 'Ayarlar', () => this.scene.start('settings'), { width: 300 });
    if (isDesktop) new Button(this, bx, 550, 'Çıkış', () => void quitApp(), { width: 300 });

    this.drawBest(width - 300, 140);
    this.parade(height - 80);

    this.input.keyboard?.on('keydown-ENTER', () => this.scene.start('heroSelect'));
    this.input.keyboard?.on('keydown-SPACE', () => this.scene.start('heroSelect'));
    bindPad(this, { confirm: () => this.scene.start('heroSelect') });
  }

  private drawBest(x: number, y: number) {
    const best = profile.data.best.slice(0, 5);
    this.add.rectangle(x, y - 20, 380, 300, UI.panel, 0.9).setOrigin(0.5, 0).setStrokeStyle(3, UI.panelEdge);
    this.add.text(x, y, 'Rekorlar', textStyle(26, { fontStyle: 'bold' })).setOrigin(0.5, 0);
    if (best.length === 0) {
      this.add.text(x, y + 60, 'Henüz tur yok.\nİlk kafileni yola çıkar!', textStyle(20, { color: UI.muted, align: 'center' })).setOrigin(0.5, 0);
      return;
    }
    best.forEach((b, i) => {
      const line = `${i + 1}.  ${b.score}   Dalga ${b.wave} · ${HEROES[b.hero].name}`;
      this.add.text(x - 160, y + 50 + i * 42, line, textStyle(20, { color: i === 0 ? UI.gold : UI.text }));
    });
  }

  /** Menü altında yürüyen kahraman kafilesi. */
  private parade(y: number) {
    const kinds = ['knight', 'archer', 'mage', 'rogue', 'priest'] as const;
    const { width } = this.scale;
    const views = kinds.map((k) => {
      const def = HEROES[k];
      return new UnitView(this, { color: def.color, glyph: def.glyph, size: 38, shape: 'square', sprite: HERO_SPRITES[k], spriteSize: 56 });
    });
    const spacing = 58;
    let x = -40;
    const tick = (_t: number, dt: number) => {
      x += dt * 0.08;
      if (x - spacing * views.length > width + 40) x = -40;
      const now = this.time.now;
      views.forEach((v, i) => {
        v.setPosition(x - i * spacing, y + Math.abs(Math.sin(now / 90 + i * 0.7)) * -4);
        v.animate(now, true);
      });
    };
    this.events.on(Phaser.Scenes.Events.UPDATE, tick);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.UPDATE, tick));
  }
}
