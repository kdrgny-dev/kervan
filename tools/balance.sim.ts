import { test } from 'vitest';
import type { Loadout } from '../src/sim/world';
import { playRun, type RunReport } from './bot';
import type { CampaignId } from '../src/data/campaigns';

declare const process: { env: Record<string, string | undefined> };

const RUNS = Number(process.env.RUNS ?? 40);

const all = ['knight', 'archer', 'mage', 'priest', 'rogue'] as const;
const ups = (lvl: number) => Object.fromEntries(all.map((k) => [k, { hp: lvl, dmg: lvl }]));

const SCENARIOS: Record<string, Partial<Loadout> & { campaign?: CampaignId }> = {
  'yeni oyuncu': {},
  'orta (Sv3, Büyücü)': { unlocked: ['knight', 'archer', 'mage'], upgrades: ups(3) },
  'güçlü (hepsi Sv6 + perkler)': {
    unlocked: [...all],
    upgrades: ups(6),
    startPower: true,
    powerBonusMs: 4000,
    secondHero: true,
  },
  // Fetih hesap Sv 6'da açılır; o noktadaki tipik oyuncu ve tam güçlü oyuncu
  'Fetih · orta (Sv3, 3 kahraman)': { unlocked: ['knight', 'archer', 'mage'], upgrades: ups(3), campaign: 'fetih' },
  'Fetih · güçlü (hepsi Sv6 + perkler)': {
    unlocked: [...all],
    upgrades: ups(6),
    startPower: true,
    powerBonusMs: 4000,
    secondHero: true,
    campaign: 'fetih',
  },
  // Alpler Sv 8'de açılır; Fetih'i bitirmiş, Fatih'i alamamış orta oyuncu
  'Alpler · orta (Sv4, 4 kahraman)': { unlocked: ['knight', 'archer', 'mage', 'priest'], upgrades: ups(4), campaign: 'alpler' },
};

const pct = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};

function summarize(name: string, runs: RunReport[]) {
  const waves = runs.map((r) => r.wave);
  const secs = runs.map((r) => r.seconds);
  const reasons: Record<string, number> = {};
  for (const r of runs) reasons[r.reason] = (reasons[r.reason] ?? 0) + 1;
  const avg = (f: (r: RunReport) => number) => Math.round(runs.reduce((a, r) => a + f(r), 0) / runs.length);
  return {
    senaryo: name,
    'dalga p25/p50/p75/p90': `${pct(waves, 0.25)}/${pct(waves, 0.5)}/${pct(waves, 0.75)}/${pct(waves, 0.9)}`,
    'süre p50 (sn)': pct(secs, 0.5),
    'ort. altın': avg((r) => r.gold),
    'ort. mücevher': (runs.reduce((a, r) => a + r.gems, 0) / runs.length).toFixed(1),
    'ort. maks kafile': avg((r) => r.maxParty),
    'katılan/düşen': `${avg((r) => r.recruited)}/${avg((r) => r.lost)}`,
    ölüm: Object.entries(reasons)
      .map(([k, v]) => `${k}:${v}`)
      .join(' '),
  };
}

test('denge raporu', () => {
  const rows = Object.entries(SCENARIOS).map(([name, { campaign, ...loadout }]) =>
    summarize(name, Array.from({ length: RUNS }, (_, i) => playRun(1000 + i, loadout, 900, true, campaign))),
  );
  console.table(rows);
});
