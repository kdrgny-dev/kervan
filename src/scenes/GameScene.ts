import Phaser from 'phaser';
import { CELL, GRID_H, GRID_W } from '../config';
import { SPAWN_WARN_MS } from '../data/balance';
import { ENEMIES } from '../data/enemies';
import { HEROES } from '../data/heroes';
import { LOOT_BLINK_MS, POWERS, type PowerKind, score, xpToNext } from '../data/loot';
import { bindControls } from '../input/controls';
import { UnitView } from '../render/UnitView';
import { isWall, type Vec } from '../sim/grid';
import {
  createWorld,
  enemyAlpha,
  type GameOverReason,
  type Loot,
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
  shield: 0x5ab8f0,
  gold: 0xf0c23b,
  gem: 0x5ef0e0,
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
  private lootViews = new Map<number, Phaser.GameObjects.Container>();
  private markers!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Text;
  private wallet!: Phaser.GameObjects.Text;
  private powerText!: Phaser.GameObjects.Text;
  private xpBar!: Phaser.GameObjects.Graphics;
  private banner!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Container;

  constructor() {
    super('game');
  }

  create() {
    this.drawArena();
    this.markers = this.add.graphics().setDepth(2);
    this.hud = this.add.text(16, 10, '', { fontFamily: FONT, fontSize: '22px', color: COLORS.text }).setDepth(40);
    this.wallet = this.add
      .text(this.scale.width - 16, 10, '', { fontFamily: FONT, fontSize: '22px', color: COLORS.text })
      .setOrigin(1, 0)
      .setDepth(40);
    this.powerText = this.add
      .text(this.scale.width / 2, this.scale.height - 12, '', { fontFamily: FONT, fontSize: '20px', color: COLORS.text, fontStyle: 'bold' })
      .setOrigin(0.5, 1)
      .setDepth(40)
      .setStroke('#14121c', 4);
    this.xpBar = this.add.graphics().setDepth(40);
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
    this.renderLoot();
    this.renderMarkers();
    this.renderHud();
  }

  private restart() {
    const views = [this.heroViews, this.enemyViews, this.projectileViews, this.lootViews];
    for (const map of views) {
      for (const v of map.values()) v.destroy();
      map.clear();
    }
    this.world = createWorld();
    this.overlay.setVisible(false);
    this.showBanner('Hazırlan!');
  }

  private handle(e: WorldEvent) {
    switch (e.type) {
      case 'lootCollected':
        this.collectFx(e.id, e.loot);
        break;
      case 'lootExpired':
        this.removeLoot(e.id, false);
        break;
      case 'powerStart':
        this.showBanner(POWERS[e.power].name + '!');
        break;
      case 'bomb':
        this.cameras.main.flash(180, 255, 240, 200);
        this.cameras.main.shake(220, 0.01);
        break;
      case 'levelUp':
        this.showBanner(`Seviye ${e.level + 1}!`);
        for (const v of this.heroViews.values()) v.flash(0xfff3c4, 160);
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
      const ring = w.powers.shield ? COLORS.shield : i === 0 ? COLORS.leader : 0x14121c;
      view.setOutline(i === 0 || w.powers.shield ? 4 : 3, ring);
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

  private makeLootView(loot: Loot) {
    const c = this.add.container(0, 0).setDepth(5);
    switch (loot.type) {
      case 'coin':
        c.add([this.add.circle(0, 0, 9, COLORS.gold).setStrokeStyle(3, 0x8a6a10), this.add.circle(-3, -3, 3, 0xfff3c4)]);
        break;
      case 'gem':
        c.add(this.add.rectangle(0, 0, 15, 15, COLORS.gem).setStrokeStyle(3, 0x1d6b66).setRotation(Math.PI / 4));
        break;
      case 'power': {
        const def = POWERS[loot.power];
        c.add([
          this.add.circle(0, 0, 15, def.color).setStrokeStyle(3, 0xf4efe6),
          this.add.text(0, 0, def.glyph, { fontFamily: FONT, fontSize: '16px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5),
        ]);
        break;
      }
      case 'hero': {
        const def = HEROES[loot.hero];
        c.add([
          this.add.circle(0, 0, CELL * 0.42, COLORS.leader, 0.25),
          new UnitView(this, { color: def.color, glyph: def.glyph, size: CELL - 20, shape: 'square' }),
        ]);
        break;
      }
    }
    this.tweens.add({ targets: c, scale: { from: 0, to: 1 }, duration: 180, ease: 'Back.Out' });
    return c;
  }

  private renderLoot() {
    const w = this.world;
    const t = this.time.now;
    for (const loot of w.loot) {
      let view = this.lootViews.get(loot.id);
      if (!view) {
        view = this.makeLootView(loot);
        this.lootViews.set(loot.id, view);
      }
      const float = Math.sin(t / 250 + loot.id) * 3;
      view.setPosition(px(loot.pos.x), px(loot.pos.y) + float);
      const blinking = loot.expiresAt - w.time < LOOT_BLINK_MS;
      view.setAlpha(blinking && Math.floor(t / 120) % 2 ? 0.3 : 1);
    }
  }

  private removeLoot(id: number, collected: boolean) {
    const view = this.lootViews.get(id);
    if (!view) return;
    this.lootViews.delete(id);
    this.tweens.killTweensOf(view);
    this.tweens.add({
      targets: view,
      y: collected ? view.y - 24 : view.y,
      scale: collected ? 1.4 : 0,
      alpha: 0,
      duration: collected ? 220 : 160,
      onComplete: () => view.destroy(),
    });
  }

  private collectFx(id: number, loot: Loot) {
    const view = this.lootViews.get(id);
    if (view && loot.type === 'coin') this.popText(view.x, view.y, `+${loot.value}`, '#f0c23b');
    if (view && loot.type === 'gem') this.popText(view.x, view.y, '+1 mücevher', '#5ef0e0');
    this.removeLoot(id, true);
  }

  private renderHud() {
    const w = this.world;
    const foes = w.enemies.length + w.wave.pending.length;
    const parts = [`Dalga ${Math.max(w.wave.n, 1)}`, `Kafile ${w.party.length}`];
    if (w.wave.phase === 'active') parts.push(`Düşman ${foes}`);
    else parts.push(`Sonraki dalga ${Math.ceil(w.wave.timer / 1000)}`);
    this.hud.setText(parts.join('    '));
    this.wallet.setText(`Altın ${w.stats.gold}    Mücevher ${w.stats.gems}    Seviye ${w.stats.level + 1}`);

    const active = (Object.keys(w.powers) as PowerKind[]).map((k) => `${POWERS[k].name} ${Math.ceil((w.powers[k] ?? 0) / 1000)}`);
    this.powerText.setText(active.join('   '));

    const barW = 220;
    const x = this.scale.width / 2 - barW / 2;
    const ratio = w.stats.xp / xpToNext(w.stats.level);
    this.xpBar.clear().fillStyle(0x000000, 0.5).fillRect(x, 16, barW, 8).fillStyle(0xfff3c4).fillRect(x, 16, barW * ratio, 8);
  }

  private killView(map: Map<number, UnitView>, id: number) {
    const view = map.get(id);
    if (!view) return;
    map.delete(id);
    this.tweens.add({ targets: view, scale: 0, alpha: 0, duration: 180, onComplete: () => view.destroy() });
  }

  private floatText(anchor: UnitView | undefined, text: string, color: string) {
    if (anchor) this.popText(anchor.x + Phaser.Math.Between(-8, 8), anchor.y - 20, text, color);
  }

  private popText(x: number, y: number, text: string, color: string) {
    const t = this.add
      .text(x, y, text, { fontFamily: FONT, fontSize: '18px', color, fontStyle: 'bold' })
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
    const { stats, wave } = this.world;
    const n = Math.max(wave.n, 1);
    (this.overlay.getByName('stats') as Phaser.GameObjects.Text).setText(
      `Dalga ${n}  ·  Öldürme ${stats.kills}  ·  Altın ${stats.gold}  ·  Skor ${score(n, stats.kills, stats.gold)}`,
    );
    this.overlay.setVisible(true);
  }
}
