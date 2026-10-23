import Phaser from 'phaser';
import { CELL, GRID_H, GRID_W } from '../config';
import { SPAWN_WARN_MS } from '../data/balance';
import { ENEMIES } from '../data/enemies';
import { HEROES } from '../data/heroes';
import { bindControls } from '../input/controls';
import { UnitView } from '../render/UnitView';
import { isWall, type Vec } from '../sim/grid';
import {
  createWorld,
  enemyAlpha,
  type GameOverReason,
  type Projectile,
  stepWorld,
  tickAlpha,
  turn,
  type World,
  type WorldEvent,
} from '../sim/world';

const COLORS = {
  floorA: 0x2b3a2e,
  floorB: 0x2f4032,
  wall: 0x4a3f36,
  wallTop: 0x5e5145,
  leader: 0xfff3c4,
  enemyOutline: 0x7a1414,
  text: '#f4efe6',
};

const FONT = 'system-ui, sans-serif';
const PROJECTILE_COLORS: Record<Projectile['kind'], number> = {
  arrow: 0xe8e0c8,
  fireball: 0xff8a2b,
  holy: 0xfff07a,
  bone: 0xd9d4c5,
};

const px = (v: number) => v * CELL + CELL / 2;
const lerp = (a: Vec, b: Vec, t: number): Vec => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

export class GameScene extends Phaser.Scene {
  private world!: World;
  private heroViews = new Map<number, UnitView>();
  private enemyViews = new Map<number, UnitView>();
  private projectileViews = new Map<number, Phaser.GameObjects.Shape>();
  private pickupView!: Phaser.GameObjects.Container;
  private markers!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Container;

  constructor() {
    super('game');
  }

  create() {
    this.drawArena();
    this.markers = this.add.graphics().setDepth(2);
    this.pickupView = this.add.container(0, 0).setDepth(5);
    this.hud = this.add.text(16, 10, '', { fontFamily: FONT, fontSize: '22px', color: COLORS.text }).setDepth(40);
    this.banner = this.add
      .text(this.scale.width / 2, 120, '', { fontFamily: FONT, fontSize: '44px', color: COLORS.text, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(40)
      .setStroke('#14121c', 6)
      .setAlpha(0);
    this.overlay = this.buildOverlay();

    bindControls(this, {
      onDir: (d) => turn(this.world, d),
      onConfirm: () => {
        if (!this.world.alive) this.restart();
      },
    });

    this.restart();
  }

  update(_time: number, delta: number) {
    // Sekme arka plana düşünce dev bir delta gelmesin
    for (const e of stepWorld(this.world, Math.min(delta, 100))) this.handle(e);
    this.renderParty();
    this.renderEnemies();
    this.renderProjectiles();
    this.renderPickup();
    this.renderMarkers();
    this.renderHud();
  }

  private restart() {
    for (const v of [...this.heroViews.values(), ...this.enemyViews.values(), ...this.projectileViews.values()]) v.destroy();
    this.heroViews.clear();
    this.enemyViews.clear();
    this.projectileViews.clear();
    this.world = createWorld();
    this.overlay.setVisible(false);
    this.refreshPickup();
    this.showBanner('Hazırlan!');
  }

  private handle(e: WorldEvent) {
    switch (e.type) {
      case 'recruited':
      case 'pickupSpawned':
        this.refreshPickup();
        break;
      case 'heroHit':
        this.heroViews.get(e.id)?.flash(0xff5a4a);
        this.floatText(this.heroViews.get(e.id), `-${e.dmg}`, '#ff7a6a');
        break;
      case 'heroHealed':
        this.heroViews.get(e.id)?.flash(0x9cff9c, 120);
        break;
      case 'heroDied':
        this.killView(this.heroViews, e.id);
        this.cameras.main.shake(120, 0.006);
        break;
      case 'enemyHit':
        this.enemyViews.get(e.id)?.flash();
        this.floatText(this.enemyViews.get(e.id), `${e.dmg}`, '#ffffff');
        break;
      case 'enemyDied':
        this.killView(this.enemyViews, e.id);
        this.burst(px(e.pos.x), px(e.pos.y), 0xf4efe6);
        break;
      case 'slash':
        this.slash(e.pos);
        break;
      case 'explosion':
        this.explosion(e.x, e.y, e.radius);
        break;
      case 'bump':
        this.cameras.main.shake(90, 0.004);
        break;
      case 'waveStart':
        this.showBanner(`Dalga ${e.n}`);
        break;
      case 'waveCleared':
        this.showBanner('Dalga temizlendi!');
        break;
      case 'gameOver':
        this.showGameOver(e.reason);
        break;
    }
  }

  private drawArena() {
    const g = this.add.graphics();
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (isWall({ x, y })) {
          g.fillStyle(COLORS.wall).fillRect(x * CELL, y * CELL, CELL, CELL);
          g.fillStyle(COLORS.wallTop).fillRect(x * CELL + 3, y * CELL + 3, CELL - 6, CELL - 12);
        } else {
          g.fillStyle((x + y) % 2 ? COLORS.floorA : COLORS.floorB).fillRect(x * CELL, y * CELL, CELL, CELL);
        }
      }
    }
  }

