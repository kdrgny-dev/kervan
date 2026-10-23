export type SfxName =
  | 'slash'
  | 'hit'
  | 'crit'
  | 'arrow'
  | 'fireball'
  | 'explosion'
  | 'holy'
  | 'heal'
  | 'enemyDie'
  | 'heroHurt'
  | 'heroDie'
  | 'coin'
  | 'gem'
  | 'power'
  | 'bomb'
  | 'levelUp'
  | 'recruit'
  | 'bump'
  | 'shockWarn'
  | 'shockwave'
  | 'waveStart'
  | 'waveCleared'
  | 'gameOver'
  | 'click';

export interface Tone {
  wave: OscillatorType | 'noise';
  freq: number;
  to?: number;
  dur: number;
  vol?: number;
  delay?: number;
}

const arp = (notes: number[], step: number, wave: OscillatorType, dur: number, vol: number): Tone[] =>
  notes.map((freq, i) => ({ wave, freq, dur, vol, delay: i * step }));

export const SFX: Record<SfxName, Tone[]> = {
  slash: [{ wave: 'noise', freq: 3200, to: 900, dur: 0.07, vol: 0.22 }],
  hit: [{ wave: 'square', freq: 240, to: 120, dur: 0.05, vol: 0.1 }],
  crit: [
    { wave: 'square', freq: 520, to: 260, dur: 0.08, vol: 0.14 },
    { wave: 'noise', freq: 4000, to: 1500, dur: 0.06, vol: 0.18 },
  ],
  arrow: [{ wave: 'triangle', freq: 900, to: 1500, dur: 0.06, vol: 0.1 }],
  fireball: [{ wave: 'noise', freq: 700, to: 250, dur: 0.18, vol: 0.18 }],
  explosion: [
    { wave: 'noise', freq: 500, to: 80, dur: 0.3, vol: 0.28 },
    { wave: 'sine', freq: 120, to: 50, dur: 0.25, vol: 0.2 },
  ],
  holy: [{ wave: 'sine', freq: 1200, to: 1700, dur: 0.08, vol: 0.08 }],
  heal: arp([784, 988, 1175], 0.05, 'sine', 0.12, 0.08),
  enemyDie: [
    { wave: 'square', freq: 320, to: 70, dur: 0.14, vol: 0.12 },
    { wave: 'noise', freq: 1200, to: 300, dur: 0.1, vol: 0.12 },
  ],
  heroHurt: [{ wave: 'sawtooth', freq: 220, to: 90, dur: 0.14, vol: 0.14 }],
  heroDie: [
    { wave: 'sawtooth', freq: 330, to: 55, dur: 0.45, vol: 0.18 },
    { wave: 'noise', freq: 600, to: 100, dur: 0.3, vol: 0.12 },
  ],
  coin: [
    { wave: 'square', freq: 988, dur: 0.05, vol: 0.09 },
    { wave: 'square', freq: 1319, dur: 0.12, vol: 0.09, delay: 0.05 },
  ],
  gem: arp([1568, 2093, 2637], 0.04, 'sine', 0.16, 0.1),
  power: arp([523, 659, 784, 1047], 0.05, 'square', 0.1, 0.1),
  bomb: [
    { wave: 'noise', freq: 900, to: 40, dur: 0.6, vol: 0.4 },
    { wave: 'sine', freq: 90, to: 30, dur: 0.5, vol: 0.3 },
  ],
  levelUp: arp([523, 659, 784, 1047, 1319], 0.06, 'triangle', 0.16, 0.14),
  recruit: arp([659, 988], 0.07, 'square', 0.09, 0.1),
  bump: [{ wave: 'noise', freq: 250, to: 70, dur: 0.12, vol: 0.32 }],
  shockWarn: [{ wave: 'sine', freq: 110, to: 260, dur: 0.7, vol: 0.14 }],
  shockwave: [
    { wave: 'noise', freq: 400, to: 50, dur: 0.5, vol: 0.38 },
    { wave: 'sine', freq: 80, to: 35, dur: 0.45, vol: 0.3 },
  ],
  waveStart: arp([392, 523], 0.1, 'triangle', 0.18, 0.13),
  waveCleared: arp([523, 659, 784], 0.08, 'triangle', 0.2, 0.13),
  gameOver: arp([392, 330, 262, 196], 0.16, 'triangle', 0.3, 0.16),
  click: [{ wave: 'square', freq: 660, dur: 0.03, vol: 0.06 }],
};
