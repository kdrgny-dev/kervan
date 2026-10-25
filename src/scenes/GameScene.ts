import Phaser from 'phaser';
import { CELL, GRID_H, GRID_W } from '../config';
import { isPhone } from '../platform';
import { SPAWN_WARN_MS } from '../data/balance';
import { ENEMIES } from '../data/enemies';
import { HEROES, type HeroKind } from '../data/heroes';
import { LOOT_BLINK_MS, POWERS, score } from '../data/loot';
import { audio } from '../audio/audio';
import { bindControls } from '../input/controls';
import { profile } from '../meta/profile';
import { applyRunResults, type RunReport } from '../meta/progression';
import { loadoutFrom } from '../meta/shop';
import { xpForLevel, type RunSummary } from '../data/progression';
import { drawArena } from '../render/arena';
import { bossAt, journeyName, REGIONS } from '../data/regions';
import type { CampaignId } from '../data/campaigns';
import { Fx } from '../render/fx';
import { ENEMY_SPRITES, FX, HERO_SPRITES, LOOT, POWER_ICONS } from '../render/sprites';
import type { ProjectileKind } from '../data/balance';
import { UnitView } from '../render/UnitView';
import { chebyshev, type Vec } from '../sim/grid';
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
import { CARDS } from '../data/cards';
import { nextRerollCost, pickCard, rerollDraft } from '../sim/cards';
import { DraftOverlay } from '../ui/draft';
import { Hud } from '../ui/hud';
import { Bar, Button, fmt, panel, ribbon, slice } from '../ui/kit';
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
/** Bu derinlik ve üstü arayüzdür; telefonda yakınlaşmayan ayrı kamerada çizilir. */
const UI_DEPTH = 40;
/** Telefonda bir karenin ekranda hedeflenen boyu (pt). */
const PHONE_CELL_PT = 34;
const COUNTDOWN_STEPS = 3;
const COUNTDOWN_STEP_MS = 600;

const px = (v: number) => v * CELL + CELL / 2;
const lerp = (a: Vec, b: Vec, t: number): Vec => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

export class GameScene extends Phaser.Scene {
  private hero: HeroKind = 'knight';
  private campaign: CampaignId = 'road';
  private world!: World;
  private paused = false;
  private countdownLeft = 0;
  private phone = false;
  private countdownText!: Phaser.GameObjects.Text;
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
  private arena?: Phaser.GameObjects.GameObject;
  private slowToastAt = 0;
  private hud!: Hud;
  private draftUi!: DraftOverlay;
  private pauseMenu!: Phaser.GameObjects.Container;
  private overlay!: Phaser.GameObjects.Container;

  constructor() {
    super('game');
  }

  init(data: { hero?: HeroKind; campaign?: CampaignId }) {
    this.hero = data.hero ?? profile.data.lastHero;
    this.campaign = data.campaign ?? 'road';
  }

  create() {
    this.phone = isPhone();
    if (this.phone) this.fitPhone();
    this.heroViews = new Map();
    this.enemyViews = new Map();
    this.projectileViews = new Map();
    this.lootViews = new Map();
    this.liveTexts = 0;

    this.arena = drawArena(this).setDepth(-10);
    this.markers = new Map();
    this.fx = new Fx(this);
    this.hud = new Hud(this, () => this.togglePause());
    this.draftUi = new DraftOverlay(this, {
      pick: (id) => {
        if (pickCard(this.world, id)) this.countdown();
      },
      reroll: () => {
        if (rerollDraft(this.world)) this.showDraft();
      },
    });
    this.overlay = this.add.container(0, 0).setDepth(60).setVisible(false);
    this.pauseMenu = this.buildPauseMenu();
    this.countdownText = this.add.text(this.scale.width / 2, this.scale.height / 2, '', displayStyle(140, { color: UI.gold, stroke: '#14121c', strokeThickness: 12 })).setOrigin(0.5).setDepth(70);

    bindControls(this, {
      onDir: (d) => {
        if (this.draftUi.open) return this.draftUi.move(d === 'left' ? -1 : d === 'right' ? 1 : 0);
        if (!this.paused) turn(this.world, d);
      },
      onConfirm: () => {
        if (this.draftUi.open) return this.draftUi.confirm();
        if (!this.world.alive) this.restart();
      },
      onPause: () => this.togglePause(),
    });

    ['ONE', 'TWO', 'THREE'].forEach((k, i) => this.input.keyboard?.on(`keydown-${k}`, () => this.draftUi.confirm(i)));

    if (this.phone) this.phoneCameras();
    this.restart();
  }

