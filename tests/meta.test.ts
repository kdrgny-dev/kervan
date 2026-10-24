import { describe, expect, it } from 'vitest';
import { MAX_UPGRADE, upgradeCost } from '../src/data/economy';
import { defaultSave, loadSave, parseSave, writeSave } from '../src/meta/save';
import { applyRun, buyGemUpgrade, loadoutFrom, nextUpgradeCost, unlockHero, upgradeHero } from '../src/meta/shop';

const memoryStore = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe('save', () => {
  it('starts with knight and archer unlocked', () => {
    expect(defaultSave().unlocked).toEqual(['knight', 'archer']);
  });

  it('round-trips through a store', () => {
    const store = memoryStore();
    const s = defaultSave();
    s.gold = 123;
    s.unlocked.push('mage');
    writeSave(s, store);
    expect(loadSave(store)).toEqual(s);
  });

  it('falls back to defaults on corrupt data', () => {
    expect(parseSave('{not json')).toEqual(defaultSave());
    expect(parseSave('null')).toEqual(defaultSave());
  });

  it('repairs partial or invalid fields', () => {
    const s = parseSave(JSON.stringify({ gold: -5, gems: 3, unlocked: ['mage', 'dragon'], lastHero: 'dragon' }));
    expect(s.gold).toBe(0);
    expect(s.gems).toBe(3);
    expect(s.unlocked.sort()).toEqual(['archer', 'knight', 'mage']);
    expect(s.lastHero).toBe('knight');
    expect(s.upgrades.rogue).toEqual({ hp: 0, dmg: 0 });
  });

  it('survives a throwing store', () => {
    const bad = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
    };
    expect(loadSave(bad)).toEqual(defaultSave());
    expect(() => writeSave(defaultSave(), bad)).not.toThrow();
  });
});

describe('shop', () => {
  it('unlocks a hero when affordable', () => {
    const s = defaultSave();
    s.gold = 450;
    expect(unlockHero(s, 'mage')).toBe(true);
    expect(s.gold).toBe(50);
    expect(s.unlocked).toContain('mage');
    expect(unlockHero(s, 'mage')).toBe(false);
  });

  it('refuses unaffordable unlocks', () => {
    const s = defaultSave();
    s.gold = 900;
    expect(unlockHero(s, 'rogue')).toBe(false);
    expect(s.gold).toBe(900);
  });

  it('upgrade cost scales and caps at max level', () => {
    const s = defaultSave();
    s.gold = 1e9;
    expect(nextUpgradeCost(s, 'knight', 'hp')).toBe(80);
    upgradeHero(s, 'knight', 'hp');
    expect(nextUpgradeCost(s, 'knight', 'hp')).toBe(upgradeCost(1));
    for (let i = 0; i < 20; i++) upgradeHero(s, 'knight', 'hp');
    expect(s.upgrades.knight.hp).toBe(MAX_UPGRADE);
    expect(nextUpgradeCost(s, 'knight', 'hp')).toBeNull();
  });

  it('cannot upgrade a locked hero', () => {
    const s = defaultSave();
    s.gold = 1e9;
    expect(upgradeHero(s, 'mage', 'dmg')).toBe(false);
  });

  it('gem upgrades consume gems up to their tier count', () => {
    const s = defaultSave();
    s.gems = 100;
    expect(buyGemUpgrade(s, 'startPower')).toBe(true);
    expect(buyGemUpgrade(s, 'startPower')).toBe(false);
    expect(s.gems).toBe(95);
    for (let i = 0; i < 5; i++) buyGemUpgrade(s, 'powerDuration');
    expect(s.gemUpgrades.powerDuration).toBe(3);
    expect(s.gems).toBe(65);
  });

  it('applyRun banks loot and ranks the score', () => {
    const s = defaultSave();
    expect(applyRun(s, { hero: 'knight', wave: 3, kills: 10, gold: 20, gems: 1, score: 400 })).toBe(0);
    expect(applyRun(s, { hero: 'archer', wave: 1, kills: 2, gold: 5, gems: 0, score: 120 })).toBe(1);
    expect(applyRun(s, { hero: 'archer', wave: 6, kills: 30, gold: 50, gems: 2, score: 800 })).toBe(0);
    expect(s.gold).toBe(75);
    expect(s.gems).toBe(3);
    expect(s.best.map((b) => b.score)).toEqual([800, 400, 120]);
  });

  it('keeps only the top 10 scores', () => {
    const s = defaultSave();
    for (let i = 0; i < 12; i++) applyRun(s, { hero: 'knight', wave: 1, kills: 0, gold: 0, gems: 0, score: i * 10 });
    expect(s.best).toHaveLength(10);
    expect(applyRun(s, { hero: 'knight', wave: 1, kills: 0, gold: 0, gems: 0, score: 1 })).toBe(-1);
  });

  it('builds a loadout from the save', () => {
    const s = defaultSave();
    s.gemUpgrades.powerDuration = 2;
    s.gemUpgrades.secondHero = 1;
    const l = loadoutFrom(s, 'mage');
    expect(l.leader).toBe('knight');
    expect(l.powerBonusMs).toBe(4000);
    expect(l.secondHero).toBe(true);
    expect(l.startPower).toBe(false);
  });
});
