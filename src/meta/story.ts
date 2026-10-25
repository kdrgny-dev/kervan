import { regionBeat, type StoryId } from '../data/story';
import { ROUTE } from '../data/regions';
import { CAMPAIGNS, DESTAN_IDS } from '../data/campaigns';
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
  // Destanlar gelmeden önce seviyeyi geçmiş oyuncular da duysun
  if (DESTAN_IDS.some((c) => s.account.level >= CAMPAIGNS[c].unlockLevel)) queueStory(s, 'destans');
}

const LEVEL_BEATS: [number, StoryId][] = [
  [5, 'level5'],
  [10, 'level10'],
  [20, 'level20'],
];

/** Tur sonunda yeni ulaşılan bölge, devrilen boss ve seviye eşikleri için hikaye anlarını sıraya koyar. */
export function storyAfterRun(s: SaveData, run: RunSummary, levelBefore: number) {
  if (s.lifetime.runs === 1) queueStory(s, 'firstRun');

  if (run.campaign && run.campaign !== 'road') return campaignStory(s, run, levelBefore);

  for (let ord = s.journey.furthest + 1; ord <= run.furthestRegion; ord++) {
    if (ord % ROUTE.length === 0) queueStory(s, 'journey2');
    else {
      const beat = regionBeat(ROUTE[ord % ROUTE.length]);
      if (beat) queueStory(s, beat);
    }
  }
  s.journey.furthest = Math.max(s.journey.furthest, run.furthestRegion);

  bossBeats(s, run);
  levelBeats(s, levelBefore);
}

function bossBeats(s: SaveData, run: RunSummary) {
  for (const kind of Object.keys(run.bossKinds) as EnemyKind[]) {
    if (!ENEMIES[kind].boss || s.journey.bosses.includes(kind)) continue;
    s.journey.bosses.push(kind);
    queueStory(s, `boss_${kind}` as StoryId);
  }
}

function levelBeats(s: SaveData, levelBefore: number) {
  for (const [lvl, id] of LEVEL_BEATS) if (levelBefore < lvl && s.account.level >= lvl) queueStory(s, id);
  if (DESTAN_IDS.some((c) => levelBefore < CAMPAIGNS[c].unlockLevel && s.account.level >= CAMPAIGNS[c].unlockLevel)) queueStory(s, 'destans');
}

/** Destanda yalnızca ilk yolculuğun bölgeleri anlatılır; bitiş anı en sona. */
function campaignStory(s: SaveData, run: RunSummary, levelBefore: number) {
  const c = run.campaign!;
  const route = CAMPAIGNS[c].route;
  const prog = (s.campaigns[c] ??= { furthest: 0, best: 0, done: false });
  for (let ord = prog.furthest + 1; ord <= Math.min(run.furthestRegion, route.length - 1); ord++) {
    const beat = regionBeat(route[ord]);
    if (beat) queueStory(s, beat);
  }
  prog.furthest = Math.max(prog.furthest, run.furthestRegion);
  bossBeats(s, run);
  if (run.campaignCleared) queueStory(s, `${c}_done` as StoryId);
  levelBeats(s, levelBefore);
}
