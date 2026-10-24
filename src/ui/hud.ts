import Phaser from 'phaser';
import { ENEMIES } from '../data/enemies';
import { type PowerKind, xpToNext } from '../data/loot';
import { HERO_CLASSES, SYNERGIES, SYNERGY_TIERS } from '../data/synergies';
import { POWER_ICONS } from '../render/sprites';
import { classCounts } from '../sim/synergy';
import type { World } from '../sim/world';
import { icon, portrait } from './assets';
import { Bar, Button, fmt, Pill, slice } from './kit';
import { displayStyle, textStyle, UI } from './theme';

const DEPTH = 40;

/** Oyun içi gösterge katmanı (docs/design/stage4/mockups/hud.png). */
export class Hud {
  private readonly wave: Pill;
  private readonly party: Pill;
  private readonly foes: Pill;
  private readonly coin: Pill;
  private readonly gem: Pill;
  private readonly level: Phaser.GameObjects.Container;
  private readonly levelText: Phaser.GameObjects.Text;
  private readonly xp: Bar;
  private readonly boss: Phaser.GameObjects.Container;
  private readonly bossBar: Bar;
  private readonly powers: Phaser.GameObjects.Container;
  private readonly toastText: Phaser.GameObjects.Text;
  private readonly synergies: Phaser.GameObjects.Container;
  private synergyKey = '';
  private powerKeys = '';
  private last = { gold: -1, gems: -1, level: -1 };

  constructor(private readonly scene: Phaser.Scene, onPause: () => void) {
    const { width, height } = scene.scale;
    const pill = (caption: string, color?: string) => new Pill(scene, 16, 34, { caption, height: 42, color }).setDepth(DEPTH);
    this.wave = pill('Dalga');
    this.party = pill('Kafile');
    this.foes = pill('Düşman', UI.danger);

    this.xp = new Bar(scene, 602, 34, 310, 'xp').setDepth(DEPTH);
    this.levelText = scene.add.text(0, 1, '1', displayStyle(20)).setOrigin(0.5);
    const disc = scene.add.graphics();
    disc.fillStyle(0x3d74c9).fillCircle(0, 0, 21).lineStyle(3, 0x14121c).strokeCircle(0, 0, 21);
    disc.lineStyle(2, 0x7fb3ec, 0.8).strokeCircle(0, 0, 17);
    this.level = scene.add.container(430, 34, [disc, this.levelText]).setDepth(DEPTH + 1);

    new Button(scene, width - 38, 34, '', onPause, { width: 52, height: 52, icon: 'pause', iconOnly: true }).setDepth(DEPTH);
    this.gem = new Pill(scene, width - 76, 34, { icon: 'gem', align: 'right', height: 42 }).setDepth(DEPTH);
    this.coin = new Pill(scene, width - 200, 34, { icon: 'coin', align: 'right', height: 42 }).setDepth(DEPTH);

    const bossName = scene.add.text(0, -26, '', displayStyle(18)).setOrigin(0.5).setStroke(UI.ink, 5).setName('bossName');
    this.bossBar = new Bar(scene, 0, 0, 580, 'boss');
    this.boss = scene.add.container(width / 2, 104, [bossName, this.bossBar]).setDepth(DEPTH).setVisible(false);

    this.powers = scene.add.container(width / 2, height - 40).setDepth(DEPTH);
    this.synergies = scene.add.container(16, 78).setDepth(DEPTH);
    this.toastText = scene.add.text(width / 2, 200, '', displayStyle(42)).setOrigin(0.5).setDepth(DEPTH + 2).setStroke(UI.ink, 8).setAlpha(0);
  }

