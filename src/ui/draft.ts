import Phaser from 'phaser';
import { isTouch } from '../platform';
import { CARDS, type CardId, RARITY_NAME, type Rarity } from '../data/cards';
import { Button, fmt, ribbon, slice } from './kit';
import { displayStyle, textStyle, UI } from './theme';
import { view } from '../render/resolution';

const CARD_W = 250;
const CARD_H = 340;
const GAP = 30;

const RARITY_COLOR: Record<Rarity | 'cursed', number> = {
  common: 0x8f88a0,
  rare: 0x3d74c9,
  epic: 0xf0c23b,
  cursed: 0x8e5bc9,
};

export interface DraftHandlers {
  pick: (id: CardId) => void;
  reroll: () => void;
}

/** Dalga sonu kart seçimi katmanı. */
export class DraftOverlay {
  private readonly root: Phaser.GameObjects.Container;
  private readonly cardsLayer: Phaser.GameObjects.Container;
  private readonly rerollBtn: Button;
  private options: CardId[] = [];
  private focus = 1;
  private busy = false;
  private cardViews: Phaser.GameObjects.Container[] = [];
  private cardY = 352;

  constructor(private readonly scene: Phaser.Scene, private readonly h: DraftHandlers) {
    const { width, height } = view(scene);
    this.root = scene.add.container(0, 0).setDepth(55).setVisible(false);
    const shade = scene.add.rectangle(0, 0, width, height, UI.bg, 0.78).setOrigin(0).setInteractive();
    this.root.add(shade);
    // Telefonda görünür yükseklik 600: her şey biraz yukarı
    const tight = height < 700;
    this.cardY = tight ? 290 : 352;
    this.root.add(ribbon(scene, width / 2, tight ? 54 : 82, 'Bir kart seç', { width: 380 }));
    this.cardsLayer = scene.add.container(0, 0);
    this.root.add(this.cardsLayer);
    this.rerollBtn = new Button(scene, width / 2, tight ? height - 72 : height - 92, 'Yeniden çek', () => this.h.reroll(), { width: 280, height: 60, icon: 'coin' });
    this.root.add(this.rerollBtn);
    this.root.add(scene.add.text(width / 2, tight ? height - 26 : height - 44, isTouch ? 'Bir karta dokun' : '1 · 2 · 3  ya da  ← → + Enter', textStyle(15, { color: UI.dim })).setOrigin(0.5));
  }

  get open() {
    return this.root.visible;
  }

  show(options: CardId[], owned: Partial<Record<CardId, number>>, rerollCost: number, gold: number) {
    this.options = options;
    this.busy = false;
    this.focus = Math.min(this.focus, options.length - 1);
    this.root.setVisible(true);
    this.cardsLayer.removeAll(true);
    const { width } = view(this.scene);
    const total = options.length * CARD_W + (options.length - 1) * GAP;
    this.cardViews = options.map((id, i) => {
      const x = width / 2 - total / 2 + CARD_W / 2 + i * (CARD_W + GAP);
      const view = this.card(id, owned[id] ?? 0, x, this.cardY, i);
      this.cardsLayer.add(view);
      return view;
    });
    this.rerollBtn.setLabel(`Yeniden çek · ${fmt(rerollCost)}`).setEnabled(gold >= rerollCost);
    this.highlight();
  }

  hide() {
    this.root.setVisible(false);
    this.cardsLayer.removeAll(true);
    this.cardViews = [];
  }

  move(dir: number) {
    if (!this.open || this.busy) return;
    this.focus = (this.focus + dir + this.options.length) % this.options.length;
    this.highlight();
  }

  confirm(index = this.focus) {
    if (!this.open || this.busy || !this.options[index]) return;
    this.busy = true;
    const view = this.cardViews[index];
    const id = this.options[index];
    this.scene.tweens.add({ targets: view, scale: 1.12, duration: 140, ease: 'Back.Out', yoyo: true });
    this.cardViews.forEach((v, i) => {
      if (i !== index) this.scene.tweens.add({ targets: v, alpha: 0, y: v.y + 30, duration: 180 });
    });
    this.scene.time.delayedCall(320, () => {
      this.hide();
      this.h.pick(id);
    });
  }

