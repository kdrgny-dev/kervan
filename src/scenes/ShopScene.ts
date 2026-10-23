import Phaser from 'phaser';
import { GEM_UPGRADE_KEYS, GEM_UPGRADES, type HeroStat, MAX_UPGRADE, UNLOCK_COST } from '../data/economy';
import { HERO_KINDS, HEROES, type HeroKind } from '../data/heroes';
import { profile } from '../meta/profile';
import { buyGemUpgrade, nextGemCost, nextUpgradeCost, unlockHero, upgradeHero } from '../meta/shop';
import { HERO_SPRITES } from '../render/sprites';
import { UnitView } from '../render/UnitView';
import { bindPad } from '../input/gamepad';
import { Button } from '../ui/Button';
import { textStyle, UI } from '../ui/theme';

type Tab = 'heroes' | 'general';

export class ShopScene extends Phaser.Scene {
  private tab: Tab = 'heroes';

  constructor() {
    super('shop');
  }

  init(data: { tab?: Tab }) {
    this.tab = data.tab ?? 'heroes';
  }

  create() {
    const { width, height } = this.scale;
    const save = profile.data;
    this.add.rectangle(width / 2, height / 2, width, height, UI.bg);
    this.add.text(40, 30, 'Dükkan', textStyle(40, { fontStyle: 'bold' }));
    this.add
      .text(width - 40, 40, `Altın ${save.gold}    Mücevher ${save.gems}`, textStyle(24, { fontStyle: 'bold' }))
      .setOrigin(1, 0);

    const tabBtn = (x: number, label: string, tab: Tab) =>
      new Button(this, x, 120, label, () => this.scene.restart({ tab }), {
        width: 220,
        height: 48,
        variant: this.tab === tab ? 'primary' : 'secondary',
      });
    tabBtn(150, 'Kahramanlar', 'heroes');
    tabBtn(390, 'Genel', 'general');

    if (this.tab === 'heroes') this.heroRows();
    else this.generalRows();

    new Button(this, width / 2, height - 50, 'Geri', () => this.scene.start('menu'), { width: 220, height: 50 });
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('menu'));
    bindPad(this, { back: () => this.scene.start('menu') });
  }

  private buy(action: () => boolean) {
    if (!action()) return;
    profile.save();
    this.scene.restart({ tab: this.tab });
  }

  private heroRows() {
    const save = profile.data;
    const rowH = 90;
    HERO_KINDS.forEach((kind, i) => {
      const y = 200 + i * rowH;
      const def = HEROES[kind];
      this.add.rectangle(this.scale.width / 2, y, this.scale.width - 80, rowH - 10, UI.panel).setStrokeStyle(2, UI.panelEdge);
      new UnitView(this, { color: def.color, glyph: def.glyph, size: 46, shape: 'square', sprite: HERO_SPRITES[kind], spriteSize: 70 }).setPosition(90, y);
      this.add.text(140, y - 22, def.name, textStyle(24, { fontStyle: 'bold' }));
      this.add.text(140, y + 8, def.role, textStyle(16, { color: UI.muted }));

      if (!save.unlocked.includes(kind)) {
        const cost = UNLOCK_COST[kind];
        new Button(this, 900, y, `Kilidi aç · ${cost} altın`, () => this.buy(() => unlockHero(save, kind)), {
          width: 300,
          height: 50,
          variant: 'primary',
        }).setEnabled(save.gold >= cost);
        return;
      }
      this.statButton(kind, 'hp', 'Can', 640, y);
      this.statButton(kind, 'dmg', 'Hasar', 940, y);
    });
  }

  private statButton(kind: HeroKind, stat: HeroStat, label: string, x: number, y: number) {
    const save = profile.data;
    const level = save.upgrades[kind][stat];
    const cost = nextUpgradeCost(save, kind, stat);
    this.add.text(x - 130, y, `${label} ${level}/${MAX_UPGRADE}`, textStyle(18)).setOrigin(0, 0.5);
    const btn = new Button(this, x + 60, y, cost === null ? 'Maks' : `+%10 · ${cost}`, () => this.buy(() => upgradeHero(save, kind, stat)), {
      width: 150,
      height: 46,
      fontSize: 18,
    });
    btn.setEnabled(cost !== null && save.gold >= cost);
  }

  private generalRows() {
    const save = profile.data;
    const rowH = 110;
    GEM_UPGRADE_KEYS.forEach((key, i) => {
      const y = 220 + i * rowH;
      const u = GEM_UPGRADES[key];
      const level = save.gemUpgrades[key];
      const cost = nextGemCost(save, key);
      this.add.rectangle(this.scale.width / 2, y, this.scale.width - 80, rowH - 14, UI.panel).setStrokeStyle(2, UI.panelEdge);
      this.add.text(80, y - 24, u.name, textStyle(26, { fontStyle: 'bold' }));
      this.add.text(80, y + 10, u.desc, textStyle(18, { color: UI.muted }));
      this.add.text(700, y, `${level}/${u.costs.length}`, textStyle(22)).setOrigin(0.5);
      new Button(this, 920, y, cost === null ? 'Alındı' : `${cost} mücevher`, () => this.buy(() => buyGemUpgrade(save, key)), {
        width: 240,
        height: 50,
        variant: 'primary',
      }).setEnabled(cost !== null && save.gems >= cost);
    });
  }
}
