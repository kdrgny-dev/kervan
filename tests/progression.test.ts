import { describe, expect, it } from 'vitest';
import { CARD_IDS } from '../src/data/cards';
import {
  accountXpForRun,
  CARD_UNLOCK_LEVEL,
  DAILY_COUNT,
  DAILY_QUESTS,
  type RunSummary,
  rewardsFor,
  STARTER_CARDS,
  titleFor,
  WEEKLY_COUNT,
  xpForLevel,
} from '../src/data/progression';
import { addAccountXp, applyRunResults, dayKey, ensureQuests, refreshAchievements, weekKey } from '../src/meta/progression';
import { defaultSave, parseSave } from '../src/meta/save';
import { loadoutFrom } from '../src/meta/shop';
import { rollDraft } from '../src/sim/cards';
import { createWorld } from '../src/sim/world';

const run = (over: Partial<RunSummary> = {}): RunSummary => ({
  hero: 'knight',
  wave: 5,
  kills: 40,
  gold: 30,
  gems: 0,
  score: 700,
  bosses: 0,
  killsByKind: {},
  recruited: 2,
  cardsPicked: 4,
  cursedPicked: 0,
  maxParty: 4,
  maxTier: {},
  furthestRegion: 0,
  bossKinds: {},
  ...over,
});

const MONDAY = new Date(2026, 9, 26, 12);

describe('account level', () => {
  it('xp formula rewards waves, kills and bosses', () => {
    expect(accountXpForRun(run({ wave: 10, kills: 80, bosses: 1 }))).toBe(150 + 80 + 60);
  });

  it('levels up and grants track rewards', () => {
    const s = defaultSave();
    const p = addAccountXp(s, xpForLevel(1) + xpForLevel(2) + 10);
    expect(s.account.level).toBe(3);
    expect(s.account.xp).toBe(10);
    expect(p.levelUps.map((l) => l.level)).toEqual([2, 3]);
    expect(s.cardsUnlocked).toContain('quickHands');
    expect(s.gold).toBe(150);
    expect(p.newCards).toEqual(['quickHands']);
  });

  it('every card is either a starter or unlocked on the track', () => {
    for (const id of CARD_IDS) {
      expect(STARTER_CARDS.includes(id) || CARD_UNLOCK_LEVEL[id] !== undefined).toBe(true);
    }
  });

  it('the track keeps rewarding forever', () => {
    for (const lvl of [23, 24, 25, 60, 101]) expect(rewardsFor(lvl).length).toBeGreaterThan(0);
  });

  it('titles follow level bands', () => {
    expect(titleFor(1)).toBe('Çaylak Yolcu');
    expect(titleFor(12)).toBe('Deve Fısıldayan');
    expect(titleFor(99)).toBe('Yolların Efendisi');
  });
});

describe('quests', () => {
  it('day and ISO week keys', () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(weekKey(new Date(2026, 9, 26))).toBe('2026-W44');
    expect(weekKey(new Date(2027, 0, 1))).toBe('2026-W53');
  });

  it('boards are deterministic per day and refresh on a new day', () => {
    const a = defaultSave();
    const b = defaultSave();
    ensureQuests(a, MONDAY);
    ensureQuests(b, MONDAY);
    expect(a.quests.daily).toEqual(b.quests.daily);
    expect(a.quests.daily.items).toHaveLength(DAILY_COUNT);
    expect(a.quests.weekly.items).toHaveLength(WEEKLY_COUNT);

    a.quests.daily.items[0].progress = 5;
    ensureQuests(a, MONDAY);
    expect(a.quests.daily.items[0].progress).toBe(5);
    ensureQuests(a, new Date(2026, 9, 27, 9));
    expect(a.quests.daily.key).toBe('2026-10-27');
    expect(a.quests.daily.items.every((q) => q.progress === 0)).toBe(true);
  });

  it('hero quests only appear for unlocked heroes', () => {
    for (let d = 1; d < 60; d++) {
      const s = defaultSave();
      ensureQuests(s, new Date(2026, 0, d));
      for (const q of s.quests.daily.items) expect(q.id.startsWith('hero')).toBe(false);
    }
  });

  it('sum quests accumulate across runs and pay out once', () => {
    const s = defaultSave();
    s.quests.daily = { key: dayKey(MONDAY), items: [{ id: 'kills', progress: 0, done: false }] };
    s.quests.weekly = { key: weekKey(MONDAY), items: [] };
    applyRunResults(s, run({ kills: 100 }), MONDAY);
    expect(s.quests.daily.items[0]).toMatchObject({ progress: 100, done: false });
    const goldBefore = s.gold;
    const r = applyRunResults(s, run({ kills: 60, gold: 0 }), MONDAY);
    expect(s.quests.daily.items[0]).toMatchObject({ progress: 150, done: true });
    expect(r.quests.map((q) => q.desc)).toEqual([DAILY_QUESTS.kills.desc]);
    expect(s.gold - goldBefore).toBe(60);
    expect(s.lifetime.dailyDone).toBe(1);
    const again = applyRunResults(s, run({ kills: 500, gold: 0 }), MONDAY);
    expect(again.quests).toHaveLength(0);
  });

  it('max quests need a single good run', () => {
    const s = defaultSave();
    s.quests.daily = { key: dayKey(MONDAY), items: [{ id: 'wave8', progress: 0, done: false }] };
    s.quests.weekly = { key: weekKey(MONDAY), items: [] };
    applyRunResults(s, run({ wave: 5 }), MONDAY);
    applyRunResults(s, run({ wave: 6 }), MONDAY);
    expect(s.quests.daily.items[0]).toMatchObject({ progress: 6, done: false });
    applyRunResults(s, run({ wave: 9 }), MONDAY);
    expect(s.quests.daily.items[0].done).toBe(true);
  });
});

