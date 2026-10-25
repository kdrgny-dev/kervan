import { describe, expect, it } from 'vitest';
import { GRID_W } from '../src/config';
import { BOSS_EVERY } from '../src/data/balance';
import { CAMPAIGNS, DESTAN_IDS, finalWave, SHIP_MS } from '../src/data/campaigns';
import { ENEMIES } from '../src/data/enemies';
import { HERO_KINDS, HEROES } from '../src/data/heroes';
import { type RunSummary } from '../src/data/progression';
import { bossAt, REGIONS, regionAt } from '../src/data/regions';
import { regionBeat, STORY } from '../src/data/story';
import { applyRunResults, campaignUnlocked } from '../src/meta/progression';
import { defaultSave, parseSave } from '../src/meta/save';
import { ensureIntro } from '../src/meta/story';
import { startWave } from '../src/sim/waves';
import { createWorld, makeHero, stepWorld } from '../src/sim/world';
import { tick } from './helpers';

const run = (over: Partial<RunSummary> = {}): RunSummary => ({
  hero: 'knight', wave: 5, kills: 40, gold: 30, gems: 0, score: 700, bosses: 0, killsByKind: {}, recruited: 2,
  cardsPicked: 4, cursedPicked: 0, maxParty: 4, maxTier: {}, furthestRegion: 0, bossKinds: {}, ...over,
});

const fetihWorld = (seed = 3) => {
  const w = createWorld({ seed, campaign: 'fetih', drafts: false });
  w.loot = [];
  return w;
};

describe('Fetih route', () => {
  it('walks its own regions and loops after the final wave', () => {
    const route = CAMPAIGNS.fetih.route;
    expect(regionAt(1, route).id).toBe('hisar');
    expect(regionAt(21, route).id).toBe('galata');
    expect(regionAt(40, route)).toMatchObject({ id: 'surlar', local: 10 });
    expect(regionAt(41, route)).toMatchObject({ id: 'hisar', journey: 2 });
  });

  it('the city walls end with the final boss, not their regular one', () => {
    const route = CAMPAIGNS.fetih.route;
    expect(bossAt(35, route)).toBe('stoneSentinel');
    expect(bossAt(40, route)).toBe('wallWarden');
    expect(bossAt(10)).toBe('slimeKing');
  });

  it('rolls fetih rosters and the final boss in the world', () => {
    const w = fetihWorld();
    w.wave.n = 0;
    startWave(w);
    const allowed = REGIONS.hisar.roster.filter((r) => r.from <= 1).map((r) => r.kind);
    for (const p of w.wave.pending) expect(allowed).toContain(p.kind);
    w.wave.n = finalWave('fetih') - 1;
    startWave(w);
    expect(w.wave.pending.filter((p) => p.kind === 'wallWarden')).toHaveLength(1);
  });

  it('the road is untouched', () => {
    const w = createWorld({ seed: 1 });
    expect(w.campaign).toBe('road');
    expect(w.route).toEqual(['vale', 'bones', 'ash', 'frost']);
  });
});

describe('ships overland', () => {
  it('boss waves let the caravan sail through walls for a while', () => {
    const w = fetihWorld();
    w.wave.n = BOSS_EVERY - 1;
    startWave(w);
    expect(w.wallPassUntil).toBe(w.time + SHIP_MS);
    expect(w.events.some((e) => e.type === 'shipsStart')).toBe(true);

    w.enemies = [];
    w.wave.pending = [];
    w.party = [makeHero(w, 'knight', { x: GRID_W - 2, y: 5 })];
    w.dir = 'right';
    tick(w);
    expect(w.alive).toBe(true);
    expect(w.party[0].pos).toEqual({ x: 1, y: 5 });
  });

  it('walls still kill outside ship time and on the road', () => {
    for (const w of [fetihWorld(), createWorld({ seed: 1, waves: false })]) {
      w.loot = [];
      w.party = [makeHero(w, 'knight', { x: GRID_W - 2, y: 5 })];
      w.dir = 'right';
      tick(w, 2);
      expect(w.alive).toBe(false);
    }
  });
});