  update(w: World) {
    const now = this.scene.time.now;
    this.wave.setValue(Math.max(w.wave.n, 1));
    this.party.setValue(w.party.length);
    if (w.wave.phase === 'active') this.foes.setCaption('Düşman').setValue(w.enemies.length + w.wave.pending.length, UI.danger);
    else this.foes.setCaption('Sonraki').setValue(`${Math.max(0, Math.ceil(w.wave.timer / 1000))} sn`, UI.text);
    this.party.place(this.wave.x + this.wave.pillWidth + 10);
    this.foes.place(this.party.x + this.party.pillWidth + 10);

    if (w.stats.gems !== this.last.gems) {
      this.gem.setValue(w.stats.gems);
      if (this.last.gems >= 0) this.gem.bump();
      this.last.gems = w.stats.gems;
    }
    if (w.stats.gold !== this.last.gold) {
      this.coin.setValue(w.stats.gold);
      if (this.last.gold >= 0) this.coin.bump();
      this.last.gold = w.stats.gold;
    }
    this.coin.place(this.gem.x - 10);

    if (w.stats.level !== this.last.level) {
      this.levelText.setText(`${w.stats.level + 1}`);
      this.last.level = w.stats.level;
    }
    this.xp.setRatio(w.stats.xp / xpToNext(w.stats.level));

    const boss = w.enemies.find((e) => ENEMIES[e.kind].boss);
    if (boss && !this.boss.visible) {
      (this.boss.getByName('bossName') as Phaser.GameObjects.Text).setText(ENEMIES[boss.kind].name.toLocaleUpperCase('tr-TR'));
      this.boss.setVisible(true).setAlpha(0).setY(74);
      this.bossBar.setRatio(1, false);
      this.scene.tweens.add({ targets: this.boss, y: 104, alpha: 1, duration: 300, ease: 'Back.Out' });
    } else if (!boss && this.boss.visible) this.boss.setVisible(false);
    if (boss) this.bossBar.setRatio(boss.hp / boss.maxHp);

    this.renderPowers(w, now);
    this.renderSynergies(w);
  }

  /** Sol üstte sınıf sayaçları; eşiğe ulaşan sınıf altın renkte. */
  private renderSynergies(w: World) {
    const counts = classCounts(w.party);
    const active = HERO_CLASSES.filter((c) => counts[c] > 0).sort((a, b) => counts[b] - counts[a]);
    const key = active.map((c) => `${c}${counts[c]}`).join();
    if (key === this.synergyKey) return;
    this.synergyKey = key;
    this.synergies.removeAll(true);
    active.forEach((c, i) => {
      const n = counts[c];
      const tier = n >= SYNERGY_TIERS[1] ? 2 : n >= SYNERGY_TIERS[0] ? 1 : 0;
      const next = SYNERGY_TIERS[Math.min(tier, 1)];
      const y = i * 34;
      const bg = this.scene.add.graphics();
      bg.fillStyle(UI.bg, 0.85).fillRoundedRect(0, y - 14, 156, 28, 14);
      bg.lineStyle(2, tier > 0 ? UI.goldNum : UI.panelEdge).strokeRoundedRect(0, y - 14, 156, 28, 14);
      const face = this.scene.add.image(15, y, portrait(SYNERGIES[c].hero)).setDisplaySize(26, 26);
      const label = this.scene.add.text(32, y, SYNERGIES[c].name, textStyle(13, { color: tier > 0 ? UI.gold : UI.muted, fontStyle: '800' })).setOrigin(0, 0.5);
      const count = this.scene.add.text(146, y, tier === 2 ? `${n} ★` : `${n}/${next}`, displayStyle(14, { color: tier > 0 ? UI.gold : UI.text })).setOrigin(1, 0.5);
      this.synergies.add([bg, face, label, count]);
    });
  }

