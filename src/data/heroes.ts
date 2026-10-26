export type HeroKind = 'knight' | 'archer' | 'mage' | 'priest' | 'rogue' | 'fatih' | 'hannibal' | 'elephant';

export type AttackKind = 'melee' | 'arrow' | 'fireball' | 'holy' | 'cannon';

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
  /** Yalnızca destanda katılan yoldaş: kahraman seçiminde, mağazada, kayıtta yok. */
  companion?: boolean;
  /** Kafilede varken lider çarpışmada hasar almaz, düşmanı ezer. */
  crush?: boolean;
  /** Çizimi gelene kadar başka kahramanın sprite'ı renklendirilerek kullanılır. */
  look?: { as: HeroKind; tint: number; scale?: number };
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
    hp: 55, dmg: 16, cooldownMs: 1900, range: 5, attack: 'cannon', splash: 1, legendary: true,
  },
  hannibal: {
    name: 'Hannibal', role: 'Fil binicisi, çarpışma ezer', color: 0x9a6a3a, glyph: 'Hn',
    hp: 85, dmg: 13, cooldownMs: 1200, range: 1, attack: 'melee', splash: 1, legendary: true, crush: true,
    look: { as: 'knight', tint: 0xe0a060, scale: 1.1 },
  },
  elephant: {
    name: 'Fil', role: 'Tank, çarpışma ezer', color: 0x9a9aa8, glyph: 'Fl',
    hp: 140, dmg: 9, cooldownMs: 1500, range: 1, attack: 'melee', splash: 1, companion: true, crush: true,
    look: { as: 'knight', tint: 0x9aa0b4, scale: 1.3 },
  },
};

/** Oyuncunun açıp seçebildiği kahramanlar (destan yoldaşları hariç). */
export const HERO_KINDS = (Object.keys(HEROES) as HeroKind[]).filter((k) => !HEROES[k].companion);
