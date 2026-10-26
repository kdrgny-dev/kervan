import Phaser from 'phaser';
import { CARD_IDS, CARDS, RARITY_NAME } from '../data/cards';
import { CARD_UNLOCK_LEVEL } from '../data/progression';
import { bindPad } from '../input/gamepad';
import { profile } from '../meta/profile';
import { icon } from '../ui/assets';
import { Button, enter, slice } from '../ui/kit';
import { backdrop, fadeIn, wallet } from '../ui/screen';
import { displayStyle, textStyle, UI } from '../ui/theme';
import { sharpen, view } from '../render/resolution';

const TILE_W = 212;
const TILE_H = 104;
const COLS = 5;

const RARITY_COLOR = { common: 0x8f88a0, rare: 0x3d74c9, epic: 0xf0c23b, cursed: 0x8e5bc9 };

export class CollectionScene extends Phaser.Scene {
  constructor() {
    super('collection');
  }

  create() {
    sharpen(this.cameras.main, 'fit');
    const { width } = view(this);
    const owned = profile.data.cardsUnlocked;
    fadeIn(this);
    backdrop(this);
    wallet(this);
    new Button(this, 78, 60, '', () => this.scene.start('menu'), { width: 64, height: 64, icon: 'back', iconOnly: true });
    this.add.text(126, 58, 'Koleksiyon', displayStyle(46)).setOrigin(0, 0.5);
    this.add.text(126, 100, `${owned.length}/${CARD_IDS.length} kart açık · kalanlar hesap seviyesiyle gelir`, textStyle(15, { color: UI.muted })).setOrigin(0, 0.5);

    const gap = 10;
    const x0 = width / 2 - ((COLS - 1) * (TILE_W + gap)) / 2;
    const y0 = 176;
    const order = [...CARD_IDS].sort((a, b) => Number(owned.includes(b)) - Number(owned.includes(a)));
    order.forEach((id, i) => {
      const x = x0 + (i % COLS) * (TILE_W + gap);
      const y = y0 + Math.floor(i / COLS) * (TILE_H + gap);
      const tile = this.tile(id, owned.includes(id), x, y);
      enter(this, tile, { y: 20 }, 30 + i * 18, 200);
    });

    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('menu'));
    bindPad(this, { back: () => this.scene.start('menu') });
  }

  private tile(id: (typeof CARD_IDS)[number], open: boolean, x: number, y: number) {
    const def = CARDS[id];
    const cursed = 'cursed' in def;
    const c = this.add.container(x, y);
    c.add(slice(this, open ? 'ui.card' : 'ui.card_locked', 0, 0, TILE_W, TILE_H));
    const color = RARITY_COLOR[cursed ? 'cursed' : def.rarity];
    const key = this.textures.exists(def.icon) ? def.icon : icon('sword');
    c.add(this.add.circle(-TILE_W / 2 + 34, 0, 25, open ? (cursed ? 0x3a2552 : UI.bgRaised) : 0x15131c));
    const art = this.add.image(-TILE_W / 2 + 34, 0, key).setDisplaySize(38, 38);
    if (!open) art.setTint(0x2a2633);
    c.add(art);
    if (!open) c.add(this.add.image(-TILE_W / 2 + 34, 0, icon('lock')).setDisplaySize(24, 24));

    const tx = -TILE_W / 2 + 66;
    const textW = TILE_W - 66 - 12;
    const name = this.add.text(tx, -32, open ? def.name : '???', displayStyle(15, { color: open ? UI.text : UI.dim })).setOrigin(0, 0.5);
    if (name.width > textW) name.setScale(textW / name.width);
    c.add(name);
    const tag = cursed ? 'Lanetli' : RARITY_NAME[def.rarity];
    const dot = this.add.circle(tx + 5, -14, 4, color);
    c.add([dot, this.add.text(tx + 13, -14, tag, textStyle(11, { color: UI.muted })).setOrigin(0, 0.5)]);
    const body = open ? def.desc : `Açılış: Seviye ${CARD_UNLOCK_LEVEL[id] ?? '?'}`;
    c.add(this.add.text(tx, -3, body, textStyle(12, { color: open ? UI.muted : UI.dim, wordWrap: { width: textW }, lineSpacing: -2 })).setOrigin(0, 0));
    return c;
  }
}
