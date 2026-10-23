import { HIT_RADIUS, PROJECTILE_SPEED, type ProjectileKind } from '../data/balance';
import { HEROES, type HeroDef } from '../data/heroes';
import { RAGE_MULT } from '../data/loot';
import { chebyshev, type Vec } from './grid';
import { onEnemyKilled } from './loot';
import { endGame, levelMult } from './state';
import type { Enemy, Hero, Projectile, World } from './types';

export function damageEnemy(w: World, e: Enemy, dmg: number) {
  if (e.hp <= 0) return;
  e.hp -= dmg;
  w.events.push({ type: 'enemyHit', id: e.id, dmg });
  if (e.hp > 0) return;
  w.events.push({ type: 'enemyDied', id: e.id, pos: e.pos });
  onEnemyKilled(w, e);
}

export function damageHero(w: World, h: Hero, dmg: number) {
  if (h.hp <= 0 || w.powers.shield) return;
  h.hp -= dmg;
  w.events.push({ type: 'heroHit', id: h.id, dmg });
  if (h.hp > 0) return;
  const i = w.party.indexOf(h);
  if (i >= 0) w.party.splice(i, 1);
  w.events.push({ type: 'heroDied', id: h.id, pos: h.pos });
  if (w.party.length === 0) endGame(w, 'wiped');
}

export const heroDamage = (w: World, def: HeroDef) =>
  Math.round(def.dmg * levelMult(w) * (w.powers.rage ? RAGE_MULT : 1));

export function nearestEnemy(w: World, from: Vec, range: number): Enemy | undefined {
  let best: Enemy | undefined;
  let bestD = Infinity;
  for (const e of w.enemies) {
    if (e.hp <= 0 || chebyshev(from, e.pos) > range) continue;
    const d = (e.pos.x - from.x) ** 2 + (e.pos.y - from.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

export function nearestHero(w: World, from: Vec): Hero | undefined {
  let best: Hero | undefined;
  let bestD = Infinity;
  for (const h of w.party) {
    const d = (h.pos.x - from.x) ** 2 + (h.pos.y - from.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = h;
    }
  }
  return best;
}

export function fire(
  w: World,
  kind: ProjectileKind,
  owner: Projectile['owner'],
  from: Vec,
  target: { id: number; pos: Vec },
  dmg: number,
  splash = 0,
) {
  w.projectiles.push({
    id: w.nextId++,
    kind,
    owner,
    x: from.x,
    y: from.y,
    tx: target.pos.x,
    ty: target.pos.y,
    targetId: target.id,
    dmg,
    splash,
    speed: PROJECTILE_SPEED[kind],
  });
}

export function updateHeroes(w: World, dt: number) {
  for (const h of [...w.party]) {
    if (h.hp <= 0) continue;
    const def = HEROES[h.kind];

    if (def.heal) {
      h.healCd -= dt;
      if (h.healCd <= 0) {
        h.healCd += def.heal.everyMs;
        healParty(w, def.heal.amount);
      }
    }

    h.cooldown = Math.max(0, h.cooldown - dt);
    if (h.cooldown > 0) continue;
    const target = nearestEnemy(w, h.pos, def.range);
    if (!target) continue;
    h.cooldown = def.cooldownMs;
    const dmg = heroDamage(w, def);

    switch (def.attack) {
      case 'melee':
        damageEnemy(w, target, dmg);
        w.events.push({ type: 'slash', pos: target.pos });
        break;
      case 'cleave':
        for (const e of w.enemies) {
          if (e.hp > 0 && chebyshev(h.pos, e.pos) <= 1) {
            damageEnemy(w, e, dmg);
            w.events.push({ type: 'slash', pos: e.pos });
          }
        }
        break;
      default:
        fire(w, def.attack, 'hero', h.pos, target, dmg, def.splash);
    }
  }
}

function healParty(w: World, amount: number) {
  for (const h of w.party) {
    if (h.hp >= h.maxHp) continue;
    const healed = Math.min(amount, h.maxHp - h.hp);
    h.hp += healed;
    w.events.push({ type: 'heroHealed', id: h.id, amount: healed });
  }
}

export function updateProjectiles(w: World, dt: number) {
  for (const p of w.projectiles) {
    const target =
      p.owner === 'hero'
        ? w.enemies.find((e) => e.id === p.targetId && e.hp > 0)
        : w.party.find((h) => h.id === p.targetId);
    if (target) {
      p.tx = target.pos.x;
      p.ty = target.pos.y;
    }
    const dx = p.tx - p.x;
    const dy = p.ty - p.y;
    const dist = Math.hypot(dx, dy);
    const step = (p.speed * dt) / 1000;
    if (dist <= step + HIT_RADIUS) {
      p.done = true;
      impact(w, p, target);
    } else {
      p.x += (dx / dist) * step;
      p.y += (dy / dist) * step;
    }
    if (!w.alive) return;
  }
  w.projectiles = w.projectiles.filter((p) => !p.done);
}

function impact(w: World, p: Projectile, target: Enemy | Hero | undefined) {
  if (p.splash > 0) {
    const center = { x: Math.round(p.tx), y: Math.round(p.ty) };
    for (const e of w.enemies) {
      if (e.hp > 0 && chebyshev(center, e.pos) <= p.splash) damageEnemy(w, e, p.dmg);
    }
    w.events.push({ type: 'explosion', x: p.tx, y: p.ty, radius: p.splash });
    return;
  }
  if (!target) return;
  if (p.owner === 'hero') damageEnemy(w, target as Enemy, p.dmg);
  else damageHero(w, target as Hero, p.dmg);
}
