import type { CardId } from './cards';
import type { EnemyKind } from './enemies';
import type { HeroKind } from './heroes';
import type { HeroClass } from './synergies';

/** Bir turun meta sistemlere aktarılan özeti. */
export interface RunSummary {
  hero: HeroKind;
  wave: number;
  kills: number;
  gold: number;
  gems: number;
  score: number;
  bosses: number;
  killsByKind: Partial<Record<EnemyKind, number>>;
  recruited: number;
  cardsPicked: number;
  cursedPicked: number;
  maxParty: number;
  maxTier: Partial<Record<HeroClass, number>>;
  furthestRegion: number;
  bossKinds: Partial<Record<EnemyKind, number>>;
}

export type Reward =
  | { type: 'gold'; amount: number }
  | { type: 'gems'; amount: number }
  | { type: 'xp'; amount: number }
  | { type: 'card'; card: CardId }
  | { type: 'title'; title: string };

// ---------------------------------------------------------------- Hesap seviyesi

export const accountXpForRun = (r: RunSummary) => r.wave * 15 + r.kills + r.bosses * 60;

/** l → l+1 için gereken XP. */
export const xpForLevel = (level: number) => 150 + 75 * (level - 1);

/** Başta herkese açık kartlar; kalanı ödül yolundan gelir. */
export const STARTER_CARDS: CardId[] = [
  'sharpBlades', 'sturdyArmor', 'warCry', 'goldFever', 'holyLight', 'shadowStep',
  'newFriend', 'thornArmor', 'scholar', 'shieldWall', 'longBrew', 'eagleEye',
];

export const TITLES: [level: number, title: string][] = [
  [1, 'Çaylak Yolcu'],
  [5, 'Kervan Çırağı'],
  [10, 'Deve Fısıldayan'],
  [15, 'Yol Kurdu'],
  [20, 'Kervanbaşı Yardımcısı'],
  [30, 'Kervanbaşı'],
  [40, 'Efsanevi Kervanbaşı'],
  [50, 'Yolların Efendisi'],
];

export const titleFor = (level: number) => [...TITLES].reverse().find(([l]) => level >= l)?.[1] ?? TITLES[0][1];

const TRACK: Record<number, Reward[]> = {
  2: [{ type: 'card', card: 'quickHands' }],
  3: [{ type: 'gold', amount: 150 }],
  4: [{ type: 'card', card: 'pyromancer' }],
  5: [{ type: 'gems', amount: 5 }],
  6: [{ type: 'card', card: 'lodestone' }],
  7: [{ type: 'gold', amount: 250 }],
  8: [{ type: 'card', card: 'recruiter' }],
  9: [{ type: 'card', card: 'martyr' }],
  10: [{ type: 'gems', amount: 10 }],
  11: [{ type: 'card', card: 'bloodPact' }],
  12: [{ type: 'card', card: 'gemHunter' }],
  13: [{ type: 'gold', amount: 400 }],
  14: [{ type: 'card', card: 'windborne' }],
  15: [{ type: 'gems', amount: 15 }],
  16: [{ type: 'card', card: 'greed' }],
  17: [{ type: 'card', card: 'doubleShot' }],
  18: [{ type: 'gold', amount: 600 }],
  19: [{ type: 'card', card: 'chaosRite' }],
  20: [{ type: 'gems', amount: 20 }],
  21: [{ type: 'card', card: 'glassCannon' }],
  22: [{ type: 'card', card: 'campfire' }],
};

/** Bir seviyeye ulaşınca verilen ödüller; 22'den sonra yol sonsuza dek altın ve her 5'te mücevherle sürer. */
export function rewardsFor(level: number): Reward[] {
  const out = [...(TRACK[level] ?? [])];
  if (level > 22) out.push(level % 5 === 0 ? { type: 'gems', amount: 10 + level / 5 } : { type: 'gold', amount: 300 + 40 * (level - 22) });
  const title = TITLES.find(([l]) => l === level && l > 1);
  if (title) out.push({ type: 'title', title: title[1] });
  return out;
}

export const CARD_UNLOCK_LEVEL: Partial<Record<CardId, number>> = Object.fromEntries(
  Object.entries(TRACK).flatMap(([lvl, rewards]) => rewards.filter((r) => r.type === 'card').map((r) => [(r as { card: CardId }).card, Number(lvl)])),
);

