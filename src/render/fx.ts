import Phaser from 'phaser';

export const FX_TEXTURES = { dot: 'fx.dot', spark: 'fx.spark' };

export function makeFxTextures(scene: Phaser.Scene) {
  const g = scene.make.graphics({}, false);
  g.fillStyle(0xffffff).fillCircle(4, 4, 4).generateTexture(FX_TEXTURES.dot, 8, 8);
  g.clear().fillStyle(0xffffff).fillRect(0, 0, 3, 10).generateTexture(FX_TEXTURES.spark, 3, 10);
  g.destroy();
}

type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;

export class Fx {
  private readonly puffs: Emitter;
  private readonly sparks: Emitter;
  private readonly sparkles: Emitter;
  private readonly confettis: Emitter;
  private readonly dusts: Emitter;

  constructor(scene: Phaser.Scene) {
    const base = { emitting: false } as const;
    this.puffs = scene.add
      .particles(0, 0, FX_TEXTURES.dot, {
        ...base,
        speed: { min: 60, max: 200 },
        lifespan: { min: 250, max: 450 },
        scale: { start: 1.3, end: 0 },
        alpha: { start: 1, end: 0 },
      })
      .setDepth(14);
    this.sparks = scene.add
      .particles(0, 0, FX_TEXTURES.spark, {
        ...base,
        speed: { min: 140, max: 280 },
        lifespan: 170,
        rotate: { min: 0, max: 360 },
        scale: { start: 1, end: 0.2 },
        tint: 0xfff3c4,
      })
      .setDepth(16);
    this.sparkles = scene.add
      .particles(0, 0, FX_TEXTURES.dot, {
        ...base,
        speedX: { min: -40, max: 40 },
        speedY: { min: -130, max: -40 },
        lifespan: 500,
        scale: { start: 0.8, end: 0 },
      })
      .setDepth(17);
    this.confettis = scene.add
      .particles(0, 0, FX_TEXTURES.spark, {
        ...base,
        speed: { min: 180, max: 380 },
        angle: { min: 210, max: 330 },
        gravityY: 600,
        rotate: { min: 0, max: 360 },
        lifespan: 1000,
        tint: [0xf0c23b, 0x5ef0e0, 0xe5533d, 0x9cff9c, 0xc77dff],
      })
      .setDepth(35);
    this.dusts = scene.add
      .particles(0, 0, FX_TEXTURES.dot, {
        ...base,
        speed: { min: 8, max: 30 },
        lifespan: 380,
        scale: { start: 0.9, end: 0 },
        alpha: { start: 0.35, end: 0 },
        tint: 0xbfae8a,
      })
      .setDepth(3);
  }

  puff(x: number, y: number, color: number, count = 12) {
    this.puffs.setParticleTint(color);
    this.puffs.explode(count, x, y);
  }

  spark(x: number, y: number, count = 4) {
    this.sparks.explode(count, x, y);
  }

  sparkle(x: number, y: number, color: number, count = 6) {
    this.sparkles.setParticleTint(color);
    this.sparkles.explode(count, x, y);
  }

  confetti(x: number, y: number, count = 40) {
    this.confettis.explode(count, x, y);
  }

  dust(x: number, y: number) {
    this.dusts.explode(2, x, y);
  }
}
