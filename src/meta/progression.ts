import { CARD_IDS, type CardId } from '../data/cards';
import { HERO_KINDS } from '../data/heroes';
import {
  accountXpForRun,
  ACHIEVEMENT_IDS,
  ACHIEVEMENTS,
  type AchievementId,
  DAILY_COUNT,
  DAILY_QUESTS,
  type QuestDef,
  type Reward,
  rewardsFor,
  type RunSummary,
  WEEKLY_COUNT,
  WEEKLY_QUESTS,
  xpForLevel,
} from '../data/progression';
import { createRng, type Rng } from '../sim/rng';
import type { QuestBoard, SaveData } from './save';
import { applyRun } from './shop';
import { storyAfterRun } from './story';
import { MARKET_STEP } from '../data/economy';

const pad = (n: number) => String(n).padStart(2, '0');

/** Yerel takvim günü; görevler gece yarısı yenilenir. */
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** ISO hafta (Pazartesi başlar). */
export function weekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${pad(week)}`;
}

const hashKey = (key: string) => [...key].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 2166136261);

function pickDistinct<T>(rng: Rng, pool: T[], n: number): T[] {
  const left = [...pool];
  const out: T[] = [];
  while (out.length < n && left.length) out.push(left.splice(Math.floor(rng() * left.length), 1)[0]);
  return out;
}

const questPool = <T extends Record<string, QuestDef>>(defs: T, s: SaveData) =>
  (Object.keys(defs) as (keyof T & string)[]).filter((id) => {
    const hero = defs[id].needsHero;
    return !hero || s.unlocked.includes(hero);
  });

/** Gün/hafta değiştiyse panoları aynı tohumla yeniden kurar (herkes aynı günün görevlerini görür). */
export function ensureQuests(s: SaveData, now = new Date()) {
  const dk = dayKey(now);
  if (s.quests.daily.key !== dk) {
    const ids = pickDistinct(createRng(hashKey(dk)), questPool(DAILY_QUESTS, s), DAILY_COUNT);
    s.quests.daily = { key: dk, items: ids.map((id) => ({ id, progress: 0, done: false })) };
  }
  const wk = weekKey(now);
  if (s.quests.weekly.key !== wk) {
    const ids = pickDistinct(createRng(hashKey(wk)), questPool(WEEKLY_QUESTS, s), WEEKLY_COUNT);
    s.quests.weekly = { key: wk, items: ids.map((id) => ({ id, progress: 0, done: false })) };
  }
}

export const questDef = (board: 'daily' | 'weekly', id: string): QuestDef | undefined =>
  (board === 'daily' ? DAILY_QUESTS : WEEKLY_QUESTS)[id as never];

// ---------------------------------------------------------------- Ödüller ve seviye

export interface LevelUp {
  level: number;
  rewards: Reward[];
}

export interface Progress {
  xpGained: number;
  levelUps: LevelUp[];
  quests: { desc: string; reward: Reward[]; weekly: boolean }[];
  achievements: { id: AchievementId; name: string; reward: Reward[] }[];
  newCards: CardId[];
}

const emptyProgress = (): Progress => ({ xpGained: 0, levelUps: [], quests: [], achievements: [], newCards: [] });

/** Ödülü kayda yazar; XP'yi sonra toplu işlemek için döndürür. */
function grant(s: SaveData, r: Reward, p: Progress): number {
  switch (r.type) {
    case 'gold':
      s.gold += r.amount;
      return 0;
    case 'gems':
      s.gems += r.amount;
      return 0;
    case 'card':
      if (!s.cardsUnlocked.includes(r.card)) {
        s.cardsUnlocked.push(r.card);
        p.newCards.push(r.card);
      }
      return 0;
    case 'title':
      return 0;
    case 'xp':
      return r.amount;
  }
}

export function addAccountXp(s: SaveData, xp: number, p: Progress = emptyProgress()) {
  s.account.xp += xp;
  p.xpGained += xp;
  while (s.account.xp >= xpForLevel(s.account.level)) {
    s.account.xp -= xpForLevel(s.account.level);
    s.account.level++;
    const rewards = rewardsFor(s.account.level);
    let extra = 0;
    for (const r of rewards) extra += grant(s, r, p);
    p.levelUps.push({ level: s.account.level, rewards });
    if (extra) s.account.xp += extra;
  }
  return p;
}

// ---------------------------------------------------------------- Görev ilerlemesi

function advanceBoard(s: SaveData, board: QuestBoard, kind: 'daily' | 'weekly', run: RunSummary, p: Progress): number {
  let xp = 0;
  for (const slot of board.items) {
    const def = questDef(kind, slot.id);
    if (!def || slot.done) continue;
    const m = def.metric(run);
    slot.progress = def.mode === 'sum' ? slot.progress + m : Math.max(slot.progress, m);
    if (slot.progress < def.target) continue;
    slot.progress = def.target;
    slot.done = true;
    if (kind === 'daily') s.lifetime.dailyDone++;
    for (const r of def.reward) xp += grant(s, r, p);
    p.quests.push({ desc: def.desc, reward: def.reward, weekly: kind === 'weekly' });
  }
  return xp;
}

function checkAchievements(s: SaveData, p: Progress): number {
  let xp = 0;
  const ctx = { level: s.account.level, unlockedHeroes: s.unlocked.length, cards: s.cardsUnlocked.length, totalCards: CARD_IDS.length };
  for (const id of ACHIEVEMENT_IDS) {
    if (s.achievements.includes(id)) continue;
    const def = ACHIEVEMENTS[id];
    if (!def.done(s.lifetime, ctx)) continue;
    s.achievements.push(id);
    for (const r of def.reward) xp += grant(s, r, p);
    p.achievements.push({ id, name: def.name, reward: def.reward });
  }
  return xp;
}

/** Dükkân dışında da (ör. kahraman açınca) başarımları yoklamak için. */
export function refreshAchievements(s: SaveData) {
  const p = emptyProgress();
  const xp = checkAchievements(s, p);
  if (xp) addAccountXp(s, xp, p);
  return p;
}

export interface RunReport extends Progress {
  rank: number;
}

/** Tur bitince: kasaya ekle, ömür boyu sayaçlar, görevler, hesap XP'si, başarımlar. */
export function applyRunResults(s: SaveData, run: RunSummary, now = new Date()): RunReport {
  const rank = applyRun(s, run, now);
  const l = s.lifetime;
  l.runs++;
  l.kills += run.kills;
  l.bosses += run.bosses;
  l.bestWave = Math.max(l.bestWave, run.wave);
  l.maxParty = Math.max(l.maxParty, run.maxParty);
  l.cursedPicked += run.cursedPicked;
  l.maxTier = Math.max(l.maxTier, ...Object.values(run.maxTier).map((t) => t ?? 0), 0);

  const p = emptyProgress();
  const levelBefore = s.account.level;
  ensureQuests(s, now);
  let xp = Math.round(accountXpForRun(run) * (1 + MARKET_STEP * s.market.xpGain));
  xp += advanceBoard(s, s.quests.daily, 'daily', run, p);
  xp += advanceBoard(s, s.quests.weekly, 'weekly', run, p);
  addAccountXp(s, xp, p);
  // Seviye atlamak yeni başarım açabilir, başarımın XP'si de yeni seviye: durana kadar tekrar
  for (let i = 0; i < 5; i++) {
    const more = checkAchievements(s, p);
    if (!more) break;
    addAccountXp(s, more, p);
  }
  storyAfterRun(s, run, levelBefore);
  return { ...p, rank };
}

export const allHeroesCount = HERO_KINDS.length;
