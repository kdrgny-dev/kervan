import type { RegionId } from './regions';

export const NARRATOR = 'Kervanbaşı Hüsnü';

export interface StoryBeat {
  title: string;
  lines: string[];
  /** Hüsnü'nün yüz ifadesi. */
  mood?: 'normal' | 'laugh' | 'surprised';
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
    mood: 'laugh',
    title: 'İlk Sefer',
    lines: [
      'Fena değil! Ben ilk seferimde devemi kaybetmiştim. Sonra deveyi buldum ama bu sefer kendimi kaybettim.',
      'Kampa uğra. Kışla yeni yoldaşlar bulur, Tapınak dua eder, Pazar da… pazarlık eder. Çok pazarlık eder.',
    ],
  },
  region_bones: {
    mood: 'surprised',
    title: 'Kemik Ovası',
    lines: [
      'Kemik Ovası’na hoş geldin. Burada iskeletler kendi kemiklerini sayar; eksik çıkınca seninkilere göz diker.',
      'Bir de hayaletler var. Zararsızdır derler. Derler ama ben hiç inanmadım.',
    ],
  },
  region_ash: {
    mood: 'laugh',
    title: 'Kül Dağları',
    lines: [
      'Kül Dağları sıcaktır evlat. O kadar sıcak ki çayı demlemeye gerek kalmaz, bardağı tutman yeter.',
      'Magma balçıklarına dikkat: vurdukça çoğalırlar. Tıpkı borçlarım gibi.',
    ],
  },
  region_frost: {
    mood: 'laugh',
    title: 'Buz Çölü',
    lines: [
      'Buz Çölü! Ne kum var ne çöl, sadece buz. Adını koyan coğrafya bilmezmiş. …Ben koydum.',
      'Buz iskeletlerinin okları insanı yavaşlatır. Bir de soğuk. Soğuk da yavaşlatır. Her şey yavaşlatır burada.',
    ],
  },
  boss_slimeKing: {
    mood: 'laugh',
    title: 'Taç Düştü',
    lines: ['Balçık Kralı’nı devirdin ha! Tacını ben alayım, hatıra olsun. …Yapışkanmış. Sen al.'],
  },
  boss_boneLord: {
    mood: 'laugh',
    title: 'Kemik Lordu',
    lines: ['Kemik Lordu da gitti! Kemiklerini topladım, çorba yapacağım. Şaka şaka. Yarısı şaka.'],
  },
  boss_emberKing: {
    mood: 'laugh',
    title: 'Kor Kral',
    lines: ['Kor Kral söndü! Közünde çay demledim, tadı biraz… kral gibi.'],
  },
  boss_frostGiant: {
    mood: 'surprised',
    title: 'Buz Devi',
    lines: ['Buz Devi’ni erittin! Üstünde kayak yapmayı planlıyordum ama olsun, gölü de güzel.'],
  },
  journey2: {
    mood: 'surprised',
    title: 'Yeni Bir Yol',
    lines: [
      'Yolun sonu mu? Hah! Yolun sonu, yeni bir yolun başıdır. Bunu bir çay ustası söylemişti… ya da ben uydurdum.',
      'Vadiye geri dönüyoruz ama dikkat: düşmanlar da bizi özlemiş, üstelik spor yapmışlar.',
    ],
  },
  level5: {
    mood: 'laugh',
    title: 'Kervan Çırağı',
    lines: ['Artık sana “çaylak” demeyeceğim. “Kervan Çırağı” diyeceğim. Maaş aynı tabii.'],
  },
  level10: {
    mood: 'laugh',
    title: 'Deve Fısıldayan',
    lines: ['Develer seninle konuşmaya başladı mı? Başlamadıysa dert etme, benimle de konuşmazlar.'],
  },
  level20: {
    mood: 'laugh',
    title: 'Kervanbaşı Yardımcısı',
    lines: ['Yardımcım oldun! İlk görevin: çaydanlığı taşımak. İkinci görevin: çaydanlığı dökmemek.'],
  },

  // ---------- Destan I · Fetih ----------
  destans: {
    mood: 'surprised',
    title: 'Destanlar',
    lines: [
      'Sana hiç dedelerimi anlattım mı? Anlatmadıysam ayıp etmişim. Anlattıysam yine dinle, her seferinde daha güzel oluyor.',
      'Tarihin bütün büyük seferlerinin arkasında bir kervan vardı. O kervanın başında da hep bir Hüsnü. Destanlar artık açık!',
    ],
  },
  fetih_intro: {
    title: 'Fetih · 1453',
    lines: [
      'Yıl 1453. Ordunun bütün topları, barutu, çadırı… hepsi dedem Hüsnü’nün kervanında.',
      'Fatih’e sormuşlar: “Bu iş nasıl olacak?” “Hüsnü’ye sorun” demiş. Dedem öyle anlatırdı. Ben de öyle anlatırım.',
      'Önce Rumeli Hisarı. Taşları dedemin develeri taşıdı. Develer hâlâ şikâyet eder.',
    ],
  },
  region_halic: {
    mood: 'surprised',
    title: 'Haliç Kıyısı',
    lines: [
      'Limanın ağzına zincir germişler. Zincir de canlanmış! Dedem “zincirle tartışılmaz” derdi.',
      'Boss dalgalarında gemileri karadan yürütüyoruz: kafile duvardan girip öbür taraftan çıkar. Tarih böyle yazar. Dedem öyle yazdırdı.',
    ],
  },
  region_galata: {
    mood: 'laugh',
    title: 'Galata Sırtları',
    lines: [
      'Kızakları yağladık, gemileri tepeden aşırdık! Yağ dedemin dükkânındandı. Hesabı hâlâ ödenmedi.',
      'Yağ küplerinden biri biraz fazla heveslendi. Dikkat et, kaygandır.',
    ],
  },
  region_surlar: {
    title: 'Kara Surlar',
    lines: [
      'Önümüzde bin yıllık surlar. Yorgunlar ama pes etmeye niyetleri yok. Bizim de yok.',
      'Son dalgada surların bekçisi uyanacak. Dedem onu ilk görünce testisini düşürmüş. Testi kırılmamış, dedem öyle iddia eder.',
    ],
  },
  boss_stoneSentinel: {
    mood: 'laugh',
    title: 'Taş Nöbetçi',
    lines: ['Hisarın taş nöbetçisi de yıkıldı! Taşlarını geri kullandık. Dedem hiçbir şeyi israf etmezdi, özellikle de taşı.'],
  },
  boss_harborKraken: {
    mood: 'surprised',
    title: 'Liman Ahtapotu',
    lines: ['Ahtapot kaçtı! Giderken dedemin şapkasını da götürdü. Dedem ömür boyu ahtapota küs kaldı.'],
  },
  boss_oilGiant: {
    mood: 'laugh',
    title: 'Yağ Küpü Devi',
    lines: ['Dev kaydı, düştü, yuvarlandı, Haliç’e kadar gitti. Gemilerden önce o vardı denize. Tarihe not düşelim.'],
  },
  boss_wallWarden: {
    mood: 'surprised',
    title: 'Sur Bekçisi Dev',
    lines: ['Bekçi diz çöktü! Surlar düştü!'],
  },
  fetih_done: {
    mood: 'laugh',
    title: 'Fetih',
    lines: [
      'Şehir alındı! Fatih dedeme dönmüş, “Hüsnü, sen olmasan…” demiş. Cümlenin devamını kimse duymamış.',
      'Dedem “sen olmasan olmazdı” diye tamamlardı. Ben de öyle tamamlarım. Fatih artık kafilende, evlat. Saygıda kusur etme.',
    ],
  },
} satisfies Record<string, StoryBeat>;

export type StoryId = keyof typeof STORY;
export const STORY_ORDER = Object.keys(STORY) as StoryId[];

export const regionBeat = (id: RegionId): StoryId | null => (id === 'vale' ? null : (`region_${id}` as StoryId));
