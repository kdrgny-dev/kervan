import Phaser from 'phaser';
import type { HeroKind } from '../data/heroes';
import { profile } from '../meta/profile';
import { drawArena } from '../render/arena';
import { LOOT } from '../render/sprites';
import { portrait } from './assets';
import { Pill } from './kit';
import { UI } from './theme';

/** Menü ekranlarının arkasındaki bulanık, karartılmış arena. */
export function backdrop(scene: Phaser.Scene, dim = 0.6) {
  const { width, height } = scene.scale;
  const arena = drawArena(scene);
  const rt = scene.add.renderTexture(0, 0, width, height).setOrigin(0);
  rt.draw(arena);
  arena.destroy();
  rt.postFX?.addBlur(1, 2, 2, 1.4);
  scene.add.rectangle(0, 0, width, height, UI.bg, dim).setOrigin(0);
  return rt;
}

/** Sağ üstte altın ve mücevher hapları. */
export function wallet(scene: Phaser.Scene, gold = profile.data.gold, gems = profile.data.gems) {
  const right = scene.scale.width - 24;
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
