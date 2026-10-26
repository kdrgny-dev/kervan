import Phaser from 'phaser';
import { CAMPAIGNS, type CampaignId, CAMPAIGN_IDS, finalWave, UPCOMING } from '../data/campaigns';
import { HEROES } from '../data/heroes';
import { REGIONS, regionAt } from '../data/regions';
import { CAMPAIGN_ART } from '../render/sprites';
import { bindPad } from '../input/gamepad';
import { profile } from '../meta/profile';
import { campaignUnlocked } from '../meta/progression';
import { markSeen } from '../meta/story';
import type { StoryId } from '../data/story';
import { StoryDialog } from '../ui/dialog';
import { icon } from '../ui/assets';
import { Button, enter, ribbon, shake, slice } from '../ui/kit';
import { backdrop, fadeIn, heroBadge, wallet } from '../ui/screen';
import { displayStyle, textStyle, UI } from '../ui/theme';
import { sharpen, view } from '../render/resolution';

const CARD_W = 330;
const COVER_W = CARD_W - 36;
const COVER_H = Math.round((COVER_W * 270) / 480);

interface Card {
  root: Phaser.GameObjects.Container;
  glow: Phaser.GameObjects.Graphics;
}

/** Yolculuk seçimi: Hüsnü'nün Yolu ya da bir destan. */
export class CampaignScene extends Phaser.Scene {
  private selected: CampaignId = 'road';
  private cards = new Map<CampaignId, Card>();
  private story!: StoryDialog;
  private leaving = false;
  /** Telefonda görünür yükseklik 600; kartlar ve butonlar ona göre sıkışır. */
  private cardH = 430;
  private cardY = 350;
  /** Destan sayısı arttıkça kartlar ekrana sığacak kadar küçülür. */
  private cardScale = 1;

  constructor() {
    super('campaigns');
  }

