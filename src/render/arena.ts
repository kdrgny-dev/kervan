import type Phaser from 'phaser';
import { CELL, GRID_H, GRID_W } from '../config';
import { isWall } from '../sim/grid';
import { TILE_TEXTURES } from './sprites';

export const ARENA = {
  floorA: 0x2b3a2e,
  floorB: 0x2f4032,
  wall: 0x4a3f36,
  wallTop: 0x5e5145,
};

export function drawArena(scene: Phaser.Scene) {
  if (scene.textures.exists(TILE_TEXTURES.floor) && scene.textures.exists(TILE_TEXTURES.wall)) return drawTiles(scene);

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

function drawTiles(scene: Phaser.Scene) {
  const layer = scene.add.container(0, 0);
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const wall = isWall({ x, y });
      const img = scene.add
        .image(x * CELL + CELL / 2, y * CELL + CELL / 2, wall ? TILE_TEXTURES.wall : TILE_TEXTURES.floor)
        .setDisplaySize(CELL, CELL);
      if (!wall) {
        // Tekrar desenini kırmak için konuma bağlı ayna; dama hissi için hafif ton farkı
        img.setFlip((x * 7 + y * 3) % 2 === 0, (x + y * 5) % 3 === 0);
        if ((x + y) % 2) img.setTint(0xe4e4e4);
      } else {
        img.setTint(0xb8b4c4);
      }
      layer.add(img);
    }
  }
  return layer;
}