  private renderParty() {
    const w = this.world;
    const alpha = tickAlpha(w);
    const t = this.time.now;
    w.party.forEach((hero, i) => {
      let view = this.heroViews.get(hero.id);
      if (!view) {
        const def = HEROES[hero.kind];
        view = new UnitView(this, { color: def.color, glyph: def.glyph, size: CELL - 10, shape: 'square' }).setDepth(10);
        this.heroViews.set(hero.id, view);
        this.tweens.add({ targets: view, scale: { from: 1.4, to: 1 }, duration: 220, ease: 'Back.Out' });
      }
      const p = lerp(hero.prev, hero.pos, alpha);
      // Yürüme zıplaması; her kahraman biraz faz kaydırılmış
      const bob = w.alive ? Math.abs(Math.sin(t / 90 + i * 0.7)) * -4 : 0;
      view.setPosition(px(p.x), px(p.y) + bob);
      view.setDepth(i === 0 ? 11 : 10);
      view.setOutline(i === 0 ? 4 : 3, i === 0 ? COLORS.leader : 0x14121c);
      view.setAlpha(i === 0 && w.bumpInvuln > 0 && Math.floor(t / 60) % 2 ? 0.5 : 1);
      view.setHp(hero.hp / hero.maxHp);
    });
  }

  private renderEnemies() {
    const w = this.world;
    for (const enemy of w.enemies) {
      let view = this.enemyViews.get(enemy.id);
      if (!view) {
        const def = ENEMIES[enemy.kind];
        view = new UnitView(this, {
          color: def.color,
          glyph: def.glyph,
          size: CELL - 12,
          shape: 'circle',
          outline: COLORS.enemyOutline,
        }).setDepth(9);
        this.enemyViews.set(enemy.id, view);
        this.tweens.add({ targets: view, scale: { from: 0, to: 1 }, duration: 200, ease: 'Back.Out' });
      }
      const p = lerp(enemy.prev, enemy.pos, enemyAlpha(w, enemy));
      view.setPosition(px(p.x), px(p.y));
      view.setHp(enemy.hp / enemy.maxHp);
    }
  }

  private renderProjectiles() {
    const live = new Set<number>();
    for (const p of this.world.projectiles) {
      live.add(p.id);
      let view = this.projectileViews.get(p.id);
      if (!view) {
        const color = PROJECTILE_COLORS[p.kind];
        view =
          p.kind === 'arrow' || p.kind === 'bone'
            ? this.add.rectangle(0, 0, 18, 4, color)
            : this.add.circle(0, 0, p.kind === 'fireball' ? 8 : 5, color);
        view.setDepth(15);
        this.projectileViews.set(p.id, view);
      }
      view.setPosition(px(p.x), px(p.y));
      view.setRotation(Math.atan2(p.ty - p.y, p.tx - p.x));
    }
    for (const [id, view] of this.projectileViews) {
      if (!live.has(id)) {
        view.destroy();
        this.projectileViews.delete(id);
      }
    }
  }

  private renderMarkers() {
    const g = this.markers.clear();
    const w = this.world;
    if (w.wave.phase !== 'active') return;
    const pulse = 0.5 + Math.sin(this.time.now / 80) * 0.3;
    for (const s of w.wave.pending) {
      if (s.at - w.time > SPAWN_WARN_MS) continue;
      const x = px(s.pos.x);
      const y = px(s.pos.y);
      const r = CELL * 0.3;
      g.lineStyle(4, 0xe5533d, pulse);
      g.lineBetween(x - r, y - r, x + r, y + r);
      g.lineBetween(x - r, y + r, x + r, y - r);
    }
  }

