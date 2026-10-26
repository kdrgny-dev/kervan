import type Phaser from 'phaser';
import { RASTER } from './resolution';
import type { EnemyKind } from '../data/enemies';
import { HEROES, type HeroKind } from '../data/heroes';
import type { PowerKind } from '../data/loot';
import type { CampaignId } from '../data/campaigns';
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
function boss(name: string, size = 128): SpriteSet {
  return {
    idle: add(`${name}.idle`, `${C}/${name}_idle_1.svg`, size),
    idleLoop: frames(name, 'idle', 2, size),
    walkMs: 400,
    hurt: add(`${name}.hurt`, `${C}/${name}_hurt_1.svg`, size),
    special: { summon: frames(name, 'summon', 2, size), charge: frames(name, 'charge', 2, size) },
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
  fatih: unit('fatih', 'walk'),
  hannibal: unit('hannibal', 'walk'),
  elephant: unit('elephant', 'walk'),
};

/** Kafilede bir boy büyük görünenler. */
const HERO_SCALE: Partial<Record<HeroKind, number>> = { hannibal: 1.15, elephant: 1.25 };

/** Kahramanın çizimi; yoksa ödünç alınan çizim, rengi ve boy çarpanı. */
export function heroLook(kind: HeroKind): { sprite?: SpriteSet; tint?: number; scale: number } {
  const look = HEROES[kind].look;
  if (HERO_SPRITES[kind] || !look) return { sprite: HERO_SPRITES[kind], scale: HERO_SCALE[kind] ?? 1 };
  return { sprite: HERO_SPRITES[look.as], tint: look.tint, scale: look.scale ?? 1 };
}

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
  mazgal: unit('mazgal', 'move', 4, 110),
  chainSerpent: unit('chain_serpent', 'move', 4, 130),
  fogWisp: unit('fog_wisp', 'move', 4, 120),
  catapultGolem: unit('catapult_golem', 'move', 4),
  stoneSentinel: boss('stone_sentinel'),
  harborKraken: boss('harbor_kraken'),
  oilGiant: boss('oil_giant'),
  wallWarden: boss('wall_warden', 160),
  sandCrab: unit('sand_crab', 'move', 4, 110),
  gull: unit('gull', 'move', 4, 80),
  goat: unit('goat', 'move', 4, 100),
  snowball: unit('snowball', 'move', 4, 120),
  yeti: unit('yeti', 'move', 4),
  tideCrab: boss('tide_crab'),
  caveBear: boss('cave_bear'),
  stormEagle: boss('storm_eagle'),
  avalancheGiant: boss('avalanche_giant', 160),
};

export interface TileSet {
  floors: string[];
  wallTop: string;
  wallSide: string;
  wallCorner: string;
  decor: string[];
}

function tileSet(region: RegionId): TileSet {
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
  hisar: tileSet('hisar'),
  halic: tileSet('halic'),
  galata: tileSet('galata'),
  surlar: tileSet('surlar'),
  iber: tileSet('iber'),
  pirene: tileSet('pirene'),
  zirve: tileSet('zirve'),
  po: tileSet('po'),
} satisfies Record<RegionId, TileSet>;

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

/** Destan anlarını kendi ağzından anlatan Dede Hüsnü (1453). */
export const DEDE_ART = {
  normal: add('dede.normal', 'ui/narrator/dede_husnu_portrait_normal.svg', 256),
  laugh: add('dede.laugh', 'ui/narrator/dede_husnu_portrait_laugh.svg', 256),
  surprised: add('dede.surprised', 'ui/narrator/dede_husnu_portrait_surprised.svg', 256),
} satisfies Record<Mood, string>;

/** Alpler anlarını anlatan Ata Hüsnü (MÖ 218). */
export const ATA_ART = {
  normal: add('ata.normal', 'ui/narrator/ata_husnu_portrait_normal.svg', 256),
  laugh: add('ata.laugh', 'ui/narrator/ata_husnu_portrait_laugh.svg', 256),
  surprised: add('ata.surprised', 'ui/narrator/ata_husnu_portrait_surprised.svg', 256),
} satisfies Record<Mood, string>;