  // ---------- telefon görünümü ----------

  /** Sahneyi ekranın oranına genişletir; menüler 1152×720'de kalır. */
  private fitPhone() {
    const { width, height } = this.scale.parentSize;
    const base = GRID_W * CELL;
    const w = Math.round(Phaser.Math.Clamp(GRID_H * CELL * (width / height), base, base * 1.6));
    this.scale.setGameSize(w, GRID_H * CELL);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.setGameSize(base, GRID_H * CELL));
  }

  /** Dünya yakınlaşır ve kafileyi izler; arayüz ayrı kamerada sabit kalır. */
  private phoneCameras() {
    const world = this.cameras.main;
    const ui = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    const ptPerPx = this.scale.displaySize.height / this.scale.height;
    world.setZoom(Phaser.Math.Clamp(PHONE_CELL_PT / (CELL * ptPerPx), 1, 1.6));
    this.events.on(Phaser.Scenes.Events.PRE_RENDER, () => {
      for (const o of this.children.list) {
        const depth = (o as Phaser.GameObjects.GameObject & { depth: number }).depth;
        o.cameraFilter = depth >= UI_DEPTH ? world.id : ui.id;
      }
    });
  }

  private followLeader(snap = false) {
    const cam = this.cameras.main;
    const leader = this.world.party[0];
    if (cam.zoom === 1 || !leader) return;
    const view = this.heroViews.get(leader.id);
    const tx = view?.x ?? px(leader.pos.x);
    const ty = view?.y ?? px(leader.pos.y);
    const vw = cam.width / cam.zoom;
    const vh = cam.height / cam.zoom;
    // Üstteki HUD şeridi arenanın ilk sırasını örtmesin diye dikeyde biraz pay
    const hud = 70 / cam.zoom;
    const along = (t: number, view: number, size: number, top = 0) =>
      view >= size + top ? (size - top) / 2 : Phaser.Math.Clamp(t, view / 2 - top, size - view / 2);
    const cx = along(tx, vw, GRID_W * CELL);
    const cy = along(ty, vh, GRID_H * CELL, hud);
    const m = cam.midPoint;
    const k = snap ? 1 : 0.12;
    cam.centerOn(m.x + (cx - m.x) * k, m.y + (cy - m.y) * k);
  }

  private paintedRegion = '';

  /** Bölge değişince arenayı o bölgenin renkleri ve süsleriyle yeniden çizer. */
  private paintRegion(region: keyof typeof REGIONS) {
    if (this.paintedRegion === region && this.arena?.active) return;
    const first = !this.paintedRegion;
    this.paintedRegion = region;
    this.arena?.destroy();
    this.arena = drawArena(this, region).setDepth(-10);
    if (!first) this.cameras.main.flash(250, 255, 255, 255);
  }

  private showDraft() {
    const w = this.world;
    if (!w.draft) return;
    this.draftUi.show(w.draft.options, w.cards, nextRerollCost(w), w.stats.gold);
  }

  update(_time: number, delta: number) {
    if (!this.paused && this.countdownLeft > 0) this.tickCountdown(delta);
    else if (!this.paused) {
      // Sekme arka plana düşünce dev bir delta gelmesin
      for (const e of stepWorld(this.world, Math.min(delta, 100))) this.handle(e);
    }
    this.renderParty();
    this.followLeader();
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
    this.tweens.killAll();
    this.frozen = [];
    for (const map of [this.heroViews, this.enemyViews, this.projectileViews, this.lootViews, this.markers]) {
      for (const v of map.values()) v.destroy();
      map.clear();
    }
    this.world = createWorld({ loadout: loadoutFrom(profile.data, this.hero), campaign: this.campaign });
    this.paintRegion(this.world.route[0]);
    this.banked = false;
    this.paused = false;
    this.pauseMenu.setVisible(false);
    this.overlay.removeAll(true).setVisible(false);
    this.draftUi.hide();
    this.countdown();
    this.renderParty();
    this.followLeader(true);
  }

  private get halted() {
    return this.paused || this.countdownLeft > 0;
  }

  /** Oyun durup yeniden akmadan önce 3-2-1; bu sırada yön seçilebilir. */
  private countdown() {
    this.countdownLeft = COUNTDOWN_STEPS * COUNTDOWN_STEP_MS;
    this.showCount(COUNTDOWN_STEPS);
  }

  private tickCountdown(delta: number) {
    const before = Math.ceil(this.countdownLeft / COUNTDOWN_STEP_MS);
    this.countdownLeft = Math.max(0, this.countdownLeft - Math.min(delta, 100));
    const after = Math.ceil(this.countdownLeft / COUNTDOWN_STEP_MS);
    if (after !== before) this.showCount(after);
  }

  private showCount(n: number) {
    const t = this.countdownText;
    this.tweens.killTweensOf(t);
    t.setText(n > 0 ? String(n) : 'Yürü!').setScale(1.6).setAlpha(1).setVisible(true);
    audio.play(n > 0 ? 'click' : 'waveStart');
    this.tweens.add({ targets: t, scale: 1, duration: 220, ease: 'Back.Out' });
    this.tweens.add({ targets: t, alpha: 0, delay: n > 0 ? 380 : 300, duration: 200, onComplete: () => n === 0 && t.setVisible(false) });
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
        const sound = kind && ({ archer: 'arrow', mage: 'fireball', priest: 'holy', fatih: 'fireball' } as const)[kind as 'archer'];
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
        this.oneShot(e.kind === 'cannon' ? FX.cannonBlast : FX.explosion, px(e.x), px(e.y), CELL * (e.radius * 2 + 1) * 0.9);
        this.fx.puff(px(e.x), px(e.y), e.kind === 'cannon' ? 0xb8a890 : 0xff8a2b, 18);
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
          this.hud.banner('boss', `Dalga ${e.n} · ${ENEMIES[bossAt(e.n, this.world.route)].name}!`);
          this.shake(300, 0.006);
        } else this.hud.banner('wave', `Dalga ${e.n}`);
        audio.play('waveStart');
        break;
      case 'regionEnter': {
        const r = REGIONS[e.region];
        this.time.delayedCall(400, () => this.paintRegion(e.region));
        this.hud.banner('region', r.name, undefined, e.journey > 1 ? journeyName(e.journey) : 'Kervan yola devam ediyor', e.region);
        audio.play('levelUp');
        break;
      }
      case 'slowed':
        if (this.time.now - this.slowToastAt > 4000) {
          this.slowToastAt = this.time.now;
          this.hud.toast('Donuyorsun!', UI.gem);
        }
        break;
      case 'draftOpen':
        this.time.delayedCall(1300, () => this.showDraft());
        break;
      case 'draftRerolled':
        audio.play('click');
        break;
      case 'cardPicked':
        audio.play('power');
        this.hud.toast(CARDS[e.id].name, UI.gold);
        break;
      case 'wallGrace':
        this.heroViews.get(this.world.party[0]?.id ?? -1)?.flash(0xff5a4a, 160, 'tint');
        break;
      case 'shipsStart':
        this.time.delayedCall(1400, () => this.hud.toast('Gemiler karadan! Duvarlardan geçebilirsin', UI.gem));
        break;
      case 'campaignCleared':
        this.time.delayedCall(600, () => this.hud.banner('region', 'Destan tamamlandı!', undefined, 'Kervan şehre giriyor', this.world.route.at(-1)));
        this.fx.confetti(px(this.world.party[0]?.pos.x ?? GRID_W / 2), px(this.world.party[0]?.pos.y ?? GRID_H / 2), 80);
        audio.play('levelUp');
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
      // Gemiyle duvardan geçince ekranın öbür ucuna kaymasın, ışınlansın
      const p = chebyshev(hero.prev, hero.pos) > 1 ? hero.pos : lerp(hero.prev, hero.pos, alpha);
      const bob = w.alive && !this.halted ? Math.abs(Math.sin(t / 90 + i * 0.7)) * -4 : 0;
      view.setPosition(px(p.x), px(p.y) + bob);
      view.setDepth(10 + p.y * 0.01 + (i === 0 ? 0.005 : 0));
      view.face(hero.pos.x - hero.prev.x);
      view.animate(t, w.alive && !this.halted);
      view.setMarker(w.powers.shield ? COLORS.shield : i === 0 ? COLORS.leader : null);
      const sailing = w.time < w.wallPassUntil;
      view.setAlpha(i === 0 && w.bumpInvuln > 0 && Math.floor(t / 60) % 2 ? 0.5 : sailing ? 0.75 + 0.2 * Math.sin(t / 120) : 1);
      view.setHp(hero.hp / hero.maxHp);
      view.setFrost(w.time < w.slowUntil);
    });
  }

  private renderEnemies() {
    const w = this.world;
    for (const enemy of w.enemies) {
      let view = this.enemyViews.get(enemy.id);
      if (!view) {
        const def = ENEMIES[enemy.kind];
        const boss = !!def.boss;
        const look = def.look;
        const base = ENEMIES[look?.as ?? enemy.kind].boss ? 1.8 : 1.05;
        view = new UnitView(this, {
          color: def.color,
          glyph: def.glyph,
          size: boss ? CELL : CELL - 12,
          shape: 'circle',
          outline: COLORS.enemyOutline,
          sprite: ENEMY_SPRITES[look?.as ?? enemy.kind],
          spriteSize: CELL * (look?.scale ?? def.spriteScale ?? base),
          tint: look?.tint,
          alpha: look?.alpha,
        });
        this.enemyViews.set(enemy.id, view);
        this.tweens.add({ targets: view, scale: { from: 0, to: 1 }, duration: 200, ease: 'Back.Out' });
      }
      const p = lerp(enemy.prev, enemy.pos, enemyAlpha(w, enemy));
      view.setPosition(px(p.x), px(p.y));
      view.setDepth(9 + p.y * 0.01);
      const target = w.party[0]?.pos;
      if (target) view.face(target.x - enemy.pos.x);
      view.animate(this.time.now, w.alive && !this.halted);
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

  private makeProjectile(kind: ProjectileKind) {
    switch (kind) {
      case 'arrow':
        return this.add.image(0, 0, FX.arrow).setDisplaySize(36, 12).setDepth(15);
      case 'bone':
        return this.add.image(0, 0, FX.bone).setDisplaySize(36, 12).setDepth(15);
      case 'holy':
        return this.add.image(0, 0, FX.holy).setDisplaySize(26, 26).setDepth(15);
      case 'fireball':
        return this.add.sprite(0, 0, this.firstFrame(FX.fireball)).setDisplaySize(32, 32).setDepth(15).play(FX.fireball);
      case 'cannon':
        return this.add.image(0, 0, FX.cannonball).setDisplaySize(22, 22).setDepth(15);
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
    if (!this.world?.alive || this.world.draft) return;
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
          this.countdown();
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

  private summary(): RunSummary {
    const { stats, wave, tally } = this.world;
    const n = Math.max(wave.n, 1);
    return {
      hero: this.hero,
      wave: n,
      kills: stats.kills,
      gold: stats.gold,
      gems: stats.gems,
      score: score(n, stats.kills, stats.gold),
      bosses: tally.bosses,
      killsByKind: { ...tally.killsByKind },
      recruited: tally.recruited,
      cardsPicked: tally.cardsPicked,
      cursedPicked: tally.cursedPicked,
      maxParty: tally.maxParty,
      maxTier: { ...tally.maxTier },
      furthestRegion: tally.furthestRegion,
      bossKinds: { ...tally.bossKinds },
      campaign: this.world.campaign,
      campaignCleared: tally.campaignCleared,
    };
  }

  /** Turu kasaya, görevlere, hesap seviyesine ve başarımlara işler (bir kez). */
  private bankRun(): RunReport | null {
    if (this.banked) return null;
    this.banked = true;
    const report = applyRunResults(profile.data, this.summary());
    profile.save();
    return report;
  }

  private showGameOver(reason: GameOverReason) {
    this.shake(180, 0.008);
    const before = { ...profile.data.account };
    const report = this.bankRun();
    const rank = report?.rank ?? -1;
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
          // Sayım bitmeden "Tekrar" basılırsa metin yok edilmiş olur
          if (!valueText.active) return;
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
    const reward = this.add.container(cx - x / 2, 418, parts).setAlpha(0);
    reward.y += 12;
    this.tweens.add({ targets: reward, y: 418, alpha: 1, duration: 240, delay: 1500, ease: 'Quad.Out' });
    o.add(reward);

    if (report) o.add(this.progressBlock(cx, 478, before, report));

    const buttons = this.add.container(0, 0, [
      new Button(this, cx - 268, 622, 'Kamp', () => this.scene.start('shop'), { width: 196, height: 60, icon: 'shop' }),
      new Button(this, cx, 625, 'Tekrar', () => this.restart(), { variant: 'primary', width: 290, height: 76, fontSize: 34 }),
      new Button(this, cx + 268, 622, 'Menü', () => this.scene.start('menu'), { width: 196, height: 60 }),
    ]).setAlpha(0);
    this.tweens.add({ targets: buttons, alpha: 1, duration: 200, delay: 1700 });
    o.add(buttons);
  }

  /** Oyun sonunda hesap XP çubuğu ve kazanılanların çipleri. */
  private progressBlock(cx: number, y: number, before: { level: number; xp: number }, report: RunReport) {
    const c = this.add.container(0, 0).setAlpha(0);
    const after = profile.data.account;
    const bar = new Bar(this, cx, y, 360, 'xp').setRatio(before.xp / xpForLevel(before.level), false);
    const lvl = this.add.text(cx - 196, y, `Sv ${before.level}`, displayStyle(20)).setOrigin(1, 0.5);
    const gain = this.add.text(cx + 196, y, `+${fmt(report.xpGained)} XP`, displayStyle(18, { color: UI.gem })).setOrigin(0, 0.5);
    c.add([bar, lvl, gain]);

    const chips: { text: string; color: number }[] = [];
    if (report.heroUnlocked) chips.push({ text: `Yeni kahraman: ${HEROES[report.heroUnlocked].name}`, color: UI.dangerNum });
    for (const l of report.levelUps) chips.push({ text: `Seviye ${l.level}!`, color: UI.xpNum });
    for (const id of report.newCards) chips.push({ text: `Yeni kart: ${CARDS[id].name}`, color: UI.bossNum });
    for (const q of report.quests) chips.push({ text: `✓ ${q.desc}`, color: UI.successNum });
    for (const a of report.achievements) chips.push({ text: `★ ${a.name}`, color: UI.goldNum });
    const shown = chips.slice(0, 4);
    if (chips.length > shown.length) shown.push({ text: `+${chips.length - shown.length}`, color: UI.panelEdge });

    const row = this.add.container(0, y + 46);
    let x = 0;
    for (const chip of shown) {
      const t = this.add.text(0, 0, chip.text, textStyle(14, { color: UI.ink, fontStyle: '900' })).setOrigin(0, 0.5);
      const w = t.width + 24;
      const bg = this.add.graphics();
      bg.fillStyle(chip.color).fillRoundedRect(x, -15, w, 30, 15).lineStyle(2, 0x14121c).strokeRoundedRect(x, -15, w, 30, 15);
      t.x = x + 12;
      row.add([bg, t]);
      x += w + 8;
    }
    row.x = cx - (x - 8) / 2;
    c.add(row);

    this.tweens.add({ targets: c, alpha: 1, duration: 240, delay: 1600 });
    this.time.delayedCall(1800, () => {
      if (!bar.active) return;
      if (report.levelUps.length) {
        bar.setRatio(1);
        this.time.delayedCall(320, () => {
          if (!bar.active) return;
          lvl.setText(`Sv ${after.level}`);
          this.tweens.add({ targets: lvl, scale: { from: 1.5, to: 1 }, duration: 320, ease: 'Back.Out(2)' });
          audio.play('levelUp');
          bar.setRatio(0, false);
          bar.setRatio(after.xp / xpForLevel(after.level));
        });
      } else bar.setRatio(after.xp / xpForLevel(after.level));
    });
    return c;
  }
}