  private refreshPickup() {
    this.pickupView.removeAll(true);
    const pk = this.world.pickup;
    if (!pk) return;
    const def = HEROES[pk.kind];
    const ring = this.add.circle(0, 0, CELL * 0.42, COLORS.leader, 0.25);
    const token = new UnitView(this, { color: def.color, glyph: def.glyph, size: CELL - 20, shape: 'square' });
    this.pickupView.add([ring, token]);
  }

  private renderPickup() {
    const pk = this.world.pickup;
    this.pickupView.setVisible(!!pk);
    if (!pk) return;
    const float = Math.sin(this.time.now / 250) * 3;
    this.pickupView.setPosition(px(pk.pos.x), px(pk.pos.y) + float);
  }

  private renderHud() {
    const w = this.world;
    const foes = w.enemies.length + w.wave.pending.length;
    const parts = [`Dalga ${Math.max(w.wave.n, 1)}`, `Kafile ${w.party.length}`];
    if (w.wave.phase === 'active') parts.push(`Düşman ${foes}`);
    else parts.push(`Sonraki dalga ${Math.ceil(w.wave.timer / 1000)}`);
    this.hud.setText(parts.join('    '));
  }

  private killView(map: Map<number, UnitView>, id: number) {
    const view = map.get(id);
    if (!view) return;
    map.delete(id);
    this.tweens.add({ targets: view, scale: 0, alpha: 0, duration: 180, onComplete: () => view.destroy() });
  }

  private floatText(anchor: UnitView | undefined, text: string, color: string) {
    if (!anchor) return;
    const t = this.add
      .text(anchor.x + Phaser.Math.Between(-8, 8), anchor.y - 20, text, { fontFamily: FONT, fontSize: '18px', color, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setStroke('#14121c', 4)
      .setDepth(30);
    this.tweens.add({ targets: t, y: t.y - 26, alpha: 0, duration: 550, onComplete: () => t.destroy() });
  }

  private slash(pos: Vec) {
    const line = this.add.rectangle(px(pos.x), px(pos.y), CELL * 0.9, 5, 0xffffff).setRotation(-0.8).setDepth(16);
    this.tweens.add({ targets: line, alpha: 0, scaleX: 1.3, duration: 140, onComplete: () => line.destroy() });
  }

  private explosion(x: number, y: number, radius: number) {
    const ring = this.add.circle(px(x), px(y), CELL * (radius + 0.5), 0xff8a2b, 0.45).setDepth(14);
    this.tweens.add({ targets: ring, alpha: 0, scale: { from: 0.4, to: 1 }, duration: 260, onComplete: () => ring.destroy() });
  }

  private burst(x: number, y: number, color: number) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const dot = this.add.circle(x, y, 4, color).setDepth(14);
      this.tweens.add({
        targets: dot,
        x: x + Math.cos(a) * 26,
        y: y + Math.sin(a) * 26,
        alpha: 0,
        duration: 300,
        onComplete: () => dot.destroy(),
      });
    }
  }

  private showBanner(text: string) {
    this.tweens.killTweensOf(this.banner);
    this.banner.setText(text).setAlpha(0).setScale(0.8);
    this.tweens.add({ targets: this.banner, alpha: 1, scale: 1, duration: 200, ease: 'Back.Out', yoyo: true, hold: 900 });
  }

  private buildOverlay() {
    const { width, height } = this.scale;
    const shade = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);
    const title = this.add
      .text(width / 2, height / 2 - 40, '', { fontFamily: FONT, fontSize: '48px', color: COLORS.text, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setName('title');
    const stats = this.add
      .text(width / 2, height / 2 + 20, '', { fontFamily: FONT, fontSize: '26px', color: COLORS.text })
      .setOrigin(0.5)
      .setName('stats');
    const hint = this.add
      .text(width / 2, height / 2 + 70, 'Tekrar: Boşluk / R / dokun', { fontFamily: FONT, fontSize: '20px', color: '#bdb6a8' })
      .setOrigin(0.5);
    return this.add.container(0, 0, [shade, title, stats, hint]).setDepth(50).setVisible(false);
  }

  private showGameOver(reason: GameOverReason) {
    this.cameras.main.shake(180, 0.008);
    const why = { wall: 'Duvara çarptın', self: 'Kendi kuyruğuna çarptın', wiped: 'Kafile düştü' }[reason];
    (this.overlay.getByName('title') as Phaser.GameObjects.Text).setText(why);
    (this.overlay.getByName('stats') as Phaser.GameObjects.Text).setText(
      `Ulaşılan dalga: ${Math.max(this.world.wave.n, 1)}`,
    );
    this.overlay.setVisible(true);
  }
}
