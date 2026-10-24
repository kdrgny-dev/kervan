import { expect, it } from 'vitest';
import { playRun } from '../tools/bot';

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

// Kaba bir bekçi: denge değişikliği yeni oyuncuyu ilk dalgalarda ezmesin, güçlü kafile de ilerleyebilsin.
it('fresh loadout survives the opening waves', () => {
  const waves = Array.from({ length: 20 }, (_, i) => playRun(500 + i, {}, 300).wave);
  expect(median(waves)).toBeGreaterThanOrEqual(4);
});

it('upgrades meaningfully extend runs', () => {
  const upgraded = {
    unlocked: ['knight', 'archer', 'mage'] as const,
    upgrades: { knight: { hp: 3, dmg: 3 }, archer: { hp: 3, dmg: 3 }, mage: { hp: 3, dmg: 3 } },
  };
  // Kartlar kapalı: yalnızca kalıcı yükseltmelerin etkisini ölçmek için
  const base = Array.from({ length: 20 }, (_, i) => playRun(700 + i, {}, 300, false).wave);
  const strong = Array.from({ length: 20 }, (_, i) => playRun(700 + i, { ...upgraded, unlocked: [...upgraded.unlocked] }, 300, false).wave);
  expect(median(strong)).toBeGreaterThan(median(base));
});
