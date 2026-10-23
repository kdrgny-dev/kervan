import { BASE_TICK_MS } from '../src/config';
import type { HeroKind } from '../src/data/heroes';
import type { Vec } from '../src/sim/grid';
import { createWorld, makeHero, stepWorld, type World } from '../src/sim/world';

export const tick = (w: World, n = 1) => stepWorld(w, BASE_TICK_MS * n);

export function arena(cells: Vec[], kinds: HeroKind[] = [], opts: { waves?: boolean; seed?: number } = {}) {
  const w = createWorld({ seed: opts.seed ?? 1, waves: opts.waves ?? false });
  w.party = cells.map((pos, i) => makeHero(w, kinds[i] ?? 'knight', pos));
  w.pickup = null;
  return w;
}

/** Kafile ve düşman hareketini durdurur; yalnızca savaş zamanlamasını test etmek için. */
export function freeze(w: World) {
  w.tickMs = 1e9;
  for (const e of w.enemies) e.moveAcc = -1e9;
  return w;
}
