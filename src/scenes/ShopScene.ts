import Phaser from 'phaser';
import { GEM_UPGRADE_KEYS, GEM_UPGRADES, type GemUpgrade, type HeroStat, MARKET_KEYS, MARKET_UPGRADES, MAX_UPGRADE, UNLOCK_COST } from '../data/economy';
import { HERO_KINDS, HEROES, type HeroKind } from '../data/heroes';
import { bindPad } from '../input/gamepad';
import { profile } from '../meta/profile';
import { refreshAchievements } from '../meta/progression';
import { buyMarket, nextMarketCost } from '../meta/shop';
import type { SaveData } from '../meta/save';
import { type Building, CAMP, CAMP_SLOTS, NARRATOR_ART } from '../render/sprites';
import { buyGemUpgrade, nextGemCost, nextUpgradeCost, unlockHero, upgradeHero } from '../meta/shop';
import { icon } from '../ui/assets';
import { Button, enter, fmt, panel, pips, shake, slice, tab } from '../ui/kit';
import { backdrop, fadeIn, heroBadge, wallet } from '../ui/screen';
import { displayStyle, textStyle, UI } from '../ui/theme';

type Tab = 'camp' | 'heroes' | 'general' | 'market';

const BUILDING_TAB: Record<Building, Tab> = { barracks: 'heroes', temple: 'general', market: 'market' };
const BUILDING_NAME: Record<Building, string> = { barracks: 'Kışla', temple: 'Tapınak', market: 'Pazar' };

/** Bina seviyesi (1–3), o binadan alınanlara göre büyür. */
export function buildingLevel(s: SaveData, b: Building) {
  const score =
    b === 'barracks'
      ? s.unlocked.length - 2 + Object.values(s.upgrades).reduce((n, u) => n + u.hp + u.dmg, 0) / 4
      : b === 'temple'
        ? Object.values(s.gemUpgrades).reduce((n, v) => n + v, 0)
        : Object.values(s.market).reduce((n, v) => n + v, 0);
  const [mid, high] = b === 'barracks' ? [3, 10] : b === 'temple' ? [2, 4] : [3, 8];
  return score >= high ? 3 : score >= mid ? 2 : 1;
}

const QUIPS = [
  'Kampa hoş geldin! Çay demde, develer uykuda.',
  'Kışlaya uğra, yoldaşlar seni bekliyor. Biri de borcunu.',
  'Tapınakta dua edersen güçlendirmeler uzun sürer. Bana sorarsan çay da uzun sürer.',
  'Pazar’da her şey var. Fiyatlar da var. Fiyatlar biraz fazla var.',
];

const PANEL = { x: 576, y: 425, w: 990, h: 530 };

export class ShopScene extends Phaser.Scene {
  private tab: Tab = 'camp';

  constructor() {
    super('shop');
  }

  init(data: { tab?: Tab }) {
    this.tab = data.tab ?? 'camp';
  }

  create() {
    fadeIn(this);
    if (this.tab === 'camp') return this.campView();
    backdrop(this);
    wallet(this);

    new Button(this, 78, 60, '', () => this.back(), { width: 64, height: 64, icon: 'back', iconOnly: true });
    this.add.text(126, 58, 'Kamp', displayStyle(46)).setOrigin(0, 0.5);

    const box = this.add.container(PANEL.x, PANEL.y, [panel(this, 0, 0, PANEL.w, PANEL.h)]);
    enter(this, box, { y: -30 }, 0, 200);
    // Aktif sekme panelin üst kenarına biner, o yüzden panelden sonra çizilir
    tab(this, 205, 138, 220, 'Kışla', this.tab === 'heroes', () => this.switchTo('heroes'));
    tab(this, 432, 138, 220, 'Tapınak', this.tab === 'general', () => this.switchTo('general'));
    tab(this, 659, 138, 220, 'Pazar', this.tab === 'market', () => this.switchTo('market'));
    const content = this.add.container(0, 0);
    if (this.tab === 'heroes') this.heroRows(content);
    else if (this.tab === 'general') this.generalCards(content);
    else this.marketCards(content);

    this.input.keyboard?.on('keydown-ESC', () => this.back());
    bindPad(this, { back: () => this.back() });
  }

  private back() {
    if (this.tab === 'camp') this.scene.start('menu');
    else this.scene.restart({ tab: 'camp' });
  }

