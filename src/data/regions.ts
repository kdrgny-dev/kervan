import type { EnemyKind } from './enemies';

export type RegionId = 'vale' | 'bones' | 'ash' | 'frost';

export interface RegionDef {
  name: string;
  desc: string;
  /** Bölge içi dalga sırasına göre açılan düşmanlar (1 = bölgenin ilk dalgası). */
  roster: { kind: EnemyKind; from: number }[];
  boss: EnemyKind;
  /** Çizimler gelene kadar karoları renklendirmek için. */
  floorTint: number;
  wallTint: number;
  /** Zemine binen renk katmanı (çizimler gelene kadar bölgeyi ayırt etmek için). */
  overlay?: { color: number; alpha: number };
  /** Arena süsleri (decor.1..6) arasından. */
  decor: number[];
}

/** Bir bölgede kaç dalga geçirilir; boss her 5. dalgada. */
export const REGION_WAVES = 10;

export const REGIONS: Record<RegionId, RegionDef> = {
  vale: {
    name: 'Yeşil Vadi',
    desc: 'Kervanın yola çıktığı çayırlar. Balçıklar dost canlısıdır, yalnızca fazla yapışkandır.',
    roster: [
      { kind: 'slime', from: 1 },
      { kind: 'bat', from: 2 },
      { kind: 'skeleton', from: 3 },
      { kind: 'goblin', from: 4 },
    ],
    boss: 'slimeKing',
    floorTint: 0xffffff,
    wallTint: 0xc4c0d0,
    decor: [1, 2, 4, 5],
  },
  bones: {
    name: 'Kemik Ovası',
    desc: 'Eski bir savaş meydanı. İskeletler kendi kemiklerini sayar, eksik çıkınca seninkilere göz diker.',
    roster: [
      { kind: 'skeleton', from: 1 },
      { kind: 'wraith', from: 1 },
      { kind: 'bat', from: 2 },
      { kind: 'goblin', from: 4 },
    ],
    boss: 'boneLord',
    floorTint: 0xd8cba8,
    wallTint: 0xd0c4a8,
    overlay: { color: 0xcdb88a, alpha: 0.42 },
    decor: [2, 3, 3, 6],
  },
  ash: {
    name: 'Kül Dağları',
    desc: 'Toprağı sıcak, havası isli. Çayı demlemeye gerek yok, bardağı tutman yeter.',
    roster: [
      { kind: 'magmaSlime', from: 1 },
      { kind: 'goblin', from: 1 },
      { kind: 'bat', from: 2 },
      { kind: 'wraith', from: 4 },
    ],
    boss: 'emberKing',
    floorTint: 0xc08070,
    wallTint: 0x9a6a62,
    overlay: { color: 0x6a2418, alpha: 0.42 },
    decor: [2, 3, 6],
  },
  frost: {
    name: 'Buz Çölü',
    desc: 'Ne kum var ne çöl; sadece buz. Adını koyan coğrafya bilmezmiş (Hüsnü koymuş).',
    roster: [
      { kind: 'frostSkeleton', from: 1 },
      { kind: 'wraith', from: 1 },
      { kind: 'goblin', from: 2 },
      { kind: 'magmaSlime', from: 5 },
    ],
    boss: 'frostGiant',
    floorTint: 0xc8dcff,
    wallTint: 0xdce8ff,
    overlay: { color: 0xe4f0ff, alpha: 0.5 },
    decor: [2, 3],
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
