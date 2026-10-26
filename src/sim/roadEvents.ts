import { CARD_IDS, CARDS, type CardId } from '../data/cards';
import { applyCard } from './cards';
import { gainXp, spawnHeroToken } from './loot';
import { pick } from './rng';
import { rescaleParty } from './state';
import type { World } from './types';

/** Dalga sonu bu ihtimalle yolda bir olay çıkar; iki olay arasında en az bu kadar dalga geçer. */
export const ROAD_EVENT_CHANCE = 0.4;
export const ROAD_EVENT_GAP = 2;
const RECENT = 4;

export interface RoadCost {
  gold?: number;
  gems?: number;
}

export interface RoadOption {
  label: string;
  /** Seçeneğin altında küçük yazı: bedeli ve ne getirdiği. */
  hint: (w: World) => string;
  cost?: (w: World) => RoadCost;
  /** Yalnızca bu koşulda seçilebilir (bedelin yanında). */
  allowed?: (w: World) => boolean;
  /** Etkiyi uygular, Hüsnü'nün sonucu anlatan cümlesini döndürür. */
  run: (w: World) => string;
}

export interface RoadEventDef {
  title: string;
  text: string;
  options: RoadOption[];
}

/** Bedeller dalgayla büyür ki geç oyunda da anlamlı kalsın. */
export const price = (w: World, base: number) => Math.round(base * (1 + w.wave.n * 0.08));

const healAll = (w: World, ratio = 1) => {
  for (const h of w.party) {
    const amount = Math.min(h.maxHp - h.hp, Math.round(h.maxHp * ratio));
    if (amount <= 0) continue;
    h.hp += amount;
    w.events.push({ type: 'heroHealed', id: h.id, amount });
  }
};

const cardPool = (w: World, cursed: boolean) =>
  CARD_IDS.filter((id) => ('cursed' in CARDS[id]) === cursed && w.loadout.cards.includes(id) && (w.cards[id] ?? 0) < CARDS[id].max);

const giveCard = (w: World, id: CardId) => {
  applyCard(w, id);
  return CARDS[id].name;
};

const pass = (line: string): RoadOption => ({ label: 'Geç', hint: () => 'Bir şey olmaz', run: () => line });

export const ROAD_EVENTS = {
  merchant: {
    title: 'Yaralı Tüccar',
    text: "Yol kenarında bir tüccar; eşeği kaçmış, bileği burkulmuş. \"Beni şehre götürün, yeğenim size katılsın!\" diyor. Yeğen dediği kılıç kuşanmış bir delikanlı.",
    options: [
      {
        label: 'Götürelim',
        hint: (w) => `${price(w, 25)} altın · kahraman katılır`,
        cost: (w) => ({ gold: price(w, 25) }),
        run: (w) => {
          spawnHeroToken(w);
          return 'Yeğen kafileye katılmaya hazır. Jetonu topla, gerisini o halleder.';
        },
      },
      pass('Tüccar arkamızdan bir şeyler söyledi. Duymamış olayım.'),
    ],
  },
  well: {
    title: 'Serin Kuyu',
    text: 'Çölün ortasında buz gibi bir kuyu! Ya da serap. Ben serap diyorum ama su sesi de geliyor.',
    options: [
      {
        label: 'Kana kana içelim',
        hint: () => 'Herkes tam iyileşir',
        run: (w) => {
          healAll(w);
          return 'Serap değilmiş! Kafile turp gibi oldu.';
        },
      },
      {
        label: 'Şişeleyip satalım',
        hint: (w) => `+${price(w, 20)} altın`,
        run: (w) => {
          w.stats.gold += price(w, 20);
          return 'Kuyunun suyunu şişeledik. Ahlaken tartışılır, ama kârlı.';
        },
      },
    ],
  },
  dice: {
    title: 'Zar Ustası',
    text: 'Tek gözlü bir adam zar sallıyor: "Altınının yarısını koy, şeş gelirse ikiye katlarım!" Gözünü de herhalde bu oyunda kaybetmiş.',
    options: [
      {
        label: 'Zar at',
        hint: (w) => `${Math.floor(w.stats.gold / 2)} altın · ya ikiye katla ya kaybet`,
        allowed: (w) => w.stats.gold >= 10,
        run: (w) => {
          const stake = Math.floor(w.stats.gold / 2);
          if (w.rng() < 0.5) {
            w.stats.gold += stake;
            return `Şeş beş! ${stake} altın kazandık. Adamın öbür gözü de seğirdi.`;
          }
          w.stats.gold -= stake;
          return `Dü bir... ${stake} altın gitti. Ben demedim mi, demedim. Ama diyecektim.`;
        },
      },
      pass('Akıllıca. Ben de gençken bir kere... neyse, o hikâye başka zaman.'),
    ],
  },
  fortune: {
    title: 'Kahve Falcısı',
    text: 'Bir teyze fincanını uzatıyor: "Bir elmas ver, falına bakayım. Beğenmezsen değiştiririm de."',
    options: [
      {
        label: 'Fala bak',
        hint: () => '1 elmas · rastgele kart',
        cost: () => ({ gems: 1 }),
        allowed: (w) => cardPool(w, false).length > 0,
        run: (w) => `Fincanda "${giveCard(w, pick(w.rng, cardPool(w, false)))}" çıktı. Teyze haklıymış, gerçekleşti bile!`,
      },
      pass('Kahvesi güzeldi. Fal kısmını sonraya saklayalım.'),
    ],
  },
  smith: {
    title: 'Gezgin Demirci',
    text: 'Örsünü sırtında taşıyan bir demirci: "Zırhları bir elden geçireyim, kazık atmam." Atacak.',
    options: [
      {
        label: 'Zırhları dövsün',
        hint: (w) => `${price(w, 35)} altın · kalıcı +%10 can`,
        cost: (w) => ({ gold: price(w, 35) }),
        run: (w) => {
          w.mods.hpMult += 0.1;
          rescaleParty(w);
          return 'Zırhlar parlıyor. Bir de kazık attı ama değdi.';
        },
      },
      {
        label: 'Kılıçları bilesin',
        hint: (w) => `${price(w, 35)} altın · kalıcı +%8 hasar`,
        cost: (w) => ({ gold: price(w, 35) }),
        run: (w) => {
          w.mods.dmgMult += 0.08;
          return 'Kılıçlar jilet gibi. Tıraş olmayı düşünüyorum.';
        },
      },
      pass('Usta, sonra gelsene. Tabii yaşarsak.'),
    ],
  },
  bandits: {
    title: 'Pusu!',
    text: 'Kayaların ardından haydutlar fırladı: "Altınlar ya da canınız!" Klasik replik, yaratıcılık sıfır.',
    options: [
      {
        label: 'Haraç öde',
        hint: (w) => `${price(w, 20)} altın`,
        cost: (w) => ({ gold: price(w, 20) }),
        run: () => 'Ödedik. Haydutlar teşekkür etti; kibar haydutlarmış.',
      },
      {
        label: 'Savaş!',
        hint: () => 'Herkes canının %30\'unu kaybeder · +2 elmas',
        run: (w) => {
          for (const h of w.party) h.hp = Math.max(1, h.hp - Math.round(h.maxHp * 0.3));
          w.stats.gems += 2;
          return 'Haydutları kovaladık, biraz hırpalandık. Ceplerinden iki elmas düştü!';
        },
      },
    ],
  },
  inn: {
    title: 'Kervansaray',
    text: 'Kervansarayın kapısı açık, içeriden pilav kokusu geliyor. Hancı göz kırpıyor.',
    options: [
      {
        label: 'Biraz dinlenelim',
        hint: (w) => `${price(w, 15)} altın · herkes tam iyileşir`,
        cost: (w) => ({ gold: price(w, 15) }),
        run: (w) => {
          healAll(w);
          return 'Pilav, çay, yumuşak minder. Kafile bayram etti.';
        },
      },
      {
        label: 'Hikâye anlat',
        hint: (w) => `+${20 + w.wave.n * 3} XP`,
        run: (w) => {
          gainXp(w, 20 + w.wave.n * 3);
          return 'Hikâyem o kadar güzeldi ki herkes bir şey öğrendi. Hancı da bedava çay verdi.';
        },
      },
    ],
  },
  chest: {
    title: 'Lanetli Sandık',
    text: 'Yolun ortasında kilitli bir sandık. Üstünde "AÇMA" yazıyor. Kim böyle bir şey yazar? Kesin içinde hazine var.',
    options: [
      {
        label: 'Aç!',
        hint: () => 'Hazine de çıkabilir lanet de',
        run: (w) => {
          const cursed = cardPool(w, true);
          if (cursed.length > 0 && w.rng() < 0.4) return `Lanet! "${giveCard(w, pick(w.rng, cursed))}" üstümüze yapıştı. AÇMA yazıyordu ama.`;
          const gold = price(w, 40);
          w.stats.gold += gold;
          w.stats.gems++;
          return `Hazine! ${gold} altın ve bir elmas. Yazıyı da hatıra olarak aldım.`;
        },
      },
      pass('Haklısın. Geçen sefer açtığım sandıktan kayınvalidem çıkmıştı.'),
    ],
  },
} satisfies Record<string, RoadEventDef>;

