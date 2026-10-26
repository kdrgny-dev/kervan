import type { HeroKind } from './heroes';
import { REGION_WAVES, ROUTE, type RegionId } from './regions';

export type CampaignId = 'road' | 'fetih' | 'alpler';

export interface CampaignDef {
  name: string;
  /** Kapakta başlığın altında. */
  era: string;
  desc: string;
  route: readonly RegionId[];
  unlockLevel: number;
  /** Destanı bitirince açılan efsanevi kahraman. */
  reward?: HeroKind;
  /** Her bölgenin boss dalgasında kafile gemi taşır, duvarlardan geçebilir. */
  ships?: boolean;
  /** Her bölgenin ilk dalgasında haritaya bu yoldaşın jetonu düşer. */
  companion?: HeroKind;
}

export const CAMPAIGNS: Record<CampaignId, CampaignDef> = {
  road: {
    name: 'Hüsnü’nün Yolu',
    era: 'Sonsuz yolculuk',
    desc: 'Yeşil Vadi’den Buz Çölü’ne, oradan yine en başa. Yol bitmez, çay soğumaz.',
    route: ROUTE,
    unlockLevel: 1,
  },
  fetih: {
    name: 'Fetih',
    era: 'Destan I · 1453',
    desc: 'Dede Hüsnü, Fatih’in toplarını ve gemilerini taşıyan kervanın başında. Gemiler karadan yürüyecek!',
    route: ['hisar', 'halic', 'galata', 'surlar'],
    unlockLevel: 6,
    reward: 'fatih',
    ships: true,
  },
  alpler: {
    name: 'Alpler',
    era: 'Destan II · MÖ 218',
    desc: 'Ata Hüsnü, Hannibal’ın fillerine bakıcı. Fillerden korkar, filler ona bayılır. Fil kafilede: çarpınca ezer!',
    route: ['iber', 'pirene', 'zirve', 'po'],
    unlockLevel: 8,
    reward: 'hannibal',
    companion: 'elephant',
  },
};

export const CAMPAIGN_IDS = Object.keys(CAMPAIGNS) as CampaignId[];
export const DESTAN_IDS = CAMPAIGN_IDS.filter((c) => c !== 'road');

/** Destanın bittiği dalga: rotanın son bölgesinin son dalgası. */
export const finalWave = (c: CampaignId) => CAMPAIGNS[c].route.length * REGION_WAVES;

/** "Yakında" kartlarında gösterilen gelecek destanlar. */
export const UPCOMING = [
  { name: 'İpek Yolu', era: 'Destan III · 1271' },
  { name: 'Bozkır', era: 'Destan IV · 1206' },
];

export const SHIP_MS = 10000;
