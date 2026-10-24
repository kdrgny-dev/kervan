import { describe, expect, it } from 'vitest';
import { FIRST_BREAK_MS } from '../src/data/balance';
import { CARDS, rerollCost } from '../src/data/cards';
import { applyCard, openDraft, pickCard, rerollDraft, rollDraft } from '../src/sim/cards';
import { damageHero } from '../src/sim/combat';
import { spawnEnemy } from '../src/sim/enemies';
import { dropLoot } from '../src/sim/loot';
import { computeSynergies } from '../src/sim/synergy';
import { startWave } from '../src/sim/waves';
import { createWorld, stepWorld } from '../src/sim/world';
import { arena, freeze, tick } from './helpers';

describe('draft lifecycle', () => {
  it('clearing a wave opens a draft and halts the simulation until a pick', () => {
    const w = createWorld({ seed: 4 });
    w.tickMs = 1e9;
    stepWorld(w, FIRST_BREAK_MS);
    w.wave.pending = [];
    const events = stepWorld(w, 10);
    expect(events.some((e) => e.type === 'draftOpen')).toBe(true);
    expect(w.draft?.options).toHaveLength(3);

    const t = w.time;
    stepWorld(w, 5000);
    expect(w.time).toBe(t);

    expect(pickCard(w, w.draft!.options[0])).toBe(true);
    expect(w.draft).toBeNull();
    stepWorld(w, 100);
    expect(w.time).toBeGreaterThan(t);
  });

  it('rejects picking a card that was not offered', () => {
    const w = arena([{ x: 5, y: 5 }]);
    openDraft(w);
    const offered = w.draft!.options;
    const other = (Object.keys(CARDS) as (keyof typeof CARDS)[]).find((id) => !offered.includes(id))!;
    expect(pickCard(w, other)).toBe(false);
    expect(w.draft).not.toBeNull();
  });

  it('options are distinct and respect the per-card cap', () => {
    const w = arena([{ x: 5, y: 5 }]);
    for (let i = 0; i < 3; i++) applyCard(w, 'campfire');
    for (let i = 0; i < 50; i++) {
      const opts = rollDraft(w);
      expect(new Set(opts).size).toBe(opts.length);
      expect(opts).not.toContain('campfire');
    }
  });

  it('reroll costs escalating run gold', () => {
    const w = arena([{ x: 5, y: 5 }]);
    w.stats.gold = rerollCost(0) + rerollCost(1) - 1;
    openDraft(w);
    expect(rerollDraft(w)).toBe(true);
    expect(w.stats.gold).toBe(rerollCost(1) - 1);
    expect(rerollDraft(w)).toBe(false);
  });

  it('sometimes offers a cursed card, never more than one', () => {
    const w = arena([{ x: 5, y: 5 }]);
    let cursedSeen = 0;
    for (let i = 0; i < 400; i++) {
      const cursed = rollDraft(w).filter((id) => 'cursed' in CARDS[id]).length;
      expect(cursed).toBeLessThanOrEqual(1);
      cursedSeen += cursed;
    }
    expect(cursedSeen).toBeGreaterThan(20);
  });
});

