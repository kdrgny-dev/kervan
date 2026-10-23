import type Phaser from 'phaser';
import type { EnemyKind } from '../data/enemies';
import type { HeroKind } from '../data/heroes';

export interface SpriteSet {
  idle: string;
  walk?: string[];
  attack?: string[];
  hurt?: string;
}

/** Doku anahtarı → public/ altındaki dosya ve rasterleştirme boyutu (px). */
const FILES: Record<string, { file: string; size: number }> = {
  'knight.walk1': { file: 'assets/knight_walk_1.svg', size: 96 },
  'knight.walk2': { file: 'assets/knight_walk_2.svg', size: 96 },
  'knight.walk3': { file: 'assets/knight_walk_3.svg', size: 96 },
  'knight.walk4': { file: 'assets/knight_walk_4.svg', size: 96 },
  'knight.attack1': { file: 'assets/knight_attack_1.svg', size: 96 },
  'knight.attack2': { file: 'assets/knight_attack_2.svg', size: 96 },
  'knight.hurt': { file: 'assets/knight_hurt.svg', size: 96 },
  archer: { file: 'assets/archer.svg', size: 96 },
  mage: { file: 'assets/mage.svg', size: 96 },
  rogue: { file: 'assets/rogue.svg', size: 96 },
  slime: { file: 'assets/slime.svg', size: 96 },
  skeleton: { file: 'assets/skeleton.svg', size: 96 },
  goblin: { file: 'assets/goblin.svg', size: 96 },
  slimeKing: { file: 'assets/boss_slime_king.svg', size: 128 },
};

export const HERO_SPRITES: Partial<Record<HeroKind, SpriteSet>> = {
  knight: {
    idle: 'knight.walk1',
    walk: ['knight.walk1', 'knight.walk2', 'knight.walk3', 'knight.walk4'],
    attack: ['knight.attack1', 'knight.attack2'],
    hurt: 'knight.hurt',
  },
  archer: { idle: 'archer' },
  mage: { idle: 'mage' },
  rogue: { idle: 'rogue' },
};

export const ENEMY_SPRITES: Partial<Record<EnemyKind, SpriteSet>> = {
  slime: { idle: 'slime' },
  skeleton: { idle: 'skeleton' },
  goblin: { idle: 'goblin' },
  slimeKing: { idle: 'slimeKing' },
};

export function preloadSprites(scene: Phaser.Scene) {
  for (const [key, { file, size }] of Object.entries(FILES)) {
    scene.load.svg(key, file, { width: size * 2, height: size * 2 });
  }
}
