import Phaser from 'phaser';
import { GEM_UPGRADE_KEYS, GEM_UPGRADES, type GemUpgrade, type HeroStat, MAX_UPGRADE, UNLOCK_COST } from '../data/economy';
import { HERO_KINDS, HEROES, type HeroKind } from '../data/heroes';
import { bindPad } from '../input/gamepad';
import { profile } from '../meta/profile';
import { refreshAchievements } from '../meta/progression';
import { buyGemUpgrade, nextGemCost, nextUpgradeCost, unlockHero, upgradeHero } from '../meta/shop';
import { icon } from '../ui/assets';
import { Button, enter, fmt, panel, pips, shake, slice, tab } from '../ui/kit';
import { backdrop, fadeIn, heroBadge, wallet } from '../ui/screen';
import { displayStyle, textStyle, UI } from '../ui/theme';

type Tab = 'heroes' | 'general';

const PANEL = { x: 576, y: 425, w: 990, h: 530 };

export class ShopScene extends Phaser.Scene {
  private tab: Tab = 'heroes';

  constructor() {
    super('shop');
  }

  init(data: { tab?: Tab }) {
    this.tab = data.tab ?? 'heroes';
  }

  create() {
    fadeIn(this);
    backdrop(this);
    wallet(this);

    new Button(this, 78, 60, '', () => this.back(), { width: 64, height: 64, icon: 'back', iconOnly: true });
    this.add.text(126, 58, 'Dükkan', displayStyle(46)).setOrigin(0, 0.5);

    const box = this.add.container(PANEL.x, PANEL.y, [panel(this, 0, 0, PANEL.w, PANEL.h)]);
    enter(this, box, { y: -30 }, 0, 200);
    // Aktif sekme panelin üst kenarına biner, o yüzden panelden sonra çizilir
    tab(this, 205, 138, 220, 'Kahramanlar', this.tab === 'heroes', () => this.switchTo('heroes'));
    tab(this, 432, 138, 220, 'Genel', this.tab === 'general', () => this.switchTo('general'));
    const content = this.add.container(0, 0);
    if (this.tab === 'heroes') this.heroRows(content);
    else this.generalCards(content);

    this.input.keyboard?.on('keydown-ESC', () => this.back());
    bindPad(this, { back: () => this.back() });
  }

  private back() {
    this.scene.start('menu');
  }

  private switchTo(tab: Tab) {
    this.scene.restart({ tab });
  }

  /** Satın alma başarılıysa kaydedip ekranı tazeler, değilse butonu sallar. */
  private buy(btn: Button, action: () => boolean) {
    if (!action()) return shake(this, btn);
    refreshAchievements(profile.data);
    profile.save();
    this.scene.restart({ tab: this.tab });
  }

  private priceButton(x: number, y: number, cost: number | null, currency: 'coin' | 'gem', w: number, h: number, onClick: (b: Button) => void) {
    const label = cost === null ? (currency === 'gem' ? 'Alındı' : 'Maks') : fmt(cost);
    const btn: Button = new Button(this, x, y, label, () => onClick(btn), {
      variant: 'primary',
      width: w,
      height: h,
      fontSize: Math.round(h * 0.42),
      icon: cost === null ? undefined : currency,
    });
    if (cost === null) btn.setEnabled(false);
    return btn;
  }

  // ---------- Kahramanlar ----------

  private heroRows(root: Phaser.GameObjects.Container) {
    const save = profile.data;
    const rowH = 100;
    const top = PANEL.y - PANEL.h / 2 + 62;
    HERO_KINDS.forEach((kind, i) => {
      const y = top + i * rowH;
      const def = HEROES[kind];
      root.add(heroBadge(this, 150, y, kind, 64));
      root.add(this.add.text(200, y - 12, def.name, displayStyle(25)).setOrigin(0, 0.5));
      root.add(this.add.text(200, y + 15, def.role, textStyle(14, { color: UI.muted })).setOrigin(0, 0.5));
      if (i < HERO_KINDS.length - 1) root.add(this.add.rectangle(PANEL.x, y + rowH / 2, PANEL.w - 64, 2, UI.panelEdge));

      if (!save.unlocked.includes(kind)) {
        root.add(this.add.text(368, y, 'Kilidi açınca yükseltmeler burada görünür.', textStyle(16, { color: UI.muted })).setOrigin(0, 0.5));
        const cost = UNLOCK_COST[kind];
        const btn: Button = new Button(this, 912, y, `Kilidi aç · ${fmt(cost)}`, () => this.buy(btn, () => unlockHero(save, kind)), {
          variant: 'primary',
          width: 250,
          height: 54,
          fontSize: 21,
          icon: 'lock',
        });
        root.add(btn);
        return;
      }
      this.statRow(root, kind, 'hp', 'Can', 'heart', y - 23);
      this.statRow(root, kind, 'dmg', 'Hasar', 'sword', y + 23);
    });
  }

  private statRow(root: Phaser.GameObjects.Container, kind: HeroKind, stat: HeroStat, label: string, glyph: 'heart' | 'sword', y: number) {
    const save = profile.data;
    const level = save.upgrades[kind][stat];
    root.add(this.add.image(380, y, icon(glyph)).setDisplaySize(18, 18));
    root.add(this.add.text(396, y, label.toLocaleUpperCase('tr-TR'), textStyle(14, { color: UI.muted, fontStyle: '800' })).setOrigin(0, 0.5));
    root.add(pips(this, 462, y, MAX_UPGRADE, level, 14, 5));
    const cost = nextUpgradeCost(save, kind, stat);
    root.add(this.priceButton(720, y, cost, 'coin', 102, 40, (b) => this.buy(b, () => upgradeHero(save, kind, stat))));
  }

  // ---------- Genel ----------

  private generalCards(root: Phaser.GameObjects.Container) {
    const save = profile.data;
    GEM_UPGRADE_KEYS.forEach((key: GemUpgrade, i) => {
      const x = PANEL.x + (i - 1) * 316;
      const y = PANEL.y;
      const u = GEM_UPGRADES[key];
      const level = save.gemUpgrades[key];
      const card = this.add.container(x, y);
      card.add(slice(this, 'ui.card', 0, 0, 276, 326));
      card.add(this.add.text(0, -128, u.name, displayStyle(28)).setOrigin(0.5));
      card.add(this.add.text(0, -96, u.desc, textStyle(15, { color: UI.muted, align: 'center', wordWrap: { width: 220 } })).setOrigin(0.5, 0));
      if (u.costs.length > 1) {
        const p = pips(this, 0, 36, u.costs.length, level);
        p.x = -(u.costs.length * 22 - 6) / 2;
        card.add(p);
      }
      card.add(this.add.text(0, 64, `${level}/${u.costs.length}`, displayStyle(18, { color: UI.muted })).setOrigin(0.5));
      card.add(this.priceButton(0, 120, nextGemCost(save, key), 'gem', 236, 52, (b) => this.buy(b, () => buyGemUpgrade(save, key))));
      root.add(card);
      enter(this, card, { y: 40 }, 60 + i * 70, 220);
    });
  }
}
