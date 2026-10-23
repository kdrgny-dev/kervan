import { describe, expect, it } from 'vitest';
import { FIRST_BREAK_MS, SAFE_SPAWN_DIST, SPAWN_WARN_MS, WAVE_BREAK_MS, waveBudget } from '../src/data/balance';
import { ENEMIES } from '../src/data/enemies';
import { spawnEnemy } from '../src/sim/enemies';
import { chebyshev } from '../src/sim/grid';
import { stepWorld } from '../src/sim/world';
import { arena, freeze, tick } from './helpers';

describe('hero attacks', () => {
  it('knight hits an adjacent enemy right away', () => {
    const w = arena([{ x: 5, y: 5 }]);
    const slime = spawnEnemy(w, 'slime', { x: 5, y: 6 });
    stepWorld(w, 10);
    expect(slime.hp).toBe(20 - 10);
  });

  it('knight ignores enemies out of reach', () => {
    const w = arena([{ x: 5, y: 5 }]);
    const slime = spawnEnemy(w, 'slime', { x: 5, y: 8 });
    stepWorld(w, 10);
    expect(slime.hp).toBe(20);
  });

  it('archer arrow travels and lands', () => {
    const w = arena([{ x: 5, y: 5 }], ['archer']);
    const slime = spawnEnemy(w, 'slime', { x: 5, y: 9 });
    freeze(w);
    stepWorld(w, 10);
    expect(w.projectiles).toHaveLength(1);
    expect(slime.hp).toBe(20);
    stepWorld(w, 400);
    expect(slime.hp).toBe(20 - 6);
  });

  it('mage fireball splashes neighbours', () => {
    const w = arena([{ x: 5, y: 5 }], ['mage']);
    const a = spawnEnemy(w, 'goblin', { x: 5, y: 8 });
    const b = spawnEnemy(w, 'goblin', { x: 6, y: 9 });
    const far = spawnEnemy(w, 'goblin', { x: 9, y: 12 });
    freeze(w);
    stepWorld(w, 10);
    stepWorld(w, 500);
    expect(a.hp).toBe(45 - 8);
    expect(b.hp).toBe(45 - 8);
    expect(far.hp).toBe(45);
  });

  it('rogue crits on a lucky roll', () => {
    const w = arena([{ x: 5, y: 5 }], ['rogue']);
    w.rng = () => 0;
    const gob = spawnEnemy(w, 'goblin', { x: 5, y: 6 });
    freeze(w);
    stepWorld(w, 10);
    expect(gob.hp).toBe(45 - 9 * 2);
  });

  it('rogue hits normally otherwise', () => {
    const w = arena([{ x: 5, y: 5 }], ['rogue']);
    w.rng = () => 0.99;
    const gob = spawnEnemy(w, 'goblin', { x: 5, y: 6 });
    freeze(w);
    stepWorld(w, 10);
    expect(gob.hp).toBe(45 - 9);
  });

  it('priest heals the party on its timer', () => {
    const w = arena([{ x: 5, y: 5 }, { x: 4, y: 5 }], ['priest', 'knight']);
    w.party[1].hp = 50;
    stepWorld(w, 3000);
    expect(w.party.find((h) => h.kind === 'knight')?.hp).toBe(53);
  });

  it('dead enemies are removed and stop being targeted', () => {
    const w = arena([{ x: 5, y: 5 }]);
    const bat = spawnEnemy(w, 'bat', { x: 5, y: 6 });
    stepWorld(w, 10);
    expect(bat.hp).toBeLessThanOrEqual(0);
    expect(w.enemies).toHaveLength(0);
  });
});

