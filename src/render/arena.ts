import type Phaser from 'phaser';
import { CELL, GRID_H, GRID_W } from '../config';
import { isWall } from '../sim/grid';
import type { RegionId } from '../data/regions';
import { REGION_TILES, type TileSet } from './sprites';

export const ARENA = {
  floorA: 0x2b3a2e,
  floorB: 0x2f4032,
  wall: 0x4a3f36,
  wallTop: 0x5e5145,
};

const DECOR_COUNT = 18;

/** Duvarlar karakterlerin önüne geçmesin diye bir ton koyu. */
const WALL_SHADE = 0xc4c0d0;

/** Konumdan sabit sayı; her açılışta aynı harita düzeni için. */
const hash = (x: number, y: number) => (Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0;

export function drawArena(scene: Phaser.Scene, region: RegionId = 'vale') {
  const t = REGION_TILES[region];
  const keys = [...t.floors, t.wallTop, t.wallSide, t.wallCorner];
  if (keys.every((k) => scene.textures.exists(k))) return drawTiles(scene, region);

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

function wallTile(t: TileSet, x: number, y: number): { key: string; angle: number } {
  const right = GRID_W - 1;
  const bottom = GRID_H - 1;
  if (x === 0 && y === 0) return { key: t.wallCorner, angle: 0 };
  if (x === right && y === 0) return { key: t.wallCorner, angle: 90 };
  if (x === right && y === bottom) return { key: t.wallCorner, angle: 180 };
  if (x === 0 && y === bottom) return { key: t.wallCorner, angle: 270 };
  if (y === 0) return { key: t.wallTop, angle: 0 };
  if (y === bottom) return { key: t.wallSide, angle: 180 };
  return { key: t.wallSide, angle: x === 0 ? 0 : 180 };
}

function drawTiles(scene: Phaser.Scene, region: RegionId) {
  const t = REGION_TILES[region];
  const layer = scene.add.container(0, 0);
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const cx = x * CELL + CELL / 2;
      const cy = y * CELL + CELL / 2;
      if (isWall({ x, y })) {
        const { key, angle } = wallTile(t, x, y);
        layer.add(scene.add.image(cx, cy, key).setDisplaySize(CELL, CELL).setAngle(angle).setTint(WALL_SHADE));
        continue;
      }
      const h = hash(x, y);
      const img = scene.add.image(cx, cy, t.floors[h % t.floors.length]).setDisplaySize(CELL, CELL);
      img.setFlip(((h >> 3) & 1) === 1, ((h >> 5) & 1) === 1);
      // Dama hissi için hafif ton farkı
      if ((x + y) % 2) img.setTint(0xe6e6e6);
      layer.add(img);
    }
  }

  if (t.decor.every((k) => scene.textures.exists(k))) {
    for (let i = 0; i < DECOR_COUNT; i++) {
      const h = hash(i * 31 + 7, i * 17 + 3);
      const x = 1 + (h % (GRID_W - 2));
      const y = 1 + ((h >> 8) % (GRID_H - 2));
      const d = scene.add
        .image(x * CELL + CELL / 2, y * CELL + CELL / 2, t.decor[(h >> 16) % t.decor.length])
        .setDisplaySize(CELL * 0.7, CELL * 0.7)
        .setAlpha(0.85)
        .setFlipX(((h >> 20) & 1) === 1);
      layer.add(d);
    }
  }
  return layer;
}
