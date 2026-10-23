import { describe, expect, it } from 'vitest';
import { BASE_TICK_MS } from '../src/config';
import { BOMB_DMG, LOOT_LIFETIME_MS, SPEED_TICK_MS, xpToNext } from '../src/data/loot';
import { damageHero } from '../src/sim/combat';
import { spawnEnemy } from '../src/sim/enemies';
import { activatePower, dropLoot, gainXp, rollDrop } from '../src/sim/loot';
import { stepWorld } from '../src/sim/world';
import { arena, freeze, tick } from './helpers';

describe('drop table', () => {
  it('maps the roll onto cumulative thresholds', () => {
    expect(rollDrop(() => 0.001, 'slime')?.type).toBe('hero');
    expect(rollDrop(() => 0.05, 'slime')?.type).toBe('power');
    expect(rollDrop(() => 0.1, 'slime')?.type).toBe('gem');
    expect(rollDrop(() => 0.5, 'goblin')).toEqual({ type: 'coin', value: 3 });
    expect(rollDrop(() => 0.99, 'slime')).toBeNull();
  });

  it('killed enemies drop loot where they died and count as kills', () => {
    const w = arena([{ x: 5, y: 5 }]);
    w.rng = () => 0.5;
    const bat = spawnEnemy(w, 'bat', { x: 5, y: 6 });
    freeze(w);
    stepWorld(w, 10);
    expect(bat.hp).toBeLessThanOrEqual(0);
    expect(w.stats.kills).toBe(1);
    expect(w.loot).toMatchObject([{ type: 'coin', value: 1, pos: { x: 5, y: 6 } }]);
  });
});

describe('collecting', () => {
  it('leader walking over a coin adds gold', () => {
    const w = arena([{ x: 5, y: 5 }]);
    dropLoot(w, { type: 'coin', value: 3 }, { x: 6, y: 5 });
    tick(w);
    expect(w.stats.gold).toBe(3);
    expect(w.loot).toHaveLength(0);
  });

  it('followers do not collect loot', () => {
    const w = arena([{ x: 5, y: 5 }, { x: 4, y: 5 }]);
    w.dir = 'down';
    dropLoot(w, { type: 'gem' }, { x: 4, y: 4 });
    tick(w);
    expect(w.stats.gems).toBe(0);
  });

  it('loot expires after its lifetime', () => {
    const w = arena([{ x: 5, y: 5 }]);
    freeze(w);
    dropLoot(w, { type: 'gem' }, { x: 10, y: 10 });
    stepWorld(w, LOOT_LIFETIME_MS - 10);
    expect(w.loot).toHaveLength(1);
    const events = stepWorld(w, 20);
    expect(w.loot).toHaveLength(0);
    expect(events.some((e) => e.type === 'lootExpired')).toBe(true);
  });

  it('a hero token grows the party', () => {
    const w = arena([{ x: 5, y: 5 }]);
    dropLoot(w, { type: 'hero', hero: 'mage' }, { x: 6, y: 5 });
    tick(w);
    expect(w.party.map((h) => h.kind)).toEqual(['knight', 'mage']);
  });
});

describe('power-ups', () => {
  it('rage doubles hero damage', () => {
    const w = arena([{ x: 5, y: 5 }]);
    activatePower(w, 'rage');
    const gob = spawnEnemy(w, 'goblin', { x: 5, y: 6 });
    freeze(w);
    stepWorld(w, 10);
    expect(gob.hp).toBe(45 - 20);
  });

  it('shield blocks hero damage', () => {
    const w = arena([{ x: 5, y: 5 }]);
    activatePower(w, 'shield');
    damageHero(w, w.party[0], 50);
    expect(w.party[0].hp).toBe(60);
  });

  it('speed shortens the move tick and wears off', () => {
    const w = arena([{ x: 5, y: 5 }]);
    activatePower(w, 'speed');
    expect(w.tickMs).toBe(SPEED_TICK_MS);
    w.dir = 'down';
    w.party[0].pos = { x: 5, y: 1 };
    w.tickMs = 1e9;
    w.powers.speed = 20;
    const events = stepWorld(w, 30);
    expect(w.tickMs).toBe(BASE_TICK_MS);
    expect(events).toContainEqual({ type: 'powerEnd', power: 'speed' });
  });

  it('bomb hits every enemy at once', () => {
    const w = arena([{ x: 5, y: 5 }]);
    const a = spawnEnemy(w, 'goblin', { x: 15, y: 10 });
    const b = spawnEnemy(w, 'goblin', { x: 20, y: 2 });
    activatePower(w, 'bomb');
    expect(a.hp).toBe(45 - BOMB_DMG);
    expect(b.hp).toBe(45 - BOMB_DMG);
    expect(w.powers.bomb).toBeUndefined();
  });

  it('magnet pulls nearby coins but not hero tokens', () => {
    const w = arena([{ x: 5, y: 5 }]);
    freeze(w);
    activatePower(w, 'magnet');
    dropLoot(w, { type: 'coin', value: 1 }, { x: 9, y: 8 });
    dropLoot(w, { type: 'coin', value: 1 }, { x: 15, y: 5 });
    dropLoot(w, { type: 'hero', hero: 'archer' }, { x: 6, y: 6 });
    stepWorld(w, 10);
    expect(w.stats.gold).toBe(1);
    expect(w.loot.map((l) => l.type).sort()).toEqual(['coin', 'hero']);
  });
});

describe('levels', () => {
  it('xp levels up the party and scales hp keeping damage taken', () => {
    const w = arena([{ x: 5, y: 5 }]);
    w.party[0].hp = 50;
    gainXp(w, xpToNext(0));
    expect(w.stats.level).toBe(1);
    expect(w.party[0].maxHp).toBe(Math.round(60 * 1.08));
    expect(w.party[0].hp).toBe(50 + Math.round(60 * 1.08) - 60);
  });

  it('heroes recruited later get the current level bonus', () => {
    const w = arena([{ x: 5, y: 5 }]);
    gainXp(w, xpToNext(0) + xpToNext(1));
    expect(w.stats.level).toBe(2);
    dropLoot(w, { type: 'hero', hero: 'knight' }, { x: 6, y: 5 });
    tick(w);
    expect(w.party[1].maxHp).toBe(Math.round(60 * 1.16));
  });

  it('levels raise hero damage', () => {
    const w = arena([{ x: 5, y: 5 }]);
    gainXp(w, xpToNext(0) + xpToNext(1) + xpToNext(2));
    const gob = spawnEnemy(w, 'goblin', { x: 5, y: 6 });
    freeze(w);
    stepWorld(w, 10);
    expect(gob.hp).toBe(45 - Math.round(10 * 1.24));
  });
});
