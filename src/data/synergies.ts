import type { HeroKind } from './heroes';

export type HeroClass = 'warrior' | 'marksman' | 'arcane' | 'holy' | 'shadow';

export const HERO_CLASS: Record<HeroKind, HeroClass> = {
  knight: 'warrior',
  archer: 'marksman',
  mage: 'arcane',
  priest: 'holy',
  rogue: 'shadow',
  fatih: 'warrior',
  hannibal: 'warrior',
  elephant: 'warrior',
};

export const SYNERGY_TIERS = [2, 4] as const;

export const SYNERGIES: Record<HeroClass, { name: string; hero: HeroKind; tiers: [string, string] }> = {
  warrior: { name: 'Savaşçı', hero: 'knight', tiers: ['Alınan hasar −%15', 'Alınan hasar −%30'] },
  marksman: { name: 'Nişancı', hero: 'archer', tiers: ['Okçulara +1 menzil', 'Okçular 2 hedefe atar'] },
  arcane: { name: 'Büyücü', hero: 'mage', tiers: ['Patlama alanı +1', 'Büyücü hasarı +%50'] },
  holy: { name: 'Kutsal', hero: 'priest', tiers: ['Şifa ×2', 'Şifa ×3'] },
  shadow: { name: 'Gölge', hero: 'rogue', tiers: ['Kritik şansı +%20', 'Kritik ×3'] },
};

export const HERO_CLASSES = Object.keys(SYNERGIES) as HeroClass[];