// ---------------------------------------------------------------- Görevler

export type QuestMode = 'sum' | 'max';

export interface QuestDef {
  desc: string;
  target: number;
  mode: QuestMode;
  metric: (r: RunSummary) => number;
  reward: Reward[];
  /** Görevin çıkabilmesi için açık olması gereken kahraman. */
  needsHero?: HeroKind;
}

const kind = (k: EnemyKind) => (r: RunSummary) => r.killsByKind[k] ?? 0;
const played = (h: HeroKind) => (r: RunSummary) => (r.hero === h ? 1 : 0);
const anyTier2 = (r: RunSummary) => (Object.values(r.maxTier).some((t) => (t ?? 0) >= 2) ? 1 : 0);
const daily = (gold: number, xp: number): Reward[] => [{ type: 'gold', amount: gold }, { type: 'xp', amount: xp }];

export const DAILY_QUESTS = {
  kills: { desc: '150 düşman yen', target: 150, mode: 'sum', metric: (r) => r.kills, reward: daily(60, 40) },
  slimes: { desc: '60 balçık temizle', target: 60, mode: 'sum', metric: kind('slime'), reward: daily(50, 30) },
  bats: { desc: '40 yarasa düşür', target: 40, mode: 'sum', metric: kind('bat'), reward: daily(50, 30) },
  skeletons: { desc: '30 iskelet kır', target: 30, mode: 'sum', metric: kind('skeleton'), reward: daily(60, 40) },
  goblins: { desc: '25 goblin kovala', target: 25, mode: 'sum', metric: kind('goblin'), reward: daily(70, 40) },
  wave8: { desc: 'Tek turda 8. dalgaya ulaş', target: 8, mode: 'max', metric: (r) => r.wave, reward: daily(80, 50) },
  boss: { desc: 'Balçık Kralı’nı yen', target: 1, mode: 'sum', metric: (r) => r.bosses, reward: daily(90, 60) },
  recruit: { desc: '10 kahramanı kafileye kat', target: 10, mode: 'sum', metric: (r) => r.recruited, reward: daily(60, 40) },
  cards: { desc: '8 kart seç', target: 8, mode: 'sum', metric: (r) => r.cardsPicked, reward: daily(50, 30) },
  gold: { desc: 'Turlarda 200 altın topla', target: 200, mode: 'sum', metric: (r) => r.gold, reward: daily(60, 40) },
  synergy: { desc: 'Bir sinerjiyi 2. seviyeye çıkar', target: 1, mode: 'max', metric: anyTier2, reward: daily(80, 50) },
  cursed: { desc: 'Bir lanetli kart seç', target: 1, mode: 'sum', metric: (r) => r.cursedPicked, reward: daily(50, 40) },
  heroMage: { desc: 'Büyücü liderliğinde bir tur oyna', target: 1, mode: 'sum', metric: played('mage'), reward: daily(50, 30), needsHero: 'mage' },
  heroPriest: { desc: 'Rahip liderliğinde bir tur oyna', target: 1, mode: 'sum', metric: played('priest'), reward: daily(50, 30), needsHero: 'priest' },
  heroRogue: { desc: 'Haydut liderliğinde bir tur oyna', target: 1, mode: 'sum', metric: played('rogue'), reward: daily(50, 30), needsHero: 'rogue' },
} satisfies Record<string, QuestDef>;

const weekly = (gems: number, xp: number): Reward[] => [{ type: 'gems', amount: gems }, { type: 'xp', amount: xp }];

export const WEEKLY_QUESTS = {
  kills: { desc: 'Bu hafta 1.500 düşman yen', target: 1500, mode: 'sum', metric: (r) => r.kills, reward: weekly(12, 200) },
  bosses: { desc: 'Bu hafta 5 boss yen', target: 5, mode: 'sum', metric: (r) => r.bosses, reward: weekly(15, 250) },
  wave15: { desc: 'Tek turda 15. dalgaya ulaş', target: 15, mode: 'max', metric: (r) => r.wave, reward: weekly(15, 250) },
  gold: { desc: 'Bu hafta 1.500 altın topla', target: 1500, mode: 'sum', metric: (r) => r.gold, reward: weekly(12, 200) },
  party: { desc: 'Tek turda 15 kişilik kafile kur', target: 15, mode: 'max', metric: (r) => r.maxParty, reward: weekly(12, 200) },
} satisfies Record<string, QuestDef>;

