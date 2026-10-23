import type { HeroKind } from './heroes';

export const UNLOCK_COST: Record<HeroKind, number> = {
  knight: 0,
  archer: 0,
  mage: 300,
  priest: 500,
  rogue: 800,
};

export const STARTING_HEROES: HeroKind[] = ['knight', 'archer'];

export type HeroStat = 'hp' | 'dmg';
export const MAX_UPGRADE = 10;
export const UPGRADE_STEP = 0.1;
export const upgradeCost = (level: number) => Math.round(50 * 1.5 ** level);

export type GemUpgrade = 'startPower' | 'powerDuration' | 'secondHero';

export const GEM_UPGRADES: Record<GemUpgrade, { name: string; desc: string; costs: number[] }> = {
  startPower: { name: 'Hızlı başlangıç', desc: 'İlk dalgada rastgele güçlendirme', costs: [5] },
  powerDuration: { name: 'Uzun etki', desc: 'Güçlendirme süresi +2 sn', costs: [10, 10, 10] },
  secondHero: { name: 'Yoldaş', desc: 'Tura 2 kahramanla başla', costs: [25] },
};

export const GEM_UPGRADE_KEYS = Object.keys(GEM_UPGRADES) as GemUpgrade[];

export const POWER_BONUS_STEP_MS = 2000;
export const BEST_LIST_SIZE = 10;
