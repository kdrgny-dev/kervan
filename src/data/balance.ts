import type { AttackKind } from './heroes';

export const SIM_DT = 10;

export const FIRST_BREAK_MS = 2000;
export const WAVE_BREAK_MS = 3000;
export const SPAWN_WARN_MS = 1000;
export const SPAWN_STAGGER_MS = 350;
export const SPAWN_RETRY_MS = 200;
export const SAFE_SPAWN_DIST = 3;

// Başta yumuşak, sonra karesel artan zorluk
export const BOSS_EVERY = 5;

export const waveBudget = (n: number) => 4 + 4 * n + Math.floor((n * n) / 4);
export const waveGoldBonus = (n: number) => 5 + 2 * n;
// Kartlar oyuncuyu her dalga güçlendirdiği için düşman canı da ilk dalgadan büyür
export const enemyHpScale = (n: number) => 1.07 ** Math.max(0, n - 1);
/** Her sonraki boss +%50 can (5. dalga x1, 10. dalga x1.5 …). */
export const bossHpScale = (n: number) => 1 + 0.5 * Math.max(0, Math.floor(n / BOSS_EVERY) - 1);

/** Buz yavaşlatmasında adım süresi çarpanı. */
export const SLOW_FACTOR = 1.35;

export const BUMP_DMG_RATIO = 0.4;
export const BUMP_INVULN_MS = 500;
/** Fil kafiledeyken çarpışmada düşman canından giden pay (boss'ta daha az). */
export const CRUSH_RATIO = 0.6;
export const CRUSH_BOSS_RATIO = 0.08;

export const CHARGE_DIST = 3;
export const CHARGE_SPEEDUP = 0.5;

export type ProjectileKind = Exclude<AttackKind, 'melee'> | 'bone';

/** hücre / saniye */
export const PROJECTILE_SPEED: Record<ProjectileKind, number> = {
  arrow: 14,
  fireball: 9,
  cannon: 10,
  holy: 11,
  bone: 8,
};

export const HIT_RADIUS = 0.25;
