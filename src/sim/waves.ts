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
import { ENEMIES, type EnemyKind } from '../data/enemies';
import { bossAt, regionAt, REGIONS as REGION_DEFS } from '../data/regions';
import { CAMPAIGNS, finalWave, SHIP_MS } from '../data/campaigns';
import { POWER_KINDS } from '../data/loot';
import { chebyshev, eq, type Vec } from './grid';
import { spawnEnemy } from './enemies';
import { pick } from './rng';
import { openDraft } from './cards';
import { rollRoadEvent } from './roadEvents';
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
    if (w.campaign !== 'road' && s.n === finalWave(w.campaign) && !w.tally.campaignCleared) {
      w.tally.campaignCleared = true;
      w.events.push({ type: 'campaignCleared' });
    }
    s.phase = 'break';
    s.timer = WAVE_BREAK_MS;
    if (!hasHeroToken(w)) spawnHeroToken(w);
    if (w.draftsEnabled) openDraft(w);
    rollRoadEvent(w);
  }
}

export function startWave(w: World) {
  const s = w.wave;
  s.n++;
  s.phase = 'active';
  s.pending = rollWave(w, s.n);
  const region = regionAt(s.n, w.route);
  if (region.local === 1 && s.n > 1) w.events.push({ type: 'regionEnter', region: region.id, journey: region.journey });
  const companion = CAMPAIGNS[w.campaign].companion;
  if (companion && region.local === 1) spawnHeroToken(w, companion);
  w.tally.furthestRegion = Math.max(w.tally.furthestRegion, Math.floor((s.n - 1) / 10));
  w.events.push({ type: 'waveStart', n: s.n });
  if (CAMPAIGNS[w.campaign].ships && s.n % BOSS_EVERY === 0) {
    w.wallPassUntil = w.time + SHIP_MS;
    w.events.push({ type: 'shipsStart', until: w.wallPassUntil });
  }
  if ((s.n === 1 && w.loadout.startPower) || w.mods.wavePower) activatePower(w, pick(w.rng, POWER_KINDS.filter((k) => k !== 'bomb')));
}

function rollWave(w: World, n: number): PendingSpawn[] {
  const region = regionAt(n, w.route);
  const def = REGION_DEFS[region.id];
  const kinds = def.roster.filter((r) => r.from <= region.local).map((r) => r.kind);
  const minCost = Math.min(...kinds.map((k) => ENEMIES[k].cost));
  const bossWave = n % BOSS_EVERY === 0;
  const roster: EnemyKind[] = bossWave ? [bossAt(n, w.route)] : [];
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