export type RoadEventId = keyof typeof ROAD_EVENTS;
export const ROAD_EVENT_IDS = Object.keys(ROAD_EVENTS) as RoadEventId[];

export function canChoose(w: World, opt: RoadOption): boolean {
  const c = opt.cost?.(w) ?? {};
  return (c.gold ?? 0) <= w.stats.gold && (c.gems ?? 0) <= w.stats.gems && (opt.allowed?.(w) ?? true);
}

/** Dalga temizlenince çağrılır; olay kart seçiminden sonra açılmak üzere sıraya girer. */
export function rollRoadEvent(w: World) {
  if (!w.roadEventsEnabled || w.wave.n < 2 || w.wave.n - w.lastRoadEvent < ROAD_EVENT_GAP) return;
  if (w.rng() >= ROAD_EVENT_CHANCE) return;
  const fresh = ROAD_EVENT_IDS.filter((id) => !w.recentRoadEvents.includes(id));
  w.roadEventQueued = pick(w.rng, fresh.length > 0 ? fresh : ROAD_EVENT_IDS);
  w.lastRoadEvent = w.wave.n;
}

/** Kart seçimi kapanınca (ya da hiç açılmadıysa) sıradaki olayı açar; açıkken simülasyon durur. */
export function openQueuedRoadEvent(w: World) {
  if (!w.alive || !w.roadEventQueued || w.draft) return;
  w.roadEvent = w.roadEventQueued;
  w.roadEventQueued = null;
  w.recentRoadEvents = [w.roadEvent, ...w.recentRoadEvents].slice(0, RECENT);
  w.events.push({ type: 'roadEventOpen', id: w.roadEvent });
}

export function chooseRoadOption(w: World, index: number): string | null {
  if (!w.roadEvent) return null;
  const opt: RoadOption | undefined = ROAD_EVENTS[w.roadEvent].options[index];
  if (!opt || !canChoose(w, opt)) return null;
  const c = opt.cost?.(w) ?? {};
  w.stats.gold -= c.gold ?? 0;
  w.stats.gems -= c.gems ?? 0;
  const line = opt.run(w);
  w.events.push({ type: 'roadEventResolved', id: w.roadEvent, line });
  w.roadEvent = null;
  return line;
}