describe('achievements and run results', () => {
  it('first run grants the first achievement and account xp', () => {
    const s = defaultSave();
    const r = applyRunResults(s, run({ wave: 10, kills: 80, bosses: 1 }), MONDAY);
    expect(r.achievements.map((a) => a.id)).toEqual(expect.arrayContaining(['firstSteps', 'kingSlayer', 'wave10']));
    expect(s.gems).toBe(3 + 5 + 5);
    expect(r.xpGained).toBeGreaterThanOrEqual(accountXpForRun(run({ wave: 10, kills: 80, bosses: 1 })));
    expect(s.account.level).toBeGreaterThan(1);
    expect(s.lifetime).toMatchObject({ runs: 1, kills: 80, bosses: 1, bestWave: 10 });
  });

  it('achievements are only granted once', () => {
    const s = defaultSave();
    applyRunResults(s, run(), MONDAY);
    const r = applyRunResults(s, run(), MONDAY);
    expect(r.achievements.find((a) => a.id === 'firstSteps')).toBeUndefined();
  });

  it('roster achievement can be checked outside a run', () => {
    const s = defaultSave();
    s.unlocked = ['knight', 'archer', 'mage', 'priest', 'rogue'];
    expect(refreshAchievements(s).achievements.map((a) => a.id)).toContain('fullRoster');
  });

  it('records rank like before', () => {
    const s = defaultSave();
    expect(applyRunResults(s, run({ score: 900 }), MONDAY).rank).toBe(0);
  });
});

describe('save v2', () => {
  it('migrates a v1 save keeping progress', () => {
    const v1 = JSON.stringify({ version: 1, gold: 420, gems: 7, unlocked: ['knight', 'archer', 'mage'], best: [] });
    const s = parseSave(v1);
    expect(s.version).toBe(3);
    expect(s.gold).toBe(420);
    expect(s.unlocked).toContain('mage');
    expect(s.account).toEqual({ level: 1, xp: 0 });
    expect(s.cardsUnlocked.sort()).toEqual([...STARTER_CARDS].sort());
    expect(s.achievements).toEqual([]);
  });

  it('drops unknown cards and achievements', () => {
    const s = parseSave(JSON.stringify({ cardsUnlocked: ['dragonFire', 'campfire'], achievements: ['nope', 'wave10'] }));
    expect(s.cardsUnlocked).toContain('campfire');
    expect(s.cardsUnlocked).not.toContain('dragonFire');
    expect(s.achievements).toEqual(['wave10']);
  });
});

describe('card pool', () => {
  it('drafts only offer unlocked cards', () => {
    const s = defaultSave();
    const w = createWorld({ seed: 3, loadout: loadoutFrom(s, 'knight') });
    for (let i = 0; i < 100; i++) for (const id of rollDraft(w)) expect(STARTER_CARDS).toContain(id);
  });
});
