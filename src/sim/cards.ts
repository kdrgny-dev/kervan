import { CARD_IDS, CARDS, type CardId, CURSED_CHANCE, DRAFT_SIZE, RARITY_WEIGHT, rerollCost } from '../data/cards';
import { spawnHeroToken } from './loot';
import { baseTickMs, rescaleParty } from './state';
import type { World } from './types';

const available = (w: World, id: CardId) => w.loadout.cards.includes(id) && (w.cards[id] ?? 0) < CARDS[id].max;

/** Nadirlik ağırlıklı, tekrarsız seçenekler; bir yuva %15 ihtimalle lanetli kart olur. */
export function rollDraft(w: World): CardId[] {
  const out: CardId[] = [];
  const take = (pool: CardId[]) => {
    const candidates = pool.filter((id) => !out.includes(id));
    if (candidates.length === 0) return;
    const total = candidates.reduce((s, id) => s + RARITY_WEIGHT[CARDS[id].rarity], 0);
    let r = w.rng() * total;
    for (const id of candidates) {
      r -= RARITY_WEIGHT[CARDS[id].rarity];
      if (r < 0) return void out.push(id);
    }
    out.push(candidates[candidates.length - 1]);
  };
  const blessed = CARD_IDS.filter((id) => !('cursed' in CARDS[id]) && available(w, id));
  const cursed = CARD_IDS.filter((id) => 'cursed' in CARDS[id] && available(w, id));
  const withCurse = cursed.length > 0 && w.rng() < CURSED_CHANCE;
  for (let i = 0; i < DRAFT_SIZE - (withCurse ? 1 : 0); i++) take(blessed);
  if (withCurse) take(cursed);
  return out;
}

export function openDraft(w: World) {
  const options = rollDraft(w);
  if (options.length === 0) return;
  w.draft = { options, rerolls: 0 };
  w.events.push({ type: 'draftOpen' });
}

export const nextRerollCost = (w: World) => rerollCost(w.draft?.rerolls ?? 0);

export function rerollDraft(w: World): boolean {
  if (!w.draft) return false;
  const cost = nextRerollCost(w);
  if (w.stats.gold < cost) return false;
  w.stats.gold -= cost;
  w.draft.rerolls++;
  w.draft.options = rollDraft(w);
  w.events.push({ type: 'draftRerolled' });
  return true;
}

export function pickCard(w: World, id: CardId): boolean {
  if (!w.draft?.options.includes(id)) return false;
  applyCard(w, id);
  w.draft = null;
  return true;
}

/** Kart etkisini uygular (seçim dışında testler de kullanır). */
export function applyCard(w: World, id: CardId) {
  const def = CARDS[id];
  def.apply(w.mods);
  w.cards[id] = (w.cards[id] ?? 0) + 1;
  w.tally.cardsPicked++;
  if ('cursed' in def) w.tally.cursedPicked++;
  rescaleParty(w);
  if (!w.powers.speed) w.tickMs = baseTickMs(w);
  if ('instant' in def && def.instant === 'heroToken') spawnHeroToken(w);
  w.events.push({ type: 'cardPicked', id });
}
