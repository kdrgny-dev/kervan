import type { AttackKind } from './heroes';

export const SIM_DT = 10;

export const FIRST_BREAK_MS = 2000;
export const WAVE_BREAK_MS = 3000;
export const SPAWN_WARN_MS = 1000;
export const SPAWN_STAGGER_MS = 350;
export const SPAWN_RETRY_MS = 200;
export const SAFE_SPAWN_DIST = 3;

export const waveBudget = (n: number) => 6 + 6 * n;
export const enemyHpScale = (n: number) => (n > 10 ? 1.06 ** (n - 10) : 1);

export const BUMP_DMG_RATIO = 0.4;
export const BUMP_INVULN_MS = 500;

export const CHARGE_DIST = 3;
export const CHARGE_SPEEDUP = 0.5;

export type ProjectileKind = Exclude<AttackKind, 'melee' | 'cleave'> | 'bone';

/** hücre / saniye */
export const PROJECTILE_SPEED: Record<ProjectileKind, number> = {
  arrow: 14,
  fireball: 9,
  holy: 11,
  bone: 8,
};

export const HIT_RADIUS = 0.25;
