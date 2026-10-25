import Phaser from 'phaser';
import { CAMPAIGNS, type CampaignId, CAMPAIGN_IDS, finalWave, UPCOMING } from '../data/campaigns';
import { HEROES } from '../data/heroes';
import { REGIONS, regionAt } from '../data/regions';
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

const CARD_W = 330;
const CARD_H = 430;
const COVER_H = 150;
const COVER_LABEL: Record<CampaignId, string> = { road: 'Kervan', fetih: '1453' };

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

  constructor() {
    super('campaigns');
  }

  create() {
    const { width, height } = this.scale;
    const save = profile.data;
    this.cards = new Map();
    this.leaving = false;
    this.selected = campaignUnlocked(save, save.lastCampaign) ? save.lastCampaign : 'road';

    fadeIn(this);
    backdrop(this);
    wallet(this);
    ribbon(this, width / 2, 68, 'Yolculuk seç', { width: 400 });

    const gap = 26;
    const x0 = width / 2 - CARD_W - gap;
    CAMPAIGN_IDS.forEach((id, i) => this.card(id, x0 + i * (CARD_W + gap), 350, i));
    this.upcoming(x0 + CAMPAIGN_IDS.length * (CARD_W + gap), 350);

    new Button(this, 145, height - 70, 'Geri', () => this.scene.start('menu'), { width: 196, height: 64, icon: 'back' });
    new Button(this, width - 195, height - 66, 'Kahraman seç', () => this.go(), { variant: 'primary', width: 296, height: 72, fontSize: 30 });

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
    const root = this.add.container(x, y);

    const glow = this.add.graphics().setAlpha(0);
    glow.lineStyle(8, UI.goldNum, 1).strokeRoundedRect(-CARD_W / 2 - 6, -CARD_H / 2 - 6, CARD_W + 12, CARD_H + 12, 22);
    root.add([glow, slice(this, 'ui.panel', 0, 0, CARD_W, CARD_H).setAlpha(locked ? 0.6 : 1)]);

    const top = -CARD_H / 2 + 18;
    root.add(this.cover(id, 0, top + COVER_H / 2, locked));
    root.add(this.add.text(0, top + COVER_H + 30, def.name, displayStyle(30, { color: locked ? UI.dim : UI.text })).setOrigin(0.5));
    root.add(this.add.text(0, top + COVER_H + 58, def.era, textStyle(14, { color: UI.gold, fontStyle: '800' })).setOrigin(0.5));
    root.add(
      this.add
        .text(0, top + COVER_H + 80, def.desc, textStyle(14, { color: UI.muted, align: 'center', wordWrap: { width: CARD_W - 48 } }))
        .setOrigin(0.5, 0),
    );

    const foot = CARD_H / 2 - 40;
    if (locked) {
      root.add(this.add.image(-96, foot, icon('lock')).setDisplaySize(30, 30));
      root.add(this.add.text(-74, foot, `Hesap Sv ${def.unlockLevel}’da açılır`, displayStyle(17, { color: UI.muted })).setOrigin(0, 0.5));
    } else root.add(this.progress(id, foot));

    const zone = this.add.zone(0, 0, CARD_W, CARD_H).setInteractive({ useHandCursor: !locked });
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

  /** Kapak çizimleri gelene kadar: rotanın bölge renklerinden şerit. */
  private cover(id: CampaignId, x: number, y: number, locked: boolean) {
    const w = CARD_W - 36;
    const c = this.add.container(x, y);
    const route = CAMPAIGNS[id].route;
    const g = this.add.graphics();
    const bw = w / route.length;
    route.forEach((r, i) => g.fillStyle(REGIONS[r].color, 1).fillRect(-w / 2 + i * bw, -COVER_H / 2, bw + 1, COVER_H));
    g.fillStyle(0x14121c, 0.35).fillRect(-w / 2, -COVER_H / 2, w, COVER_H);
    c.add(g);
    c.add(this.add.text(0, 0, COVER_LABEL[id], displayStyle(52)).setOrigin(0.5));
    const frame = this.add.graphics();
    frame.lineStyle(4, 0x14121c).strokeRoundedRect(-w / 2, -COVER_H / 2, w, COVER_H, 12);
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
    const root = this.add.container(x, y);
    root.add(slice(this, 'ui.panel', 0, 0, CARD_W, CARD_H).setAlpha(0.6));
    root.add(this.add.text(0, -CARD_H / 2 + 50, 'Yakında', displayStyle(30, { color: UI.dim })).setOrigin(0.5));
    root.add(this.add.text(0, -CARD_H / 2 + 82, 'Hüsnü’nün dedeleri daha çok yol gördü', textStyle(14, { color: UI.muted })).setOrigin(0.5));
    UPCOMING.forEach((u, i) => {
      const cy = -CARD_H / 2 + 150 + i * 82;
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
      this.tweens.add({ targets: c.root, y: 350 + (on ? -10 : 0), scale: on ? 1.03 : 1, alpha: 1, duration: 180, ease: 'Back.Out' });
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
