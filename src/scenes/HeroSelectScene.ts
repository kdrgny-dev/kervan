import Phaser from 'phaser';
import { UNLOCK_COST, UPGRADE_STEP } from '../data/economy';
import { HERO_KINDS, HEROES, type HeroKind } from '../data/heroes';
import { profile } from '../meta/profile';
import { HERO_SPRITES } from '../render/sprites';
import { UnitView } from '../render/UnitView';
import { Button } from '../ui/Button';
import { textStyle, UI } from '../ui/theme';

const CARD_W = 196;
const CARD_H = 330;

export class HeroSelectScene extends Phaser.Scene {
  private selected: HeroKind = 'knight';
  private cards = new Map<HeroKind, Phaser.GameObjects.Rectangle>();

  constructor() {
    super('heroSelect');
  }

  create() {
    const { width, height } = this.scale;
    const save = profile.data;
    this.cards.clear();
    this.selected = save.unlocked.includes(save.lastHero) ? save.lastHero : save.unlocked[0];

    this.add.rectangle(width / 2, height / 2, width, height, UI.bg);
    this.add.text(width / 2, 60, 'Kafilenin liderini seç', textStyle(40, { fontStyle: 'bold' })).setOrigin(0.5);

    const gap = 20;
    const total = HERO_KINDS.length * CARD_W + (HERO_KINDS.length - 1) * gap;
    HERO_KINDS.forEach((kind, i) => this.card(kind, width / 2 - total / 2 + CARD_W / 2 + i * (CARD_W + gap), 310));

    new Button(this, width / 2 - 150, height - 80, 'Geri', () => this.scene.start('menu'), { width: 220 });
    new Button(this, width / 2 + 150, height - 80, 'Yola çık', () => this.start(), { variant: 'primary', width: 260 });

    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.step(-1);
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') this.step(1);
      else if (e.code === 'Enter' || e.code === 'Space') this.start();
      else if (e.code === 'Escape') this.scene.start('menu');
    });
    this.refresh();
  }

  private card(kind: HeroKind, x: number, y: number) {
    const save = profile.data;
    const def = HEROES[kind];
    const locked = !save.unlocked.includes(kind);
    const up = save.upgrades[kind];

    const bg = this.add.rectangle(x, y, CARD_W, CARD_H, UI.panel).setStrokeStyle(3, UI.panelEdge).setInteractive({ useHandCursor: !locked });
    this.cards.set(kind, bg);
    bg.on('pointerup', () => {
      if (locked) return;
      if (this.selected === kind) this.start();
      this.selected = kind;
      this.refresh();
    });

    const view = new UnitView(this, { color: def.color, glyph: def.glyph, size: 64, shape: 'square', sprite: HERO_SPRITES[kind], spriteSize: 104 });
    view.setPosition(x, y - 90);
    this.add.text(x, y - 10, def.name, textStyle(26, { fontStyle: 'bold' })).setOrigin(0.5);
    this.add.text(x, y + 22, def.role, textStyle(16, { color: UI.muted, align: 'center', wordWrap: { width: CARD_W - 20 } })).setOrigin(0.5, 0);

    const hp = Math.round(def.hp * (1 + UPGRADE_STEP * up.hp));
    const dmg = Math.round(def.dmg * (1 + UPGRADE_STEP * up.dmg));
    const lines = [`Can ${hp}`, `Hasar ${dmg}`, `Menzil ${def.range}`];
    this.add.text(x, y + 70, lines.join('\n'), textStyle(18, { align: 'center', lineSpacing: 6 })).setOrigin(0.5, 0);

    if (locked) {
      view.setAlpha(0.35);
      this.add.rectangle(x, y, CARD_W, CARD_H, UI.bg, 0.55);
      this.add.text(x, y - 145, `Kilitli · ${UNLOCK_COST[kind]} altın`, textStyle(18, { color: UI.gold, fontStyle: 'bold' })).setOrigin(0.5);
    }
  }

  private step(dir: number) {
    const unlocked = HERO_KINDS.filter((k) => profile.data.unlocked.includes(k));
    const i = unlocked.indexOf(this.selected);
    this.selected = unlocked[(i + dir + unlocked.length) % unlocked.length];
    this.refresh();
  }

  private refresh() {
    for (const [kind, bg] of this.cards) {
      const on = kind === this.selected;
      bg.setStrokeStyle(on ? 5 : 3, on ? UI.primary : UI.panelEdge);
    }
  }

  private start() {
    profile.data.lastHero = this.selected;
    profile.save();
    this.scene.start('game', { hero: this.selected });
  }
}
