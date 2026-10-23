import { type GemUpgrade, type HeroStat, STARTING_HEROES } from '../data/economy';
import { HERO_KINDS, type HeroKind } from '../data/heroes';

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

export interface SaveData {
  version: 1;
  gold: number;
  gems: number;
  unlocked: HeroKind[];
  upgrades: Record<HeroKind, Record<HeroStat, number>>;
  gemUpgrades: Record<GemUpgrade, number>;
  best: ScoreEntry[];
  settings: Settings;
  lastHero: HeroKind;
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const KEY = 'kervan.save';

export function defaultSave(): SaveData {
  return {
    version: 1,
    gold: 0,
    gems: 0,
    unlocked: [...STARTING_HEROES],
    upgrades: Object.fromEntries(HERO_KINDS.map((k) => [k, { hp: 0, dmg: 0 }])) as SaveData['upgrades'],
    gemUpgrades: { startPower: 0, powerDuration: 0, secondHero: 0 },
    best: [],
    settings: { shake: true, damageNumbers: true, sfx: true, music: true },
    lastHero: 'knight',
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

  return {
    version: 1,
    gold: num(data.gold, 0),
    gems: num(data.gems, 0),
    unlocked,
    upgrades,
    gemUpgrades,
    best: Array.isArray(data.best) ? data.best.filter((e) => e && typeof e.score === 'number' && isHero(e.hero)) : [],
    settings: { ...base.settings, ...(data.settings ?? {}) },
    lastHero: isHero(data.lastHero) && unlocked.includes(data.lastHero) ? data.lastHero : base.lastHero,
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
