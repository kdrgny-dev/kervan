import { CHARGE_DIST, CHARGE_SPEEDUP, enemyHpScale } from '../data/balance';
import { ENEMIES, type EnemyDef, type EnemyKind } from '../data/enemies';
import { chebyshev, manhattan, neighbors, type Vec } from './grid';
import { damageHero, fire, nearestHero } from './combat';
import { pick } from './rng';
import { isFree } from './state';
import type { Enemy, World } from './types';

export function spawnEnemy(w: World, kind: EnemyKind, pos: Vec): Enemy {
  const def = ENEMIES[kind];
  const hp = Math.round(def.hp * enemyHpScale(w.wave.n));
  const e: Enemy = { id: w.nextId++, kind, pos, prev: pos, hp, maxHp: hp, moveAcc: 0, moveMs: def.moveMs, attackCd: def.attackMs / 2 };
  w.enemies.push(e);
  w.events.push({ type: 'enemySpawned', id: e.id });
  return e;
}

export function updateEnemies(w: World, dt: number) {
  for (const e of w.enemies) {
    if (e.hp <= 0) continue;
    const near = nearestHero(w, e.pos);
    if (!near) return;
    const def = ENEMIES[e.kind];
    const dist = chebyshev(e.pos, near.pos);

    e.attackCd = Math.max(0, e.attackCd - dt);
    if (e.attackCd === 0) {
      if (def.brain === 'kite') {
        if (dist <= (def.range ?? 0) + 1) {
          fire(w, 'bone', 'enemy', e.pos, near, def.dmg);
          e.attackCd = def.attackMs;
        }
      } else if (dist <= 1) {
        damageHero(w, near, def.dmg);
        e.attackCd = def.attackMs;
        if (!w.alive) return;
      }
    }

    e.moveMs = def.brain === 'charge' && dist <= CHARGE_DIST ? def.moveMs * CHARGE_SPEEDUP : def.moveMs;
    e.moveAcc += dt;
    if (e.moveAcc < e.moveMs) continue;
    e.moveAcc = Math.min(e.moveAcc - e.moveMs, e.moveMs);
    e.prev = e.pos;
    const next = chooseStep(w, e, def, near.pos, dist);
    if (next) e.pos = next;
  }
}

function chooseStep(w: World, e: Enemy, def: EnemyDef, nearPos: Vec, dist: number): Vec | null {
  const options = neighbors(e.pos).filter((p) => isFree(w, p));
  if (options.length === 0) return null;
  const toward = (t: Vec) => best(w, options, (p) => -manhattan(p, t));
  const away = (t: Vec) => best(w, options, (p) => manhattan(p, t));
  const random = () => pick(w.rng, options);

  switch (def.brain) {
    case 'wander':
      if (dist <= 1) return null;
      return w.rng() < 0.6 ? toward(nearPos) : random();
    case 'erratic':
      if (dist <= 1 && w.rng() < 0.5) return null;
      return w.rng() < 0.5 ? toward(nearPos) : random();
    case 'kite': {
      const range = def.range ?? 4;
      if (dist < range) return away(nearPos);
      if (dist > range) return toward(nearPos);
      return null;
    }
    case 'charge':
      if (dist <= 1) return null;
      return toward(w.party[0].pos);
  }
}

function best(w: World, options: Vec[], score: (p: Vec) => number): Vec {
  let top = -Infinity;
  let picks: Vec[] = [];
  for (const p of options) {
    const s = score(p);
    if (s > top) {
      top = s;
      picks = [p];
    } else if (s === top) picks.push(p);
  }
  return pick(w.rng, picks);
}
