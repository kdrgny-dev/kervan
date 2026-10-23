import type { ProjectileKind } from '../data/balance';
import type { EnemyKind } from '../data/enemies';
import type { HeroKind } from '../data/heroes';
import type { PowerKind } from '../data/loot';
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
  | { type: 'enemyHit'; id: number; dmg: number; crit?: boolean }
  | { type: 'enemyDied'; id: number; pos: Vec }
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
  | { type: 'waveStart'; n: number }
  | { type: 'waveCleared'; n: number };

export interface Loadout {
  leader: HeroKind;
  unlocked: HeroKind[];
  upgrades: Partial<Record<HeroKind, { hp: number; dmg: number }>>;
  startPower: boolean;
  powerBonusMs: number;
  secondHero: boolean;
}

export interface World {
  loadout: Loadout;
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
  alive: boolean;
  rng: Rng;
  nextId: number;
  ticks: number;
  wave: WaveState;
  wavesEnabled: boolean;
  events: WorldEvent[];
}