  /** Kamp sahnesi: binalar ilerlemeye göre büyür, tıklanınca o binanın paneli açılır. */
  private campView() {
    const { width } = this.scale;
    const save = profile.data;
    if (this.textures.exists(CAMP.bg)) this.add.image(0, 0, CAMP.bg).setOrigin(0).setDisplaySize(width, this.scale.height);
    else backdrop(this);
    wallet(this);
    new Button(this, 78, 60, '', () => this.back(), { width: 64, height: 64, icon: 'back', iconOnly: true });
    this.add.text(126, 58, 'Kamp', displayStyle(46)).setOrigin(0, 0.5).setStroke(UI.ink, 8);

    (Object.keys(BUILDING_TAB) as Building[]).forEach((b, i) => {
      const [x, y, w, h] = CAMP_SLOTS[b];
      const level = buildingLevel(save, b);
      const cx = x + w / 2;
      const c = this.add.container(cx, y + h);
      const img = this.add.image(0, 0, CAMP.buildings[b][level - 1]).setOrigin(0.5, 1).setDisplaySize(w, h);
      c.add(img);
      const plaque = this.add.container(0, -h - 6);
      const label = this.add.text(0, 0, `${BUILDING_NAME[b]} · Sv ${level}`, displayStyle(20, { color: UI.ink })).setOrigin(0.5);
      const bg = this.add.graphics();
      bg.fillStyle(UI.goldNum).fillRoundedRect(-label.width / 2 - 14, -18, label.width + 28, 36, 12);
      bg.lineStyle(3, 0x14121c).strokeRoundedRect(-label.width / 2 - 14, -18, label.width + 28, 36, 12);
      plaque.add([bg, label]);
      c.add(plaque);
      const zone = this.add.zone(0, -h / 2, w * 0.8, h).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => this.tweens.add({ targets: c, scale: 1.04, duration: 120, ease: 'Quad.Out' }));
      zone.on('pointerout', () => this.tweens.add({ targets: c, scale: 1, duration: 120, ease: 'Quad.Out' }));
      zone.on('pointerup', () => this.scene.restart({ tab: BUILDING_TAB[b] }));
      c.add(zone);
      c.setAlpha(0).y += 30;
      this.tweens.add({ targets: c, alpha: 1, y: y + h, duration: 260, delay: 80 + i * 90, ease: 'Back.Out' });
    });

    const [fx, fy, fw] = CAMP_SLOTS.campfire;
    if (this.anims.exists(CAMP.campfire)) {
      const fire = this.add.sprite(fx + fw / 2, fy + fw / 2, this.anims.get(CAMP.campfire).frames[0].textureKey);
      fire.setDisplaySize(fw, fw).play(CAMP.campfire);
    }
    if (this.textures.exists(NARRATOR_ART.full)) {
      const husnu = this.add.image(fx + fw + 70, fy + fw, NARRATOR_ART.full).setOrigin(0.5, 1).setDisplaySize(96, 144);
      this.tweens.add({ targets: husnu, scaleY: husnu.scaleY * 1.02, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      const quip = QUIPS[Math.floor(Math.random() * QUIPS.length)];
      const t = this.add.text(0, 0, quip, textStyle(15, { color: UI.ink, wordWrap: { width: 260 } })).setOrigin(0, 0.5);
      const bw = t.width + 28;
      const bh = t.height + 20;
      const bubble = this.add.container(fx + fw + 120, fy - 40);
      const g = this.add.graphics();
      g.fillStyle(0xf0e6d2).fillRoundedRect(0, -bh / 2, bw, bh, 12).lineStyle(3, 0x14121c).strokeRoundedRect(0, -bh / 2, bw, bh, 12);
      g.fillStyle(0xf0e6d2).fillTriangle(10, bh / 2 - 2, 26, bh / 2 - 2, 4, bh / 2 + 14);
      t.x = 14;
      bubble.add([g, t]);
      bubble.setAlpha(0);
      this.tweens.add({ targets: bubble, alpha: 1, duration: 300, delay: 600 });
    }

    this.add.text(width / 2, this.scale.height - 24, 'Bir binaya tıkla', textStyle(15, { color: UI.text })).setOrigin(0.5).setStroke(UI.ink, 4);
    this.input.keyboard?.on('keydown-ESC', () => this.back());
    bindPad(this, { back: () => this.back() });
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

  private marketCards(root: Phaser.GameObjects.Container) {
    const save = profile.data;
    MARKET_KEYS.forEach((key, i) => {
      const x = PANEL.x + (i - 1) * 316;
      const u = MARKET_UPGRADES[key];
      const level = save.market[key];
      const card = this.add.container(x, PANEL.y);
      card.add(slice(this, 'ui.card', 0, 0, 276, 326));
      card.add(this.add.text(0, -128, u.name, displayStyle(28)).setOrigin(0.5));
      card.add(this.add.text(0, -96, u.desc, textStyle(15, { color: UI.muted, align: 'center', wordWrap: { width: 220 } })).setOrigin(0.5, 0));
      const p = pips(this, 0, 36, u.costs.length, level);
      p.x = -(u.costs.length * 22 - 6) / 2;
      card.add(p);
      card.add(this.add.text(0, 64, `${level}/${u.costs.length}`, displayStyle(18, { color: UI.muted })).setOrigin(0.5));
      card.add(this.priceButton(0, 120, nextMarketCost(save, key), 'coin', 236, 52, (b) => this.buy(b, () => buyMarket(save, key))));
      root.add(card);
      enter(this, card, { y: 40 }, 60 + i * 70, 220);
    });
  }

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
