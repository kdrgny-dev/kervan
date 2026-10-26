import { BASE_TICK_MS, GRID_H, GRID_W } from '../config';
import { CARD_IDS, defaultMods } from '../data/cards';
import { CAMPAIGNS, type CampaignId } from '../data/campaigns';
import { BUMP_DMG_RATIO, BUMP_INVULN_MS, FIRST_BREAK_MS, SIM_DT, SLOW_FACTOR } from '../data/balance';
import { damageHero, updateHeroes, updateProjectiles } from './combat';
import { updateEnemies } from './enemies';
import { add, DIR_VEC, type Dir, eq, isWall, type Vec } from './grid';
import { InputQueue } from './inputQueue';
import { createRng, pick } from './rng';
import { collect, spawnHeroToken, updateLoot } from './loot';
import { endGame, enemyAt, isFree, makeHero } from './state';
import { computeSynergies, emptySynergies } from './synergy';
import type { Enemy, GameOverReason, Loadout, World, WorldEvent } from './types';
import { updateWaves } from './waves';

export type * from './types';
export { makeHero } from './state';

export interface WorldOptions {
  seed?: number;
  waves?: boolean;
  /** Dalga sonu kart seçimi; testlerde kapatılabilir. */
  drafts?: boolean;
  loadout?: Partial<Loadout>;
  campaign?: CampaignId;
}

export const DEFAULT_LOADOUT: Loadout = {
  leader: 'knight',
  unlocked: ['knight', 'archer'],
  upgrades: {},
  startPower: false,
  powerBonusMs: 0,
  secondHero: false,
  goldMult: 1,
  freeRerolls: 0,
  cards: [...CARD_IDS],
};

export function createWorld({ seed = Date.now(), waves = true, drafts = true, loadout = {}, campaign = 'road' }: WorldOptions = {}): World {
  const w: World = {
    campaign,
    route: CAMPAIGNS[campaign].route,
    wallPassUntil: 0,
    grace: false,
    loadout: { ...DEFAULT_LOADOUT, ...loadout },
    mods: defaultMods(),
    cards: {},
    draft: null,
    draftsEnabled: drafts,
    syn: emptySynergies(),
    tally: { killsByKind: {}, bosses: 0, recruited: 0, cardsPicked: 0, cursedPicked: 0, maxParty: 1, maxTier: {}, furthestRegion: 0, bossKinds: {}, campaignCleared: false },
    party: [],
    enemies: [],
    projectiles: [],
    loot: [],
    powers: {},
    stats: { gold: 0, gems: 0, kills: 0, xp: 0, level: 0 },
    dir: 'right',
    input: new InputQueue(),
    tickMs: BASE_TICK_MS,
    moveAcc: 0,
    simAcc: 0,
    time: 0,
    bumpInvuln: 0,
    slowUntil: 0,
    freeRerolls: 0,
    alive: true,
    rng: createRng(seed),
    nextId: 1,
    ticks: 0,
    wave: { n: 0, phase: 'break', timer: FIRST_BREAK_MS, pending: [] },
    wavesEnabled: waves,
    events: [],
  };
  w.mods.goldMult = w.loadout.goldMult;
  w.freeRerolls = w.loadout.freeRerolls;
  const start = { x: Math.floor(GRID_W / 2) - 4, y: Math.floor(GRID_H / 2) };
  w.party.push(makeHero(w, w.loadout.leader, start));
  if (w.loadout.secondHero) w.party.push(makeHero(w, pick(w.rng, w.loadout.unlocked), { x: start.x - 1, y: start.y }));
  spawnHeroToken(w);
  w.events.length = 0;
  return w;
}

export function turn(w: World, dir: Dir) {
  if (!w.alive) return;
  const before = w.input.size;
  w.input.push(dir, w.dir);
  // Son an payında bekleyen kafile yeni yönü bir sonraki adımı beklemeden alır
  if (w.grace && w.input.size > before) w.moveAcc = effectiveTick(w);
}

export function stepWorld(w: World, dtMs: number): WorldEvent[] {
  if (w.alive && !w.draft) {
    w.simAcc += dtMs;
    while (w.alive && !w.draft && w.simAcc >= SIM_DT) {
      w.simAcc -= SIM_DT;
      simStep(w, SIM_DT);
    }
  }
  return w.events.splice(0);
}

/** Son lider adımından bu yana geçen oran (0..1), çizim interpolasyonu için. */
/** Buz yavaşlatması dahil gerçek adım süresi. */
export const effectiveTick = (w: World) => w.tickMs * (w.time < w.slowUntil ? SLOW_FACTOR : 1);

