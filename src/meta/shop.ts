import {
  BEST_LIST_SIZE,
  GEM_UPGRADES,
  type GemUpgrade,
  MARKET_STEP,
  MARKET_UPGRADES,
  type MarketUpgrade,
  type HeroStat,
  MAX_UPGRADE,
  POWER_BONUS_STEP_MS,
  UNLOCK_COST,
  upgradeCost,
} from '../data/economy';
import type { HeroKind } from '../data/heroes';
import type { Loadout } from '../sim/types';
import type { SaveData, ScoreEntry } from './save';

export function unlockHero(s: SaveData, kind: HeroKind): boolean {
  const cost = UNLOCK_COST[kind];
  if (s.unlocked.includes(kind) || s.gold < cost) return false;
  s.gold -= cost;
  s.unlocked.push(kind);
  return true;
}

export function nextUpgradeCost(s: SaveData, kind: HeroKind, stat: HeroStat): number | null {
  const level = s.upgrades[kind][stat];
  return level >= MAX_UPGRADE ? null : upgradeCost(level);
}

export function upgradeHero(s: SaveData, kind: HeroKind, stat: HeroStat): boolean {
  const cost = nextUpgradeCost(s, kind, stat);
  if (cost === null || !s.unlocked.includes(kind) || s.gold < cost) return false;
  s.gold -= cost;
  s.upgrades[kind][stat]++;
  return true;
}

export function nextMarketCost(s: SaveData, key: MarketUpgrade): number | null {
  return MARKET_UPGRADES[key].costs[s.market[key]] ?? null;
}

export function buyMarket(s: SaveData, key: MarketUpgrade): boolean {
  const cost = nextMarketCost(s, key);
  if (cost === null || s.gold < cost) return false;
  s.gold -= cost;
  s.market[key]++;
  return true;
}

export function nextGemCost(s: SaveData, key: GemUpgrade): number | null {
  return GEM_UPGRADES[key].costs[s.gemUpgrades[key]] ?? null;
}

export function buyGemUpgrade(s: SaveData, key: GemUpgrade): boolean {
  const cost = nextGemCost(s, key);
  if (cost === null || s.gems < cost) return false;
  s.gems -= cost;
  s.gemUpgrades[key]++;
  return true;
}

export interface RunResult {
  hero: HeroKind;
  wave: number;
  kills: number;
  gold: number;
  gems: number;
  score: number;
}

/** Tur kazancını kalıcı hesaba ekler. Rekor listesine girdiyse sırası (0 = en iyi), yoksa -1. */
export function applyRun(s: SaveData, r: RunResult, now = new Date()): number {
  s.gold += r.gold;
  s.gems += r.gems;
  const entry: ScoreEntry = { score: r.score, wave: r.wave, kills: r.kills, gold: r.gold, hero: r.hero, date: now.toISOString() };
  s.best.push(entry);
  s.best.sort((a, b) => b.score - a.score);
  s.best = s.best.slice(0, BEST_LIST_SIZE);
  return s.best.indexOf(entry);
}

export function loadoutFrom(s: SaveData, leader: HeroKind): Loadout {
  return {
    leader: s.unlocked.includes(leader) ? leader : s.unlocked[0],
    unlocked: [...s.unlocked],
    upgrades: structuredClone(s.upgrades),
    startPower: s.gemUpgrades.startPower > 0,
    powerBonusMs: s.gemUpgrades.powerDuration * POWER_BONUS_STEP_MS,
    secondHero: s.gemUpgrades.secondHero > 0,
    goldMult: 1 + MARKET_STEP * s.market.goldGain,
    freeRerolls: s.market.freeRerolls,
    cards: [...s.cardsUnlocked],
  };
}
