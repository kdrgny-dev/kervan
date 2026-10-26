import { describe, expect, it } from 'vitest';
import { CRUSH_BOSS_RATIO, CRUSH_RATIO } from '../src/data/balance';
import { CAMPAIGNS, finalWave } from '../src/data/campaigns';
import { ENEMIES } from '../src/data/enemies';
import { HERO_KINDS, HEROES } from '../src/data/heroes';
import { bossAt, REGIONS } from '../src/data/regions';
import { regionBeat, STORY } from '../src/data/story';
import { spawnEnemy } from '../src/sim/enemies';
import { startWave } from '../src/sim/waves';
import { createWorld, makeHero } from '../src/sim/world';
import { freeze, tick } from './helpers';

const alplerWorld = (seed = 3) => {
  const w = createWorld({ seed, campaign: 'alpler', drafts: false });
  w.loot = [];
  return w;
};

/** Sağa bakan iki kişilik kafile ve liderin tam önünde bir düşman. */
const lineUp = (kinds: Parameters<typeof makeHero>[1][], enemy: keyof typeof ENEMIES = 'goat') => {
  const w = createWorld({ seed: 1, waves: false });
  w.party = kinds.map((k, i) => makeHero(w, k, { x: 6 - i, y: 5 }));
  w.loot = [];
  w.dir = 'right';
  const e = spawnEnemy(w, enemy, { x: 7, y: 5 });
  freeze(w);
  w.tickMs = 100;
  // Yalnızca çarpışmayı ölç: kahramanlar vurmasın, düşman saldırmasın
  for (const h of w.party) h.cooldown = 1e9;
  e.attackCd = 1e9;
  return { w, e };
};

describe('Alpler', () => {
  it('walks its own route and ends with the Avalanche Giant', () => {
    const route = CAMPAIGNS.alpler.route;
    expect(route).toEqual(['iber', 'pirene', 'zirve', 'po']);
    expect(bossAt(finalWave('alpler'), route)).toBe('avalancheGiant');
    expect(bossAt(5, route)).toBe('tideCrab');
  });

  it('every region starts by renting an elephant', () => {
    const w = alplerWorld();
    for (const n of [0, 10, 20, 30]) {
      w.loot = [];
      w.wave.n = n;
      startWave(w);
      expect(w.loot.filter((l) => l.type === 'hero' && l.hero === 'elephant')).toHaveLength(1);
    }
    w.loot = [];
    w.wave.n = 1;
    startWave(w);
    expect(w.loot.some((l) => l.type === 'hero' && l.hero === 'elephant')).toBe(false);
  });

  it('elephants never leak into the road, the shop or hero select', () => {
    const w = createWorld({ seed: 1, drafts: false });
    for (let n = 0; n < 40; n++) {
      w.wave.n = n;
      startWave(w);
    }
    expect(w.loot.some((l) => l.type === 'hero' && l.hero === 'elephant')).toBe(false);
    expect(HERO_KINDS).not.toContain('elephant');
    expect(HERO_KINDS).toContain('hannibal');
    expect(HEROES.hannibal.legendary).toBe(true);
  });

  it('with an elephant in the caravan, bumping crushes the enemy and spares the leader', () => {
    const { w, e } = lineUp(['knight', 'elephant']);
    const hp = w.party[0].hp;
    tick(w);
    expect(w.party[0].hp).toBe(hp);
    expect(e.hp).toBe(e.maxHp - Math.ceil(e.maxHp * CRUSH_RATIO));
  });

  it('without one, bumping still hurts the leader', () => {
    const { w, e } = lineUp(['knight', 'archer']);
    const hp = w.party[0].hp;
    tick(w);
    expect(w.party[0].hp).toBeLessThan(hp);
    expect(e.hp).toBe(e.maxHp);
  });

  it('bosses only take a small crush', () => {
    const { w, e } = lineUp(['hannibal', 'knight'], 'caveBear');
    tick(w);
    expect(e.hp).toBe(e.maxHp - Math.ceil(e.maxHp * CRUSH_BOSS_RATIO));
  });

  it('elephant stomps hit the enemies around the target', () => {
    const w = createWorld({ seed: 1, waves: false });
    w.party = [makeHero(w, 'elephant', { x: 5, y: 5 })];
    const target = spawnEnemy(w, 'goat', { x: 6, y: 5 });
    const near = spawnEnemy(w, 'goat', { x: 7, y: 5 });
    const far = spawnEnemy(w, 'goat', { x: 9, y: 5 });
    freeze(w);
    for (let i = 0; i < 20 && target.hp === target.maxHp; i++) tick(w, 0.2);
    expect(target.hp).toBeLessThan(target.maxHp);
    expect(near.hp).toBeLessThan(near.maxHp);
    expect(far.hp).toBe(far.maxHp);
  });

  it('has a story beat for every region after the first, every boss, the intro and the ending', () => {
    for (const r of CAMPAIGNS.alpler.route.slice(1)) expect(STORY).toHaveProperty(regionBeat(r)!);
    const bosses = new Set(CAMPAIGNS.alpler.route.flatMap((r) => [REGIONS[r].boss, REGIONS[r].finalBoss].filter(Boolean)));
    for (const b of bosses) expect(STORY).toHaveProperty(`boss_${b}`);
    expect(STORY).toHaveProperty('alpler_intro');
    expect(STORY).toHaveProperty('alpler_done');
  });
});
