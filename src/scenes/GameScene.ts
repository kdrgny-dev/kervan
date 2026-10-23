import Phaser from 'phaser';
import { CELL } from '../config';
import { SPAWN_WARN_MS } from '../data/balance';
import { ENEMIES } from '../data/enemies';
import { HEROES, type HeroKind } from '../data/heroes';
import { LOOT_BLINK_MS, POWERS, type PowerKind, score, xpToNext } from '../data/loot';
import { audio } from '../audio/audio';
import { bindControls } from '../input/controls';
import { profile } from '../meta/profile';
import { applyRun, loadoutFrom } from '../meta/shop';
import { drawArena } from '../render/arena';
import { Fx } from '../render/fx';
import { ENEMY_SPRITES, HERO_SPRITES } from '../render/sprites';
import { UnitView } from '../render/UnitView';
import type { Vec } from '../sim/grid';
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
import { Button } from '../ui/Button';
import { FONT, textStyle, UI } from '../ui/theme';

const COLORS = {
  leader: 0xfff3c4,
  shield: 0x5ab8f0,
  enemyOutline: 0x7a1414,
  gold: 0xf0c23b,
  gem: 0x5ef0e0,
};

const PROJECTILE_COLORS: Record<Projectile['kind'], number> = {
  arrow: 0xe8e0c8,
  fireball: 0xff8a2b,
  holy: 0xfff07a,
  bone: 0xd9d4c5,
};

const MAX_DAMAGE_TEXTS = 24;

const px = (v: number) => v * CELL + CELL / 2;
const lerp = (a: Vec, b: Vec, t: number): Vec => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

export class GameScene extends Phaser.Scene {
  private hero: HeroKind = 'knight';
  private world!: World;
  private paused = false;
  private liveTexts = 0;
  private banked = false;
  private heroViews = new Map<number, UnitView>();
  private enemyViews = new Map<number, UnitView>();
  private projectileViews = new Map<number, Phaser.GameObjects.Shape>();
  private lootViews = new Map<number, Phaser.GameObjects.Container>();
  private markers!: Phaser.GameObjects.Graphics;
  private fx!: Fx;
  private hud!: Phaser.GameObjects.Text;
  private wallet!: Phaser.GameObjects.Text;
  private powerText!: Phaser.GameObjects.Text;
  private xpBar!: Phaser.GameObjects.Graphics;
  private bossBar!: Phaser.GameObjects.Container;
  private banner!: Phaser.GameObjects.Text;
  private pauseMenu!: Phaser.GameObjects.Container;
  private overlay!: Phaser.GameObjects.Container;

  constructor() {
    super('game');
  }

  init(data: { hero?: HeroKind }) {
    this.hero = data.hero ?? profile.data.lastHero;
  }

  create() {
    this.heroViews = new Map();
    this.enemyViews = new Map();
    this.projectileViews = new Map();
    this.lootViews = new Map();
    this.liveTexts = 0;

    drawArena(this);
    this.markers = this.add.graphics().setDepth(2);
    this.fx = new Fx(this);
    this.buildHud();
    this.overlay = this.add.container(0, 0).setDepth(60).setVisible(false);
    this.pauseMenu = this.buildPauseMenu();

    bindControls(this, {
      onDir: (d) => !this.paused && turn(this.world, d),
      onConfirm: () => {
        if (!this.world.alive) this.restart();
      },
      onPause: () => this.togglePause(),
    });

    this.restart();
  }

  update(_time: number, delta: number) {
    if (!this.paused) {
      // Sekme arka plana düşünce dev bir delta gelmesin
      for (const e of stepWorld(this.world, Math.min(delta, 100))) this.handle(e);
    }
    this.renderParty();
    this.renderEnemies();
    this.renderProjectiles();
    this.renderLoot();
    this.renderMarkers();
    this.renderHud();
  }

  private get settings() {
    return profile.data.settings;
  }

