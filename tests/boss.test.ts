import { describe, expect, it } from 'vitest';
import { BOSS_EVERY, FIRST_BREAK_MS } from '../src/data/balance';
import { ENEMIES } from '../src/data/enemies';
import { POWERS } from '../src/data/loot';
import { spawnEnemy } from '../src/sim/enemies';
import { activatePower } from '../src/sim/loot';
import { startWave } from '../src/sim/waves';
import { createWorld, stepWorld } from '../src/sim/world';
import { arena, freeze } from './helpers';

const BOSS = ENEMIES.slimeKing.boss!;

describe('Balçık Kralı', () => {
  it('appears on every boss wave and never on normal waves', () => {
    const w = arena([{ x: 5, y: 7 }], ['knight'], { waves: true });
    w.wave.n = BOSS_EVERY - 2;
    startWave(w);
    expect(w.wave.pending.some((p) => p.kind === 'slimeKing')).toBe(false);
    startWave(w);
    expect(w.wave.n).toBe(BOSS_EVERY);
    expect(w.wave.pending.filter((p) => p.kind === 'slimeKing')).toHaveLength(1);
  });

  it('summons slimes next to itself', () => {
    const w = arena([{ x: 2, y: 2 }]);
    const king = spawnEnemy(w, 'slimeKing', { x: 15, y: 8 });
    freeze(w);
    stepWorld(w, BOSS.summonEveryMs / 2 + 10);
    const slimes = w.enemies.filter((e) => e.kind === 'slime');
    expect(slimes).toHaveLength(1);
    expect(Math.abs(slimes[0].pos.x - king.pos.x) + Math.abs(slimes[0].pos.y - king.pos.y)).toBe(1);
  });

  it('caps its minions', () => {
    const w = arena([{ x: 2, y: 2 }]);
    spawnEnemy(w, 'slimeKing', { x: 15, y: 8 });
    for (let i = 0; i < BOSS.maxMinions; i++) spawnEnemy(w, 'slime', { x: 18 + (i % 3), y: 2 + i });
    freeze(w);
    stepWorld(w, BOSS.summonEveryMs + 10);
    expect(w.enemies.filter((e) => e.kind === 'slime')).toHaveLength(BOSS.maxMinions);
  });

  it('warns before the shockwave and then hits heroes in radius', () => {
    const w = arena([{ x: 10, y: 8 }, { x: 4, y: 8 }], ['knight', 'archer']);
    const king = spawnEnemy(w, 'slimeKing', { x: 12, y: 8 });
    king.summonCd = 1e9;
    king.attackCd = 1e9;
    freeze(w);
    w.party[0].cooldown = 1e9;
    w.party[1].cooldown = 1e9;
    const warn = stepWorld(w, BOSS.shockEveryMs - BOSS.shockWarnMs + 10);
    expect(warn.some((e) => e.type === 'shockwaveWarn')).toBe(true);
    expect(w.party[0].hp).toBe(60);
    const hit = stepWorld(w, BOSS.shockWarnMs);
    expect(hit.some((e) => e.type === 'shockwave')).toBe(true);
    expect(w.party[0].hp).toBe(60 - BOSS.shockDmg);
    expect(w.party[1].hp).toBe(35);
  });

  it('drops a big coin and a gem on death', () => {
    const w = arena([{ x: 2, y: 2 }]);
    const king = spawnEnemy(w, 'slimeKing', { x: 15, y: 8 });
    king.hp = 1;
    activatePower(w, 'bomb');
    expect(w.loot.find((l) => l.type === 'coin')).toMatchObject({ value: 25 });
    expect(w.loot.some((l) => l.type === 'gem')).toBe(true);
  });
});

describe('loadout', () => {
  it('starts with the chosen leader', () => {
    const w = createWorld({ seed: 1, loadout: { leader: 'mage', unlocked: ['knight', 'archer', 'mage'] } });
    expect(w.party.map((h) => h.kind)).toEqual(['mage']);
  });

  it('second hero perk adds a follower', () => {
    const w = createWorld({ seed: 1, loadout: { secondHero: true } });
    expect(w.party).toHaveLength(2);
    expect(w.party[1].pos.x).toBe(w.party[0].pos.x - 1);
  });

  it('hero tokens only come from unlocked heroes', () => {
    for (let seed = 0; seed < 30; seed++) {
      const w = createWorld({ seed, loadout: { unlocked: ['knight', 'rogue'] } });
      const token = w.loot.find((l) => l.type === 'hero');
      expect(token?.type === 'hero' && ['knight', 'rogue'].includes(token.hero)).toBe(true);
    }
  });

  it('permanent upgrades scale hp and damage', () => {
    const w = createWorld({ seed: 1, waves: false, loadout: { upgrades: { knight: { hp: 3, dmg: 2 } } } });
    expect(w.party[0].maxHp).toBe(Math.round(60 * 1.3));
    const gob = spawnEnemy(w, 'goblin', { x: w.party[0].pos.x, y: w.party[0].pos.y + 1 });
    freeze(w);
    stepWorld(w, 10);
    expect(gob.hp).toBe(45 - 12);
  });

  it('power duration bonus extends power-ups', () => {
    const w = createWorld({ seed: 1, waves: false, loadout: { powerBonusMs: 4000 } });
    activatePower(w, 'rage');
    expect(w.powers.rage).toBe(POWERS.rage.durationMs + 4000);
  });

  it('start power perk fires when wave 1 begins', () => {
    const w = createWorld({ seed: 3, loadout: { startPower: true } });
    w.tickMs = 1e9;
    const events = stepWorld(w, FIRST_BREAK_MS);
    expect(events.some((e) => e.type === 'powerStart')).toBe(true);
  });
});
