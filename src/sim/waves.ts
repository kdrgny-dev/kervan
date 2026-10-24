import { GRID_H, GRID_W } from '../config';
import {
  SAFE_SPAWN_DIST,
  SPAWN_RETRY_MS,
  SPAWN_STAGGER_MS,
  SPAWN_WARN_MS,
  WAVE_BREAK_MS,
  waveBudget,
  waveGoldBonus,
  BOSS_EVERY,
} from '../data/balance';
import { BOSS_KIND, ENEMIES, ENEMY_KINDS, type EnemyKind } from '../data/enemies';
import { POWER_KINDS } from '../data/loot';
import { chebyshev, eq, type Vec } from './grid';
import { spawnEnemy } from './enemies';
import { pick } from './rng';
import { openDraft } from './cards';
import { activatePower, hasHeroToken, spawnHeroToken } from './loot';
import { freeCells, isFree } from './state';
import type { PendingSpawn, World } from './types';

const onEdgeRing = (p: Vec) => p.x === 1 || p.y === 1 || p.x === GRID_W - 2 || p.y === GRID_H - 2;

export function updateWaves(w: World, dt: number) {
  const s = w.wave;
  if (s.phase === 'break') {
    s.timer -= dt;
    if (s.timer <= 0) startWave(w);
    return;
  }

  for (const p of s.pending) {
    if (p.at > w.time) continue;
    if (isFree(w, p.pos) && w.party.every((h) => chebyshev(h.pos, p.pos) > 1)) {
      spawnEnemy(w, p.kind, p.pos);
      p.at = -1;
    } else {
      p.at = w.time + SPAWN_RETRY_MS;
    }
  }
  s.pending = s.pending.filter((p) => p.at >= 0);

  if (s.pending.length === 0 && w.enemies.every((e) => e.hp <= 0)) {
    const bonus = Math.round(waveGoldBonus(s.n) * w.mods.waveGoldMult);
    w.stats.gold += bonus;
    w.events.push({ type: 'waveCleared', n: s.n, bonus });
    s.phase = 'break';
    s.timer = WAVE_BREAK_MS;
    if (!hasHeroToken(w)) spawnHeroToken(w);
    if (w.draftsEnabled) openDraft(w);
  }
}

export function startWave(w: World) {
  const s = w.wave;
  s.n++;
  s.phase = 'active';
  s.pending = rollWave(w, s.n);
  w.events.push({ type: 'waveStart', n: s.n });
  if ((s.n === 1 && w.loadout.startPower) || w.mods.wavePower) activatePower(w, pick(w.rng, POWER_KINDS.filter((k) => k !== 'bomb')));
}

function rollWave(w: World, n: number): PendingSpawn[] {
  const kinds = ENEMY_KINDS.filter((k) => ENEMIES[k].firstWave <= n);
  const minCost = Math.min(...kinds.map((k) => ENEMIES[k].cost));
  const bossWave = n % BOSS_EVERY === 0;
  const roster: EnemyKind[] = bossWave ? [BOSS_KIND] : [];
  const scaled = waveBudget(n) * w.mods.enemyCountMult;
  let budget = Math.floor(bossWave ? scaled / 2 : scaled);
  while (budget >= minCost) {
    const affordable = kinds.filter((k) => ENEMIES[k].cost <= budget);
    const kind = pick(w.rng, affordable);
    roster.push(kind);
    budget -= ENEMIES[kind].cost;
  }

  const out: PendingSpawn[] = [];
  const taken = (p: Vec) => out.some((o) => eq(o.pos, p));
  const safe = (p: Vec) => w.party.every((h) => chebyshev(h.pos, p) > SAFE_SPAWN_DIST);
  roster.forEach((kind, i) => {
    let cells = freeCells(w, (p) => onEdgeRing(p) && safe(p) && !taken(p));
    if (cells.length === 0) cells = freeCells(w, (p) => safe(p) && !taken(p));
    if (cells.length === 0) return;
    out.push({ kind, pos: pick(w.rng, cells), at: w.time + SPAWN_WARN_MS + i * SPAWN_STAGGER_MS });
  });
  return out;
}