  private shake(ms: number, intensity: number) {
    if (this.settings.shake) this.cameras.main.shake(ms, intensity);
  }

  private restart() {
    for (const map of [this.heroViews, this.enemyViews, this.projectileViews, this.lootViews]) {
      for (const v of map.values()) v.destroy();
      map.clear();
    }
    this.world = createWorld({ loadout: loadoutFrom(profile.data, this.hero) });
    this.banked = false;
    this.paused = false;
    this.pauseMenu.setVisible(false);
    this.overlay.removeAll(true).setVisible(false);
    this.showBanner('Hazırlan!');
  }

  private handle(e: WorldEvent) {
    const now = this.time.now;
    switch (e.type) {
      case 'moved': {
        const leader = this.world.party[0];
        if (leader) this.fx.dust(px(leader.prev.x), px(leader.prev.y) + CELL * 0.35);
        break;
      }
      case 'heroAttack': {
        this.heroViews.get(e.id)?.playAttack(now);
        const kind = this.world.party.find((h) => h.id === e.id)?.kind;
        const sound = kind && ({ archer: 'arrow', mage: 'fireball', priest: 'holy' } as const)[kind as 'archer'];
        if (sound) audio.play(sound);
        break;
      }
      case 'heroHit': {
        const v = this.heroViews.get(e.id);
        v?.flash(0xff5a4a);
        v?.playHurt(now);
        this.damageText(v, `-${e.dmg}`, UI.danger);
        audio.play('heroHurt');
        break;
      }
      case 'heroHealed': {
        const v = this.heroViews.get(e.id);
        v?.flash(0x9cff9c, 140, 'tint');
        if (v) this.fx.sparkle(v.x, v.y, 0x9cff9c, 3);
        audio.play('heal');
        break;
      }
      case 'heroDied': {
        const v = this.heroViews.get(e.id);
        if (v) this.fx.puff(v.x, v.y, 0xe5533d, 16);
        this.killView(this.heroViews, e.id);
        this.shake(120, 0.006);
        this.cameras.main.flash(120, 120, 20, 20);
        audio.play('heroDie');
        break;
      }
      case 'recruited':
        audio.play('recruit');
        this.fx.sparkle(px(e.hero.pos.x), px(e.hero.pos.y), COLORS.leader, 10);
        break;
      case 'enemyHit': {
        const v = this.enemyViews.get(e.id);
        v?.flash();
        if (v) this.fx.spark(v.x, v.y, e.crit ? 8 : 3);
        this.damageText(v, e.crit ? `${e.dmg}!` : `${e.dmg}`, e.crit ? UI.gold : '#ffffff', e.crit ? 24 : 18);
        audio.play(e.crit ? 'crit' : 'hit');
        break;
      }
      case 'enemyDied': {
        const enemy = this.enemyViews.get(e.id);
        const color = ENEMIES[e.kind].color;
        const boss = !!ENEMIES[e.kind].boss;
        this.killView(this.enemyViews, e.id);
        this.fx.puff(enemy?.x ?? px(e.pos.x), enemy?.y ?? px(e.pos.y), color, boss ? 60 : 14);
        if (boss) {
          this.fx.confetti(px(e.pos.x), px(e.pos.y), 60);
          this.shake(300, 0.012);
          this.showBanner('Balçık Kralı yenildi!');
        }
        audio.play(boss ? 'explosion' : 'enemyDie');
        break;
      }
      case 'slash':
        this.slash(e.pos);
        audio.play('slash');
        break;
      case 'explosion':
        this.ring(px(e.x), px(e.y), CELL * (e.radius + 0.5), 0xff8a2b, 260);
        this.fx.puff(px(e.x), px(e.y), 0xff8a2b, 18);
        audio.play('explosion');
        break;
      case 'shockwaveWarn': {
        const v = this.enemyViews.get(e.id);
        if (v) this.ring(v.x, v.y, CELL * (e.radius + 0.5), 0xe5533d, 800, true);
        audio.play('shockWarn');
        break;
      }
      case 'shockwave':
        this.ring(px(e.pos.x), px(e.pos.y), CELL * (e.radius + 0.5), 0xc77dff, 320);
        this.fx.puff(px(e.pos.x), px(e.pos.y), 0xc77dff, 30);
        this.shake(260, 0.012);
        audio.play('shockwave');
        break;
      case 'bump':
        this.shake(90, 0.004);
        audio.play('bump');
        break;
      case 'lootCollected':
        this.collectFx(e.id, e.loot);
        if (e.loot.type === 'coin') audio.play('coin');
        if (e.loot.type === 'gem') audio.play('gem');
        break;
      case 'lootExpired':
        this.removeLoot(e.id, false);
        break;
      case 'powerStart':
        this.showBanner(POWERS[e.power].name + '!');
        audio.play('power');
        break;
      case 'bomb':
        this.cameras.main.flash(180, 255, 240, 200);
        this.shake(220, 0.01);
        audio.play('bomb');
        break;
      case 'levelUp': {
        this.showBanner(`Seviye ${e.level + 1}!`);
        for (const v of this.heroViews.values()) v.flash(0xfff3c4, 160, 'tint');
        const leader = this.heroViews.get(this.world.party[0]?.id ?? -1);
        if (leader) this.fx.confetti(leader.x, leader.y, 30);
        audio.play('levelUp');
        break;
      }
      case 'waveStart':
        this.showBanner(e.n % 5 === 0 ? `Dalga ${e.n} · Balçık Kralı!` : `Dalga ${e.n}`);
        audio.play('waveStart');
        break;
      case 'waveCleared':
        this.showBanner(`Dalga temizlendi! +${e.bonus} altın`);
        audio.play('waveCleared');
        break;
      case 'gameOver':
        this.showGameOver(e.reason);
        audio.play('gameOver');
        break;
    }
  }

