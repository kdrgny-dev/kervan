import type Phaser from 'phaser';
import type { EnemyKind } from '../data/enemies';
import type { HeroKind } from '../data/heroes';
import type { PowerKind } from '../data/loot';

export interface SpriteSet {
  idle: string;
  /** Dururken döngüde oynayan kareler (ör. boss nefesi). */
  idleLoop?: string[];
  walk?: string[];
  walkMs?: number;
  attack?: string[];
  hurt?: string;
  /** Olayla tetiklenen özel hareketler (ör. boss çağırma, şişme). */
  special?: Record<string, string[]>;
}

/** Doku anahtarı → public/assets altındaki dosya ve doğal boyutu (px). */
const FILES: Record<string, { file: string; w: number; h: number }> = {};
/** Phaser animasyonları: anahtar → kareler ve kare süresi. */
const ANIMS: Record<string, { frames: string[]; ms: number; repeat: number }> = {};

function add(key: string, file: string, w: number, h = w) {
  FILES[key] = { file: `assets/${file}`, w, h };
  return key;
}

/** `dir/name_1.svg … name_n.svg` dizisini kaydeder; anahtarlar `name.1 …`. */
function seq(dir: string, name: string, n: number, w: number, h = w) {
  return Array.from({ length: n }, (_, i) => add(`${name}.${i + 1}`, `${dir}/${name}_${i + 1}.svg`, w, h));
}

function anim(key: string, frames: string[], ms: number, repeat = -1) {
  ANIMS[key] = { frames, ms, repeat };
  return key;
}

// ---------- karakterler ----------

const C = 'characters';
const idle = (name: string, size = 96) => add(`${name}.idle`, `${C}/${name}_idle_1.svg`, size);
const frames = (name: string, move: string, n: number, size = 96) => seq(C, `${name}_${move}`, n, size);

function unit(name: string, move: 'walk' | 'move', moveFrames = 4, walkMs?: number): SpriteSet {
  return {
    idle: idle(name),
    walk: frames(name, move, moveFrames),
    walkMs,
    attack: frames(name, 'attack', 2),
    hurt: add(`${name}.hurt`, `${C}/${name}_hurt_1.svg`, 96),
  };
}

export const HERO_SPRITES: Partial<Record<HeroKind, SpriteSet>> = {
  knight: unit('knight', 'walk'),
  archer: unit('archer', 'walk'),
  mage: unit('mage', 'walk'),
  priest: unit('priest', 'walk'),
  rogue: unit('rogue', 'walk'),
};

export const ENEMY_SPRITES: Partial<Record<EnemyKind, SpriteSet>> = {
  slime: unit('slime', 'move', 3, 150),
  bat: unit('bat', 'move', 4, 80),
  skeleton: unit('skeleton', 'move', 4),
  goblin: unit('goblin', 'move', 4, 90),
  slimeKing: {
    idle: add('slime_king.idle', `${C}/slime_king_idle_1.svg`, 128),
    idleLoop: frames('slime_king', 'idle', 2, 128),
    walkMs: 400,
    hurt: add('slime_king.hurt', `${C}/slime_king_hurt_1.svg`, 128),
    special: {
      summon: frames('slime_king', 'summon', 2, 128),
      charge: frames('slime_king', 'charge', 2, 128),
    },
  },
};

// ---------- dünya ----------

export const TILES = {
  floors: [1, 2, 3].map((i) => add(`tile.floor${i}`, `tiles/tile_floor_${i}.svg`, 96)),
  wallTop: add('tile.wall', 'tiles/tile_wall.svg', 96),
  wallSide: add('tile.wallSide', 'tiles/tile_wall_side.svg', 96),
  wallCorner: add('tile.wallCorner', 'tiles/tile_wall_corner.svg', 96),
};

export const DECOR = [1, 2, 3, 4, 5, 6].map((i) => add(`decor.${i}`, `decor/decor_${i}.svg`, 48));

// ---------- ganimet ----------

export const LOOT = {
  coin: anim('coin', seq('loot', 'coin', 4, 48), 100),
  coinBig: add('coin.big', 'loot/coin_big.svg', 48),
  gem: anim('gem', seq('loot', 'gem', 3, 48), 150),
  heroToken: add('hero.token', 'loot/hero_token.svg', 48),
};

export const POWER_ICONS: Record<PowerKind, string> = {
  rage: add('power.rage', 'loot/power_rage.svg', 48),
  shield: add('power.shield', 'loot/power_shield.svg', 48),
  speed: add('power.speed', 'loot/power_speed.svg', 48),
  magnet: add('power.magnet', 'loot/power_magnet.svg', 48),
  bomb: add('power.bomb', 'loot/power_bomb.svg', 48),
};

// ---------- efektler ----------

export const FX = {
  arrow: add('fx.arrow', 'fx/fx_arrow.svg', 48, 16),
  bone: add('fx.bone', 'fx/fx_bone_arrow.svg', 48, 16),
  holy: add('fx.holy', 'fx/fx_holy.svg', 48),
  fireball: anim('fx.fireball', seq('fx', 'fx_fireball', 3, 48), 90),
  slash: anim('fx.slash', seq('fx', 'fx_slash', 3, 48), 60, 0),
  explosion: anim('fx.explosion', seq('fx', 'fx_explosion', 4, 96), 80, 0),
  spawnMarker: anim('fx.spawnMarker', seq('fx', 'fx_spawn_marker', 2, 48), 250),
  shockwave: add('fx.shockwave', 'fx/fx_shockwave.svg', 192),
  levelUp: add('fx.levelUp', 'fx/fx_level_up.svg', 96),
};

/** SVG'leri 2x çözünürlükte rasterleştirir; ekranda küçültülerek keskin kalır. */
export function preloadSprites(scene: Phaser.Scene) {
  for (const [key, { file, w, h }] of Object.entries(FILES)) {
    scene.load.svg(key, file, { width: w * 2, height: h * 2 });
  }
}

export function createAnims(scene: Phaser.Scene) {
  for (const [key, { frames, ms, repeat }] of Object.entries(ANIMS)) {
    if (scene.anims.exists(key) || !frames.every((f) => scene.textures.exists(f))) continue;
    scene.anims.create({ key, frames: frames.map((f) => ({ key: f })), frameRate: 1000 / ms, repeat });
  }
}
