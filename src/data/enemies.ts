export type EnemyKind = 'slime' | 'bat' | 'skeleton' | 'goblin' | 'slimeKing';

/** wander: yavaş yaklaşır · erratic: zikzak · kite: mesafe korur, ateş eder · charge: lideri kovalar */
export type EnemyBrain = 'wander' | 'erratic' | 'kite' | 'charge';

export interface BossAbilities {
  summon: EnemyKind;
  summonEveryMs: number;
  maxMinions: number;
  shockEveryMs: number;
  shockWarnMs: number;
  shockRadius: number;
  shockDmg: number;
}

export interface EnemyDef {
  name: string;
  color: number;
  glyph: string;
  hp: number;
  dmg: number;
  moveMs: number;
  attackMs: number;
  brain: EnemyBrain;
  cost: number;
  firstWave: number;
  gold: number;
  xp?: number;
  range?: number;
  boss?: BossAbilities;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  slime: { name: 'Balçık', color: 0x7bd96b, glyph: 'Bç', hp: 20, dmg: 8, moveMs: 400, attackMs: 1000, brain: 'wander', cost: 2, firstWave: 1, gold: 1 },
  bat: { name: 'Yarasa', color: 0x7a4fa8, glyph: 'Y', hp: 8, dmg: 4, moveMs: 200, attackMs: 800, brain: 'erratic', cost: 2, firstWave: 2, gold: 1 },
  skeleton: {
    name: 'İskelet Okçu', color: 0xd9d4c5, glyph: 'İ', hp: 15, dmg: 5, moveMs: 350, attackMs: 2000, brain: 'kite', cost: 3, firstWave: 3, gold: 2,
    range: 4,
  },
  goblin: { name: 'Goblin', color: 0x5c8a3a, glyph: 'Gb', hp: 45, dmg: 12, moveMs: 300, attackMs: 1200, brain: 'charge', cost: 5, firstWave: 4, gold: 3 },
  slimeKing: {
    name: 'Balçık Kralı', color: 0x8a5bd6, glyph: 'K', hp: 260, dmg: 20, moveMs: 450, attackMs: 1500, brain: 'charge',
    cost: 0, firstWave: Infinity, gold: 25, xp: 30,
    boss: { summon: 'slime', summonEveryMs: 6000, maxMinions: 4, shockEveryMs: 5000, shockWarnMs: 800, shockRadius: 3, shockDmg: 10 },
  },
};

export const ENEMY_KINDS = Object.keys(ENEMIES) as EnemyKind[];
export const BOSS_KIND: EnemyKind = 'slimeKing';