  create() {
    sharpen(this.cameras.main);
    const { width, height } = view(this);
    const save = profile.data;
    this.cards = new Map();
    this.leaving = false;
    this.selected = campaignUnlocked(save, save.lastCampaign) ? save.lastCampaign : 'road';

    fadeIn(this);
    backdrop(this);
    wallet(this);
    const tight = height < 700;
    this.cardH = tight ? height - 190 : 430;
    this.cardY = tight ? 300 : 350;
    ribbon(this, width / 2, tight ? 46 : 68, 'Yolculuk seç', { width: 400 });

    const gap = 26;
    const count = CAMPAIGN_IDS.length + 1;
    this.cardScale = Math.min(1, (width - 48) / (count * CARD_W + (count - 1) * gap));
    const step = (CARD_W + gap) * this.cardScale;
    const x0 = width / 2 - ((count - 1) * step) / 2;
    CAMPAIGN_IDS.forEach((id, i) => this.card(id, x0 + i * step, this.cardY, i));
    this.upcoming(x0 + CAMPAIGN_IDS.length * step, this.cardY);

    const footY = tight ? height - 48 : height - 70;
    new Button(this, 145, footY, 'Geri', () => this.scene.start('menu'), { width: 196, height: 64, icon: 'back' });
    new Button(this, width - 195, footY + 4, 'Kahraman seç', () => this.go(), { variant: 'primary', width: 296, height: 72, fontSize: 30 });

    this.story = new StoryDialog(this);
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (this.story.open) return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.step(-1);
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') this.step(1);
      else if (e.code === 'Enter' || e.code === 'Space') this.go();
      else if (e.code === 'Escape') this.scene.start('menu');
    });
    bindPad(this, {
      dir: (d) => (d === 'left' ? this.step(-1) : d === 'right' ? this.step(1) : undefined),
      confirm: () => (this.story.open ? this.story.advance() : this.go()),
      back: () => this.scene.start('menu'),
    });
    this.time.delayedCall(380, () => this.refresh());
  }

  private card(id: CampaignId, x: number, y: number, index: number) {
    const save = profile.data;
    const def = CAMPAIGNS[id];
    const locked = !campaignUnlocked(save, id);
    const root = this.add.container(x, y).setScale(this.cardScale);

    const glow = this.add.graphics().setAlpha(0);
    glow.lineStyle(8, UI.goldNum, 1).strokeRoundedRect(-CARD_W / 2 - 6, -this.cardH / 2 - 6, CARD_W + 12, this.cardH + 12, 22);
    root.add([glow, slice(this, 'ui.panel', 0, 0, CARD_W, this.cardH).setAlpha(locked ? 0.6 : 1)]);

    const top = -this.cardH / 2 + 18;
    root.add(this.cover(CAMPAIGN_ART.covers[id], 0, top + COVER_H / 2, locked));
    root.add(this.add.text(0, top + COVER_H + 30, def.name, displayStyle(30, { color: locked ? UI.dim : UI.text })).setOrigin(0.5));
    root.add(this.add.text(0, top + COVER_H + 58, def.era, textStyle(14, { color: UI.gold, fontStyle: '800' })).setOrigin(0.5));
    root.add(
      this.add
        .text(0, top + COVER_H + 80, def.desc, textStyle(14, { color: UI.muted, align: 'center', wordWrap: { width: CARD_W - 48 } }))
        .setOrigin(0.5, 0),
    );

    const foot = this.cardH / 2 - 40;
    if (locked) {
      root.add(this.add.image(-96, foot, icon('lock')).setDisplaySize(30, 30));
      root.add(this.add.text(-74, foot, `Hesap Sv ${def.unlockLevel}’da açılır`, displayStyle(17, { color: UI.muted })).setOrigin(0, 0.5));
    } else root.add(this.progress(id, foot));

    const zone = this.add.zone(0, 0, CARD_W, this.cardH).setInteractive({ useHandCursor: !locked });
    zone.on('pointerup', () => {
      if (locked) return shake(this, root);
      if (this.selected === id) return this.go();
      this.selected = id;
      this.refresh();
    });
    root.add(zone);
    this.cards.set(id, { root, glow });
    enter(this, root, { y: 60 }, 80 + index * 70, 240);
  }

  private cover(key: string, x: number, y: number, locked = false) {
    const c = this.add.container(x, y);
    c.add(this.add.image(0, 0, key).setDisplaySize(COVER_W, COVER_H));
    const frame = this.add.graphics();
    frame.lineStyle(4, 0x14121c).strokeRoundedRect(-COVER_W / 2, -COVER_H / 2, COVER_W, COVER_H, 12);
    c.add(frame);
    if (locked) c.setAlpha(0.35);
    return c;
  }

  private progress(id: CampaignId, y: number) {
    const save = profile.data;
    if (id === 'road') {
      const furthest = save.journey.furthest;
      const r = regionAt(furthest * 10 + 1);
      return this.add.text(0, y, `En uzak: ${REGIONS[r.id].name}`, displayStyle(17, { color: UI.muted })).setOrigin(0.5);
    }
    const prog = save.campaigns[id];
    const reward = CAMPAIGNS[id].reward;
    const c = this.add.container(0, y);
    const status = prog?.done ? '✓ Tamamlandı' : prog ? `En iyi dalga ${prog.best}/${finalWave(id)}` : 'Henüz yola çıkılmadı';
    c.add(this.add.text(0, 0, status, displayStyle(17, { color: prog?.done ? '#6fbf5a' : UI.muted })).setOrigin(0.5));
    if (reward) {
      const label = this.add.text(0, -40, `Ödül: ${HEROES[reward].name}`, displayStyle(17, { color: UI.gold })).setOrigin(0, 0.5);
      const badge = heroBadge(this, 0, -40, reward, 40);
      const w = 40 + 6 + label.width;
      badge.x = -w / 2 + 20;
      label.x = badge.x + 26;
      c.add([badge, label]);
    }
    return c;
  }

  private upcoming(x: number, y: number) {
    const root = this.add.container(x, y).setScale(this.cardScale);
    root.add(slice(this, 'ui.panel', 0, 0, CARD_W, this.cardH).setAlpha(0.6));
    const top = -this.cardH / 2 + 18;
    root.add(this.cover(CAMPAIGN_ART.locked, 0, top + COVER_H / 2));
    root.add(this.add.text(0, top + COVER_H + 30, 'Yakında', displayStyle(30, { color: UI.dim })).setOrigin(0.5));
    UPCOMING.forEach((u, i) => {
      const cy = top + COVER_H + 84 + i * (this.cardH < 430 ? 54 : 62);
      root.add(this.add.image(-CARD_W / 2 + 54, cy, icon('lock')).setDisplaySize(30, 30).setAlpha(0.6));
      root.add(this.add.text(-CARD_W / 2 + 84, cy - 12, u.name, displayStyle(22, { color: UI.dim })).setOrigin(0, 0.5));
      root.add(this.add.text(-CARD_W / 2 + 84, cy + 14, u.era, textStyle(13, { color: UI.muted })).setOrigin(0, 0.5));
    });
    enter(this, root, { y: 60 }, 80 + CAMPAIGN_IDS.length * 70, 240);
  }

  private step(dir: number) {
    const open = CAMPAIGN_IDS.filter((c) => campaignUnlocked(profile.data, c));
    const i = open.indexOf(this.selected);
    this.selected = open[(i + dir + open.length) % open.length];
    this.refresh();
  }

  private refresh() {
    for (const [id, c] of this.cards) {
      const on = id === this.selected;
      this.tweens.killTweensOf([c.root, c.glow]);
      this.tweens.add({ targets: c.root, y: this.cardY + (on ? -10 : 0), scale: (on ? 1.03 : 1) * this.cardScale, alpha: 1, duration: 180, ease: 'Back.Out' });
      c.glow.setAlpha(0);
      if (on) this.tweens.add({ targets: c.glow, alpha: { from: 0.35, to: 0.7 }, duration: 800, ease: 'Sine.InOut', yoyo: true, repeat: -1 });
    }
  }

  private go() {
    if (this.leaving) return;
    this.leaving = true;
    const save = profile.data;
    const id = this.selected;
    save.lastCampaign = id;
    profile.save();
    const intro = `${id}_intro` as StoryId;
    if (id !== 'road' && !save.story.seen.includes(intro)) {
      this.story.play([intro], (beat) => {
        markSeen(save, beat);
        profile.save();
        this.time.delayedCall(150, () => this.scene.start('heroSelect', { campaign: id }));
      });
      return;
    }
    this.scene.start('heroSelect', { campaign: id });
  }
}
