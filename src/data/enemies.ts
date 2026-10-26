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
  | 'frostGiant'
  | 'mazgal'
  | 'chainSerpent'
  | 'fogWisp'
  | 'catapultGolem'
  | 'stoneSentinel'
  | 'harborKraken'
  | 'oilGiant'
  | 'wallWarden'
  | 'sandCrab'
  | 'gull'
  | 'goat'
  | 'snowball'
  | 'snowling'
  | 'yeti'
  | 'tideCrab'
  | 'caveBear'
  | 'stormEagle'
  | 'avalancheGiant';

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
  /** Hücreye göre çizim boyu (varsayılan: boss 1.8, diğerleri 1.05). */
  spriteScale?: number;
  /** Ölünce bu türden N tane doğurur. */
  splitInto?: { kind: EnemyKind; count: number };
  /** Uzaktan saldıranların mermisi (varsayılan kemik ok). */
  shot?: 'bone' | 'snow';
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
    range: 4, slowMs: 1500, shot: 'snow',
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

  // Fetih destanı
  mazgal: {
    name: 'Canlı Mazgal', color: 0x9a9488, glyph: 'Mz', hp: 26, dmg: 10, moveMs: 280, attackMs: 1100, brain: 'charge', cost: 4, firstWave: Infinity, gold: 2,
  },
  chainSerpent: {
    name: 'Zincir Yılanı', color: 0x8a8f99, glyph: 'Zy', hp: 26, dmg: 9, moveMs: 320, attackMs: 1000, brain: 'wander', cost: 3, firstWave: Infinity, gold: 2,
  },
  fogWisp: {
    name: 'Sis Perisi', color: 0xc8d0e0, glyph: 'Sp', hp: 12, dmg: 5, moveMs: 190, attackMs: 700, brain: 'erratic', cost: 2, firstWave: Infinity, gold: 1,
  },
  catapultGolem: {
    name: 'Mancınık Golemi', color: 0xb08a5a, glyph: 'Mg', hp: 28, dmg: 8, moveMs: 420, attackMs: 2400, brain: 'kite', cost: 4, firstWave: Infinity, gold: 2,
    range: 5,
  },
  stoneSentinel: {
    name: 'Taş Nöbetçi', color: 0xb8b0a0, glyph: 'TN', hp: 260, dmg: 20, moveMs: 460, attackMs: 1500, brain: 'charge',
    cost: 0, firstWave: Infinity, gold: 30, xp: 40,
    boss: { summon: 'mazgal', summonEveryMs: 8000, maxMinions: 2, shockEveryMs: 5000, shockWarnMs: 800, shockRadius: 3, shockDmg: 12 },
  },
  harborKraken: {
    name: 'Liman Ahtapotu', color: 0x4a7ab0, glyph: 'LA', hp: 340, dmg: 18, moveMs: 440, attackMs: 1500, brain: 'kite', range: 5,
    cost: 0, firstWave: Infinity, gold: 35, xp: 45,
    boss: { summon: 'chainSerpent', summonEveryMs: 6000, maxMinions: 4, shockEveryMs: 7000, shockWarnMs: 800, shockRadius: 3, shockDmg: 12, volley: { everyMs: 3500, count: 3 } },
  },
  oilGiant: {
    name: 'Yağ Küpü Devi', color: 0xd8b048, glyph: 'YD', hp: 400, dmg: 22, moveMs: 430, attackMs: 1500, brain: 'charge',
    cost: 0, firstWave: Infinity, gold: 40, xp: 50,
    boss: { summon: 'fogWisp', summonEveryMs: 5500, maxMinions: 4, shockEveryMs: 5000, shockWarnMs: 800, shockRadius: 3, shockDmg: 14, shockSlowMs: 1500 },
  },
  wallWarden: {
    name: 'Sur Bekçisi Dev', color: 0x8a8070, glyph: 'SB', hp: 620, dmg: 26, moveMs: 480, attackMs: 1600, brain: 'charge',
    cost: 0, firstWave: Infinity, gold: 80, xp: 120, spriteScale: 2.3,
    boss: { summon: 'mazgal', summonEveryMs: 5000, maxMinions: 5, shockEveryMs: 5000, shockWarnMs: 900, shockRadius: 4, shockDmg: 16, volley: { everyMs: 4000, count: 3 } },
  },

  // Alpler destanı
  sandCrab: {
    name: 'Kum Yengeci', color: 0xe07a3a, glyph: 'Ky', hp: 22, dmg: 7, moveMs: 260, attackMs: 900, brain: 'erratic', cost: 2, firstWave: Infinity, gold: 1,
  },
  gull: {
    name: 'Martı', color: 0xeeeeee, glyph: 'Mr', hp: 10, dmg: 5, moveMs: 190, attackMs: 800, brain: 'charge', cost: 2, firstWave: Infinity, gold: 1,
  },
  goat: {
    name: 'Dağ Keçisi', color: 0xb89a7a, glyph: 'Dk', hp: 30, dmg: 10, moveMs: 260, attackMs: 1000, brain: 'charge', cost: 4, firstWave: Infinity, gold: 2,
  },
  snowball: {
    name: 'Kartopu', color: 0xf4f8ff, glyph: 'Kt', hp: 28, dmg: 8, moveMs: 330, attackMs: 1000, brain: 'wander', cost: 4, firstWave: Infinity, gold: 2,
    splitInto: { kind: 'snowling', count: 2 },
  },
  snowling: {
    name: 'Küçük Kartopu', color: 0xf4f8ff, glyph: 'kt', hp: 9, dmg: 4, moveMs: 300, attackMs: 900, brain: 'wander', cost: 1, firstWave: Infinity, gold: 1,
    look: { as: 'snowball', tint: 0xffffff, scale: 0.75 },
  },
  yeti: {
    name: 'Yeti', color: 0xdfe8f0, glyph: 'Ye', hp: 34, dmg: 6, moveMs: 440, attackMs: 2000, brain: 'kite', cost: 4, firstWave: Infinity, gold: 2,
    range: 4, slowMs: 1500,
  },
  tideCrab: {
    name: 'Gelgit Yengeci', color: 0xd8603a, glyph: 'GY', hp: 260, dmg: 18, moveMs: 440, attackMs: 1500, brain: 'charge',
    cost: 0, firstWave: Infinity, gold: 30, xp: 40,
    boss: { summon: 'sandCrab', summonEveryMs: 7000, maxMinions: 3, shockEveryMs: 5000, shockWarnMs: 800, shockRadius: 3, shockDmg: 12 },
  },
  caveBear: {
    name: 'Mağara Ayısı', color: 0x7a5a3a, glyph: 'MA', hp: 360, dmg: 22, moveMs: 420, attackMs: 1400, brain: 'charge',
    cost: 0, firstWave: Infinity, gold: 35, xp: 45,
    boss: { summon: 'goat', summonEveryMs: 6500, maxMinions: 3, shockEveryMs: 4500, shockWarnMs: 800, shockRadius: 3, shockDmg: 14 },
  },
  stormEagle: {
    name: 'Fırtına Kartalı', color: 0x8ab0d8, glyph: 'FK', hp: 380, dmg: 18, moveMs: 400, attackMs: 1500, brain: 'kite', range: 5,
    cost: 0, firstWave: Infinity, gold: 40, xp: 50,
    boss: { summon: 'gull', summonEveryMs: 5500, maxMinions: 4, shockEveryMs: 6000, shockWarnMs: 800, shockRadius: 3, shockDmg: 12, shockSlowMs: 2000, volley: { everyMs: 3500, count: 3 } },
  },
  avalancheGiant: {
    name: 'Çığ Devi', color: 0xe8f0ff, glyph: 'ÇD', hp: 640, dmg: 26, moveMs: 480, attackMs: 1600, brain: 'charge',
    cost: 0, firstWave: Infinity, gold: 80, xp: 120,
    boss: { summon: 'snowball', summonEveryMs: 5000, maxMinions: 5, shockEveryMs: 5000, shockWarnMs: 900, shockRadius: 4, shockDmg: 16, shockSlowMs: 2500 },
    spriteScale: 2.3,
  },
};

export const ENEMY_KINDS = Object.keys(ENEMIES) as EnemyKind[];
export const BOSS_KIND: EnemyKind = 'slimeKing';
