import type { RegionId } from './regions';

export const NARRATOR = 'Kervanbaşı Hüsnü';

export interface StoryBeat {
  title: string;
  lines: string[];
}

/** Kervanbaşının anlattıkları; tetiklenince günlüğe yazılır. */
export const STORY = {
  intro: {
    title: 'Yola Çıkış',
    lines: [
      'Hoş geldin evlat! Ben Kervanbaşı Hüsnü. Kırk yıldır bu yolları arşınlarım, otuz dokuzunu balçıklardan kaçarak geçirdim.',
      'Sen kafileyi yönet, kahramanlar gerisini halleder. Bir kural var: duvara çarpma. Ben çarptım, hâlâ kulağım çınlar.',
      'Yol uzun, çay soğuk. Haydi bakalım!',
    ],
  },
  firstRun: {
    title: 'İlk Sefer',
    lines: [
      'Fena değil! Ben ilk seferimde devemi kaybetmiştim. Sonra deveyi buldum ama bu sefer kendimi kaybettim.',
      'Kampa uğra. Kışla yeni yoldaşlar bulur, Tapınak dua eder, Pazar da… pazarlık eder. Çok pazarlık eder.',
    ],
  },
  region_bones: {
    title: 'Kemik Ovası',
    lines: [
      'Kemik Ovası’na hoş geldin. Burada iskeletler kendi kemiklerini sayar; eksik çıkınca seninkilere göz diker.',
      'Bir de hayaletler var. Zararsızdır derler. Derler ama ben hiç inanmadım.',
    ],
  },
  region_ash: {
    title: 'Kül Dağları',
    lines: [
      'Kül Dağları sıcaktır evlat. O kadar sıcak ki çayı demlemeye gerek kalmaz, bardağı tutman yeter.',
      'Magma balçıklarına dikkat: vurdukça çoğalırlar. Tıpkı borçlarım gibi.',
    ],
  },
  region_frost: {
    title: 'Buz Çölü',
    lines: [
      'Buz Çölü! Ne kum var ne çöl, sadece buz. Adını koyan coğrafya bilmezmiş. …Ben koydum.',
      'Buz iskeletlerinin okları insanı yavaşlatır. Bir de soğuk. Soğuk da yavaşlatır. Her şey yavaşlatır burada.',
    ],
  },
  boss_slimeKing: {
    title: 'Taç Düştü',
    lines: ['Balçık Kralı’nı devirdin ha! Tacını ben alayım, hatıra olsun. …Yapışkanmış. Sen al.'],
  },
  boss_boneLord: {
    title: 'Kemik Lordu',
    lines: ['Kemik Lordu da gitti! Kemiklerini topladım, çorba yapacağım. Şaka şaka. Yarısı şaka.'],
  },
  boss_emberKing: {
    title: 'Kor Kral',
    lines: ['Kor Kral söndü! Közünde çay demledim, tadı biraz… kral gibi.'],
  },
  boss_frostGiant: {
    title: 'Buz Devi',
    lines: ['Buz Devi’ni erittin! Üstünde kayak yapmayı planlıyordum ama olsun, gölü de güzel.'],
  },
  journey2: {
    title: 'Yeni Bir Yol',
    lines: [
      'Yolun sonu mu? Hah! Yolun sonu, yeni bir yolun başıdır. Bunu bir çay ustası söylemişti… ya da ben uydurdum.',
      'Vadiye geri dönüyoruz ama dikkat: düşmanlar da bizi özlemiş, üstelik spor yapmışlar.',
    ],
  },
  level5: {
    title: 'Kervan Çırağı',
    lines: ['Artık sana “çaylak” demeyeceğim. “Kervan Çırağı” diyeceğim. Maaş aynı tabii.'],
  },
  level10: {
    title: 'Deve Fısıldayan',
    lines: ['Develer seninle konuşmaya başladı mı? Başlamadıysa dert etme, benimle de konuşmazlar.'],
  },
  level20: {
    title: 'Kervanbaşı Yardımcısı',
    lines: ['Yardımcım oldun! İlk görevin: çaydanlığı taşımak. İkinci görevin: çaydanlığı dökmemek.'],
  },
} satisfies Record<string, StoryBeat>;

export type StoryId = keyof typeof STORY;
export const STORY_ORDER = Object.keys(STORY) as StoryId[];

export const regionBeat = (id: RegionId): StoryId | null => (id === 'vale' ? null : (`region_${id}` as StoryId));
