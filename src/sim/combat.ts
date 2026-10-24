import { HIT_RADIUS, PROJECTILE_SPEED, type ProjectileKind } from '../data/balance';
import { HEROES, type HeroKind } from '../data/heroes';
import { RAGE_MULT } from '../data/loot';
import { chebyshev, type Vec } from './grid';
import { onEnemyKilled } from './loot';
import { endGame, levelMult, upgradeMult } from './state';
import type { Enemy, Hero, Projectile, World } from './types';

const MIN_HIT = 1;

export function damageEnemy(w: World, e: Enemy, dmg: number, crit = false) {
  if (e.hp <= 0) return;
  e.hp -= dmg;
  w.events.push({ type: 'enemyHit', id: e.id, dmg, crit });
  if (e.hp > 0) return;
  w.events.push({ type: 'enemyDied', id: e.id, kind: e.kind, pos: e.pos });
  onEnemyKilled(w, e);
}

const WARRIOR_GUARD = [1, 0.85, 0.7];

/** source: vuran düşman (diken zırhı için). */
export function damageHero(w: World, h: Hero, raw: number, source?: Enemy) {
  if (h.hp <= 0 || w.powers.shield) return;
  const dmg = Math.max(MIN_HIT, Math.round(raw * w.mods.dmgTakenMult * WARRIOR_GUARD[w.syn.warrior]));
  h.hp -= dmg;
  w.events.push({ type: 'heroHit', id: h.id, dmg });
  if (source && w.mods.thorns > 0) damageEnemy(w, source, w.mods.thorns);
  if (h.hp > 0) return;
  const i = w.party.indexOf(h);
  if (i >= 0) w.party.splice(i, 1);
  w.events.push({ type: 'heroDied', id: h.id, pos: h.pos });
  if (w.mods.martyr > 0) {
    for (const e of w.enemies) if (e.hp > 0 && chebyshev(e.pos, h.pos) <= 1) damageEnemy(w, e, w.mods.martyr);
    w.events.push({ type: 'explosion', x: h.pos.x, y: h.pos.y, radius: 1 });
  }
  if (w.party.length === 0) endGame(w, 'wiped');
}

export function heroDamage(w: World, kind: HeroKind) {
  const def = HEROES[kind];
  let mult = levelMult(w) * upgradeMult(w, kind, 'dmg') * w.mods.dmgMult * (w.powers.rage ? RAGE_MULT : 1);
  if (def.attack === 'melee') mult *= w.mods.meleeDmgMult;
  if (kind === 'mage' && w.syn.arcane === 2) mult *= 1.5;
  return Math.max(MIN_HIT, Math.round(def.dmg * mult));
}

export function heroRange(w: World, kind: HeroKind) {
  const def = HEROES[kind];
  if (def.range <= 1) return def.range;
  return def.range + w.mods.rangeBonus + (kind === 'archer' && w.syn.marksman >= 1 ? 1 : 0);
}

export function heroSplash(w: World, kind: HeroKind) {
  const base = HEROES[kind].splash ?? 0;
  return base > 0 ? base + w.mods.splashBonus + (w.syn.arcane >= 1 ? 1 : 0) : 0;
}

/** Kritik: [şans, çarpan]; Gölge sinerjisi ve kartlar ekler. */
export function heroCrit(w: World, kind: HeroKind): [number, number] {
  const c = HEROES[kind].crit;
  const chance = (c?.chance ?? 0) + w.mods.critBonus + (w.syn.shadow >= 1 ? 0.2 : 0);
  const mult = w.syn.shadow === 2 ? 3 : (c?.mult ?? 2);
  return [Math.min(chance, 0.95), mult];
}

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

function nearestEnemies(w: World, from: Vec, range: number, n: number): Enemy[] {
  return w.enemies
    .filter((e) => e.hp > 0 && chebyshev(from, e.pos) <= range)
    .sort((a, b) => (a.pos.x - from.x) ** 2 + (a.pos.y - from.y) ** 2 - ((b.pos.x - from.x) ** 2 + (b.pos.y - from.y) ** 2))
    .slice(0, n);
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
    const range = heroRange(w, h.kind);
    const target = nearestEnemy(w, h.pos, range);
    if (!target) continue;
    h.cooldown = def.cooldownMs * w.mods.cooldownMult;
    const dmg = heroDamage(w, h.kind);
    w.events.push({ type: 'heroAttack', id: h.id });

    if (def.attack === 'melee') {
      const [chance, mult] = heroCrit(w, h.kind);
      const crit = chance > 0 && w.rng() < chance;
      damageEnemy(w, target, crit ? Math.round(dmg * mult) : dmg, crit);
      w.events.push({ type: 'slash', pos: target.pos });
      continue;
    }
    fire(w, def.attack, 'hero', h.pos, target, dmg, heroSplash(w, h.kind));
    if (h.kind === 'archer') {
      const extra = w.mods.extraTargets + (w.syn.marksman === 2 ? 1 : 0);
      for (const t of nearestEnemies(w, h.pos, range, extra + 1).filter((e) => e !== target).slice(0, extra)) {
        fire(w, def.attack, 'hero', h.pos, t, dmg);
      }
    }
  }
}

const HOLY_HEAL = [1, 2, 3];

function healParty(w: World, base: number) {
  const amount = Math.round(base * w.mods.healMult * HOLY_HEAL[w.syn.holy]);
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
