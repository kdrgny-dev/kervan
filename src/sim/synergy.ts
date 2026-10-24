import type { HeroKind } from '../data/heroes';
import { HERO_CLASS, HERO_CLASSES, type HeroClass, SYNERGY_TIERS } from '../data/synergies';
import type { Hero } from './types';

export type SynergyTiers = Record<HeroClass, 0 | 1 | 2>;

export function classCounts(party: Hero[]): Record<HeroClass, number> {
  const counts = Object.fromEntries(HERO_CLASSES.map((c) => [c, 0])) as Record<HeroClass, number>;
  for (const h of party) counts[HERO_CLASS[h.kind]]++;
  return counts;
}

export function computeSynergies(party: Hero[]): SynergyTiers {
  const counts = classCounts(party);
  const out = {} as SynergyTiers;
  for (const c of HERO_CLASSES) out[c] = counts[c] >= SYNERGY_TIERS[1] ? 2 : counts[c] >= SYNERGY_TIERS[0] ? 1 : 0;
  return out;
}

export const emptySynergies = (): SynergyTiers => computeSynergies([]);

export const classOf = (kind: HeroKind) => HERO_CLASS[kind];
