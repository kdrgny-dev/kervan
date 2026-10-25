import type { CampaignId } from '../data/campaigns';
import type { ProjectileKind } from '../data/balance';
import type { EnemyKind } from '../data/enemies';
import type { HeroKind } from '../data/heroes';
import type { CardId, Mods } from '../data/cards';
import type { PowerKind } from '../data/loot';
import type { RegionId } from '../data/regions';
import type { HeroClass } from '../data/synergies';
import type { SynergyTiers } from './synergy';
import type { Dir, Vec } from './grid';
import type { InputQueue } from './inputQueue';
import type { Rng } from './rng';

export interface Hero {
  id: number;
  kind: HeroKind;
  pos: Vec;
  prev: Vec;
  hp: number;
  maxHp: number;
  cooldown: number;
  healCd: number;
}

export interface Enemy {
  id: number;
  kind: EnemyKind;
  pos: Vec;
  prev: Vec;
  hp: number;
  maxHp: number;
  moveAcc: number;
  moveMs: number;
  attackCd: number;
  summonCd?: number;
  shockCd?: number;
  shockWarned?: boolean;
  volleyCd?: number;
}

export interface Projectile {
  id: number;
  kind: ProjectileKind;
  owner: 'hero' | 'enemy';
  x: number;
  y: number;
  tx: number;
  ty: number;
  targetId: number;
  dmg: number;
  splash: number;
  speed: number;
  /** Vurduğu kahramanı yavaşlatır (ms). */
  slowMs?: number;
  done?: boolean;
}

export type Loot =
  | { id: number; pos: Vec; expiresAt: number; type: 'coin'; value: number }
  | { id: number; pos: Vec; expiresAt: number; type: 'gem' }
  | { id: number; pos: Vec; expiresAt: number; type: 'hero'; hero: HeroKind }
  | { id: number; pos: Vec; expiresAt: number; type: 'power'; power: PowerKind };

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type LootDrop = DistributiveOmit<Loot, 'id' | 'pos' | 'expiresAt'>;

export interface RunStats {
  gold: number;
  gems: number;
  kills: number;
  xp: number;
  level: number;
}

export interface PendingSpawn {
  kind: EnemyKind;
  pos: Vec;
  at: number;
}

export interface WaveState {
  n: number;
  phase: 'break' | 'active';
  timer: number;
  pending: PendingSpawn[];
}

export type GameOverReason = 'wall' | 'self' | 'wiped';

export type WorldEvent =
  | { type: 'moved' }
  | { type: 'recruited'; hero: Hero }
  | { type: 'gameOver'; reason: GameOverReason }
  | { type: 'heroHit'; id: number; dmg: number }
  | { type: 'heroHealed'; id: number; amount: number }
  | { type: 'heroDied'; id: number; pos: Vec }
  | { type: 'enemySpawned'; id: number }
  | { type: 'enemyAttack'; id: number }
  | { type: 'bossSummon'; id: number }
  | { type: 'enemyHit'; id: number; dmg: number; crit?: boolean }
  | { type: 'enemyDied'; id: number; kind: EnemyKind; pos: Vec }
  | { type: 'heroAttack'; id: number }
  | { type: 'slash'; pos: Vec }
  | { type: 'explosion'; x: number; y: number; radius: number }
  | { type: 'bump'; pos: Vec }
  | { type: 'shockwaveWarn'; id: number; radius: number }
  | { type: 'shockwave'; pos: Vec; radius: number }
  | { type: 'lootSpawned'; id: number }
  | { type: 'lootCollected'; id: number; loot: Loot }
  | { type: 'lootExpired'; id: number }
  | { type: 'powerStart'; power: PowerKind }
  | { type: 'powerEnd'; power: PowerKind }
  | { type: 'bomb' }
  | { type: 'levelUp'; level: number }
  | { type: 'draftOpen' }
  | { type: 'draftRerolled' }
  | { type: 'cardPicked'; id: CardId }
  | { type: 'regionEnter'; region: RegionId; journey: number }
  | { type: 'slowed'; until: number }
  | { type: 'waveStart'; n: number }
  | { type: 'waveCleared'; n: number; bonus: number }
  | { type: 'shipsStart'; until: number }
  | { type: 'campaignCleared' };

export interface Loadout {
  leader: HeroKind;
  unlocked: HeroKind[];
  upgrades: Partial<Record<HeroKind, { hp: number; dmg: number }>>;
  startPower: boolean;
  powerBonusMs: number;
  secondHero: boolean;
  /** Pazar yükseltmeleri. */
  goldMult: number;
  freeRerolls: number;
  /** Kart seçiminde çıkabilecek (açılmış) kartlar. */
  cards: CardId[];
}

/** Meta sistemler (görev, başarım) için tur boyunca tutulan sayaçlar. */
export interface Tally {
  killsByKind: Partial<Record<EnemyKind, number>>;
  bosses: number;
  recruited: number;
  cardsPicked: number;
  cursedPicked: number;
  maxParty: number;
  maxTier: Partial<Record<HeroClass, number>>;
  /** Ulaşılan en uzak bölge sırası (0 = Yeşil Vadi, 4 = ikinci yolculuğun vadisi). */
  furthestRegion: number;
  bossKinds: Partial<Record<EnemyKind, number>>;
  /** Destanın son dalgası temizlendi. */
  campaignCleared: boolean;
}

export interface Draft {
  options: CardId[];
  rerolls: number;
}

export interface World {
  campaign: CampaignId;
  route: readonly RegionId[];
  /** Gemiler karadan: bu zamana kadar lider duvardan karşı tarafa geçer. */
  wallPassUntil: number;
  loadout: Loadout;
  mods: Mods;
  cards: Partial<Record<CardId, number>>;
  /** Açıkken simülasyon durur; oyuncu kart seçer. */
  draft: Draft | null;
  draftsEnabled: boolean;
  syn: SynergyTiers;
  tally: Tally;
  party: Hero[];
  enemies: Enemy[];
  projectiles: Projectile[];
  loot: Loot[];
  powers: Partial<Record<PowerKind, number>>;
  stats: RunStats;
  dir: Dir;
  input: InputQueue;
  tickMs: number;
  moveAcc: number;
  simAcc: number;
  time: number;
  bumpInvuln: number;
  /** Bu zamana kadar kafile yavaş ilerler (buz). */
  slowUntil: number;
  /** Pazar'dan gelen ücretsiz yeniden çekmeler. */
  freeRerolls: number;
  alive: boolean;
  rng: Rng;
  nextId: number;
  ticks: number;
  wave: WaveState;
  wavesEnabled: boolean;
  events: WorldEvent[];
}