  private renderPowers(w: World, now: number) {
    const active = (Object.keys(w.powers) as PowerKind[]).sort();
    const keys = active.join(',');
    if (keys !== this.powerKeys) {
      this.powers.removeAll(true);
      const gap = 64;
      active.forEach((k, i) => {
        const x = (i - (active.length - 1) / 2) * gap;
        const img = this.scene.add.image(x, 0, POWER_ICONS[k]).setDisplaySize(48, 48).setName(`icon:${k}`);
        const secs = this.scene.add.text(x + 18, 18, '', displayStyle(15)).setOrigin(0.5).setStroke(UI.ink, 4).setName(`secs:${k}`);
        this.powers.add([img, secs]);
        if (!this.powerKeys.split(',').includes(k)) {
          const base = img.scale;
          this.scene.tweens.add({ targets: img, scale: { from: 0, to: base }, duration: 240, ease: 'Back.Out(2)' });
        }
      });
      this.powerKeys = keys;
    }
    for (const k of active) {
      const left = w.powers[k] ?? 0;
      (this.powers.getByName(`secs:${k}`) as Phaser.GameObjects.Text)?.setText(`${Math.ceil(left / 1000)}s`);
      const img = this.powers.getByName(`icon:${k}`) as Phaser.GameObjects.Image | null;
      img?.setAlpha(left < 3000 && Math.floor(now / 250) % 2 ? 0.4 : 1);
    }
  }

  levelUp() {
    this.scene.tweens.add({ targets: this.level, scale: { from: 1.6, to: 1 }, duration: 320, ease: 'Back.Out(2)' });
  }

  /** Kısa ortadan beliren yazı (Hazırlan!, Seviye 3!, Öfke!). */
  toast(text: string, color = UI.text) {
    const t = this.toastText;
    this.scene.tweens.killTweensOf(t);
    t.setText(text).setColor(color).setAlpha(0).setScale(0.7);
    this.scene.tweens.add({ targets: t, alpha: 1, scale: 1, duration: 200, ease: 'Back.Out', yoyo: true, hold: 800 });
  }

  /** Dalga afişi: boss için kırmızı, temizlendi için ödüllü sarı. */
  banner(kind: 'wave' | 'boss' | 'clear' | 'region', title: string, bonus?: number, sub?: string) {
    const { width, height } = this.scene.scale;
    const danger = kind === 'boss';
    const y = kind === 'wave' ? 170 : height / 2 - 40;
    const c = this.scene.add.container(width / 2, y).setDepth(DEPTH + 3);
    const w = kind === 'wave' ? 380 : 580;
    c.add(slice(this.scene, danger ? 'ui.banner_danger' : 'ui.banner', 0, 0, w));
    const titleY = bonus === undefined && !sub ? -6 : -20;
    c.add(this.scene.add.text(0, titleY, title, displayStyle(kind === 'wave' ? 38 : 44, { color: danger ? UI.text : UI.ink })).setOrigin(0.5));

    if (sub) c.add(this.scene.add.text(0, 24, sub, displayStyle(20, { color: UI.ink })).setOrigin(0.5));
    if (bonus !== undefined) {
      const amount = this.scene.add.text(0, 0, `+${fmt(bonus)}`, displayStyle(22, { color: UI.ink })).setOrigin(0, 0.5);
      const coin = this.scene.add.image(0, 0, icon('coin')).setDisplaySize(24, 24);
      const total = amount.width + 8 + 24;
      amount.x = -total / 2;
      coin.x = amount.x + amount.width + 8 + 12;
      const reward = this.scene.add.container(0, 24, [amount, coin]).setScale(0);
      c.add(reward);
      this.scene.tweens.add({ targets: reward, scale: 1, duration: 220, delay: 200, ease: 'Back.Out(2)' });
    }

    if (danger) {
      c.setScale(0.2, 1).setAlpha(0);
      this.scene.tweens.chain({
        targets: c,
        tweens: [
          { scaleX: 1, alpha: 1, duration: 280, ease: 'Back.Out' },
          { y: y - 40, alpha: 0, duration: 220, delay: 1400, ease: 'Quad.In', onComplete: () => c.destroy() },
        ],
      });
    } else {
      c.setAlpha(0).setY(y + 30);
      this.scene.tweens.chain({
        targets: c,
        tweens: [
          { y, alpha: 1, duration: 240, ease: 'Back.Out' },
          { y: y - 30, alpha: 0, duration: 200, delay: kind === 'wave' ? 700 : kind === 'region' ? 2200 : 1000, ease: 'Quad.In', onComplete: () => c.destroy() },
        ],
      });
    }
  }
}
