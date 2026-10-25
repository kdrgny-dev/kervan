import type { EnemyKind } from './enemies';

export type RegionId = 'vale' | 'bones' | 'ash' | 'frost';

export interface RegionDef {
  name: string;
  desc: string;
  /** Bölge içi dalga sırasına göre açılan düşmanlar (1 = bölgenin ilk dalgası). */
  roster: { kind: EnemyKind; from: number }[];
  boss: EnemyKind;
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
};

export const ROUTE: RegionId[] = ['vale', 'bones', 'ash', 'frost'];

/** n. dalganın yolculuktaki yeri: bölge, bölge içi dalga, kaçıncı yolculuk. */
export function regionAt(wave: number) {
  const index = Math.floor((Math.max(1, wave) - 1) / REGION_WAVES);
  return {
    id: ROUTE[index % ROUTE.length],
    index: index % ROUTE.length,
    local: ((Math.max(1, wave) - 1) % REGION_WAVES) + 1,
    journey: Math.floor(index / ROUTE.length) + 1,
  };
}

export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
export const journeyName = (j: number) => `Yolculuk ${ROMAN[j] ?? j}`;
