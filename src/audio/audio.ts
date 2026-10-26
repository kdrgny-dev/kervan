import { notesAt, STEP_SEC } from './music';
import { SFX, type SfxName, type Tone } from './sfx';
import { MUSIC_TRACKS, type MusicTrack, SOUND_FILES } from './sounds';

const SFX_VOLUME = 0.5;
const MUSIC_VOLUME = 0.16;
const THROTTLE_MS = 40;
const LOOKAHEAD_SEC = 0.15;
const FADE_SEC = 0.8;

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
  private buffers = new Map<SfxName, AudioBuffer[]>();
  private musicBuffers = new Map<MusicTrack, AudioBuffer>();
  private track: MusicTrack = 'menu';
  private song: { src: AudioBufferSourceNode; gain: GainNode } | null = null;

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

  /** Ses dosyalarını arka planda çözer; bitene kadar (ya da dosyası olmayan olaylarda) sentez çalar. */
  preload() {
    const ctx = this.ensure();
    if (!ctx) return;
    for (const [name, def] of Object.entries(SOUND_FILES) as [SfxName, { variants: number }][]) {
      const urls = Array.from({ length: def.variants }, (_, i) => `assets/audio/${name}_${i + 1}.mp3`);
      void Promise.all(urls.map((u) => fetch(u).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b))))
        .then((list) => this.buffers.set(name, list))
        .catch(() => undefined);
    }
    for (const [name, def] of Object.entries(MUSIC_TRACKS) as [MusicTrack, { file: string }][]) {
      void fetch(`assets/audio/${def.file}`)
        .then((r) => r.arrayBuffer())
        .then((b) => ctx.decodeAudioData(b))
        .then((buf) => {
          this.musicBuffers.set(name, buf);
          // Sentez müzik çalıyorsa dosyaya geç
          if (name === this.track && this.musicTimer !== null) {
            this.stopMusic();
            this.startMusic();
          }
        })
        .catch(() => undefined);
    }
  }

  /** Menüde ve oyunda ayrı parça; geçişte eskisi kısılarak biter. */
  setTrack(track: MusicTrack) {
    if (track === this.track) return;
    this.track = track;
    if (!this.musicOn || this.ctx?.state !== 'running') return;
    this.stopMusic(FADE_SEC);
    this.startMusic();
  }

  play(name: SfxName) {
    if (!this.sfxOn) return;
    const ctx = this.ensure();
    if (!ctx || ctx.state !== 'running') return;
    const now = performance.now();
    if (now - (this.lastPlayed.get(name) ?? 0) < THROTTLE_MS) return;
    this.lastPlayed.set(name, now);
    const list = this.buffers.get(name);
    if (list?.length) return this.sample(name, list[Math.floor(Math.random() * list.length)]);
    for (const tone of SFX[name]) this.tone(tone, ctx.currentTime + (tone.delay ?? 0), this.sfxBus);
  }

  private sample(name: SfxName, buffer: AudioBuffer) {
    const ctx = this.ctx!;
    const def = SOUND_FILES[name]!;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    if (def.jitter) src.playbackRate.value = 0.94 + Math.random() * 0.12;
    const gain = ctx.createGain();
    gain.gain.value = def.gain;
    src.connect(gain).connect(this.sfxBus);
    src.start();
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
    if (!ctx || ctx.state !== 'running' || this.musicTimer !== null || this.song) return;
    const buffer = this.musicBuffers.get(this.track);
    const def = MUSIC_TRACKS[this.track];
    if (buffer && def) {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(def.gain, ctx.currentTime + 1.5);
      src.connect(gain).connect(ctx.destination);
      src.start();
      this.song = { src, gain };
      return;
    }
    this.nextNoteAt = ctx.currentTime + 0.05;
    this.musicTimer = window.setInterval(() => {
      while (this.nextNoteAt < ctx.currentTime + LOOKAHEAD_SEC) {
        for (const n of notesAt(this.musicStep)) this.tone(n, this.nextNoteAt, this.musicBus);
        this.musicStep++;
        this.nextNoteAt += STEP_SEC;
      }
    }, 25);
  }

  private stopMusic(fadeSec = 0) {
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
    if (this.song && this.ctx) {
      const { src, gain } = this.song;
      const now = this.ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(fadeSec, 0.02));
      src.stop(now + Math.max(fadeSec, 0.02));
    }
    this.song = null;
  }
}

export const audio = new AudioEngine();
