import { GRID_H, GRID_W } from '../config';

export type Dir = 'up' | 'down' | 'left' | 'right';

export interface Vec {
  x: number;
  y: number;
}

export const DIR_VEC: Record<Dir, Vec> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const OPPOSITE: Record<Dir, Dir> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

export const eq = (a: Vec, b: Vec) => a.x === b.x && a.y === b.y;

export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });

export const isWall = (p: Vec) =>
  p.x <= 0 || p.y <= 0 || p.x >= GRID_W - 1 || p.y >= GRID_H - 1;

export const chebyshev = (a: Vec, b: Vec) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

export const manhattan = (a: Vec, b: Vec) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export const neighbors = (p: Vec): Vec[] => Object.values(DIR_VEC).map((d) => add(p, d));
