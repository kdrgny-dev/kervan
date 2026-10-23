// La minör, Am–F–C–G döngüsü. Her adım bir sekizlik nota.
const BPM = 112;
export const STEP_SEC = 60 / BPM / 2;

const CHORDS = [
  [220, 261.6, 329.6],
  [174.6, 220, 261.6],
  [261.6, 329.6, 392],
  [196, 246.9, 293.7],
];

const ARP_ORDER = [0, 1, 2, 1, 0, 2, 1, 2];

export interface MusicNote {
  wave: OscillatorType | 'noise';
  freq: number;
  dur: number;
  vol: number;
}

/** Döngüdeki adımın çalacağı notalar (bar başına 8 adım, 4 bar). */
export function notesAt(step: number): MusicNote[] {
  const bar = Math.floor(step / 8) % CHORDS.length;
  const beat = step % 8;
  const chord = CHORDS[bar];
  const out: MusicNote[] = [];
  if (beat % 4 === 0) out.push({ wave: 'triangle', freq: chord[0] / 2, dur: STEP_SEC * 3.5, vol: 0.5 });
  out.push({ wave: 'square', freq: chord[ARP_ORDER[beat]] * 2, dur: STEP_SEC * 0.8, vol: 0.12 });
  if (beat % 2 === 1) out.push({ wave: 'noise', freq: 8000, dur: 0.03, vol: 0.08 });
  return out;
}
