import { GRID_H, GRID_W } from '../src/config';
import { SIM_DT } from '../src/data/balance';
import { DIR_VEC, type Dir, OPPOSITE, type Vec } from '../src/sim/grid';
import { pickCard } from '../src/sim/cards';
import { canChoose, chooseRoadOption, ROAD_EVENTS } from '../src/sim/roadEvents';
import type { CampaignId } from '../src/data/campaigns';
import { createWorld, stepWorld, turn, type GameOverReason, type Loadout, type World } from '../src/sim/world';

const DIRS = Object.keys(DIR_VEC) as Dir[];
const md = (a: Vec, b: Vec) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Açgözlü bot: jeton > yakındaki ganimet > en yakın düşmanı 2 hücre mesafeden çevirme; sıkışmamak için alan taraması. */
function decide(w: World): Dir | null {
  const head = w.party[0].pos;
  const blocked = new Set<string>();
  for (const h of w.party.slice(0, -1)) blocked.add(`${h.pos.x},${h.pos.y}`);
  for (const e of w.enemies) blocked.add(`${e.pos.x},${e.pos.y}`);
  const bad = (x: number, y: number) => x <= 0 || y <= 0 || x >= GRID_W - 1 || y >= GRID_H - 1 || blocked.has(`${x},${y}`);

  const area = (sx: number, sy: number, cap: number) => {
    const seen = new Set([`${sx},${sy}`]);
    const stack = [[sx, sy]];
    while (stack.length && seen.size < cap) {
      const [x, y] = stack.pop()!;
      for (const d of DIRS) {
        const nx = x + DIR_VEC[d].x;
        const ny = y + DIR_VEC[d].y;
        const k = `${nx},${ny}`;
        if (!seen.has(k) && !bad(nx, ny)) {
          seen.add(k);
          stack.push([nx, ny]);
        }
      }
    }
    return seen.size;
  };

  const token = w.loot.find((l) => l.type === 'hero');
  const near = w.loot.filter((l) => l.type !== 'hero' && md(l.pos, head) <= 6).sort((a, b) => md(a.pos, head) - md(b.pos, head))[0];
  let goal = (token ?? near)?.pos;
  let orbit = false;
  if (!goal && w.enemies.length) {
    goal = w.enemies.reduce((a, b) => (md(a.pos, head) < md(b.pos, head) ? a : b)).pos;
    orbit = true;
  }

  const need = w.party.length + 4;
  let best: Dir | null = null;
  let bestScore = -Infinity;
  for (const d of DIRS) {
    if (d === OPPOSITE[w.dir]) continue;
    const nx = head.x + DIR_VEC[d].x;
    const ny = head.y + DIR_VEC[d].y;
    if (bad(nx, ny)) continue;
    const a = area(nx, ny, need + 1);
    let score = a >= need ? 1000 : a * 5;
    if (goal) {
      const dist = Math.abs(nx - goal.x) + Math.abs(ny - goal.y);
      score -= orbit ? Math.abs(dist - 2) * 3 : dist * 3;
    }
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}

export interface RunReport {
  wave: number;
  seconds: number;
  kills: number;
  gold: number;
  gems: number;
  maxParty: number;
  /** Kafileye katılan ve savaşta düşen kahraman sayısı. */
  recruited: number;
  lost: number;
  reason: GameOverReason | 'timeout';
}

export function playRun(seed: number, loadout: Partial<Loadout>, maxSeconds = 900, drafts = true, campaign: CampaignId = 'road'): RunReport {
  const w = createWorld({ seed, loadout, drafts, campaign });
  let reason: RunReport['reason'] = 'timeout';
  let lastTick = -1;
  let maxParty = 1;
  let lost = 0;
  while (w.time < maxSeconds * 1000) {
    if (w.draft) pickCard(w, w.draft.options[0]);
    if (w.roadEvent) chooseRoadOption(w, ROAD_EVENTS[w.roadEvent].options.findIndex((o) => canChoose(w, o)));
    if (w.ticks !== lastTick) {
      lastTick = w.ticks;
      const d = decide(w);
      if (d && d !== w.dir) turn(w, d);
    }
    for (const e of stepWorld(w, SIM_DT)) {
      if (e.type === 'gameOver') reason = e.reason;
      else if (e.type === 'heroDied') lost++;
    }
    maxParty = Math.max(maxParty, w.party.length);
    if (!w.alive) break;
  }
  return {
    wave: Math.max(w.wave.n, 1),
    seconds: Math.round(w.time / 1000),
    kills: w.stats.kills,
    gold: w.stats.gold,
    gems: w.stats.gems,
    maxParty,
    recruited: w.tally.recruited,
    lost,
    reason,
  };
}
