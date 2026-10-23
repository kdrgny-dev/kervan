export type PowerKind = 'rage' | 'shield' | 'speed' | 'magnet' | 'bomb';

export interface PowerDef {
  name: string;
  color: number;
  glyph: string;
  /** 0 = anında etki */
  durationMs: number;
}

export const POWERS: Record<PowerKind, PowerDef> = {
  rage: { name: 'Öfke', color: 0xe5533d, glyph: 'Ö', durationMs: 8000 },
  shield: { name: 'Kalkan', color: 0x5ab8f0, glyph: 'K', durationMs: 8000 },
  speed: { name: 'Hız', color: 0xf0c23b, glyph: 'H', durationMs: 8000 },
  magnet: { name: 'Mıknatıs', color: 0xc77dff, glyph: 'M', durationMs: 8000 },
  bomb: { name: 'Bomba', color: 0x3a3a3a, glyph: 'B', durationMs: 0 },
};

export const POWER_KINDS = Object.keys(POWERS) as PowerKind[];

/** Düşman başına tek zar; sıralı eşikler (kümülatif). */
export const DROP_TABLE = [
  { kind: 'hero', chance: 0.03 },
  { kind: 'power', chance: 0.06 },
  { kind: 'gem', chance: 0.02 },
  { kind: 'coin', chance: 0.7 },
] as const;

export const LOOT_LIFETIME_MS = 10000;
export const LOOT_BLINK_MS = 3000;

export const RAGE_MULT = 2;
export const SPEED_TICK_MS = 120;
export const MAGNET_RADIUS = 5;
export const BOMB_DMG = 30;

export const LEVEL_BONUS = 0.08;
export const xpToNext = (level: number) => Math.round(20 * 1.35 ** level);

export const score = (wave: number, kills: number, gold: number) => wave * 100 + kills * 5 + gold;