describe('card effects', () => {
  it('war cry and sharp blades raise melee damage', () => {
    const w = arena([{ x: 5, y: 5 }]);
    applyCard(w, 'warCry');
    applyCard(w, 'sharpBlades');
    const gob = spawnEnemy(w, 'goblin', { x: 5, y: 6 });
    freeze(w);
    stepWorld(w, 10);
    expect(gob.hp).toBe(45 - Math.round(10 * 1.15 * 1.25));
  });

  it('sturdy armor scales max hp and keeps damage taken', () => {
    const w = arena([{ x: 5, y: 5 }]);
    w.party[0].hp = 50;
    applyCard(w, 'sturdyArmor');
    expect(w.party[0].maxHp).toBe(72);
    expect(w.party[0].hp).toBe(62);
  });

  it('blood pact lowers max hp but never kills', () => {
    const w = arena([{ x: 5, y: 5 }]);
    w.party[0].hp = 5;
    applyCard(w, 'bloodPact');
    expect(w.party[0].maxHp).toBe(48);
    expect(w.party[0].hp).toBe(1);
  });

  it('double shot makes archers fire at a second target', () => {
    const w = arena([{ x: 5, y: 5 }], ['archer']);
    applyCard(w, 'doubleShot');
    spawnEnemy(w, 'slime', { x: 5, y: 8 });
    spawnEnemy(w, 'slime', { x: 7, y: 7 });
    freeze(w);
    stepWorld(w, 10);
    expect(w.projectiles.filter((p) => p.owner === 'hero')).toHaveLength(2);
  });

  it('eagle eye extends ranged reach', () => {
    const w = arena([{ x: 5, y: 5 }], ['archer']);
    spawnEnemy(w, 'slime', { x: 5, y: 10 });
    freeze(w);
    stepWorld(w, 10);
    expect(w.projectiles).toHaveLength(0);
    applyCard(w, 'eagleEye');
    stepWorld(w, 10);
    expect(w.projectiles).toHaveLength(1);
  });

  it('gold fever multiplies coin value', () => {
    const w = arena([{ x: 5, y: 5 }]);
    applyCard(w, 'goldFever');
    dropLoot(w, { type: 'coin', value: 4 }, { x: 6, y: 5 });
    tick(w);
    expect(w.stats.gold).toBe(5);
  });

  it('lodestone pulls loot without the magnet power', () => {
    const w = arena([{ x: 5, y: 5 }]);
    freeze(w);
    applyCard(w, 'lodestone');
    dropLoot(w, { type: 'coin', value: 1 }, { x: 7, y: 6 });
    dropLoot(w, { type: 'coin', value: 1 }, { x: 12, y: 6 });
    stepWorld(w, 10);
    expect(w.stats.gold).toBe(1);
  });

  it('martyr blasts enemies around a fallen hero', () => {
    const w = arena([{ x: 5, y: 5 }, { x: 4, y: 5 }], ['archer', 'knight']);
    applyCard(w, 'martyr');
    const gob = spawnEnemy(w, 'goblin', { x: 6, y: 6 });
    freeze(w);
    w.party[1].cooldown = 1e9;
    damageHero(w, w.party[0], 999);
    expect(gob.hp).toBe(45 - 40);
  });

  it('thorn armor hurts the attacker', () => {
    const w = arena([{ x: 5, y: 5 }]);
    applyCard(w, 'thornArmor');
    const gob = spawnEnemy(w, 'goblin', { x: 6, y: 6 });
    damageHero(w, w.party[0], 5, gob);
    expect(gob.hp).toBe(45 - 6);
  });

  it('glass cannon raises damage taken', () => {
    const w = arena([{ x: 5, y: 5 }]);
    applyCard(w, 'glassCannon');
    damageHero(w, w.party[0], 10);
    expect(w.party[0].hp).toBe(60 - 13);
  });

  it('new friend drops a hero token right away', () => {
    const w = arena([{ x: 5, y: 5 }]);
    applyCard(w, 'newFriend');
    expect(w.loot.some((l) => l.type === 'hero')).toBe(true);
  });

  it('campfire starts every wave with a power-up', () => {
    const w = arena([{ x: 5, y: 7 }], ['knight'], { waves: true });
    applyCard(w, 'campfire');
    w.wave.n = 3;
    w.events.length = 0;
    startWave(w);
    expect(w.events.some((e) => e.type === 'powerStart')).toBe(true);
  });

  it('chaos rite adds enemies to each wave', () => {
    const base = arena([{ x: 5, y: 7 }], ['knight'], { waves: true, seed: 9 });
    base.wave.n = 5;
    startWave(base);
    const cursed = arena([{ x: 5, y: 7 }], ['knight'], { waves: true, seed: 9 });
    applyCard(cursed, 'chaosRite');
    cursed.wave.n = 5;
    startWave(cursed);
    expect(cursed.wave.pending.length).toBeGreaterThan(base.wave.pending.length);
  });

  it('windborne speeds up the caravan', () => {
    const w = arena([{ x: 5, y: 5 }]);
    const before = w.tickMs;
    applyCard(w, 'windborne');
    expect(w.tickMs).toBeLessThan(before);
  });
});

describe('synergies', () => {
  const party = (kinds: string[]) => arena(kinds.map((_, i) => ({ x: 10 - i, y: 5 })), kinds as never).party;

  it('tiers unlock at 2 and 4 heroes of a class', () => {
    expect(computeSynergies(party(['knight'])).warrior).toBe(0);
    expect(computeSynergies(party(['knight', 'knight'])).warrior).toBe(1);
    expect(computeSynergies(party(['knight', 'knight', 'knight', 'knight'])).warrior).toBe(2);
    expect(computeSynergies(party(['knight', 'archer'])).warrior).toBe(0);
  });

  it('warriors reduce damage taken', () => {
    const w = arena([{ x: 5, y: 5 }, { x: 4, y: 5 }], ['knight', 'knight']);
    freeze(w);
    stepWorld(w, 10);
    damageHero(w, w.party[0], 20);
    expect(w.party[0].hp).toBe(60 - 17);
  });

  it('holy synergy multiplies healing', () => {
    const w = arena([{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }], ['priest', 'priest', 'knight']);
    freeze(w);
    w.party[2].hp = 30;
    stepWorld(w, 3000);
    // İki rahip, her biri 3 × 2 şifa
    expect(w.party[2].hp).toBe(30 + 12);
  });

  it('marksman tier 2 gives archers an extra target', () => {
    const w = arena(
      [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }, { x: 2, y: 5 }],
      ['archer', 'archer', 'archer', 'archer'],
    );
    spawnEnemy(w, 'slime', { x: 5, y: 8 });
    spawnEnemy(w, 'slime', { x: 6, y: 8 });
    freeze(w);
    stepWorld(w, 10);
    expect(w.projectiles.length).toBe(8);
  });
});