  // ---------- birimler ----------

  private renderParty() {
    const w = this.world;
    const alpha = tickAlpha(w);
    const t = this.time.now;
    w.party.forEach((hero, i) => {
      let view = this.heroViews.get(hero.id);
      if (!view) {
        const def = HEROES[hero.kind];
        view = new UnitView(this, {
          color: def.color,
          glyph: def.glyph,
          size: CELL - 10,
          shape: 'square',
          sprite: HERO_SPRITES[hero.kind],
          spriteSize: CELL * 1.15,
        });
        this.heroViews.set(hero.id, view);
        this.tweens.add({ targets: view, scale: { from: 1.4, to: 1 }, duration: 220, ease: 'Back.Out' });
      }
      const p = lerp(hero.prev, hero.pos, alpha);
      const bob = w.alive && !this.paused ? Math.abs(Math.sin(t / 90 + i * 0.7)) * -4 : 0;
      view.setPosition(px(p.x), px(p.y) + bob);
      view.setDepth(10 + p.y * 0.01 + (i === 0 ? 0.005 : 0));
      view.face(hero.pos.x - hero.prev.x);
      view.animate(t, w.alive && !this.paused);
      view.setMarker(w.powers.shield ? COLORS.shield : i === 0 ? COLORS.leader : null);
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
        const boss = !!def.boss;
        view = new UnitView(this, {
          color: def.color,
          glyph: def.glyph,
          size: boss ? CELL : CELL - 12,
          shape: 'circle',
          outline: COLORS.enemyOutline,
          sprite: ENEMY_SPRITES[enemy.kind],
          spriteSize: boss ? CELL * 1.8 : CELL * 1.05,
        });
        this.enemyViews.set(enemy.id, view);
        this.tweens.add({ targets: view, scale: { from: 0, to: 1 }, duration: 200, ease: 'Back.Out' });
      }
      const p = lerp(enemy.prev, enemy.pos, enemyAlpha(w, enemy));
      view.setPosition(px(p.x), px(p.y));
      view.setDepth(9 + p.y * 0.01);
      const target = w.party[0]?.pos;
      if (target) view.face(target.x - enemy.pos.x);
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
      const r = CELL * (ENEMIES[s.kind].boss ? 0.5 : 0.3);
      g.lineStyle(4, 0xe5533d, pulse);
      g.lineBetween(x - r, y - r, x + r, y + r);
      g.lineBetween(x - r, y + r, x + r, y - r);
    }
  }