describe('enemy attacks and hero death', () => {
  it('adjacent slime damages a hero', () => {
    const w = arena([{ x: 5, y: 5 }], ['archer']);
    spawnEnemy(w, 'slime', { x: 6, y: 6 });
    freeze(w);
    stepWorld(w, ENEMIES.slime.attackMs / 2 + 10);
    expect(w.party[0].hp).toBe(35 - 8);
  });

  it('leadership passes to the next hero when the leader dies', () => {
    const w = arena([{ x: 5, y: 5 }, { x: 4, y: 5 }], ['archer', 'knight']);
    w.party[0].hp = 1;
    spawnEnemy(w, 'slime', { x: 6, y: 4 });
    freeze(w);
    stepWorld(w, ENEMIES.slime.attackMs / 2 + 10);
    expect(w.party).toHaveLength(1);
    expect(w.party[0].kind).toBe('knight');
    expect(w.alive).toBe(true);
  });

  it('losing every hero ends the run', () => {
    const w = arena([{ x: 5, y: 5 }], ['archer']);
    w.party[0].hp = 1;
    spawnEnemy(w, 'slime', { x: 6, y: 6 });
    const events = stepWorld(w, ENEMIES.slime.attackMs / 2 + 10);
    expect(w.alive).toBe(false);
    expect(events).toContainEqual({ type: 'gameOver', reason: 'wiped' });
  });

  it('skeleton shoots from range', () => {
    const w = arena([{ x: 5, y: 5 }], ['knight']);
    spawnEnemy(w, 'skeleton', { x: 5, y: 9 });
    w.dir = 'right';
    stepWorld(w, ENEMIES.skeleton.attackMs / 2 + 10);
    expect(w.projectiles.some((p) => p.owner === 'enemy')).toBe(true);
  });
});

describe('bumping into enemies', () => {
  it('hurts the leader and pushes the enemy', () => {
    const w = arena([{ x: 5, y: 5 }], ['archer']);
    const gob = spawnEnemy(w, 'goblin', { x: 6, y: 5 });
    gob.attackCd = 99999;
    tick(w);
    expect(w.party[0].hp).toBe(35 - Math.ceil(35 * 0.4));
    expect(w.party[0].pos).toEqual({ x: 6, y: 5 });
    expect(gob.pos.x).toBeGreaterThanOrEqual(7);
  });

  it('blocks movement when the enemy cannot be pushed', () => {
    const w = arena([{ x: 21, y: 5 }], ['knight']);
    const gob = spawnEnemy(w, 'goblin', { x: 22, y: 5 });
    gob.attackCd = 99999;
    w.party[0].cooldown = 99999;
    tick(w);
    expect(w.alive).toBe(true);
    expect(w.party[0].pos).toEqual({ x: 21, y: 5 });
  });

  it('grants brief invulnerability after a bump', () => {
    const w = arena([{ x: 21, y: 5 }], ['knight']);
    const gob = spawnEnemy(w, 'goblin', { x: 22, y: 5 });
    gob.attackCd = 99999;
    w.party[0].cooldown = 99999;
    tick(w);
    const hp = w.party[0].hp;
    tick(w);
    expect(w.party[0].hp).toBe(hp);
  });
});

describe('waves', () => {
  it('starts wave 1 after the opening break with telegraphed spawns', () => {
    const w = arena([{ x: 5, y: 7 }], ['knight'], { waves: true });
    const events = stepWorld(w, FIRST_BREAK_MS);
    expect(events).toContainEqual({ type: 'waveStart', n: 1 });
    expect(w.wave.pending.length).toBe(waveBudget(1) / ENEMIES.slime.cost);
    expect(w.enemies).toHaveLength(0);
    for (const p of w.wave.pending) {
      expect(chebyshev(p.pos, w.party[0].pos)).toBeGreaterThan(SAFE_SPAWN_DIST);
      expect(p.kind).toBe('slime');
    }
  });

  it('spawns enemies once the warning elapses', () => {
    const w = arena([{ x: 5, y: 7 }], ['knight'], { waves: true });
    w.tickMs = 1e9;
    stepWorld(w, FIRST_BREAK_MS + SPAWN_WARN_MS + 10);
    expect(w.enemies.length).toBeGreaterThan(0);
  });

  it('clearing a wave starts a break and drops a hero token', () => {
    const w = arena([{ x: 5, y: 7 }], ['knight'], { waves: true });
    w.tickMs = 1e9;
    stepWorld(w, FIRST_BREAK_MS);
    w.wave.pending = [];
    const events = stepWorld(w, 10);
    expect(events).toContainEqual({ type: 'waveCleared', n: 1 });
    expect(w.wave.phase).toBe('break');
    expect(w.wave.timer).toBeCloseTo(WAVE_BREAK_MS, -2);
    expect(w.loot.some((l) => l.type === 'hero')).toBe(true);
  });
});
