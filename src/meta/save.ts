import { type GemUpgrade, type HeroStat, MARKET_KEYS, type MarketUpgrade, STARTING_HEROES } from '../data/economy';
import { ENEMY_KINDS, type EnemyKind } from '../data/enemies';
import { STORY_ORDER, type StoryId } from '../data/story';
import { CARD_IDS, type CardId } from '../data/cards';
import { HERO_KINDS, type HeroKind } from '../data/heroes';
import { ACHIEVEMENT_IDS, type AchievementId, emptyLifetime, type Lifetime, STARTER_CARDS } from '../data/progression';

export interface ScoreEntry {
  score: number;
  wave: number;
  kills: number;
  gold: number;
  hero: HeroKind;
  date: string;
}

export interface Settings {
  shake: boolean;
  damageNumbers: boolean;
  sfx: boolean;
  music: boolean;
}

export interface QuestSlot {
  id: string;
  progress: number;
  done: boolean;
}

/** Bir günün ya da haftanın görev listesi; key değişince yenilenir. */
export interface QuestBoard {
  key: string;
  items: QuestSlot[];
}

export interface SaveData {
  version: 3;
  gold: number;
  gems: number;
  unlocked: HeroKind[];
  upgrades: Record<HeroKind, Record<HeroStat, number>>;
  gemUpgrades: Record<GemUpgrade, number>;
  best: ScoreEntry[];
  settings: Settings;
  lastHero: HeroKind;
  account: { level: number; xp: number };
  cardsUnlocked: CardId[];
  quests: { daily: QuestBoard; weekly: QuestBoard };
  achievements: AchievementId[];
  lifetime: Lifetime;
  market: Record<MarketUpgrade, number>;
  /** Kervan Yolu: ulaşılan en uzak bölge sırası ve devrilen boss türleri. */
  journey: { furthest: number; bosses: EnemyKind[] };
  /** Hikaye: okunanlar günlükte, bekleyenler menüde gösterilir. */
  story: { seen: StoryId[]; pending: StoryId[] };
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const KEY = 'kervan.save';

export function defaultSave(): SaveData {
  return {
    version: 3,
    gold: 0,
    gems: 0,
    unlocked: [...STARTING_HEROES],
    upgrades: Object.fromEntries(HERO_KINDS.map((k) => [k, { hp: 0, dmg: 0 }])) as SaveData['upgrades'],
    gemUpgrades: { startPower: 0, powerDuration: 0, secondHero: 0 },
    best: [],
    settings: { shake: true, damageNumbers: true, sfx: true, music: true },
    lastHero: 'knight',
    account: { level: 1, xp: 0 },
    cardsUnlocked: [...STARTER_CARDS],
    quests: { daily: { key: '', items: [] }, weekly: { key: '', items: [] } },
    achievements: [],
    lifetime: emptyLifetime(),
    market: { goldGain: 0, freeRerolls: 0, xpGain: 0 },
    journey: { furthest: 0, bosses: [] },
    story: { seen: [], pending: [] },
  };
}

const isStory = (v: unknown): v is StoryId => typeof v === 'string' && (STORY_ORDER as string[]).includes(v);
const isEnemy = (v: unknown): v is EnemyKind => typeof v === 'string' && (ENEMY_KINDS as string[]).includes(v);

const isCard = (v: unknown): v is CardId => typeof v === 'string' && (CARD_IDS as string[]).includes(v);

function parseBoard(v: unknown): QuestBoard {
  const b = v as Partial<QuestBoard> | undefined;
  if (!b || typeof b.key !== 'string' || !Array.isArray(b.items)) return { key: '', items: [] };
  return {
    key: b.key,
    items: b.items
      .filter((i) => i && typeof i.id === 'string')
      .map((i) => ({ id: i.id, progress: num(i.progress, 0), done: !!i.done })),
  };
}

const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback);
const isHero = (v: unknown): v is HeroKind => typeof v === 'string' && (HERO_KINDS as string[]).includes(v);

/** Bozuk veya eski kayıtları sessizce varsayılanlarla tamamlar. */
export function parseSave(raw: string | null): SaveData {
  const base = defaultSave();
  if (!raw) return base;
  let data: Partial<SaveData>;
  try {
    data = JSON.parse(raw);
  } catch {
    return base;
  }
  if (!data || typeof data !== 'object') return base;

  const unlocked = Array.isArray(data.unlocked) ? data.unlocked.filter(isHero) : [];
  for (const k of STARTING_HEROES) if (!unlocked.includes(k)) unlocked.push(k);

  const upgrades = base.upgrades;
  for (const k of HERO_KINDS) {
    const u = data.upgrades?.[k];
    upgrades[k] = { hp: num(u?.hp, 0), dmg: num(u?.dmg, 0) };
  }

  const gemUpgrades = base.gemUpgrades;
  for (const k of Object.keys(gemUpgrades) as GemUpgrade[]) gemUpgrades[k] = num(data.gemUpgrades?.[k], 0);

  const cards = Array.isArray(data.cardsUnlocked) ? data.cardsUnlocked.filter(isCard) : [];
  for (const c of STARTER_CARDS) if (!cards.includes(c)) cards.push(c);
  const life = base.lifetime;
  for (const k of Object.keys(life) as (keyof Lifetime)[]) life[k] = num(data.lifetime?.[k], 0);

  return {
    version: 3,
    gold: num(data.gold, 0),
    gems: num(data.gems, 0),
    unlocked,
    upgrades,
    gemUpgrades,
    best: Array.isArray(data.best) ? data.best.filter((e) => e && typeof e.score === 'number' && isHero(e.hero)) : [],
    settings: { ...base.settings, ...(data.settings ?? {}) },
    lastHero: isHero(data.lastHero) && unlocked.includes(data.lastHero) ? data.lastHero : base.lastHero,
    account: { level: Math.max(1, Math.floor(num(data.account?.level, 1))), xp: num(data.account?.xp, 0) },
    cardsUnlocked: cards,
    quests: { daily: parseBoard(data.quests?.daily), weekly: parseBoard(data.quests?.weekly) },
    achievements: Array.isArray(data.achievements)
      ? data.achievements.filter((a): a is AchievementId => (ACHIEVEMENT_IDS as string[]).includes(a))
      : [],
    lifetime: life,
    market: Object.fromEntries(MARKET_KEYS.map((k) => [k, num(data.market?.[k], 0)])) as SaveData['market'],
    journey: {
      furthest: num(data.journey?.furthest, 0),
      bosses: Array.isArray(data.journey?.bosses) ? data.journey.bosses.filter(isEnemy) : [],
    },
    story: {
      seen: Array.isArray(data.story?.seen) ? data.story.seen.filter(isStory) : [],
      pending: Array.isArray(data.story?.pending) ? data.story.pending.filter(isStory) : [],
    },
  };
}

function browserStore(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadSave(store = browserStore()): SaveData {
  try {
    return parseSave(store?.getItem(KEY) ?? null);
  } catch {
    return defaultSave();
  }
}

export function writeSave(data: SaveData, store = browserStore()) {
  try {
    store?.setItem(KEY, JSON.stringify(data));
  } catch {
    // Gizli sekme / dolu depolama: oyun kayıtsız devam eder
  }
}
