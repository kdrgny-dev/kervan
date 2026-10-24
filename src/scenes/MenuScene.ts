import Phaser from 'phaser';
import { HEROES, type HeroKind } from '../data/heroes';
import { bindPad } from '../input/gamepad';
import { profile } from '../meta/profile';
import { isDesktop, quitApp } from '../platform';
import { HERO_SPRITES } from '../render/sprites';
import { UnitView } from '../render/UnitView';
import { titleFor, xpForLevel } from '../data/progression';
import { ensureQuests } from '../meta/progression';
import { ensureIntro, markSeen } from '../meta/story';
import { StoryDialog } from '../ui/dialog';
import { LOGO } from '../ui/assets';
import { Bar, Button, enter, fmt, panel, ribbon } from '../ui/kit';
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
    ensureQuests(profile.data);
    ensureIntro(profile.data);
    profile.save();
    this.accountBadge(24, 40);

    const logo = this.add.image(285, 178, LOGO).setDisplaySize(400, 200);
    enter(this, logo, { y: -40 }, 0, 360);

    const left = 97;
    const half = 164;
    const play = new Button(this, left + 168, 330, 'Oyna', () => this.play(), { variant: 'primary', width: 336, height: 80, fontSize: 36 });
    const done = profile.data.quests.daily.items.filter((q) => q.done).length;
    const buttons = [
      play,
      new Button(this, left + half / 2, 420, `Görevler ${done}/${profile.data.quests.daily.items.length}`, () => this.scene.start('progress', { tab: 'quests' }), { width: half, height: 60, icon: 'trophy', fontSize: 19 }),
      new Button(this, left + 336 - half / 2, 420, 'Koleksiyon', () => this.scene.start('collection'), { width: half, height: 60, icon: 'sword', fontSize: 19 }),
      new Button(this, left + half / 2, 494, 'Kamp', () => this.scene.start('shop'), { width: half, height: 60, icon: 'shop', fontSize: 19 }),
      new Button(this, left + 336 - half / 2, 494, 'Ayarlar', () => this.scene.start('settings'), { width: half, height: 60, icon: 'settings', fontSize: 19 }),
    ];
    if (isDesktop) buttons.push(new Button(this, left + 168, 568, 'Çıkış', () => void quitApp(), { width: 336, height: 56, icon: 'exit', fontSize: 19 }));
    buttons.forEach((b, i) => enter(this, b, { x: -60 }, 120 + i * 60, 240));
    this.tweens.add({ targets: play, scale: 1.03, duration: 900, delay: 800, ease: 'Sine.InOut', yoyo: true, repeat: -1 });

    this.records(905, 325);
    this.parade(this.scale.height - 62);

    const story = new StoryDialog(this);
    this.input.keyboard?.on('keydown-ENTER', () => !story.open && this.play());
    this.input.keyboard?.on('keydown-SPACE', () => !story.open && this.play());
    bindPad(this, { confirm: () => (story.open ? story.advance() : this.play()) });

    // Bekleyen hikaye anları menü açılınca kervanbaşı tarafından anlatılır
    const pending = [...profile.data.story.pending];
    if (pending.length)
      this.time.delayedCall(700, () =>
        story.play(pending, (id) => {
          markSeen(profile.data, id);
          profile.save();
        }),
      );
  }

  /** Sol üstte hesap seviyesi, unvan ve XP çubuğu. */
  private accountBadge(x: number, y: number) {
    const { level, xp } = profile.data.account;
    const disc = this.add.graphics();
    disc.fillStyle(0x3d74c9).fillCircle(0, 0, 24).lineStyle(3, 0x14121c).strokeCircle(0, 0, 24);
    disc.lineStyle(2, 0x7fb3ec, 0.8).strokeCircle(0, 0, 19);
    const num = this.add.text(0, 1, `${level}`, displayStyle(22)).setOrigin(0.5);
    const title = this.add.text(34, -10, titleFor(level), displayStyle(18)).setOrigin(0, 0.5);
    const bar = new Bar(this, 34 + 110, 14, 220, 'xp').setRatio(xp / xpForLevel(level), false);
    const label = this.add.text(34 + 226, 14, `${fmt(xp)}/${fmt(xpForLevel(level))}`, textStyle(12, { color: UI.muted })).setOrigin(0, 0.5);
    const c = this.add.container(x + 24, y, [disc, num, title, bar, label]).setDepth(40);
    enter(this, c, { x: -40 }, 100, 240);
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
