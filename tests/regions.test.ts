import { describe, expect, it } from 'vitest';
import { BOSS_EVERY, SLOW_FACTOR } from '../src/data/balance';
import { ENEMIES } from '../src/data/enemies';
import { MARKET_UPGRADES } from '../src/data/economy';
import { type RunSummary } from '../src/data/progression';
import { REGIONS, regionAt, ROUTE } from '../src/data/regions';
import { STORY } from '../src/data/story';
import { applyRunResults } from '../src/meta/progression';
import { defaultSave, parseSave } from '../src/meta/save';
import { buyMarket, loadoutFrom } from '../src/meta/shop';
import { ensureIntro, markSeen } from '../src/meta/story';
import { openDraft, rerollDraft } from '../src/sim/cards';
import { damageEnemy } from '../src/sim/combat';
import { spawnEnemy } from '../src/sim/enemies';
import { startWave } from '../src/sim/waves';
import { createWorld, effectiveTick, stepWorld } from '../src/sim/world';
import { arena, freeze } from './helpers';

const run = (over: Partial<RunSummary> = {}): RunSummary => ({
  hero: 'knight', wave: 5, kills: 40, gold: 30, gems: 0, score: 700, bosses: 0, killsByKind: {}, recruited: 2,
  cardsPicked: 4, cursedPicked: 0, maxParty: 4, maxTier: {}, furthestRegion: 0, bossKinds: {}, ...over,
});

describe('route', () => {
  it('maps waves onto regions and journeys', () => {
    expect(regionAt(1)).toEqual({ id: 'vale', index: 0, local: 1, journey: 1 });
    expect(regionAt(10).id).toBe('vale');
    expect(regionAt(11)).toMatchObject({ id: 'bones', local: 1 });
    expect(regionAt(35)).toMatchObject({ id: 'frost', local: 5 });
    expect(regionAt(41)).toMatchObject({ id: 'vale', journey: 2 });
  });

  it('each region rolls its own roster and boss', () => {
    for (const [i, id] of ROUTE.entries()) {
      const w = arena([{ x: 5, y: 7 }], ['knight'], { waves: true, seed: 7 + i });
      w.wave.n = i * 10;
      startWave(w);
      const allowed = REGIONS[id].roster.filter((r) => r.from <= 1).map((r) => r.kind);
      for (const p of w.wave.pending) expect(allowed).toContain(p.kind);

      w.wave.n = i * 10 + BOSS_EVERY - 1;
      startWave(w);
      expect(w.wave.pending.filter((p) => p.kind === REGIONS[id].boss)).toHaveLength(1);
    }
  });

  it('announces entering a new region', () => {
    const w = arena([{ x: 5, y: 7 }], ['knight'], { waves: true });
    w.wave.n = 10;
    w.events.length = 0;
    startWave(w);
    expect(w.events).toContainEqual({ type: 'regionEnter', region: 'bones', journey: 1 });
    expect(w.tally.furthestRegion).toBe(1);
  });
});

describe('new enemies', () => {
  it('magma slimes split into slimes on death', () => {
    const w = arena([{ x: 2, y: 2 }]);
    const m = spawnEnemy(w, 'magmaSlime', { x: 12, y: 8 });
    damageEnemy(w, m, 999);
    expect(w.enemies.filter((e) => e.kind === 'slime' && e.hp > 0)).toHaveLength(2);
  });

  it('frost arrows slow the caravan', () => {
    const w = arena([{ x: 5, y: 5 }]);
    spawnEnemy(w, 'frostSkeleton', { x: 5, y: 9 });
    freeze(w);
    w.party[0].cooldown = 1e9;
    stepWorld(w, ENEMIES.frostSkeleton.attackMs / 2 + 800);
    expect(w.slowUntil).toBeGreaterThan(w.time);
    expect(effectiveTick(w)).toBeCloseTo(w.tickMs * SLOW_FACTOR);
  });

  it('bone lord fires a volley', () => {
    const w = arena([{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }]);
    const lord = spawnEnemy(w, 'boneLord', { x: 14, y: 8 });
    lord.summonCd = 1e9;
    lord.attackCd = 1e9;
    freeze(w);
    for (const h of w.party) h.cooldown = 1e9;
    stepWorld(w, ENEMIES.boneLord.boss!.volley!.everyMs + 10);
    expect(w.projectiles.filter((p) => p.owner === 'enemy').length).toBeGreaterThanOrEqual(3);
  });

  it('borrowed looks point at real sprites', () => {
    for (const def of Object.values(ENEMIES)) if (def.look) expect(ENEMIES[def.look.as].look).toBeUndefined();
  });
});

describe('story', () => {
  it('intro is queued on a fresh save and cleared when seen', () => {
    const s = defaultSave();
    ensureIntro(s);
    expect(s.story.pending).toEqual(['intro']);
    markSeen(s, 'intro');
    ensureIntro(s);
    expect(s.story.pending).toEqual([]);
    expect(s.story.seen).toEqual(['intro']);
  });

  it('first run, new regions and first boss kills add beats', () => {
    const s = defaultSave();
    applyRunResults(s, run({ wave: 22, furthestRegion: 2, bosses: 2, bossKinds: { slimeKing: 1, boneLord: 1 } }));
    expect(s.story.pending).toEqual(expect.arrayContaining(['firstRun', 'region_bones', 'region_ash', 'boss_slimeKing', 'boss_boneLord']));
    expect(s.journey).toEqual({ furthest: 2, bosses: ['slimeKing', 'boneLord'] });
    const again = s.story.pending.length;
    applyRunResults(s, run({ wave: 22, furthestRegion: 2, bossKinds: { slimeKing: 1 } }));
    expect(s.story.pending.length).toBe(again);
  });

  it('finishing the route starts the second journey beat', () => {
    const s = defaultSave();
    applyRunResults(s, run({ wave: 41, furthestRegion: 4 }));
    expect(s.story.pending).toContain('journey2');
  });

  it('every boss has a beat', () => {
    for (const [k, def] of Object.entries(ENEMIES)) if (def.boss) expect(STORY).toHaveProperty(`boss_${k}`);
  });
});

describe('market', () => {
  it('gold gain multiplies run coins via the loadout', () => {
    const s = defaultSave();
    s.gold = 10000;
    expect(buyMarket(s, 'goldGain')).toBe(true);
    expect(s.gold).toBe(10000 - MARKET_UPGRADES.goldGain.costs[0]);
    const w = createWorld({ seed: 1, loadout: loadoutFrom(s, 'knight') });
    expect(w.mods.goldMult).toBeCloseTo(1.1);
  });

  it('free rerolls are used before gold', () => {
    const w = createWorld({ seed: 1, waves: false, loadout: { freeRerolls: 1 } });
    openDraft(w);
    expect(rerollDraft(w)).toBe(true);
    expect(w.freeRerolls).toBe(0);
    expect(w.stats.gold).toBe(0);
    expect(rerollDraft(w)).toBe(false);
  });

  it('xp gain boosts account xp', () => {
    const a = defaultSave();
    const b = defaultSave();
    b.market.xpGain = 2;
    expect(applyRunResults(b, run()).xpGained).toBeGreaterThan(applyRunResults(a, run()).xpGained);
  });

  it('v2 saves migrate into v3', () => {
    const s = parseSave(JSON.stringify({ version: 2, gold: 50, account: { level: 3, xp: 10 } }));
    expect(s.version).toBe(3);
    expect(s.account.level).toBe(3);
    expect(s.journey).toEqual({ furthest: 0, bosses: [] });
    expect(s.market).toEqual({ goldGain: 0, freeRerolls: 0, xpGain: 0 });
  });
});