export const CAMPAIGN_ART = {
  covers: {
    road: add('campaign.road', 'ui/campaign/campaign_cover_road.svg', 480, 270),
    fetih: add('campaign.fetih', 'ui/campaign/campaign_cover_fetih.svg', 480, 270),
    alpler: add('campaign.alpler', 'ui/campaign/campaign_cover_alpler.svg', 480, 270),
  } satisfies Record<CampaignId, string>,
  locked: add('campaign.locked', 'ui/campaign/campaign_cover_locked.svg', 480, 270),
  ship: add('campaign.ship', 'ui/campaign/ship_icon.svg', 64),
  elephant: add('campaign.elephant', 'ui/campaign/elephant_icon.svg', 64),
};

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

const ART_REGION: Record<RegionId, string> = {
  vale: 'valley', bones: 'bones', ash: 'ash', frost: 'frost', hisar: 'hisar', halic: 'halic', galata: 'galata', surlar: 'surlar',
  iber: 'iber', pirene: 'pirene', zirve: 'zirve', po: 'po',
};

export const MAP = {
  route: add('map.route', 'ui/map/route_map.svg', 1100, 420),
  icons: Object.fromEntries(
    (Object.keys(ART_REGION) as RegionId[]).map((r) => [r, add(`map.icon.${r}`, `ui/map/region_icon_${ART_REGION[r]}.svg`, 96)]),
  ) as Record<RegionId, string>,
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
  hisar: { key: add('banner.hisar', 'ui/components/ui_banner_region_hisar.svg', 640, 128), text: '#14121c' },
  halic: { key: add('banner.halic', 'ui/components/ui_banner_region_halic.svg', 640, 128), text: '#f4efe6' },
  galata: { key: add('banner.galata', 'ui/components/ui_banner_region_galata.svg', 640, 128), text: '#14121c' },
  surlar: { key: add('banner.surlar', 'ui/components/ui_banner_region_surlar.svg', 640, 128), text: '#f4efe6' },
  iber: { key: add('banner.iber', 'ui/components/ui_banner_region_iber.svg', 640, 128), text: '#14121c' },
  pirene: { key: add('banner.pirene', 'ui/components/ui_banner_region_pirene.svg', 640, 128), text: '#f4efe6' },
  zirve: { key: add('banner.zirve', 'ui/components/ui_banner_region_zirve.svg', 640, 128), text: '#14121c' },
  po: { key: add('banner.po', 'ui/components/ui_banner_region_po.svg', 640, 128), text: '#14121c' },
} satisfies Record<RegionId, { key: string; text: string }>;

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
  cannonball: add('fx.cannonball', 'fx/cannonball.svg', 24),
  snowball: add('fx.snowball', 'fx/snowball_shot.svg', 24),
  cannonBlast: anim('fx.cannonBlast', seq('fx', 'cannon_blast', 4, 96), 80, 0),
  slash: anim('fx.slash', seq('fx', 'fx_slash', 3, 48), 60, 0),
  explosion: anim('fx.explosion', seq('fx', 'fx_explosion', 4, 96), 80, 0),
  spawnMarker: anim('fx.spawnMarker', seq('fx', 'fx_spawn_marker', 2, 48), 250),
  shockwave: add('fx.shockwave', 'fx/fx_shockwave.svg', 192),
  levelUp: add('fx.levelUp', 'fx/fx_level_up.svg', 96),
};

/** SVG'leri 2x çözünürlükte rasterleştirir; ekranda küçültülerek keskin kalır. */
export function preloadSprites(scene: Phaser.Scene) {
  for (const [key, { file, w, h }] of Object.entries(FILES)) {
    scene.load.svg(key, file, { width: w * RASTER, height: h * RASTER });
  }
}

export function createAnims(scene: Phaser.Scene) {
  for (const [key, { frames, ms, repeat }] of Object.entries(ANIMS)) {
    if (scene.anims.exists(key) || !frames.every((f) => scene.textures.exists(f))) continue;
    scene.anims.create({ key, frames: frames.map((f) => ({ key: f })), frameRate: 1000 / ms, repeat });
  }
}