describe('finishing a destan', () => {
  it('clearing the final wave marks the run', () => {
    const w = fetihWorld();
    w.wave.n = finalWave('fetih');
    w.wave.phase = 'active';
    w.wave.pending = [];
    w.enemies = [];
    const events = stepWorld(w, 20);
    expect(w.tally.campaignCleared).toBe(true);
    expect(events.some((e) => e.type === 'campaignCleared')).toBe(true);
  });

  it('unlocks Fatih once and records progress', () => {
    const s = defaultSave();
    const r = applyRunResults(s, run({ wave: 41, furthestRegion: 4, campaign: 'fetih', campaignCleared: true }));
    expect(r.heroUnlocked).toBe('fatih');
    expect(s.unlocked).toContain('fatih');
    expect(s.campaigns.fetih).toMatchObject({ done: true, best: 41 });
    expect(s.story.pending).toContain('fetih_done');
    const again = applyRunResults(s, run({ wave: 41, furthestRegion: 4, campaign: 'fetih', campaignCleared: true }));
    expect(again.heroUnlocked).toBeUndefined();
  });

  it('a partial run tells the reached regions but does not unlock', () => {
    const s = defaultSave();
    applyRunResults(s, run({ wave: 22, furthestRegion: 2, campaign: 'fetih', bossKinds: { stoneSentinel: 1 } }));
    expect(s.unlocked).not.toContain('fatih');
    expect(s.story.pending).toEqual(expect.arrayContaining(['region_halic', 'region_galata', 'boss_stoneSentinel']));
    expect(s.story.pending).not.toContain('region_bones');
    expect(s.journey.furthest).toBe(0);
  });
});

describe('content is complete', () => {
  it('every destan region and boss has a story beat', () => {
    const missing = DESTAN_IDS.flatMap((c) => CAMPAIGNS[c].route.slice(1).map(regionBeat)).filter((id) => !id || !(id in STORY));
    expect(missing).toEqual([]);
    for (const [kind, def] of Object.entries(ENEMIES)) if (def.boss) expect(STORY).toHaveProperty(`boss_${kind}`);
    for (const c of DESTAN_IDS) {
      expect(STORY).toHaveProperty(`${c}_intro`);
      expect(STORY).toHaveProperty(`${c}_done`);
    }
  });

  it('legendary heroes are destan rewards', () => {
    for (const k of HERO_KINDS) {
      if (!HEROES[k].legendary) continue;
      expect(DESTAN_IDS.some((c) => CAMPAIGNS[c].reward === k)).toBe(true);
    }
  });
});

describe('unlocking and saving', () => {
  it('destans open with account level and announce themselves', () => {
    const s = defaultSave();
    expect(campaignUnlocked(s, 'road')).toBe(true);
    expect(campaignUnlocked(s, 'fetih')).toBe(false);
    s.account.level = CAMPAIGNS.fetih.unlockLevel;
    expect(campaignUnlocked(s, 'fetih')).toBe(true);
    ensureIntro(s);
    expect(s.story.pending).toContain('destans');
  });

  it('round-trips campaign progress and drops junk', () => {
    const s = defaultSave();
    s.campaigns.fetih = { furthest: 2, best: 23, done: false };
    s.lastCampaign = 'fetih';
    const back = parseSave(JSON.stringify(s));
    expect(back.campaigns.fetih).toEqual({ furthest: 2, best: 23, done: false });
    expect(back.lastCampaign).toBe('fetih');
    const junk = parseSave(JSON.stringify({ campaigns: { atlantis: { best: 9 } }, lastCampaign: 'atlantis' }));
    expect(junk.campaigns).toEqual({});
    expect(junk.lastCampaign).toBe('road');
  });
});
