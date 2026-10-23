export type HeroKind = 'knight' | 'archer' | 'mage' | 'priest' | 'barbarian';

export type AttackKind = 'melee' | 'cleave' | 'arrow' | 'fireball' | 'holy';

export interface HeroDef {
  name: string;
  color: number;
  glyph: string;
  hp: number;
  dmg: number;
  cooldownMs: number;
  range: number;
  attack: AttackKind;
  splash?: number;
  heal?: { amount: number; everyMs: number };
}

export const HEROES: Record<HeroKind, HeroDef> = {
  knight: { name: 'Şövalye', color: 0x4a7bd8, glyph: 'Ş', hp: 60, dmg: 10, cooldownMs: 800, range: 1, attack: 'melee' },
  archer: { name: 'Okçu', color: 0x4fae5a, glyph: 'O', hp: 35, dmg: 6, cooldownMs: 700, range: 4, attack: 'arrow' },
  mage: { name: 'Büyücü', color: 0x9a5bd6, glyph: 'Bü', hp: 30, dmg: 8, cooldownMs: 1400, range: 3, attack: 'fireball', splash: 1 },
  priest: {
    name: 'Rahip', color: 0xe8d27a, glyph: 'R', hp: 40, dmg: 3, cooldownMs: 1000, range: 3, attack: 'holy',
    heal: { amount: 3, everyMs: 3000 },
  },
  barbarian: { name: 'Barbar', color: 0xd8613f, glyph: 'Ba', hp: 75, dmg: 14, cooldownMs: 1100, range: 1, attack: 'cleave' },
};

export const HERO_KINDS = Object.keys(HEROES) as HeroKind[];
