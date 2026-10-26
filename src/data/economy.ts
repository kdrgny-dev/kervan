import type { HeroKind } from './heroes';

export const UNLOCK_COST: Record<HeroKind, number> = {
  knight: 0,
  archer: 0,
  mage: 400,
  priest: 700,
  rogue: 1000,
  fatih: 0,
  hannibal: 0,
  elephant: 0,
};

export const STARTING_HEROES: HeroKind[] = ['knight', 'archer'];

export type HeroStat = 'hp' | 'dmg';
export const MAX_UPGRADE = 10;
export const UPGRADE_STEP = 0.1;
export const upgradeCost = (level: number) => Math.round(80 * 1.6 ** level);

export type GemUpgrade = 'startPower' | 'powerDuration' | 'secondHero';

export const GEM_UPGRADES: Record<GemUpgrade, { name: string; desc: string; costs: number[] }> = {
  startPower: { name: 'Hızlı başlangıç', desc: 'İlk dalgada rastgele güçlendirme', costs: [5] },
  powerDuration: { name: 'Uzun etki', desc: 'Güçlendirme süresi +2 sn', costs: [10, 10, 10] },
  secondHero: { name: 'Yoldaş', desc: 'Tura 2 kahramanla başla', costs: [25] },
};

export const GEM_UPGRADE_KEYS = Object.keys(GEM_UPGRADES) as GemUpgrade[];

export type MarketUpgrade = 'goldGain' | 'freeRerolls' | 'xpGain';

/** Pazar: altınla alınan kamp yükseltmeleri. */
export const MARKET_UPGRADES: Record<MarketUpgrade, { name: string; desc: string; costs: number[] }> = {
  goldGain: { name: 'Tüccar Ağı', desc: 'Turlarda altın +%10', costs: [300, 600, 1200, 2400, 4800] },
  freeRerolls: { name: 'Kervan Kasası', desc: 'Her tur +1 ücretsiz yeniden çekme', costs: [500, 1500, 4000] },
  xpGain: { name: 'Harita Ustası', desc: 'Hesap XP’si +%10', costs: [400, 800, 1600, 3200, 6400] },
};

export const MARKET_KEYS = Object.keys(MARKET_UPGRADES) as MarketUpgrade[];
export const MARKET_STEP = 0.1;

export const POWER_BONUS_STEP_MS = 2000;
export const BEST_LIST_SIZE = 10;
