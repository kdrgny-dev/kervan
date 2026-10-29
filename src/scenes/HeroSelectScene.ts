import Phaser from 'phaser';
import { UNLOCK_COST, UPGRADE_STEP } from '../data/economy';
import { HERO_KINDS, HEROES, type HeroKind } from '../data/heroes';
import { CAMPAIGNS, type CampaignId, DESTAN_IDS } from '../data/campaigns';
import { campaignUnlocked } from '../meta/progression';
import { bindPad } from '../input/gamepad';
import { profile } from '../meta/profile';
import { icon, type IconName, portrait } from '../ui/assets';
import { Button, enter, fit, fmt, ribbon, shake, slice } from '../ui/kit';
import { backdrop, fadeIn, wallet } from '../ui/screen';
import { displayStyle, textStyle, UI } from '../ui/theme';
import { sharpen, view } from '../render/resolution';

const CARD_H = 250;
const GAP = 14;
/** Kart çerçevesinin kalın kenarı; içerik bunun içinde kalır. */
const INSET = 28;
/** Can/hasar satırı ya da fiyatın kart içindeki yüksekliği. */
const BOTTOM = CARD_H / 2 - 30;

interface Card {
  root: Phaser.GameObjects.Container;
  frame: Phaser.GameObjects.NineSlice;
  selectedFrame?: Phaser.GameObjects.NineSlice;
  tag?: Phaser.GameObjects.Container;
  baseY: number;
}

export class HeroSelectScene extends Phaser.Scene {
  private selected: HeroKind = 'knight';
  private cards = new Map<HeroKind, Card>();
  private campaign: CampaignId = 'road';
  private cardW = 160;

  constructor() {
    super('heroSelect');
  }

  init(data: { campaign?: CampaignId }) {
    this.campaign = data.campaign ?? 'road';
  }