  // ---------- ganimet ----------

  private makeLootView(loot: Loot) {
    const c = this.add.container(0, 0).setDepth(5);
    switch (loot.type) {
      case 'coin':
        c.add([this.add.circle(0, 0, loot.value > 5 ? 14 : 9, COLORS.gold).setStrokeStyle(3, 0x8a6a10), this.add.circle(-3, -3, 3, 0xfff3c4)]);
        break;
      case 'gem':
        c.add(this.add.rectangle(0, 0, 15, 15, COLORS.gem).setStrokeStyle(3, 0x1d6b66).setRotation(Math.PI / 4));
        break;
      case 'power': {
        const def = POWERS[loot.power];
        c.add([
          this.add.circle(0, 0, 15, def.color).setStrokeStyle(3, 0xf4efe6),
          this.add.text(0, 0, def.glyph, textStyle(16, { color: '#ffffff', fontStyle: 'bold' })).setOrigin(0.5),
        ]);
        break;
      }
      case 'hero': {
        const def = HEROES[loot.hero];
        c.add([
          this.add.circle(0, 0, CELL * 0.45, COLORS.leader, 0.25).setStrokeStyle(2, COLORS.leader, 0.6),
          new UnitView(this, { color: def.color, glyph: def.glyph, size: CELL - 20, shape: 'square', sprite: HERO_SPRITES[loot.hero], spriteSize: CELL * 0.95 }),
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
      view.setPosition(px(loot.pos.x), px(loot.pos.y) + Math.sin(t / 250 + loot.id) * 3);
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
    if (view && loot.type === 'coin') {
      this.popText(view.x, view.y, `+${loot.value}`, UI.gold);
      this.fx.sparkle(view.x, view.y, COLORS.gold, loot.value > 5 ? 20 : 5);
    }
    if (view && loot.type === 'gem') {
      this.popText(view.x, view.y, '+1 mücevher', UI.gem);
      this.fx.sparkle(view.x, view.y, COLORS.gem, 10);
    }
    if (view && loot.type === 'power') this.fx.sparkle(view.x, view.y, POWERS[loot.power].color, 12);
    this.removeLoot(id, true);
  }

  // ---------- HUD ----------

  private buildHud() {
    const { width, height } = this.scale;
    this.hud = this.add.text(16, 10, '', textStyle(22)).setDepth(40);
    this.wallet = this.add.text(width - 70, 10, '', textStyle(22)).setOrigin(1, 0).setDepth(40);
    new Button(this, width - 30, 24, 'II', () => this.togglePause(), { width: 40, height: 36, fontSize: 18 }).setDepth(41);
    this.powerText = this.add
      .text(width / 2, height - 12, '', textStyle(20, { fontStyle: 'bold' }))
      .setOrigin(0.5, 1)
      .setDepth(40)
      .setStroke('#14121c', 4);
    this.xpBar = this.add.graphics().setDepth(40);
    this.banner = this.add
      .text(width / 2, 120, '', textStyle(44, { fontStyle: 'bold' }))
      .setOrigin(0.5)
      .setDepth(40)
      .setStroke('#14121c', 6)
      .setAlpha(0);

    const barW = 420;
    const bossName = this.add.text(0, -18, ENEMIES.slimeKing.name, textStyle(18, { fontStyle: 'bold' })).setOrigin(0.5);
    const bg = this.add.rectangle(-barW / 2, 0, barW, 12, 0x000000, 0.6).setOrigin(0, 0.5);
    const fill = this.add.rectangle(-barW / 2, 0, barW, 12, 0xc77dff).setOrigin(0, 0.5).setName('fill');
    this.bossBar = this.add.container(width / 2, 70, [bossName, bg, fill]).setDepth(40).setVisible(false);
  }

  private renderHud() {
    const w = this.world;
    const foes = w.enemies.length + w.wave.pending.length;
    const parts = [`Dalga ${Math.max(w.wave.n, 1)}`, `Kafile ${w.party.length}`];
    if (w.wave.phase === 'active') parts.push(`Düşman ${foes}`);
    else parts.push(`Sonraki ${Math.max(0, Math.ceil(w.wave.timer / 1000))}`);
    this.hud.setText(parts.join('    '));
    this.wallet.setText(`Altın ${w.stats.gold}    Mücevher ${w.stats.gems}    Sv ${w.stats.level + 1}`);

    const active = (Object.keys(w.powers) as PowerKind[]).map((k) => `${POWERS[k].name} ${Math.ceil((w.powers[k] ?? 0) / 1000)}`);
    this.powerText.setText(active.join('   '));

    const barW = 220;
    const x = this.scale.width / 2 - barW / 2;
    const ratio = w.stats.xp / xpToNext(w.stats.level);
    this.xpBar.clear().fillStyle(0x000000, 0.5).fillRect(x, 16, barW, 8).fillStyle(0xfff3c4).fillRect(x, 16, barW * ratio, 8);

    const boss = w.enemies.find((e) => ENEMIES[e.kind].boss);
    this.bossBar.setVisible(!!boss);
    if (boss) (this.bossBar.getByName('fill') as Phaser.GameObjects.Rectangle).setScale(Math.max(0, boss.hp / boss.maxHp), 1);
  }

  // ---------- efektler ----------

  private killView(map: Map<number, UnitView>, id: number) {
    const view = map.get(id);
    if (!view) return;
    map.delete(id);
    this.tweens.add({ targets: view, scale: 0, alpha: 0, duration: 180, onComplete: () => view.destroy() });
  }

  private damageText(anchor: UnitView | undefined, text: string, color: string, size = 18) {
    // Kalabalık dalgalarda sayı yağmurunu sınırla
    if (this.liveTexts > MAX_DAMAGE_TEXTS && size <= 18) return;
    if (anchor && this.settings.damageNumbers) this.popText(anchor.x + Phaser.Math.Between(-8, 8), anchor.y - 20, text, color, size);
  }

  private popText(x: number, y: number, text: string, color: string, size = 18) {
    const t = this.add
      .text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setStroke('#14121c', 4)
      .setDepth(30);
    this.liveTexts++;
    this.tweens.add({
      targets: t,
      y: t.y - 26,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        this.liveTexts--;
        t.destroy();
      },
    });
  }

  private slash(pos: Vec) {
    const line = this.add.rectangle(px(pos.x), px(pos.y), CELL * 0.9, 5, 0xffffff).setRotation(-0.8).setDepth(16);
    this.tweens.add({ targets: line, alpha: 0, scaleX: 1.3, duration: 140, onComplete: () => line.destroy() });
  }

  private ring(x: number, y: number, radius: number, color: number, ms: number, warning = false) {
    const ring = this.add.circle(x, y, radius, color, warning ? 0.15 : 0.45).setDepth(14);
    if (warning) ring.setStrokeStyle(3, color, 0.9);
    this.tweens.add({
      targets: ring,
      alpha: warning ? { from: 0.3, to: 0.9 } : 0,
      scale: warning ? { from: 1, to: 1 } : { from: 0.4, to: 1 },
      duration: ms,
      onComplete: () => ring.destroy(),
    });
  }

  private showBanner(text: string) {
    this.tweens.killTweensOf(this.banner);
    this.banner.setText(text).setAlpha(0).setScale(0.8);
    this.tweens.add({ targets: this.banner, alpha: 1, scale: 1, duration: 200, ease: 'Back.Out', yoyo: true, hold: 900 });
  }

  // ---------- duraklatma / oyun sonu ----------

  private buildPauseMenu() {
    const { width, height } = this.scale;
    const c = this.add.container(0, 0).setDepth(60).setVisible(false);
    c.add(this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6));
    c.add(this.add.text(width / 2, height / 2 - 110, 'Duraklatıldı', textStyle(48, { fontStyle: 'bold' })).setOrigin(0.5));
    c.add(new Button(this, width / 2, height / 2 - 10, 'Devam', () => this.togglePause(), { variant: 'primary', width: 280 }));
    c.add(new Button(this, width / 2, height / 2 + 60, 'Baştan başla', () => this.leave(() => this.restart()), { width: 280 }));
    c.add(new Button(this, width / 2, height / 2 + 130, 'Menüye dön', () => this.leave(() => this.scene.start('menu')), { width: 280 }));
    return c;
  }

  private togglePause() {
    if (!this.world?.alive) return;
    this.paused = !this.paused;
    this.pauseMenu.setVisible(this.paused);
    if (this.paused) this.tweens.pauseAll();
    else this.tweens.resumeAll();
  }

  /** Turu yarıda bırakmak da kazancı bankaya yatırır. */
  private leave(next: () => void) {
    this.tweens.resumeAll();
    this.bankRun();
    next();
  }

  private bankRun() {
    if (this.banked) return -1;
    this.banked = true;
    const { stats, wave } = this.world;
    const n = Math.max(wave.n, 1);
    const rank = applyRun(profile.data, {
      hero: this.hero,
      wave: n,
      kills: stats.kills,
      gold: stats.gold,
      gems: stats.gems,
      score: score(n, stats.kills, stats.gold),
    });
    profile.save();
    return rank;
  }

  private showGameOver(reason: GameOverReason) {
    this.shake(180, 0.008);
    const rank = this.bankRun();
    const { width, height } = this.scale;
    const { stats, wave } = this.world;
    const n = Math.max(wave.n, 1);
    const why = { wall: 'Duvara çarptın', self: 'Kendi kuyruğuna çarptın', wiped: 'Kafile düştü' }[reason];
    const rankText = rank === 0 ? 'Yeni rekor!' : rank > 0 ? `Rekor listesinde ${rank + 1}. sıra` : '';

    const o = this.overlay.removeAll(true);
    o.add(this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.65));
    o.add(this.add.text(width / 2, height / 2 - 150, why, textStyle(52, { fontStyle: 'bold' })).setOrigin(0.5));
    o.add(this.add.text(width / 2, height / 2 - 85, rankText, textStyle(26, { color: UI.gold, fontStyle: 'bold' })).setOrigin(0.5));
    o.add(
      this.add
        .text(
          width / 2,
          height / 2 - 30,
          `Dalga ${n}  ·  Öldürme ${stats.kills}  ·  Skor ${score(n, stats.kills, stats.gold)}`,
          textStyle(24),
        )
        .setOrigin(0.5),
    );
    o.add(
      this.add
        .text(width / 2, height / 2 + 10, `+${stats.gold} altın   +${stats.gems} mücevher kasaya eklendi`, textStyle(20, { color: UI.muted }))
        .setOrigin(0.5),
    );
    o.add(new Button(this, width / 2 - 220, height / 2 + 100, 'Dükkan', () => this.scene.start('shop'), { width: 200 }));
    o.add(new Button(this, width / 2, height / 2 + 100, 'Tekrar', () => this.restart(), { variant: 'primary', width: 200 }));
    o.add(new Button(this, width / 2 + 220, height / 2 + 100, 'Menü', () => this.scene.start('menu'), { width: 200 }));
    o.add(this.add.text(width / 2, height / 2 + 160, 'Boşluk / Enter: Tekrar', textStyle(16, { color: UI.muted })).setOrigin(0.5));
    o.setVisible(true);
  }
}
