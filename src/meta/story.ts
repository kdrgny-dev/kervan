import { regionBeat, type StoryId } from '../data/story';
import { ROUTE } from '../data/regions';
import { ENEMIES, type EnemyKind } from '../data/enemies';
import type { RunSummary } from '../data/progression';
import type { SaveData } from './save';

export function queueStory(s: SaveData, id: StoryId) {
  if (!s.story.seen.includes(id) && !s.story.pending.includes(id)) s.story.pending.push(id);
}

export function markSeen(s: SaveData, id: StoryId) {
  s.story.pending = s.story.pending.filter((p) => p !== id);
  if (!s.story.seen.includes(id)) s.story.seen.push(id);
}

/** İlk açılışta kervanbaşı kendini tanıtır. */
export function ensureIntro(s: SaveData) {
  if (s.lifetime.runs === 0) queueStory(s, 'intro');
}

const LEVEL_BEATS: [number, StoryId][] = [
  [5, 'level5'],
  [10, 'level10'],
  [20, 'level20'],
];

/** Tur sonunda yeni ulaşılan bölge, devrilen boss ve seviye eşikleri için hikaye anlarını sıraya koyar. */
export function storyAfterRun(s: SaveData, run: RunSummary, levelBefore: number) {
  if (s.lifetime.runs === 1) queueStory(s, 'firstRun');

  for (let ord = s.journey.furthest + 1; ord <= run.furthestRegion; ord++) {
    if (ord % ROUTE.length === 0) queueStory(s, 'journey2');
    else {
      const beat = regionBeat(ROUTE[ord % ROUTE.length]);
      if (beat) queueStory(s, beat);
    }
  }
  s.journey.furthest = Math.max(s.journey.furthest, run.furthestRegion);

  for (const kind of Object.keys(run.bossKinds) as EnemyKind[]) {
    if (!ENEMIES[kind].boss || s.journey.bosses.includes(kind)) continue;
    s.journey.bosses.push(kind);
    queueStory(s, `boss_${kind}` as StoryId);
  }

  for (const [lvl, id] of LEVEL_BEATS) if (levelBefore < lvl && s.account.level >= lvl) queueStory(s, id);
}
