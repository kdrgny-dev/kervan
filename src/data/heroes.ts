export type HeroKind = 'knight' | 'archer' | 'mage' | 'priest' | 'rogue' | 'fatih';

export type AttackKind = 'melee' | 'arrow' | 'fireball' | 'holy';

export interface HeroDef {
  name: string;
  role: string;
  color: number;
  glyph: string;
  hp: number;
  dmg: number;
  cooldownMs: number;
  range: number;
  attack: AttackKind;
  splash?: number;
  heal?: { amount: number; everyMs: number };
  crit?: { chance: number; mult: number };
  /** Destan ödülü; altınla açılmaz. */
  legendary?: boolean;
}

export const HEROES: Record<HeroKind, HeroDef> = {
  knight: {
    name: 'Şövalye', role: 'Yakın dövüş, dayanıklı', color: 0x4a7bd8, glyph: 'Ş',
    hp: 60, dmg: 10, cooldownMs: 800, range: 1, attack: 'melee',
  },
  archer: {
    name: 'Okçu', role: 'Menzilli, tek hedef', color: 0x4fae5a, glyph: 'O',
    hp: 35, dmg: 6, cooldownMs: 700, range: 4, attack: 'arrow',
  },
  mage: {
    name: 'Büyücü', role: 'Alan hasarı', color: 0x9a5bd6, glyph: 'Bü',
    hp: 30, dmg: 8, cooldownMs: 1400, range: 3, attack: 'fireball', splash: 1,
  },
  priest: {
    name: 'Rahip', role: 'Kafileyi iyileştirir', color: 0xe8d27a, glyph: 'R',
    hp: 40, dmg: 3, cooldownMs: 1000, range: 3, attack: 'holy', heal: { amount: 3, everyMs: 3000 },
  },
  rogue: {
    name: 'Haydut', role: 'Hızlı, kritik vuruş', color: 0x5a4a8a, glyph: 'H',
    hp: 50, dmg: 9, cooldownMs: 550, range: 1, attack: 'melee', crit: { chance: 0.25, mult: 2 },
  },
  fatih: {
    name: 'Fatih', role: 'Şahi topu, alan hasarı', color: 0xc8402a, glyph: 'F',
    hp: 55, dmg: 16, cooldownMs: 1900, range: 5, attack: 'fireball', splash: 1, legendary: true,
  },
};

export const HERO_KINDS = Object.keys(HEROES) as HeroKind[];
