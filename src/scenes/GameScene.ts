import Phaser from 'phaser';
import { CELL } from '../config';
import { SPAWN_WARN_MS } from '../data/balance';
import { ENEMIES } from '../data/enemies';
import { HEROES, type HeroKind } from '../data/heroes';
import { LOOT_BLINK_MS, POWERS, score } from '../data/loot';
import { audio } from '../audio/audio';
import { bindControls } from '../input/controls';
import { profile } from '../meta/profile';
import { applyRun, loadoutFrom } from '../meta/shop';
import { drawArena } from '../render/arena';
import { Fx } from '../render/fx';
import { ENEMY_SPRITES, FX, HERO_SPRITES, LOOT, POWER_ICONS } from '../render/sprites';
import { UnitView } from '../render/UnitView';
import type { Vec } from '../sim/grid';
import {
  createWorld,
  enemyAlpha,
  type GameOverReason,
  type Loot,
  stepWorld,
  tickAlpha,
  turn,
  type World,
  type WorldEvent,
} from '../sim/world';
import { Hud } from '../ui/hud';
import { Button, fmt, panel, ribbon, slice } from '../ui/kit';
import { displayStyle, FONT_DISPLAY, textStyle, UI } from '../ui/theme';
import { icon } from '../ui/assets';

const COLORS = {
  leader: 0xfff3c4,
  shield: 0x5ab8f0,
  enemyOutline: 0x7a1414,
  gold: 0xf0c23b,
  gem: 0x5ef0e0,
};

const MAX_DAMAGE_TEXTS = 24;

const px = (v: number) => v * CELL + CELL / 2;
const lerp = (a: Vec, b: Vec, t: number): Vec => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