export const tickAlpha = (w: World) => (w.alive ? Math.min((w.moveAcc + w.simAcc) / effectiveTick(w), 1) : 1);

export const enemyAlpha = (w: World, e: Enemy) => (w.alive ? Math.min((e.moveAcc + w.simAcc) / e.moveMs, 1) : 1);

function simStep(w: World, dt: number) {
  w.time += dt;
  w.syn = computeSynergies(w.party);
  trackTally(w);
  w.bumpInvuln = Math.max(0, w.bumpInvuln - dt);

  w.moveAcc += dt;
  const tickMs = effectiveTick(w);
  if (w.moveAcc >= tickMs) {
    w.moveAcc -= tickMs;
    moveTick(w);
  }
  if (!w.alive) return;
  updateHeroes(w, dt);
  updateProjectiles(w, dt);
  if (!w.alive) return;
  updateEnemies(w, dt);
  if (!w.alive) return;
  w.enemies = w.enemies.filter((e) => e.hp > 0);
  updateLoot(w, dt);
  if (w.wavesEnabled) updateWaves(w, dt);
  // Mıknatısla toplanan bomba yukarıdaki temizlikten sonra öldürebilir; adım ölüsüz bitsin
  w.enemies = w.enemies.filter((e) => e.hp > 0);
}

function moveTick(w: World) {
  w.dir = w.input.next(w.dir);
  w.ticks++;
  let target = add(w.party[0].pos, DIR_VEC[w.dir]);

  if (isWall(target)) {
    if (w.time < w.wallPassUntil) target = wrapAround(target);
    else return lastMoment(w, 'wall');
  }

  const enemy = enemyAt(w, target);
  if (enemy && !bump(w, enemy)) {
    for (const h of w.party) h.prev = h.pos;
    return;
  }

  const token = w.loot.find((l) => l.type === 'hero' && eq(l.pos, target));
  const grows = token?.type === 'hero';
  // Kuyruk ucu bu tick'te boşalacağı için, büyümüyorsak çarpışmaya dahil değil.
  const blockers = grows ? w.party : w.party.slice(0, -1);
  if (blockers.some((h) => eq(h.pos, target))) return lastMoment(w, 'self');
  w.grace = false;

  const old = w.party.map((h) => h.pos);
  w.party.forEach((h, i) => {
    h.prev = h.pos;
    h.pos = i === 0 ? target : old[i - 1];
  });
  w.events.push({ type: 'moved' });

  for (const l of w.loot.filter((l) => eq(l.pos, target))) collect(w, l);
  if (token?.type === 'hero') {
    const hero = makeHero(w, token.hero, old[old.length - 1]);
    w.party.push(hero);
    w.tally.recruited++;
    w.events.push({ type: 'recruited', hero });
  }
}

/**
 * Çizim bir adım geriden geldiği için oyuncu duvarı ve gövdeyi geç görür. Çarpacak adımda kafile
 * bir adım bekler (lider kırmızı yanar); bu sırada dönülmezse sonraki adımda çarpar.
 */
function lastMoment(w: World, reason: GameOverReason) {
  if (w.grace) return endGame(w, reason);
  w.grace = true;
  for (const h of w.party) h.prev = h.pos;
  w.events.push({ type: 'grace' });
}

/** Duvarın ötesindeki hücre: arenanın karşı kenarındaki ilk boş sıra. */
const wrapAround = (p: Vec): Vec => ({
  x: p.x <= 0 ? GRID_W - 2 : p.x >= GRID_W - 1 ? 1 : p.x,
  y: p.y <= 0 ? GRID_H - 2 : p.y >= GRID_H - 1 ? 1 : p.y,
});

function trackTally(w: World) {
  const t = w.tally;
  t.maxParty = Math.max(t.maxParty, w.party.length);
  for (const [c, tier] of Object.entries(w.syn) as [keyof typeof w.syn, number][]) {
    if (tier > (t.maxTier[c] ?? 0)) t.maxTier[c] = tier;
  }
}

/** Lider düşmana çarptı. Düşman itilebildiyse true (lider o hücreye ilerler). */
function bump(w: World, enemy: Enemy): boolean {
  const leader = w.party[0];
  w.events.push({ type: 'bump', pos: enemy.pos });
  if (w.bumpInvuln === 0) {
    w.bumpInvuln = BUMP_INVULN_MS;
    damageHero(w, leader, Math.ceil(leader.maxHp * BUMP_DMG_RATIO * w.mods.bumpMult));
    if (!w.alive || w.party[0] !== leader) return false;
  }
  const dest = add(enemy.pos, DIR_VEC[w.dir]);
  if (!isFree(w, dest)) return false;
  enemy.prev = enemy.pos;
  enemy.pos = dest;
  return true;
}
