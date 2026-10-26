import { describe, expect, it } from 'vitest';
import { BASE_TICK_MS } from '../src/config';
import { SIM_DT } from '../src/data/balance';
import { InputQueue } from '../src/sim/inputQueue';
import { createWorld, nextCells, stepWorld, turn } from '../src/sim/world';
import { arena, tick } from './helpers';
import { spawnEnemy } from '../src/sim/enemies';

describe('InputQueue', () => {
  it('rejects reversing into current direction', () => {
    const q = new InputQueue();
    q.push('left', 'right');
    expect(q.size).toBe(0);
  });

  it('buffers a quick U-turn as two moves', () => {
    const q = new InputQueue();
    q.push('up', 'right');
    q.push('left', 'right');
    expect(q.next('right')).toBe('up');
    expect(q.next('up')).toBe('left');
  });

  it('caps buffer size', () => {
    const q = new InputQueue(2);
    q.push('up', 'right');
    q.push('left', 'right');
    q.push('down', 'right');
    expect(q.size).toBe(2);
  });
});

describe('world', () => {
  it('moves leader one cell per tick', () => {
    const w = arena([{ x: 5, y: 5 }]);
    tick(w);
    expect(w.party[0].pos).toEqual({ x: 6, y: 5 });
    expect(w.party[0].prev).toEqual({ x: 5, y: 5 });
  });

  it('does not move before a full tick elapses', () => {
    const w = arena([{ x: 5, y: 5 }]);
    stepWorld(w, BASE_TICK_MS - 1);
    expect(w.party[0].pos).toEqual({ x: 5, y: 5 });
  });

  it('followers trace the leader path', () => {
    const w = arena([
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 3, y: 5 },
    ]);
    turn(w, 'down');
    tick(w);
    expect(w.party.map((h) => h.pos)).toEqual([
      { x: 5, y: 6 },
      { x: 5, y: 5 },
      { x: 4, y: 5 },
    ]);
  });

  it('ends the game on wall hit after a one-step grace', () => {
    const w = arena([{ x: 22, y: 5 }]);
    const first = tick(w);
    expect(w.alive).toBe(true);
    expect(first).toContainEqual({ type: 'wallGrace' });
    expect(w.party[0].pos).toEqual({ x: 22, y: 5 });
    const events = tick(w);
    expect(w.alive).toBe(false);
    expect(events).toContainEqual({ type: 'gameOver', reason: 'wall' });
  });

  it('a turn during the grace step is taken right away', () => {
    const w = arena([{ x: 22, y: 5 }]);
    tick(w);
    turn(w, 'down');
    stepWorld(w, SIM_DT);
    expect(w.alive).toBe(true);
    expect(w.party[0].pos).toEqual({ x: 22, y: 6 });
    expect(w.wallGrace).toBe(false);
  });

  it('the grace is spent per wall, not per run', () => {
    const w = arena([{ x: 22, y: 5 }]);
    tick(w);
    turn(w, 'down');
    tick(w);
    turn(w, 'right');
    tick(w);
    expect(w.alive).toBe(true);
    tick(w);
    expect(w.alive).toBe(false);
  });

  it('ends the game on self hit', () => {
    // Leader at (5,5) heading right, body loops around below it.
    const w = arena([
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 4, y: 6 },
      { x: 5, y: 6 },
      { x: 6, y: 6 },
      { x: 7, y: 6 },
    ]);
    turn(w, 'down');
    const events = tick(w);
    expect(events).toContainEqual({ type: 'gameOver', reason: 'self' });
  });

  it('allows moving into the cell the tail is leaving', () => {
    const w = arena([
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 4, y: 6 },
      { x: 5, y: 6 },
    ]);
    turn(w, 'down');
    tick(w);
    expect(w.alive).toBe(true);
    expect(w.party[0].pos).toEqual({ x: 5, y: 6 });
  });

  it('recruits a hero at the old tail cell', () => {
    const w = arena([
      { x: 5, y: 5 },
      { x: 4, y: 5 },
    ]);
    w.loot = [{ id: 999, type: 'hero', hero: 'archer', pos: { x: 6, y: 5 }, expiresAt: Infinity }];
    const events = tick(w);
    expect(w.party).toHaveLength(3);
    expect(w.party[2]).toMatchObject({ kind: 'archer', pos: { x: 4, y: 5 } });
    expect(events.some((e) => e.type === 'recruited')).toBe(true);
    expect(w.party[2].hp).toBe(35);
    expect(w.loot).toHaveLength(0);
  });

  it('stops simulating after death', () => {
    const w = arena([{ x: 22, y: 5 }]);
    tick(w);
    const pos = { ...w.party[0].pos };
    tick(w, 5);
    expect(w.party[0].pos).toEqual(pos);
  });

  it('is deterministic for the same seed', () => {
    const a = createWorld({ seed: 42 });
    const b = createWorld({ seed: 42 });
    expect(a.loot).toEqual(b.loot);
  });
});

describe('dead enemies', () => {
  it('never outlive the step they died in, even when a magnet-pulled bomb kills them', () => {
    const w = createWorld({ seed: 5, waves: false, drafts: false });
    w.loot = [];
    w.party[0].pos = { x: 5, y: 5 };
    w.party[0].prev = { x: 5, y: 5 };
    w.tickMs = 1e9;
    for (const pos of [{ x: 15, y: 10 }, { x: 18, y: 3 }]) spawnEnemy(w, 'skeleton', pos);
    w.powers.magnet = 10_000;
    w.loot.push({ id: w.nextId++, type: 'power', power: 'bomb', pos: { x: 7, y: 5 }, expiresAt: 1e9 });
    const events = stepWorld(w, SIM_DT);
    expect(events.filter((e) => e.type === 'enemyDied')).toHaveLength(2);
    expect(w.enemies).toHaveLength(0);
  });
});

describe('nextCells (drawing ahead of the step)', () => {
  it('leader heads to the next cell, each body part to the one in front', () => {
    const w = arena([{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }]);
    expect(nextCells(w)).toEqual([{ x: 6, y: 5 }, { x: 5, y: 5 }, { x: 4, y: 5 }]);
  });

  it('a queued turn is shown right away', () => {
    const w = arena([{ x: 5, y: 5 }, { x: 4, y: 5 }]);
    turn(w, 'down');
    expect(nextCells(w)[0]).toEqual({ x: 5, y: 6 });
  });

  it('nobody moves forward when the leader faces a wall or its own body', () => {
    const wall = arena([{ x: 22, y: 5 }, { x: 21, y: 5 }]);
    expect(nextCells(wall)).toEqual([{ x: 22, y: 5 }, { x: 21, y: 5 }]);
    const coil = arena([{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 6, y: 6 }, { x: 5, y: 6 }, { x: 4, y: 6 }]);
    coil.dir = 'down';
    expect(nextCells(coil)[0]).toEqual({ x: 5, y: 5 });
  });

  it('matches where the step actually goes', () => {
    const w = arena([{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }]);
    turn(w, 'up');
    const predicted = nextCells(w);
    tick(w);
    expect(w.party.map((h) => h.pos)).toEqual(predicted);
  });
});