export type DailyQuestId = keyof typeof DAILY_QUESTS;
export type WeeklyQuestId = keyof typeof WEEKLY_QUESTS;
export const DAILY_COUNT = 3;
export const WEEKLY_COUNT = 2;

// ---------------------------------------------------------------- Başarımlar

/** Ömür boyu sayaçlar; başarımlar bunlara bakar. */
export interface Lifetime {
  runs: number;
  kills: number;
  bosses: number;
  bestWave: number;
  maxParty: number;
  cursedPicked: number;
  maxTier: number;
  dailyDone: number;
}

export const emptyLifetime = (): Lifetime => ({ runs: 0, kills: 0, bosses: 0, bestWave: 0, maxParty: 0, cursedPicked: 0, maxTier: 0, dailyDone: 0 });

export interface AchievementDef {
  name: string;
  desc: string;
  done: (l: Lifetime, ctx: { level: number; unlockedHeroes: number; cards: number; totalCards: number }) => boolean;
  reward: Reward[];
}

export const ACHIEVEMENTS = {
  firstSteps: { name: 'İlk Adım', desc: 'İlk turunu tamamla', done: (l) => l.runs >= 1, reward: [{ type: 'gems', amount: 3 }] },
  kingSlayer: { name: 'Taç Düştü', desc: 'Balçık Kralı’nı ilk kez yen', done: (l) => l.bosses >= 1, reward: [{ type: 'gems', amount: 5 }] },
  wave10: { name: 'Uzun Yol', desc: '10. dalgaya ulaş', done: (l) => l.bestWave >= 10, reward: [{ type: 'gems', amount: 5 }] },
  wave20: { name: 'Dayanıklı Kervan', desc: '20. dalgaya ulaş', done: (l) => l.bestWave >= 20, reward: [{ type: 'gems', amount: 10 }] },
  wave30: { name: 'Bitmeyen Yol', desc: '30. dalgaya ulaş', done: (l) => l.bestWave >= 30, reward: [{ type: 'gems', amount: 20 }] },
  kills1k: { name: 'Bin Balçık', desc: 'Toplam 1.000 düşman yen', done: (l) => l.kills >= 1000, reward: [{ type: 'gold', amount: 300 }] },
  kills10k: { name: 'Efsane Avcı', desc: 'Toplam 10.000 düşman yen', done: (l) => l.kills >= 10000, reward: [{ type: 'gems', amount: 25 }] },
  bigFamily: { name: 'Kalabalık Aile', desc: 'Tek turda 20 kişilik kafile', done: (l) => l.maxParty >= 20, reward: [{ type: 'gems', amount: 8 }] },
  synergyMaster: { name: 'Uyum Ustası', desc: 'Bir sinerjiyi 2. seviyeye çıkar', done: (l) => l.maxTier >= 2, reward: [{ type: 'gems', amount: 5 }] },
  cursedSoul: { name: 'Lanetli Ruh', desc: 'Toplam 10 lanetli kart seç', done: (l) => l.cursedPicked >= 10, reward: [{ type: 'gems', amount: 8 }] },
  dutiful: { name: 'Sözünün Eri', desc: '10 günlük görev tamamla', done: (l) => l.dailyDone >= 10, reward: [{ type: 'gems', amount: 10 }] },
  fullRoster: { name: 'Tam Kadro', desc: 'Tüm kahramanların kilidini aç', done: (_, c) => c.unlockedHeroes >= 5, reward: [{ type: 'gems', amount: 10 }] },
  collector: { name: 'Koleksiyoncu', desc: 'Tüm kartları aç', done: (_, c) => c.cards >= c.totalCards, reward: [{ type: 'gems', amount: 20 }] },
  level10: { name: 'Yolda Usta', desc: 'Hesap seviyesi 10', done: (_, c) => c.level >= 10, reward: [{ type: 'gold', amount: 500 }] },
  level25: { name: 'Yolun Sesi', desc: 'Hesap seviyesi 25', done: (_, c) => c.level >= 25, reward: [{ type: 'gems', amount: 25 }] },
} satisfies Record<string, AchievementDef>;

export type AchievementId = keyof typeof ACHIEVEMENTS;
export const ACHIEVEMENT_IDS = Object.keys(ACHIEVEMENTS) as AchievementId[];
