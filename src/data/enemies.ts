export type EnemyKind =
  | 'slime'
  | 'bat'
  | 'skeleton'
  | 'goblin'
  | 'wraith'
  | 'magmaSlime'
  | 'frostSkeleton'
  | 'slimeKing'
  | 'boneLord'
  | 'emberKing'
  | 'frostGiant';

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
  /** Şok dalgası vurduğu kahramanları yavaşlatır (ms). */
  shockSlowMs?: number;
  /** Her X ms'de en yakın N kahramana kemik oku atar. */
  volley?: { everyMs: number; count: number };
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
  /** Çizimi olmayan türler başka bir türün sprite'ını renklendirerek kullanır. */
  look?: { as: EnemyKind; tint: number; scale?: number; alpha?: number };
  /** Ölünce bu türden N tane doğurur. */
  splitInto?: { kind: EnemyKind; count: number };
  /** Mermisi vurduğu kahramanı yavaşlatır (ms). */
  slowMs?: number;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  slime: { name: 'Balçık', color: 0x7bd96b, glyph: 'Bç', hp: 20, dmg: 8, moveMs: 400, attackMs: 1000, brain: 'wander', cost: 2, firstWave: 1, gold: 1 },
  bat: { name: 'Yarasa', color: 0x7a4fa8, glyph: 'Y', hp: 8, dmg: 4, moveMs: 200, attackMs: 800, brain: 'erratic', cost: 2, firstWave: 2, gold: 1 },
  skeleton: {
    name: 'İskelet Okçu', color: 0xd9d4c5, glyph: 'İ', hp: 15, dmg: 5, moveMs: 350, attackMs: 2000, brain: 'kite', cost: 3, firstWave: 3, gold: 2,
    range: 4,
  },
  goblin: { name: 'Goblin', color: 0x5c8a3a, glyph: 'Gb', hp: 45, dmg: 12, moveMs: 300, attackMs: 1200, brain: 'charge', cost: 5, firstWave: 4, gold: 3 },
  wraith: {
    name: 'Hayalet', color: 0xbfe8ff, glyph: 'Hy', hp: 16, dmg: 6, moveMs: 180, attackMs: 700, brain: 'erratic', cost: 3, firstWave: Infinity, gold: 1,
  },
  magmaSlime: {
    name: 'Magma Balçığı', color: 0xff8a4a, glyph: 'Mb', hp: 34, dmg: 10, moveMs: 380, attackMs: 1000, brain: 'wander', cost: 4, firstWave: Infinity, gold: 2, splitInto: { kind: 'slime', count: 2 },
  },
  frostSkeleton: {
    name: 'Buz İskeleti', color: 0x9fd8ff, glyph: 'Bİ', hp: 24, dmg: 6, moveMs: 340, attackMs: 1800, brain: 'kite', cost: 4, firstWave: Infinity, gold: 2,
    range: 4, slowMs: 1500,
  },
  slimeKing: {
    name: 'Balçık Kralı', color: 0x8a5bd6, glyph: 'K', hp: 260, dmg: 20, moveMs: 450, attackMs: 1500, brain: 'charge',
    cost: 0, firstWave: Infinity, gold: 25, xp: 30,
    boss: { summon: 'slime', summonEveryMs: 6000, maxMinions: 4, shockEveryMs: 5000, shockWarnMs: 800, shockRadius: 3, shockDmg: 10 },
  },
  boneLord: {
    name: 'Kemik Lordu', color: 0xe8e0c8, glyph: 'KL', hp: 300, dmg: 18, moveMs: 420, attackMs: 1500, brain: 'kite', range: 5,
    cost: 0, firstWave: Infinity, gold: 30, xp: 40,
    boss: { summon: 'skeleton', summonEveryMs: 6000, maxMinions: 4, shockEveryMs: 7000, shockWarnMs: 800, shockRadius: 3, shockDmg: 12, volley: { everyMs: 3500, count: 3 } },
  },
  emberKing: {
    name: 'Kor Kral', color: 0xff6a3a, glyph: 'KK', hp: 380, dmg: 22, moveMs: 450, attackMs: 1500, brain: 'charge',
    cost: 0, firstWave: Infinity, gold: 35, xp: 50,
    boss: { summon: 'magmaSlime', summonEveryMs: 6500, maxMinions: 3, shockEveryMs: 5000, shockWarnMs: 800, shockRadius: 3, shockDmg: 14 },
  },
  frostGiant: {
    name: 'Buz Devi', color: 0x9fd8ff, glyph: 'BD', hp: 440, dmg: 24, moveMs: 420, attackMs: 1600, brain: 'charge',
    cost: 0, firstWave: Infinity, gold: 40, xp: 60,
    boss: { summon: 'frostSkeleton', summonEveryMs: 7000, maxMinions: 3, shockEveryMs: 5500, shockWarnMs: 900, shockRadius: 3, shockDmg: 12, shockSlowMs: 2500 },
  },
};

export const ENEMY_KINDS = Object.keys(ENEMIES) as EnemyKind[];
export const BOSS_KIND: EnemyKind = 'slimeKing';