  private card(id: CardId, owned: number, x: number, y: number, index: number) {
    const def = CARDS[id];
    const cursed = 'cursed' in def;
    const color = RARITY_COLOR[cursed ? 'cursed' : def.rarity];
    const c = this.scene.add.container(x, y);

    c.add(slice(this.scene, 'ui.card', 0, 0, CARD_W, CARD_H));
    // Seçim çerçevesi kartın kendi kenarına oturur; dışına ikinci bir çerçeve çizmez
    const glow = this.scene.add.graphics().setName('glow').setAlpha(0);
    glow.lineStyle(5, color, 1).strokeRoundedRect(-CARD_W / 2 + 6, -CARD_H / 2 + 6, CARD_W - 12, CARD_H - 12, 16);
    c.add(glow);
    // NineSlice'a tint verilince WebGL'de kart hiç çizilmiyor; lanet rengi üst katmanla
    if (cursed) {
      const veil = this.scene.add.graphics();
      veil.fillStyle(0x8e5bc9, 0.18).fillRoundedRect(-CARD_W / 2 + 6, -CARD_H / 2 + 6, CARD_W - 12, CARD_H - 12, 18);
      veil.lineStyle(3, 0x8e5bc9, 0.9).strokeRoundedRect(-CARD_W / 2 + 6, -CARD_H / 2 + 6, CARD_W - 12, CARD_H - 12, 18);
      c.add(veil);
    }

    const tagText = cursed ? 'Lanetli' : RARITY_NAME[def.rarity];
    const tag = this.scene.add.text(0, -CARD_H / 2 + 26, tagText.toLocaleUpperCase('tr-TR'), textStyle(13, { color: UI.ink, fontStyle: '900' })).setOrigin(0.5);
    const tagBg = this.scene.add.graphics();
    tagBg.fillStyle(color).fillRoundedRect(-tag.width / 2 - 12, -CARD_H / 2 + 14, tag.width + 24, 24, 12);
    tagBg.lineStyle(2, 0x14121c).strokeRoundedRect(-tag.width / 2 - 12, -CARD_H / 2 + 14, tag.width + 24, 24, 12);
    c.add([tagBg, tag]);

    const key = this.scene.textures.exists(def.icon) ? def.icon : 'icon.trophy';
    const art = this.scene.add.image(0, -62, key).setDisplaySize(104, 104);
    c.add(this.scene.add.circle(0, -62, 62, cursed ? 0x3a2552 : UI.bgRaised));
    c.add(art);

    c.add(this.scene.add.text(0, 22, def.name, displayStyle(24, { align: 'center', wordWrap: { width: CARD_W - 36 } })).setOrigin(0.5, 0));
    c.add(
      this.scene.add
        .text(0, 84, def.desc, textStyle(16, { color: cursed ? '#d6b8ff' : UI.muted, align: 'center', wordWrap: { width: CARD_W - 40 } }))
        .setOrigin(0.5, 0),
    );
    if (owned > 0) c.add(this.scene.add.text(0, CARD_H / 2 - 24, `Sahip: ${owned}/${def.max}`, textStyle(13, { color: UI.dim })).setOrigin(0.5));

    const zone = this.scene.add.zone(0, 0, CARD_W, CARD_H).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => {
      this.focus = index;
      this.highlight();
    });
    zone.on('pointerup', () => this.confirm(index));
    c.add(zone);

    c.setAlpha(0).setScale(0.2, 1);
    this.scene.tweens.add({ targets: c, alpha: 1, scaleX: 1, duration: 240, delay: 80 + index * 90, ease: 'Back.Out' });
    return c;
  }

  private highlight() {
    this.cardViews.forEach((v, i) => {
      const on = i === this.focus;
      const glow = v.getByName('glow') as Phaser.GameObjects.Graphics;
      this.scene.tweens.add({ targets: v, y: this.cardY - (on ? 12 : 0), duration: 140, ease: 'Quad.Out' });
      glow.setAlpha(on ? 1 : 0);
    });
  }
}
