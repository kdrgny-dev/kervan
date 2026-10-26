import { afterEach, describe, expect, it } from 'vitest';
import { DESKTOP_GRID, setGrid } from '../src/config';
import { isWall } from '../src/sim/grid';
import { startWave } from '../src/sim/waves';
import { createWorld } from '../src/sim/world';

const waveSize = (n: number) => {
  const w = createWorld({ seed: 7, drafts: false });
  w.wave.n = n - 1;
  startWave(w);
  return w.wave.pending.length;
};

describe('phone arena', () => {
  afterEach(() => setGrid(DESKTOP_GRID.w, DESKTOP_GRID.h));

  it('walls follow the smaller grid and the caravan starts inside it', () => {
    setGrid(23, 11);
    expect(isWall({ x: 22, y: 5 })).toBe(true);
    expect(isWall({ x: 5, y: 10 })).toBe(true);
    expect(isWall({ x: 21, y: 9 })).toBe(false);
    const w = createWorld({ seed: 1 });
    expect(isWall(w.party[0].pos)).toBe(false);
  });

  it('waves shrink with the arena so the density stays the same', () => {
    const desktop = waveSize(8);
    setGrid(23, 11);
    const phone = waveSize(8);
    expect(phone).toBeLessThan(desktop);
    expect(phone).toBeGreaterThan(desktop * 0.5);
  });
});
