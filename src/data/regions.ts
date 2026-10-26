import type { EnemyKind } from './enemies';

export type RoadRegion = 'vale' | 'bones' | 'ash' | 'frost';
export type FetihRegion = 'hisar' | 'halic' | 'galata' | 'surlar';
export type AlplerRegion = 'iber' | 'pirene' | 'zirve' | 'po';
export type RegionId = RoadRegion | FetihRegion | AlplerRegion;

export interface RegionDef {
  name: string;
  desc: string;
  /** Bölge içi dalga sırasına göre açılan düşmanlar (1 = bölgenin ilk dalgası). */
  roster: { kind: EnemyKind; from: number }[];
  boss: EnemyKind;
  /** Bölgenin son (10.) dalgasında boss yerine gelen final boss. */
  finalBoss?: EnemyKind;
  /** Harita ve arayüzde bölgenin ana rengi. */
  color: number;
}

/** Bir bölgede kaç dalga geçirilir; boss her 5. dalgada. */
export const REGION_WAVES = 10;

export const REGIONS: Record<RegionId, RegionDef> = {
  vale: {
    color: 0x6fbf5a,
    name: 'Yeşil Vadi',
    desc: 'Kervanın yola çıktığı çayırlar. Balçıklar dost canlısıdır, yalnızca fazla yapışkandır.',
    roster: [
      { kind: 'slime', from: 1 },
      { kind: 'bat', from: 2 },
      { kind: 'skeleton', from: 3 },
      { kind: 'goblin', from: 4 },
    ],
    boss: 'slimeKing',
  },
  bones: {
    color: 0xd8c49a,
    name: 'Kemik Ovası',
    desc: 'Eski bir savaş meydanı. İskeletler kendi kemiklerini sayar, eksik çıkınca seninkilere göz diker.',
    roster: [
      { kind: 'skeleton', from: 1 },
      { kind: 'wraith', from: 1 },
      { kind: 'bat', from: 2 },
      { kind: 'goblin', from: 4 },
    ],
    boss: 'boneLord',
  },
  ash: {
    color: 0xe5533d,
    name: 'Kül Dağları',
    desc: 'Toprağı sıcak, havası isli. Çayı demlemeye gerek yok, bardağı tutman yeter.',
    roster: [
      { kind: 'magmaSlime', from: 1 },
      { kind: 'goblin', from: 1 },
      { kind: 'bat', from: 2 },
      { kind: 'wraith', from: 4 },
    ],
    boss: 'emberKing',
  },
  frost: {
    color: 0x9fd0ff,
    name: 'Buz Çölü',
    desc: 'Ne kum var ne çöl; sadece buz. Adını koyan coğrafya bilmezmiş (Hüsnü koymuş).',
    roster: [
      { kind: 'frostSkeleton', from: 1 },
      { kind: 'wraith', from: 1 },
      { kind: 'goblin', from: 2 },
      { kind: 'magmaSlime', from: 5 },
    ],
    boss: 'frostGiant',
  },
  hisar: {
    color: 0xc9b48a,
    name: 'Rumeli Hisarı',
    desc: 'Hisar üç ayda yükseldi. Taşları dedemin develeri taşıdı, develer hâlâ şikâyet eder.',
    // Destanın ilk bölgesi: yavaş başlar, kovalayan mazgal üçüncü dalgada gelir
    roster: [
      { kind: 'bat', from: 1 },
      { kind: 'chainSerpent', from: 1 },
      { kind: 'mazgal', from: 3 },
      { kind: 'skeleton', from: 4 },
      { kind: 'catapultGolem', from: 5 },
    ],
    boss: 'stoneSentinel',
  },
  halic: {
    color: 0x4a8ac9,
    name: 'Haliç Kıyısı',
    desc: 'Limanın ağzı zincirle kapalı. Zincir de canlanmış, kimse şaşırmadı.',
    roster: [
      { kind: 'fogWisp', from: 1 },
      { kind: 'chainSerpent', from: 1 },
      { kind: 'mazgal', from: 3 },
      { kind: 'bat', from: 4 },
    ],
    boss: 'harborKraken',
  },
  galata: {
    color: 0x6fae5a,
    name: 'Galata Sırtları',
    desc: 'Gemiler buradan karadan yürüdü. Kızakları yağlayan yağ küpleri biraz fazla heveslendi.',
    roster: [
      { kind: 'chainSerpent', from: 1 },
      { kind: 'catapultGolem', from: 1 },
      { kind: 'fogWisp', from: 2 },
      { kind: 'goblin', from: 4 },
    ],
    boss: 'oilGiant',
  },
  surlar: {
    color: 0x8a4a4a,
    name: 'Kara Surlar',
    desc: 'Bin yıllık surlar. Yorgunlar ama pes etmeye niyetleri yok.',
    roster: [
      { kind: 'mazgal', from: 1 },
      { kind: 'catapultGolem', from: 1 },
      { kind: 'chainSerpent', from: 2 },
      { kind: 'fogWisp', from: 3 },
    ],
    boss: 'stoneSentinel',
    finalBoss: 'wallWarden',
  },
  iber: {
    color: 0xe0a860,
    name: 'İber Kıyısı',
    desc: 'Filler gemiden indi, kumda yürümeyi beğenmedi. Yengeçler de filleri beğenmedi.',
    // Fil ilk dalgada katılır; kovalayan martı ikinci dalgadan
    roster: [
      { kind: 'sandCrab', from: 1 },
      { kind: 'slime', from: 1 },
      { kind: 'gull', from: 2 },
      { kind: 'goat', from: 5 },
    ],
    boss: 'tideCrab',
  },
  pirene: {
    color: 0x4f8a4a,
    name: 'Pireneler',
    desc: 'Çam ormanları, dar patikalar, inatçı keçiler. Keçiler patikanın kendilerine ait olduğunu düşünür.',
    roster: [
      { kind: 'goat', from: 1 },
      { kind: 'gull', from: 1 },
      { kind: 'sandCrab', from: 2 },
      { kind: 'snowball', from: 4 },
    ],
    boss: 'caveBear',
  },
  zirve: {
    color: 0xcfe6ff,
    name: 'Karlı Alpler',
    desc: 'Kar dizden, rüzgâr kulaktan. Filler kardan adam yapmayı öğrendi, kimse öğretmedi.',
    roster: [
      { kind: 'snowball', from: 1 },
      { kind: 'goat', from: 1 },
      { kind: 'yeti', from: 2 },
      { kind: 'gull', from: 4 },
    ],
    boss: 'stormEagle',
  },
  po: {
    color: 0x8ccf5a,
    name: 'Po Ovası',
    desc: 'Dağdan indik, ova yemyeşil. Ama dağdan inen bir tek biz değiliz.',
    roster: [
      { kind: 'yeti', from: 1 },
      { kind: 'snowball', from: 1 },
      { kind: 'goat', from: 2 },
      { kind: 'sandCrab', from: 3 },
    ],
    boss: 'stormEagle',
    finalBoss: 'avalancheGiant',
  },
};

export const ROUTE: RoadRegion[] = ['vale', 'bones', 'ash', 'frost'];

/** n. dalganın yolculuktaki yeri: bölge, bölge içi dalga, kaçıncı yolculuk. */
export function regionAt(wave: number, route: readonly RegionId[] = ROUTE) {
  const index = Math.floor((Math.max(1, wave) - 1) / REGION_WAVES);
  return {
    id: route[index % route.length],
    index: index % route.length,
    local: ((Math.max(1, wave) - 1) % REGION_WAVES) + 1,
    journey: Math.floor(index / route.length) + 1,
  };
}

/** n. dalganın boss'u (bölgenin son dalgasında varsa final boss). */
export function bossAt(wave: number, route: readonly RegionId[] = ROUTE): EnemyKind {
  const r = regionAt(wave, route);
  const def = REGIONS[r.id];
  return r.local === REGION_WAVES && def.finalBoss ? def.finalBoss : def.boss;
}

export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
export const journeyName = (j: number) => `Yolculuk ${ROMAN[j] ?? j}`;
