import { bossHpScale, CHARGE_DIST, CHARGE_SPEEDUP, enemyHpScale } from '../data/balance';
import { type BossAbilities, ENEMIES, type EnemyDef, type EnemyKind } from '../data/enemies';
import { chebyshev, manhattan, neighbors, type Vec } from './grid';
import { damageHero, fire, nearestHero, slowParty } from './combat';
import { pick } from './rng';
import { isFree } from './state';
import type { Enemy, World } from './types';

export function spawnEnemy(w: World, kind: EnemyKind, pos: Vec): Enemy {
  const def = ENEMIES[kind];
  const hp = Math.round(def.hp * enemyHpScale(w.wave.n) * (def.boss ? bossHpScale(w.wave.n) : 1) * w.mods.enemyHpMult);
  const e: Enemy = { id: w.nextId++, kind, pos, prev: pos, hp, maxHp: hp, moveAcc: 0, moveMs: def.moveMs, attackCd: def.attackMs / 2 };
  if (def.boss) {
    e.summonCd = def.boss.summonEveryMs / 2;
    e.shockCd = def.boss.shockEveryMs;
  }
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
          fire(w, def.shot ?? 'bone', 'enemy', e.pos, near, def.dmg, 0, def.slowMs ?? 0);
          e.attackCd = def.attackMs;
          w.events.push({ type: 'enemyAttack', id: e.id });
        }
      } else if (dist <= 1) {
        w.events.push({ type: 'enemyAttack', id: e.id });
        damageHero(w, near, def.dmg, e);
        e.attackCd = def.attackMs;
        if (!w.alive) return;
      }
    }

    if (def.boss) {
      bossAbilities(w, e, def.boss, dt);
      bossVolley(w, e, def.boss, dt);
      if (!w.alive) return;
    }

    const charging = def.brain === 'charge' && !def.boss && dist <= CHARGE_DIST;
    e.moveMs = charging ? def.moveMs * CHARGE_SPEEDUP : def.moveMs;
    e.moveAcc += dt;
    if (e.moveAcc < e.moveMs) continue;
    e.moveAcc = Math.min(e.moveAcc - e.moveMs, e.moveMs);
    e.prev = e.pos;
    const next = chooseStep(w, e, def, near.pos, dist);
    if (next) e.pos = next;
  }
}

function bossAbilities(w: World, e: Enemy, b: BossAbilities, dt: number) {
  e.summonCd = (e.summonCd ?? b.summonEveryMs) - dt;
  if (e.summonCd <= 0) {
    e.summonCd += b.summonEveryMs;
    const minions = w.enemies.filter((m) => m.kind === b.summon && m.hp > 0).length;
    const spots = neighbors(e.pos).filter((p) => isFree(w, p));
    if (minions < b.maxMinions && spots.length > 0) {
      w.events.push({ type: 'bossSummon', id: e.id });
      spawnEnemy(w, b.summon, pick(w.rng, spots));
    }
  }

  e.shockCd = (e.shockCd ?? b.shockEveryMs) - dt;
  if (!e.shockWarned && e.shockCd <= b.shockWarnMs) {
    e.shockWarned = true;
    w.events.push({ type: 'shockwaveWarn', id: e.id, radius: b.shockRadius });
  }
  if (e.shockCd <= 0) {
    e.shockCd += b.shockEveryMs;
    e.shockWarned = false;
    w.events.push({ type: 'shockwave', pos: e.pos, radius: b.shockRadius });
    let hit = false;
    for (const h of [...w.party]) {
      if (chebyshev(h.pos, e.pos) <= b.shockRadius) {
        damageHero(w, h, b.shockDmg);
        hit = true;
      }
    }
    if (hit && b.shockSlowMs) slowParty(w, b.shockSlowMs);
  }
}

function bossVolley(w: World, e: Enemy, b: BossAbilities, dt: number) {
  if (!b.volley) return;
  e.volleyCd = (e.volleyCd ?? b.volley.everyMs) - dt;
  if (e.volleyCd > 0) return;
  e.volleyCd += b.volley.everyMs;
  const targets = [...w.party]
    .sort((a, c) => (a.pos.x - e.pos.x) ** 2 + (a.pos.y - e.pos.y) ** 2 - ((c.pos.x - e.pos.x) ** 2 + (c.pos.y - e.pos.y) ** 2))
    .slice(0, b.volley.count);
  for (const h of targets) fire(w, ENEMIES[e.kind].shot ?? 'bone', 'enemy', e.pos, h, Math.round(ENEMIES[e.kind].dmg / 2));
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
