import { describe, expect, it } from 'vitest';
import { pickCard } from '../src/sim/cards';
import { canChoose, chooseRoadOption, price, ROAD_EVENT_GAP, ROAD_EVENT_IDS, ROAD_EVENTS, rollRoadEvent } from '../src/sim/roadEvents';
import { createWorld, stepWorld } from '../src/sim/world';
import { makeHero } from '../src/sim/state';

const world = (seed = 1) => {
  const w = createWorld({ seed, waves: false });
  w.party = [makeHero(w, 'knight', { x: 5, y: 5 }), makeHero(w, 'archer', { x: 4, y: 5 })];
  w.wave.n = 5;
  return w;
};

const open = (w: ReturnType<typeof world>, id: (typeof ROAD_EVENT_IDS)[number]) => {
  w.roadEventQueued = id;
  stepWorld(w, 0);
  expect(w.roadEvent).toBe(id);
};

describe('road events', () => {
  it('every event has an option the player can always take', () => {
    const w = world();
    w.stats.gold = 0;
    w.stats.gems = 0;
    for (const id of ROAD_EVENT_IDS) expect(ROAD_EVENTS[id].options.some((o) => canChoose(w, o))).toBe(true);
  });

  it('rolls roughly 40% of the time, never on wave 1 and never two in a row', () => {
    let hits = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const w = world(seed);
      rollRoadEvent(w);
      if (w.roadEventQueued) hits++;
    }
    expect(hits).toBeGreaterThan(120);
    expect(hits).toBeLessThan(200);

    const first = world();
    first.wave.n = 1;
    for (let i = 0; i < 50; i++) rollRoadEvent(first);
    expect(first.roadEventQueued).toBeNull();

    const w = world();
    w.lastRoadEvent = w.wave.n - ROAD_EVENT_GAP + 1;
    for (let i = 0; i < 50; i++) rollRoadEvent(w);
    expect(w.roadEventQueued).toBeNull();
  });

  it('opens only after the card draft closes and halts the simulation while open', () => {
    const w = createWorld({ seed: 4 });
    w.wave.n = 5;
    w.draft = { options: ['sharpBlades'], rerolls: 0 };
    w.roadEventQueued = 'well';
    stepWorld(w, 100);
    expect(w.roadEvent).toBeNull();

    pickCard(w, 'sharpBlades');
    const events = stepWorld(w, 500);
    expect(w.roadEvent).toBe('well');
    expect(events.some((e) => e.type === 'roadEventOpen')).toBe(true);
    const t = w.time;
    stepWorld(w, 500);
    expect(w.time).toBe(t);

    chooseRoadOption(w, 1);
    stepWorld(w, 500);
    expect(w.time).toBeGreaterThan(t);
  });

  it('charges the price and refuses options the player cannot afford', () => {
    const w = world();
    open(w, 'smith');
    w.stats.gold = price(w, 35) - 1;
    expect(chooseRoadOption(w, 0)).toBeNull();
    expect(w.roadEvent).toBe('smith');

    w.stats.gold = price(w, 35) + 5;
    const hp = w.party[0].maxHp;
    expect(chooseRoadOption(w, 0)).toContain('Zırhlar');
    expect(w.stats.gold).toBe(5);
    expect(w.party[0].maxHp).toBeGreaterThan(hp);
    expect(w.roadEvent).toBeNull();
  });

  it('the well heals everyone, bandits hurt but never kill', () => {
    const w = world();
    for (const h of w.party) h.hp = 1;
    open(w, 'well');
    chooseRoadOption(w, 0);
    for (const h of w.party) expect(h.hp).toBe(h.maxHp);

    for (const h of w.party) h.hp = 2;
    open(w, 'bandits');
    chooseRoadOption(w, 1);
    expect(w.stats.gems).toBe(2);
    for (const h of w.party) expect(h.hp).toBe(1);
  });

  it('dice either doubles or halves the stake', () => {
    const outcomes = new Set<number>();
    for (let seed = 1; seed <= 20; seed++) {
      const w = world(seed);
      w.stats.gold = 100;
      open(w, 'dice');
      chooseRoadOption(w, 0);
      outcomes.add(w.stats.gold);
    }
    expect([...outcomes].sort()).toEqual([150, 50]);
  });

  it('the merchant brings a hero token and the fortune teller a card', () => {
    const w = world();
    w.loot = [];
    w.stats.gold = 999;
    open(w, 'merchant');
    chooseRoadOption(w, 0);
    expect(w.loot.some((l) => l.type === 'hero')).toBe(true);

    w.stats.gems = 1;
    open(w, 'fortune');
    chooseRoadOption(w, 0);
    expect(w.stats.gems).toBe(0);
    expect(w.tally.cardsPicked).toBe(1);
  });

  it('does not repeat a recent event', () => {
    const w = world();
    const seen: string[] = [];
    for (let n = 2; n < 40; n++) {
      w.wave.n = n;
      w.lastRoadEvent = 0;
      w.roadEventQueued = null;
      rollRoadEvent(w);
      if (!w.roadEventQueued) continue;
      stepWorld(w, 0);
      seen.push(w.roadEvent!);
      chooseRoadOption(w, ROAD_EVENTS[w.roadEvent!].options.findIndex((o) => canChoose(w, o)));
    }
    for (let i = 1; i < seen.length; i++) expect(seen.slice(Math.max(0, i - 4), i)).not.toContain(seen[i]);
  });
});

describe('road events after defeat', () => {
  it('never opens once the caravan has fallen', () => {
    const w = world();
    w.roadEventQueued = 'well';
    w.alive = false;
    stepWorld(w, 100);
    expect(w.roadEvent).toBeNull();
  });
});
