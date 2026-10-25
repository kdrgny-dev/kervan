import { notesAt, STEP_SEC } from './music';
import { SFX, type SfxName, type Tone } from './sfx';

const SFX_VOLUME = 0.5;
const MUSIC_VOLUME = 0.16;
const THROTTLE_MS = 40;
const LOOKAHEAD_SEC = 0.15;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private noise!: AudioBuffer;
  private lastPlayed = new Map<SfxName, number>();
  private sfxOn = true;
  private musicOn = true;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private nextNoteAt = 0;

  /** Tarayıcılar ses bağlamını ilk kullanıcı etkileşimine kadar açmaz. */
  unlockOnGesture() {
    const unlock = () => {
      this.ensure()?.resume();
      if (this.musicOn) this.startMusic();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('touchend', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    // iOS uygulamadan çıkıp dönünce bağlamı askıya alır
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.ctx?.state !== 'running') void this.ctx?.resume();
    });
  }

  configure(opts: { sfx: boolean; music: boolean }) {
    this.sfxOn = opts.sfx;
    if (opts.music !== this.musicOn) {
      this.musicOn = opts.music;
      if (this.musicOn) this.startMusic();
      else this.stopMusic();
    }
  }

  play(name: SfxName) {
    if (!this.sfxOn) return;
    const ctx = this.ensure();
    if (!ctx || ctx.state !== 'running') return;
    const now = performance.now();
    if (now - (this.lastPlayed.get(name) ?? 0) < THROTTLE_MS) return;
    this.lastPlayed.set(name, now);
    for (const tone of SFX[name]) this.tone(tone, ctx.currentTime + (tone.delay ?? 0), this.sfxBus);
  }

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const ctx = new AudioContext();
      this.sfxBus = ctx.createGain();
      this.sfxBus.gain.value = SFX_VOLUME;
      this.sfxBus.connect(ctx.destination);
      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = MUSIC_VOLUME;
      this.musicBus.connect(ctx.destination);
      this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.ctx = ctx;
    } catch {
      return null;
    }
    return this.ctx;
  }

  private tone(t: Tone, at: number, bus: GainNode) {
    const ctx = this.ctx!;
    const vol = t.vol ?? 0.2;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(vol, at + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, at + t.dur);
    env.connect(bus);

    if (t.wave === 'noise') {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 1.2;
      filter.frequency.setValueAtTime(t.freq, at);
      if (t.to) filter.frequency.exponentialRampToValueAtTime(t.to, at + t.dur);
      src.connect(filter).connect(env);
      src.start(at);
      src.stop(at + t.dur + 0.02);
      return;
    }

    const osc = ctx.createOscillator();
    osc.type = t.wave;
    osc.frequency.setValueAtTime(t.freq, at);
    if (t.to) osc.frequency.exponentialRampToValueAtTime(t.to, at + t.dur);
    osc.connect(env);
    osc.start(at);
    osc.stop(at + t.dur + 0.02);
  }

  private startMusic() {
    const ctx = this.ensure();
    if (!ctx || ctx.state !== 'running' || this.musicTimer !== null) return;
    this.nextNoteAt = ctx.currentTime + 0.05;
    this.musicTimer = window.setInterval(() => {
      while (this.nextNoteAt < ctx.currentTime + LOOKAHEAD_SEC) {
        for (const n of notesAt(this.musicStep)) this.tone(n, this.nextNoteAt, this.musicBus);
        this.musicStep++;
        this.nextNoteAt += STEP_SEC;
      }
    }, 25);
  }

  private stopMusic() {
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
  }
}

export const audio = new AudioEngine();
