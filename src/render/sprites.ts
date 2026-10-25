import type Phaser from 'phaser';
import type { EnemyKind } from '../data/enemies';
import type { HeroKind } from '../data/heroes';
import type { PowerKind } from '../data/loot';
import type { RegionId, RoadRegion } from '../data/regions';

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

/** Boss: 2 kare nefes, çağırma ve şok öncesi hazırlanma kareleri. */
function boss(name: string): SpriteSet {
  return {
    idle: add(`${name}.idle`, `${C}/${name}_idle_1.svg`, 128),
    idleLoop: frames(name, 'idle', 2, 128),
    walkMs: 400,
    hurt: add(`${name}.hurt`, `${C}/${name}_hurt_1.svg`, 128),
    special: { summon: frames(name, 'summon', 2, 128), charge: frames(name, 'charge', 2, 128) },
  };
}

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
HERO_SPRITES.fatih = HERO_SPRITES.knight;

/** Çizimi gelene kadar başka kahramanın sprite'ını kullananların rengi. */
export const HERO_TINT: Partial<Record<HeroKind, number>> = { fatih: 0xf0b070 };

export const ENEMY_SPRITES: Partial<Record<EnemyKind, SpriteSet>> = {
  slime: unit('slime', 'move', 3, 150),
  bat: unit('bat', 'move', 4, 80),
  skeleton: unit('skeleton', 'move', 4),
  goblin: unit('goblin', 'move', 4, 90),
  wraith: unit('wraith', 'move', 4, 120),
  magmaSlime: unit('magma_slime', 'move', 3, 150),
  frostSkeleton: unit('frost_skeleton', 'move', 4),
  slimeKing: boss('slime_king'),
  boneLord: boss('bone_lord'),
  emberKing: boss('ember_king'),
  frostGiant: boss('frost_giant'),
};

export interface TileSet {
  floors: string[];
  wallTop: string;
  wallSide: string;
  wallCorner: string;
  decor: string[];
}

function tileSet(region: RoadRegion): TileSet {
  const dir = region === 'vale' ? 'tiles' : `tiles/${region}`;
  const decorDir = region === 'vale' ? 'decor' : `decor/${region}`;
  const p = region === 'vale' ? 'tile' : `tile.${region}`;
  return {
    floors: [1, 2, 3].map((i) => add(`${p}.floor${i}`, `${dir}/tile_floor_${i}.svg`, 96)),
    wallTop: add(`${p}.wall`, `${dir}/tile_wall.svg`, 96),
    wallSide: add(`${p}.wallSide`, `${dir}/tile_wall_side.svg`, 96),
    wallCorner: add(`${p}.wallCorner`, `${dir}/tile_wall_corner.svg`, 96),
    decor: (region === 'vale' ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4]).map((i) => add(`${p}.decor${i}`, `${decorDir}/decor_${i}.svg`, 48)),
  };
}

export const REGION_TILES = {
  vale: tileSet('vale'),
  bones: tileSet('bones'),
  ash: tileSet('ash'),
  frost: tileSet('frost'),
} as Record<RegionId, TileSet>;
// Fetih çizimleri gelene kadar en yakın setler
Object.assign(REGION_TILES, { hisar: REGION_TILES.bones, halic: REGION_TILES.frost, galata: REGION_TILES.vale, surlar: REGION_TILES.ash });

/** Eski çağrılar için Yeşil Vadi seti. */
export const TILES = REGION_TILES.vale;
export const DECOR = REGION_TILES.vale.decor;

// ---------- anlatıcı, kamp, harita ----------

export type Mood = 'normal' | 'laugh' | 'surprised';

export const NARRATOR_ART = {
  normal: add('husnu.normal', 'ui/narrator/husnu_portrait_normal.svg', 256),
  laugh: add('husnu.laugh', 'ui/narrator/husnu_portrait_laugh.svg', 256),
  surprised: add('husnu.surprised', 'ui/narrator/husnu_portrait_surprised.svg', 256),
  full: add('husnu.full', 'ui/narrator/husnu_full.svg', 256, 384),
} satisfies Record<Mood | 'full', string>;

export type Building = 'barracks' | 'temple' | 'market';

export const CAMP = {
  bg: add('camp.bg', 'ui/camp/camp_bg.svg', 1152, 720),
  buildings: Object.fromEntries(
    (['barracks', 'temple', 'market'] as Building[]).map((b) => [
      b,
      [1, 2, 3].map((i) => add(`camp.${b}${i}`, `ui/camp/building_${b}_${i}.svg`, 320, 280)),
    ]),
  ) as Record<Building, string[]>,
  campfire: anim('campfire', seq('ui/camp', 'campfire', 4, 96), 120),
};

/** camp_bg üzerindeki yerleşim (manifest _meta.camp_slots): sol üst köşe + boyut. */
export const CAMP_SLOTS: Record<Building | 'campfire', [number, number, number, number]> = {
  barracks: [40, 300, 320, 280],
  temple: [416, 282, 320, 280],
  market: [792, 300, 320, 280],
  campfire: [528, 590, 96, 96],
};

const ART_REGION: Record<RoadRegion, string> = { vale: 'valley', bones: 'bones', ash: 'ash', frost: 'frost' };

export const MAP = {
  route: add('map.route', 'ui/map/route_map.svg', 1100, 420),
  icons: Object.fromEntries(
    (Object.keys(ART_REGION) as RoadRegion[]).map((r) => [r, add(`map.icon.${r}`, `ui/map/region_icon_${ART_REGION[r]}.svg`, 96)]),
  ) as Record<RoadRegion, string>,
};

/** route_map üzerindeki düğüm merkezleri (manifest _meta.map_nodes). */
export const MAP_NODES: Record<RoadRegion | 'start' | 'horizon', [number, number]> = {
  start: [40, 300],
  vale: [300, 250],
  bones: [520, 180],
  ash: [760, 270],
  frost: [980, 170],
  horizon: [1088, 140],
};

export const REGION_BANNER = {
  vale: { key: add('banner.vale', 'ui/components/ui_banner_region_valley.svg', 640, 128), text: '#14121c' },
  bones: { key: add('banner.bones', 'ui/components/ui_banner_region_bones.svg', 640, 128), text: '#14121c' },
  ash: { key: add('banner.ash', 'ui/components/ui_banner_region_ash.svg', 640, 128), text: '#f4efe6' },
  frost: { key: add('banner.frost', 'ui/components/ui_banner_region_frost.svg', 640, 128), text: '#14121c' },
} as Record<RegionId, { key: string; text: string }>;
Object.assign(REGION_BANNER, { hisar: REGION_BANNER.bones, halic: REGION_BANNER.frost, galata: REGION_BANNER.vale, surlar: REGION_BANNER.ash });

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
