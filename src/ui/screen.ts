import Phaser from 'phaser';
import type { HeroKind } from '../data/heroes';
import { profile } from '../meta/profile';
import { CELL, GRID_H, GRID_W } from '../config';
import { drawArena } from '../render/arena';
import { LOOT } from '../render/sprites';
import { CARDS } from '../data/cards';
import type { Reward } from '../data/progression';
import { icon, portrait } from './assets';
import { fmt, Pill } from './kit';
import { displayStyle, UI } from './theme';
import { view, visibleArea } from '../render/resolution';

/** Menü ekranlarının arkasındaki bulanık, karartılmış arena. */
export function backdrop(scene: Phaser.Scene, dim = 0.6) {
  const area = visibleArea(scene);
  const arena = drawArena(scene);
  const w = GRID_W * CELL;
  const h = GRID_H * CELL;
  const rt = scene.add.renderTexture(0, 0, w, h).setOrigin(0);
  rt.draw(arena);
  arena.destroy();
  // Telefonda görünür alan arenadan farklı oranda; kaplayacak kadar büyüt, ortala
  const cover = Math.max(area.width / w, area.height / h);
  rt.setScale(cover).setPosition(area.x + (area.width - w * cover) / 2, area.y + (area.height - h * cover) / 2);
  rt.postFX?.addBlur(1, 2, 2, 1.4);
  scene.add.rectangle(area.x, area.y, area.width, area.height, UI.bg, dim).setOrigin(0);
  return rt;
}

/** Sağ üstte altın ve mücevher hapları. */
export function wallet(scene: Phaser.Scene, gold = profile.data.gold, gems = profile.data.gems) {
  const right = view(scene).width - 24;
  const gem = new Pill(scene, right, 40, { icon: 'gem', align: 'right', height: 44 }).setValue(gems).setDepth(40);
  const coin = new Pill(scene, gem.x - 14, 40, { icon: 'coin', align: 'right', height: 44 }).setValue(gold).setDepth(40);
  return { coin, gem };
}

/** Altın halkalı portre rozeti. */
export function heroBadge(scene: Phaser.Scene, x: number, y: number, kind: HeroKind, size = 56) {
  const c = scene.add.container(x, y);
  c.add(scene.add.circle(0, 0, size * 0.42, UI.panel2));
  c.add(scene.add.image(0, 0, portrait(kind)).setDisplaySize(size * 0.82, size * 0.82));
  c.add(scene.add.image(0, 0, LOOT.heroToken).setDisplaySize(size, size));
  return c;
}

export function fadeIn(scene: Phaser.Scene) {
  scene.cameras.main.fadeIn(180, 20, 18, 28);
}

/** Ödül çipi: ikon + miktar (altın, mücevher, XP, kart, unvan). */
export function rewardChip(scene: Phaser.Scene, x: number, y: number, r: Reward) {
  const c = scene.add.container(x, y);
  let iconKey: string | null = null;
  let text = '';
  let color: string = UI.text;
  switch (r.type) {
    case 'gold':
      iconKey = icon('coin');
      text = fmt(r.amount);
      color = UI.gold;
      break;
    case 'gems':
      iconKey = icon('gem');
      text = fmt(r.amount);
      color = UI.gem;
      break;
    case 'xp':
      text = `${fmt(r.amount)} XP`;
      color = UI.gem;
      break;
    case 'card': {
      const def = CARDS[r.card];
      iconKey = scene.textures.exists(def.icon) ? def.icon : icon('sword');
      text = def.name;
      color = '#d6b8ff';
      break;
    }
    case 'title':
      iconKey = icon('trophy');
      text = `“${r.title}”`;
      color = UI.gold;
      break;
  }
  let w = 0;
  if (iconKey) {
    c.add(scene.add.image(10, 0, iconKey).setDisplaySize(20, 20));
    w = 24;
  }
  const t = scene.add.text(w, 0, text, displayStyle(15, { color })).setOrigin(0, 0.5);
  c.add(t);
  c.setSize(w + t.width, 24);
  return c;
}

export function rewardRow(scene: Phaser.Scene, x: number, y: number, rewards: Reward[], align: 'left' | 'right' = 'left') {
  const row = scene.add.container(x, y);
  let cx = 0;
  for (const r of rewards) {
    const chip = rewardChip(scene, cx, 0, r);
    row.add(chip);
    cx += chip.width + 14;
  }
  if (align === 'right') row.x -= cx - 14;
  return row;
}