export class GameScene extends Phaser.Scene {
  private hero: HeroKind = 'knight';
  private world!: World;
  private paused = false;
  /** Duraklatınca dondurulan tween'ler; menü animasyonları serbest kalsın diye pauseAll kullanılmıyor. */
  private frozen: Phaser.Tweens.Tween[] = [];
  private liveTexts = 0;
  private banked = false;
  private heroViews = new Map<number, UnitView>();
  private enemyViews = new Map<number, UnitView>();
  private projectileViews = new Map<number, Phaser.GameObjects.Image>();
  private lootViews = new Map<number, Phaser.GameObjects.Container>();
  private markers = new Map<string, Phaser.GameObjects.Sprite>();
  private fx!: Fx;
  private hud!: Hud;
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
    this.markers = new Map();
    this.fx = new Fx(this);
    this.hud = new Hud(this, () => this.togglePause());
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
    this.hud.update(this.world);
  }

  private get settings() {
    return profile.data.settings;
  }

  private shake(ms: number, intensity: number) {
    if (this.settings.shake) this.cameras.main.shake(ms, intensity);
  }

  private restart() {
    for (const map of [this.heroViews, this.enemyViews, this.projectileViews, this.lootViews, this.markers]) {
      for (const v of map.values()) v.destroy();
      map.clear();
    }
    this.world = createWorld({ loadout: loadoutFrom(profile.data, this.hero) });
    this.banked = false;
    this.paused = false;
    this.pauseMenu.setVisible(false);
    this.overlay.removeAll(true).setVisible(false);
    this.hud.toast('Hazırlan!');
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
      case 'enemyAttack':
        this.enemyViews.get(e.id)?.playAttack(now);
        break;
      case 'bossSummon':
        this.enemyViews.get(e.id)?.playSpecial('summon', now, 500);
        break;
      case 'enemyHit': {
        const v = this.enemyViews.get(e.id);
        v?.flash();
        v?.playHurt(now);
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
          this.hud.toast('Balçık Kralı yenildi!', UI.gold);
        }
        audio.play(boss ? 'explosion' : 'enemyDie');
        break;
      }
      case 'slash':
        this.slash(e.pos);
        audio.play('slash');
        break;
      case 'explosion':
        this.oneShot(FX.explosion, px(e.x), px(e.y), CELL * (e.radius * 2 + 1) * 0.9);
        this.fx.puff(px(e.x), px(e.y), 0xff8a2b, 18);
        audio.play('explosion');
        break;
      case 'shockwaveWarn': {
        const v = this.enemyViews.get(e.id);
        if (v) this.ring(v.x, v.y, CELL * (e.radius + 0.5), 0xe5533d, 800, true);
        v?.playSpecial('charge', now, 800);
        audio.play('shockWarn');
        break;
      }
      case 'shockwave':
        this.shockwave(px(e.pos.x), px(e.pos.y), CELL * (e.radius * 2 + 1));
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
        this.hud.toast(POWERS[e.power].name + '!');
        audio.play('power');
        break;
      case 'bomb':
        this.cameras.main.flash(180, 255, 240, 200);
        this.shake(220, 0.01);
        audio.play('bomb');
        break;
      case 'levelUp': {
        this.hud.toast(`Seviye ${e.level + 1}!`, UI.gold);
        this.hud.levelUp();
        for (const v of this.heroViews.values()) v.flash(0xfff3c4, 160, 'tint');
        const leader = this.heroViews.get(this.world.party[0]?.id ?? -1);
        if (leader) this.fx.confetti(leader.x, leader.y, 30);
        for (const v of this.heroViews.values()) this.popImage(FX.levelUp, v.x, v.y, CELL * 1.2);
        audio.play('levelUp');
        break;
      }
      case 'waveStart':
        if (e.n % 5 === 0) {
          this.hud.banner('boss', `Dalga ${e.n} · Balçık Kralı!`);
          this.shake(300, 0.006);
        } else this.hud.banner('wave', `Dalga ${e.n}`);
        audio.play('waveStart');
        break;
      case 'waveCleared':
        this.hud.banner('clear', 'Dalga temizlendi!', e.bonus);
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
      view.animate(this.time.now, w.alive && !this.paused);
      view.setHp(enemy.hp / enemy.maxHp);
    }
  }

  private renderProjectiles() {
    const live = new Set<number>();
    for (const p of this.world.projectiles) {
      live.add(p.id);
      let view = this.projectileViews.get(p.id);
      if (!view) {
        view = this.makeProjectile(p.kind);
        this.projectileViews.set(p.id, view);
      }
      view.setPosition(px(p.x), px(p.y));
      if (p.kind !== 'holy') view.setRotation(Math.atan2(p.ty - p.y, p.tx - p.x));
    }
    for (const [id, view] of this.projectileViews) {
      if (!live.has(id)) {
        view.destroy();
        this.projectileViews.delete(id);
      }
    }
  }

  private makeProjectile(kind: 'arrow' | 'bone' | 'fireball' | 'holy') {
    switch (kind) {
      case 'arrow':
        return this.add.image(0, 0, FX.arrow).setDisplaySize(36, 12).setDepth(15);
      case 'bone':
        return this.add.image(0, 0, FX.bone).setDisplaySize(36, 12).setDepth(15);
      case 'holy':
        return this.add.image(0, 0, FX.holy).setDisplaySize(26, 26).setDepth(15);
      case 'fireball':
        return this.add.sprite(0, 0, this.firstFrame(FX.fireball)).setDisplaySize(32, 32).setDepth(15).play(FX.fireball);
    }
  }

  /** Uyarı süresine girmiş doğma noktalarında yanıp sönen işaret. */
  private renderMarkers() {
    const w = this.world;
    const wanted = new Map<string, boolean>();
    if (w.wave.phase === 'active') {
      for (const s of w.wave.pending) {
        if (s.at - w.time <= SPAWN_WARN_MS) wanted.set(`${s.pos.x},${s.pos.y}`, !!ENEMIES[s.kind].boss);
      }
    }
    for (const [key, sprite] of this.markers) {
      if (!wanted.has(key)) {
        sprite.destroy();
        this.markers.delete(key);
      }
    }
    for (const [key, boss] of wanted) {
      if (this.markers.has(key)) continue;
      const [x, y] = key.split(',').map(Number);
      const size = boss ? CELL * 1.4 : CELL * 0.85;
      this.markers.set(key, this.add.sprite(px(x), px(y), this.firstFrame(FX.spawnMarker)).setDisplaySize(size, size).setDepth(2).play(FX.spawnMarker));
    }
  }

  // ---------- ganimet ----------

  private makeLootView(loot: Loot) {
    const c = this.add.container(0, 0).setDepth(5);
    const size = CELL * 0.75;
    switch (loot.type) {
      case 'coin':
        c.add(
          loot.value > 5
            ? this.add.image(0, 0, LOOT.coinBig).setDisplaySize(CELL, CELL)
            : this.add.sprite(0, 0, this.firstFrame(LOOT.coin)).setDisplaySize(size, size).play({ key: LOOT.coin, startFrame: loot.id % 4 }),
        );
        break;
      case 'gem':
        c.add(this.add.sprite(0, 0, this.firstFrame(LOOT.gem)).setDisplaySize(size, size).play(LOOT.gem));
        break;
      case 'power':
        c.add(this.add.image(0, 0, POWER_ICONS[loot.power]).setDisplaySize(CELL * 0.85, CELL * 0.85));
        break;
      case 'hero': {
        const def = HEROES[loot.hero];
        c.add([
          this.add.circle(0, 0, CELL * 0.42, COLORS.leader, 0.18),
          new UnitView(this, { color: def.color, glyph: def.glyph, size: CELL - 20, shape: 'square', sprite: HERO_SPRITES[loot.hero], spriteSize: CELL * 0.8 }),
          this.add.image(0, 0, LOOT.heroToken).setDisplaySize(CELL, CELL),
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
      .text(x, y, text, { fontFamily: FONT_DISPLAY, fontSize: `${size}px`, color, fontStyle: '900' })
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
    this.oneShot(FX.slash, px(pos.x), px(pos.y), CELL * 1.1).setAngle(Phaser.Math.Between(-40, 40));
  }

  private firstFrame(animKey: string) {
    return this.anims.get(animKey)?.frames[0]?.textureKey ?? '__MISSING';
  }

  /** Bir kez oynayıp kendini yok eden efekt animasyonu. */
  private oneShot(animKey: string, x: number, y: number, size: number) {
    const s = this.add.sprite(x, y, this.firstFrame(animKey)).setDisplaySize(size, size).setDepth(16).play(animKey);
    s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => s.destroy());
    return s;
  }

  private shockwave(x: number, y: number, size: number) {
    const img = this.add.image(x, y, FX.shockwave).setDisplaySize(size * 0.3, size * 0.3).setDepth(14);
    const scale = size / img.width;
    this.tweens.add({ targets: img, scale, alpha: { from: 1, to: 0 }, duration: 380, ease: 'Cubic.Out', onComplete: () => img.destroy() });
  }

  private popImage(key: string, x: number, y: number, size: number) {
    const img = this.add.image(x, y, key).setDisplaySize(size, size).setDepth(34);
    const base = img.scale;
    this.tweens.add({ targets: img, scale: { from: base * 0.3, to: base * 1.2 }, alpha: { from: 1, to: 0 }, y: y - 20, duration: 600, ease: 'Cubic.Out', onComplete: () => img.destroy() });
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

  // ---------- duraklatma / oyun sonu ----------

  private buildPauseMenu() {
    const { width, height } = this.scale;
    const c = this.add.container(0, 0).setDepth(60).setVisible(false);
    const shade = this.add.rectangle(0, 0, width, height, UI.bg, 0.72).setOrigin(0).setName('shade');
    shade.setInteractive();
    const box = this.add.container(width / 2, height / 2).setName('box');
    box.add(panel(this, 0, 0, 420, 380));
    box.add(ribbon(this, 0, -190, 'Duraklatıldı', { width: 320 }));
    box.add(new Button(this, 0, -60, 'Devam', () => this.togglePause(), { variant: 'primary', width: 300, height: 72, fontSize: 30 }));
    box.add(new Button(this, 0, 30, 'Baştan başla', () => this.leave(() => this.restart()), { width: 300, height: 64 }));
    box.add(new Button(this, 0, 112, 'Menüye dön', () => this.leave(() => this.scene.start('menu')), { width: 300, height: 64 }));
    c.add([shade, box]);
    return c;
  }

  private togglePause() {
    if (!this.world?.alive) return;
    this.paused = !this.paused;
    const shade = this.pauseMenu.getByName('shade') as Phaser.GameObjects.Rectangle;
    const box = this.pauseMenu.getByName('box') as Phaser.GameObjects.Container;
    const cy = this.scale.height / 2;
    if (this.paused) {
      this.freeze();
      this.pauseMenu.setVisible(true);
      shade.setAlpha(0);
      box.setY(cy - 200).setAlpha(0);
      this.tweens.add({ targets: shade, alpha: 1, duration: 160 });
      this.tweens.add({ targets: box, y: cy, alpha: 1, duration: 200, ease: 'Back.Out' });
    } else {
      this.tweens.add({
        targets: box,
        y: cy - 120,
        alpha: 0,
        duration: 140,
        ease: 'Quad.In',
        onComplete: () => {
          this.pauseMenu.setVisible(false);
          this.thaw();
        },
      });
    }
  }

  private freeze() {
    this.frozen = this.tweens.getTweens().filter((t) => t.isPlaying());
    for (const t of this.frozen) t.pause();
  }

  private thaw() {
    for (const t of this.frozen) t.resume();
    this.frozen = [];
  }

  /** Turu yarıda bırakmak da kazancı bankaya yatırır. */
  private leave(next: () => void) {
    this.thaw();
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
    const why = { wall: 'Duvara çarptın', self: 'Kuyruğuna çarptın', wiped: 'Kafile düştü' }[reason];
    const cx = width / 2;

    const o = this.overlay.removeAll(true).setVisible(true);
    const shade = this.add.rectangle(0, 0, width, height, UI.bg, 0.78).setOrigin(0).setInteractive();
    o.add(shade);
    shade.setAlpha(0);
    this.tweens.add({ targets: shade, alpha: 1, duration: 300 });

    const title = this.add.container(cx, 102, [
      slice(this, 'ui.banner_danger', 0, 0, 540),
      this.add.text(0, -6, why, displayStyle(48)).setOrigin(0.5),
    ]);
    title.setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: title, scale: 1, alpha: 1, duration: 360, delay: 150, ease: 'Back.Out' });
    o.add(title);

    const stat = (x: number, label: string, value: number, i: number) => {
      const valueText = this.add.text(0, 14, '0', displayStyle(36, { color: UI.gold })).setOrigin(0.5);
      const card = this.add.container(x, 322, [
        slice(this, 'ui.card', 0, 0, 152, 104),
        this.add.text(0, -24, label.toLocaleUpperCase('tr-TR'), textStyle(14, { color: UI.muted, fontStyle: '800' })).setOrigin(0.5),
        valueText,
      ]);
      card.setAlpha(0).y += 40;
      this.tweens.add({ targets: card, y: 322, alpha: 1, duration: 220, delay: 450 + i * 120, ease: 'Back.Out' });
      const counter = { v: 0 };
      let lastTick = 0;
      this.tweens.add({
        targets: counter,
        v: value,
        duration: 700,
        delay: 550 + i * 200,
        ease: 'Quad.Out',
        onUpdate: () => {
          valueText.setText(fmt(counter.v));
          if (this.time.now - lastTick > 50) {
            lastTick = this.time.now;
            audio.play('click');
          }
        },
      });
      o.add(card);
    };
    stat(cx - 190, 'Dalga', n, 0);
    stat(cx, 'Öldürme', stats.kills, 1);
    stat(cx + 190, 'Skor', score(n, stats.kills, stats.gold), 2);

    if (rank >= 0) {
      const text = rank === 0 ? '★  Yeni rekor!' : `★  Rekor listesinde ${rank + 1}.`;
      const label = this.add.text(0, 0, text, displayStyle(24, { color: UI.ink })).setOrigin(0.5);
      const bw = label.width + 40;
      const bg = this.add.graphics();
      bg.fillStyle(0x7a4f19).fillRoundedRect(-bw / 2 - 5, -26, bw + 10, 56, 14);
      bg.fillStyle(UI.goldNum).fillRoundedRect(-bw / 2, -22, bw, 44, 10);
      bg.lineStyle(3, 0x14121c).strokeRoundedRect(-bw / 2, -22, bw, 44, 10);
      const glow = this.add.graphics().lineStyle(6, UI.goldNum, 1).strokeRoundedRect(-bw / 2 - 10, -30, bw + 20, 64, 16);
      const badge = this.add.container(cx, 208, [glow, bg, label]).setScale(0).setAngle(-12);
      this.tweens.add({ targets: badge, scale: 1, angle: -4, duration: 420, delay: 1300, ease: 'Back.Out(2)' });
      this.tweens.add({ targets: glow, alpha: { from: 0.3, to: 0.8 }, duration: 700, ease: 'Sine.InOut', yoyo: true, repeat: -1 });
      o.add(badge);
    }

    const parts: Phaser.GameObjects.GameObject[] = [];
    let x = 0;
    const add = (obj: Phaser.GameObjects.Text | Phaser.GameObjects.Image, w: number, gap = 10) => {
      obj.x = x + w / 2;
      x += w + gap;
      parts.push(obj);
    };
    const goldTxt = this.add.text(0, 0, `+${fmt(stats.gold)}`, displayStyle(26, { color: UI.gold })).setOrigin(0.5);
    add(goldTxt, goldTxt.width, 8);
    add(this.add.image(0, 0, icon('coin')).setDisplaySize(26, 26), 26, 22);
    const gemTxt = this.add.text(0, 0, `+${fmt(stats.gems)}`, displayStyle(26, { color: UI.gem })).setOrigin(0.5);
    add(gemTxt, gemTxt.width, 8);
    add(this.add.image(0, 0, icon('gem')).setDisplaySize(26, 26), 26, 18);
    const note = this.add.text(0, 0, 'kasaya eklendi', textStyle(18, { color: UI.muted })).setOrigin(0.5);
    add(note, note.width, 0);
    const reward = this.add.container(cx - x / 2, 436, parts).setAlpha(0);
    reward.y += 12;
    this.tweens.add({ targets: reward, y: 436, alpha: 1, duration: 240, delay: 1500, ease: 'Quad.Out' });
    o.add(reward);

    const buttons = this.add.container(0, 0, [
      new Button(this, cx - 268, 600, 'Dükkan', () => this.scene.start('shop'), { width: 196, height: 60, icon: 'shop' }),
      new Button(this, cx, 603, 'Tekrar', () => this.restart(), { variant: 'primary', width: 290, height: 76, fontSize: 34 }),
      new Button(this, cx + 268, 600, 'Menü', () => this.scene.start('menu'), { width: 196, height: 60 }),
    ]).setAlpha(0);
    this.tweens.add({ targets: buttons, alpha: 1, duration: 200, delay: 1700 });
    o.add(buttons);
  }
}
