import { GRID_H, GRID_W } from '../config';
import { HERO_KINDS, HEROES, type HeroKind } from '../data/heroes';
import { eq, isWall, type Vec } from './grid';
import { pick } from './rng';
import type { GameOverReason, Hero, World } from './types';

export function makeHero(w: World, kind: HeroKind, pos: Vec): Hero {
  const hp = HEROES[kind].hp;
  return { id: w.nextId++, kind, pos, prev: pos, hp, maxHp: hp, cooldown: 0, healCd: HEROES[kind].heal?.everyMs ?? 0 };
}

export const heroAt = (w: World, p: Vec) => w.party.find((h) => eq(h.pos, p));

export const enemyAt = (w: World, p: Vec) => w.enemies.find((e) => e.hp > 0 && eq(e.pos, p));

export const isFree = (w: World, p: Vec) => !isWall(p) && !heroAt(w, p) && !enemyAt(w, p);

export function freeCells(w: World, accept: (p: Vec) => boolean = () => true): Vec[] {
  const out: Vec[] = [];
  for (let y = 1; y < GRID_H - 1; y++) {
    for (let x = 1; x < GRID_W - 1; x++) {
      const p = { x, y };
      if (isFree(w, p) && accept(p)) out.push(p);
    }
  }
  return out;
}

export function spawnPickup(w: World, kind?: HeroKind) {
  const cells = freeCells(w);
  if (cells.length === 0) return;
  w.pickup = { pos: pick(w.rng, cells), kind: kind ?? pick(w.rng, HERO_KINDS) };
  w.events.push({ type: 'pickupSpawned' });
}

export function endGame(w: World, reason: GameOverReason) {
  if (!w.alive) return;
  w.alive = false;
  for (const h of w.party) h.prev = h.pos;
  for (const e of w.enemies) e.prev = e.pos;
  w.events.push({ type: 'gameOver', reason });
}
