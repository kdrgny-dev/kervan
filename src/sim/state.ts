import { BASE_TICK_MS, GRID_H, GRID_W } from '../config';
import { HEROES, type HeroKind } from '../data/heroes';
import { UPGRADE_STEP } from '../data/economy';
import { LEVEL_BONUS } from '../data/loot';
import { eq, isWall, type Vec } from './grid';
import type { GameOverReason, Hero, World } from './types';

export const levelMult = (w: World) => 1 + LEVEL_BONUS * w.stats.level;

export const upgradeMult = (w: World, kind: HeroKind, stat: 'hp' | 'dmg') =>
  1 + UPGRADE_STEP * (w.loadout.upgrades[kind]?.[stat] ?? 0);

export const scaledMaxHp = (w: World, kind: HeroKind) =>
  Math.max(1, Math.round(HEROES[kind].hp * levelMult(w) * upgradeMult(w, kind, 'hp') * Math.max(0.2, w.mods.hpMult)));

/** Kart ve seviye değişince mevcut kahramanların maks. canını, aldıkları hasarı koruyarak yeniler. */
export function rescaleParty(w: World) {
  for (const h of w.party) {
    const max = scaledMaxHp(w, h.kind);
    h.hp = Math.max(1, h.hp + max - h.maxHp);
    h.maxHp = max;
  }
}

export const baseTickMs = (w: World) => BASE_TICK_MS * w.mods.speedMult;

export function makeHero(w: World, kind: HeroKind, pos: Vec): Hero {
  const hp = scaledMaxHp(w, kind);
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

export function endGame(w: World, reason: GameOverReason) {
  if (!w.alive) return;
  w.alive = false;
  for (const h of w.party) h.prev = h.pos;
  for (const e of w.enemies) e.prev = e.pos;
  w.events.push({ type: 'gameOver', reason });
}