  create() {
    sharpen(this.cameras.main);
    const { width, height } = view(this);
    const save = profile.data;
    this.cards = new Map();
    this.selected = save.unlocked.includes(save.lastHero) ? save.lastHero : save.unlocked[0];

    fadeIn(this);
    backdrop(this);
    wallet(this);
    ribbon(this, width / 2, 68, 'Kahramanını seç', { width: 440 });
    if (this.campaign !== 'road') {
      const c = CAMPAIGNS[this.campaign];
      this.add.text(width / 2, 122, `${c.name} · ${c.era}`, displayStyle(20, { color: UI.gold })).setOrigin(0.5);
    }

    this.cardW = Math.min(160, Math.floor((width - 60) / HERO_KINDS.length - GAP));
    const total = HERO_KINDS.length * this.cardW + (HERO_KINDS.length - 1) * GAP;
    HERO_KINDS.forEach((kind, i) => this.card(kind, width / 2 - total / 2 + this.cardW / 2 + i * (this.cardW + GAP), (150 + height - 130) / 2, i));

    new Button(this, 145, height - 90, 'Geri', () => this.back(), { width: 196, height: 64, icon: 'back' });
    new Button(this, width - 195, height - 86, 'Yola çık', () => this.start(), { variant: 'primary', width: 296, height: 76, fontSize: 34 });

    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.step(-1);
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') this.step(1);
      else if (e.code === 'Enter' || e.code === 'Space') this.start();
      else if (e.code === 'Escape') this.back();
    });
    bindPad(this, {
      dir: (d) => (d === 'left' ? this.step(-1) : d === 'right' ? this.step(1) : undefined),
      confirm: () => this.start(),
      back: () => this.back(),
    });
    this.time.delayedCall(420, () => this.refresh());
  }

  private card(kind: HeroKind, x: number, y: number, index: number) {
    const save = profile.data;
    const def = HEROES[kind];
    const locked = !save.unlocked.includes(kind);
    const up = save.upgrades[kind];
    const root = this.add.container(x, y);

    const frame = slice(this, locked ? 'ui.card_locked' : 'ui.card', 0, 0, this.cardW, CARD_H);
    root.add(frame);
    const selectedFrame = locked ? undefined : slice(this, 'ui.card_selected', 0, 0, this.cardW, CARD_H).setVisible(false);
    if (selectedFrame) root.add(selectedFrame);

    const inner = this.cardW - INSET;
    const faceSize = Math.min(120, inner);
    const face = this.add.image(0, -CARD_H / 2 + 14 + faceSize / 2, portrait(kind)).setDisplaySize(faceSize, faceSize);
    root.add(face);
    const name = fit(this.add.text(0, 22, def.name, displayStyle(24)).setOrigin(0.5), inner);
    const role = this.add.text(0, 38, def.role, textStyle(13, { color: UI.muted, align: 'center', wordWrap: { width: inner } })).setOrigin(0.5, 0);
    root.add([name, role]);

    if (locked) {
      face.setTint(0x55505f);
      name.setColor(UI.dim);
      root.add(this.add.image(0, face.y, icon('lock')).setDisplaySize(44, 44));
      root.add(def.legendary ? fit(this.add.text(0, BOTTOM, 'Destan ödülü', displayStyle(17, { color: UI.gold })).setOrigin(0.5), inner) : this.price(kind));
    } else {
      const hp = Math.round(def.hp * (1 + UPGRADE_STEP * up.hp));
      const dmg = Math.round(def.dmg * (1 + UPGRADE_STEP * up.dmg));
      root.add(this.stats(0, BOTTOM, [['heart', hp], ['sword', dmg], ['range', def.range]]));
    }

    let tag: Phaser.GameObjects.Container | undefined;
    if (!locked) {
      const label = this.add.text(0, 0, 'Seçili', textStyle(13, { color: UI.ink, fontStyle: '900' })).setOrigin(0.5);
      const bg = this.add.graphics();
      bg.fillStyle(UI.goldNum).fillRoundedRect(-label.width / 2 - 8, -12, label.width + 16, 24, 6);
      bg.lineStyle(2, 0x7a4f19).strokeRoundedRect(-label.width / 2 - 8, -12, label.width + 16, 24, 6);
      tag = this.add.container(0, -CARD_H / 2, [bg, label]).setVisible(false);
      root.add(tag);
    }

    const zone = this.add.zone(0, 0, this.cardW, CARD_H).setInteractive({ useHandCursor: !locked });
    zone.on('pointerup', () => {
      if (locked) return shake(this, root);
      if (this.selected === kind) return this.start();
      this.selected = kind;
      this.refresh();
    });
    root.add(zone);

    this.cards.set(kind, { root, frame, selectedFrame, tag, baseY: y });
    enter(this, root, { y: 60 }, 80 + index * 50, 220);
  }

  private price(kind: HeroKind) {
    const coin = this.add.image(0, 0, icon('coin')).setDisplaySize(26, 26);
    const amount = this.add.text(0, 0, fmt(UNLOCK_COST[kind]), displayStyle(24, { color: UI.gold })).setOrigin(0, 0.5);
    const w = 26 + 8 + amount.width;
    coin.x = -w / 2 + 13;
    amount.x = coin.x + 21;
    return fit(this.add.container(0, BOTTOM, [coin, amount]), this.cardW - INSET);
  }

  private stats(x: number, y: number, items: [IconName, number][]) {
    const parts: Phaser.GameObjects.GameObject[] = [];
    let cx = 0;
    for (const [name, value] of items) {
      const img = this.add.image(cx + 10, 0, icon(name)).setDisplaySize(20, 20);
      const txt = this.add.text(cx + 24, 0, `${value}`, displayStyle(17)).setOrigin(0, 0.5);
      parts.push(img, txt);
      cx += 24 + txt.width + 9;
    }
    // Kahraman sayısı arttıkça kartlar daralıyor; satır kartın içinde kalsın
    const total = cx - 9;
    const k = Math.min(1, (this.cardW - INSET) / total);
    return this.add.container(x - (total * k) / 2, y, parts).setScale(k);
  }

  private step(dir: number) {
    const unlocked = HERO_KINDS.filter((k) => profile.data.unlocked.includes(k));
    const i = unlocked.indexOf(this.selected);
    this.selected = unlocked[(i + dir + unlocked.length) % unlocked.length];
    this.refresh();
  }

  private refresh() {
    for (const [kind, c] of this.cards) {
      const on = kind === this.selected;
      this.tweens.killTweensOf(c.root);
      c.selectedFrame?.setVisible(on);
      c.frame.setVisible(!(on && c.selectedFrame));
      c.tag?.setVisible(on);
      this.tweens.add({ targets: c.root, y: c.baseY + (on ? -10 : 0), alpha: 1, duration: 180, ease: 'Back.Out' });
    }
  }

  private start() {
    profile.data.lastHero = this.selected;
    profile.save();
    this.scene.start('game', { hero: this.selected, campaign: this.campaign });
  }

  private back() {
    this.scene.start(DESTAN_IDS.some((c) => campaignUnlocked(profile.data, c)) ? 'campaigns' : 'menu');
  }
}
