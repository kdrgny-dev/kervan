import type { SfxName } from './sfx';

export interface SoundFile {
  /** public/assets/audio/<ad>_1..n.mp3 */
  variants: number;
  gain: number;
  /** Aynı ses arka arkaya gelince bıktırmasın diye hafif ton farkı. */
  jitter?: boolean;
}

export type MusicTrack = 'menu' | 'game';

/** Döngüde çalan müzikler; dosyası olmayan parça yerine sentez müzik çalar. */
export const MUSIC_TRACKS: Partial<Record<MusicTrack, { file: string; gain: number }>> = {
  // "Desert theme", yd, OpenGameArt, CC0
  menu: { file: 'music_menu.mp3', gain: 0.35 },
  // "Happy Adventure (Loop)", TinyWorlds, OpenGameArt, CC0
  game: { file: 'music_game.mp3', gain: 0.3 },
};

/**
 * Dosyayla çalan efektler (yapay zekâyla üretilecek; istemler docs/ses-istemleri.md).
 * Listede olmayan olaylar sentezle çalar.
 */
export const SOUND_FILES: Partial<Record<SfxName, SoundFile>> = {};
