import { describe, expect, it } from 'vitest';
import { BASE_TICK_MS } from '../src/config';
import { InputQueue } from '../src/sim/inputQueue';
import { createWorld, stepWorld, turn } from '../src/sim/world';
import { arena, tick } from './helpers';

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

  it('ends the game on wall hit', () => {
    const w = arena([{ x: 22, y: 5 }]);
    const events = tick(w);
    expect(w.alive).toBe(false);
    expect(events).toContainEqual({ type: 'gameOver', reason: 'wall' });
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
