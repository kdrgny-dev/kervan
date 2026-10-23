import type Phaser from 'phaser';
import { CELL, GRID_H, GRID_W } from '../config';
import { isWall } from '../sim/grid';

export const ARENA = {
  floorA: 0x2b3a2e,
  floorB: 0x2f4032,
  wall: 0x4a3f36,
  wallTop: 0x5e5145,
};

export function drawArena(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (isWall({ x, y })) {
        g.fillStyle(ARENA.wall).fillRect(x * CELL, y * CELL, CELL, CELL);
        g.fillStyle(ARENA.wallTop).fillRect(x * CELL + 3, y * CELL + 3, CELL - 6, CELL - 12);
      } else {
        g.fillStyle((x + y) % 2 ? ARENA.floorA : ARENA.floorB).fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }
  }
  return g;
}
