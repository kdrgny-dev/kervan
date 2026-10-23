import { BASE_TICK_MS } from '../config';
import { ENEMIES, type EnemyKind } from '../data/enemies';
import { HERO_KINDS, type HeroKind } from '../data/heroes';
import {
  BOMB_DMG,
  DROP_TABLE,
  LOOT_LIFETIME_MS,
  MAGNET_RADIUS,
  POWER_KINDS,
  POWERS,
  type PowerKind,
  SPEED_TICK_MS,
  xpToNext,
} from '../data/loot';
import { damageEnemy } from './combat';
import { chebyshev, eq, type Vec } from './grid';
import { pick, type Rng } from './rng';
import { freeCells, scaledMaxHp } from './state';
import type { Enemy, Loot, LootDrop, World } from './types';

export function rollDrop(rng: Rng, enemy: EnemyKind): LootDrop | null {
  const r = rng();
  let acc = 0;
  for (const row of DROP_TABLE) {
    acc += row.chance;
    if (r >= acc) continue;
    switch (row.kind) {
      case 'hero':
        return { type: 'hero', hero: pick(rng, HERO_KINDS) };
      case 'power':
        return { type: 'power', power: pick(rng, POWER_KINDS) };
      case 'gem':
        return { type: 'gem' };
      case 'coin':
        return { type: 'coin', value: ENEMIES[enemy].gold };
    }
  }
  return null;
}

export function dropLoot(w: World, drop: LootDrop, pos: Vec, lifetimeMs = LOOT_LIFETIME_MS): Loot {
  const loot = { ...drop, id: w.nextId++, pos, expiresAt: w.time + lifetimeMs } as Loot;
  w.loot.push(loot);
  w.events.push({ type: 'lootSpawned', id: loot.id });
  return loot;
}

/** Dalga sonu garantili jeton; süresi dolmaz. */
export function spawnHeroToken(w: World, hero?: HeroKind) {
  const cells = freeCells(w, (p) => !w.loot.some((l) => eq(l.pos, p)));
  if (cells.length === 0) return;
  dropLoot(w, { type: 'hero', hero: hero ?? pick(w.rng, HERO_KINDS) }, pick(w.rng, cells), Infinity);
}

export const hasHeroToken = (w: World) => w.loot.some((l) => l.type === 'hero');

/** Kahraman jetonu dışındaki ganimetin etkisini uygular; büyüme world.moveTick'te. */
export function collect(w: World, loot: Loot) {
  w.loot = w.loot.filter((l) => l !== loot);
  w.events.push({ type: 'lootCollected', id: loot.id, loot });
  switch (loot.type) {
    case 'coin':
      w.stats.gold += loot.value;
      break;
    case 'gem':
      w.stats.gems++;
      break;
    case 'power':
      activatePower(w, loot.power);
      break;
  }
}

export function activatePower(w: World, power: PowerKind) {
  if (power === 'bomb') {
    w.events.push({ type: 'bomb' });
    for (const e of w.enemies) damageEnemy(w, e, BOMB_DMG);
    return;
  }
  w.powers[power] = POWERS[power].durationMs;
  if (power === 'speed') w.tickMs = SPEED_TICK_MS;
  w.events.push({ type: 'powerStart', power });
}

export function updateLoot(w: World, dt: number) {
  for (const power of Object.keys(w.powers) as PowerKind[]) {
    const left = (w.powers[power] ?? 0) - dt;
    if (left > 0) {
      w.powers[power] = left;
      continue;
    }
    delete w.powers[power];
    if (power === 'speed') w.tickMs = BASE_TICK_MS;
    w.events.push({ type: 'powerEnd', power });
  }

  for (const l of w.loot) {
    if (l.expiresAt <= w.time) w.events.push({ type: 'lootExpired', id: l.id });
  }
  w.loot = w.loot.filter((l) => l.expiresAt > w.time);

  const leader = w.party[0];
  if (w.powers.magnet && leader) {
    for (const l of [...w.loot]) {
      if (l.type !== 'hero' && chebyshev(l.pos, leader.pos) <= MAGNET_RADIUS) collect(w, l);
    }
  }
}

export function onEnemyKilled(w: World, e: Enemy) {
  w.stats.kills++;
  gainXp(w, ENEMIES[e.kind].cost);
  const drop = rollDrop(w.rng, e.kind);
  if (drop) dropLoot(w, drop, e.pos);
}

export function gainXp(w: World, amount: number) {
  const s = w.stats;
  s.xp += amount;
  while (s.xp >= xpToNext(s.level)) {
    s.xp -= xpToNext(s.level);
    s.level++;
    for (const h of w.party) {
      const max = scaledMaxHp(w, h.kind);
      h.hp += max - h.maxHp;
      h.maxHp = max;
    }
    w.events.push({ type: 'levelUp', level: s.level });
  }
}
