import Phaser from 'phaser';
import { ENEMIES } from '../data/enemies';
import { ACHIEVEMENT_IDS, ACHIEVEMENTS, rewardsFor, titleFor, xpForLevel } from '../data/progression';
import { journeyName, REGIONS, ROUTE } from '../data/regions';
import { STORY, STORY_ORDER } from '../data/story';
import { StoryDialog } from '../ui/dialog';
import { bindPad } from '../input/gamepad';
import { profile } from '../meta/profile';
import { ensureQuests, questDef } from '../meta/progression';
import type { QuestBoard } from '../meta/save';
import { icon } from '../ui/assets';
import { Bar, Button, enter, fmt, panel, tab } from '../ui/kit';
import { backdrop, fadeIn, rewardChip, rewardRow, wallet } from '../ui/screen';
import { displayStyle, textStyle, UI } from '../ui/theme';

type Tab = 'quests' | 'track' | 'achievements' | 'map' | 'journal';

const PANEL = { x: 576, y: 425, w: 990, h: 530 };

/** Gece yarısına kalan süre. */
function untilMidnight(now = new Date()) {
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  const min = Math.max(0, Math.round((end.getTime() - now.getTime()) / 60000));
  return `${Math.floor(min / 60)} sa ${min % 60} dk`;
}

export class ProgressScene extends Phaser.Scene {
  private tab: Tab = 'quests';

  constructor() {
    super('progress');
  }

  init(data: { tab?: Tab }) {
    this.tab = data.tab ?? 'map';
  }

  create() {
    ensureQuests(profile.data);
    fadeIn(this);
    backdrop(this);
    wallet(this);

    new Button(this, 78, 60, '', () => this.back(), { width: 64, height: 64, icon: 'back', iconOnly: true });
    this.add.text(126, 58, 'Yolculuk', displayStyle(46)).setOrigin(0, 0.5);

    const box = this.add.container(PANEL.x, PANEL.y, [panel(this, 0, 0, PANEL.w, PANEL.h)]);
    enter(this, box, { y: -30 }, 0, 200);
    const tabs: [Tab, string][] = [['map', 'Harita'], ['quests', 'Görevler'], ['track', 'Ödül Yolu'], ['achievements', 'Başarımlar'], ['journal', 'Günlük']];
    tabs.forEach(([t, label], i) => tab(this, 175 + i * 192, 138, 184, label, this.tab === t, () => this.scene.restart({ tab: t })));

    if (this.tab === 'quests') this.quests();
    else if (this.tab === 'track') this.track();
    else if (this.tab === 'achievements') this.achievements();
    else if (this.tab === 'map') this.map();
    else this.journal();

    this.input.keyboard?.on('keydown-ESC', () => this.back());
    bindPad(this, { back: () => this.back() });
  }

  private back() {
    this.scene.start('menu');
  }

  // ---------- Harita ----------

  private map() {
    const { furthest, bosses } = profile.data.journey;
    const journey = Math.floor(furthest / ROUTE.length) + 1;
    const current = furthest % ROUTE.length;
    const top = PANEL.y - PANEL.h / 2;
    this.add.text(PANEL.x, top + 50, `Kervan Yolu · ${journeyName(journey)}`, displayStyle(28)).setOrigin(0.5);
    this.add
      .text(PANEL.x, top + 84, `En iyi dalga: ${profile.data.lifetime.bestWave} · her bölge 10 dalga, her 5 dalgada bir boss`, textStyle(15, { color: UI.muted }))
      .setOrigin(0.5);

    const gap = 210;
    const x0 = PANEL.x - (gap * ROUTE.length) / 2 + gap / 2 - 50;
    const ny = top + 210;
    const road = this.add.graphics();
    road.lineStyle(10, UI.panelEdge).lineBetween(x0, ny, x0 + gap * ROUTE.length, ny);
    road.lineStyle(10, 0x8a5532).lineBetween(x0, ny, x0 + gap * Math.min(furthest, ROUTE.length), ny);

    ROUTE.forEach((id, i) => {
      const r = REGIONS[id];
      const x = x0 + i * gap;
      const reached = journey > 1 || i <= current;
      const here = journey === 1 ? i === current : false;
      const disc = this.add.graphics();
      disc.fillStyle(reached ? r.floorTint : UI.bgRaised).fillCircle(x, ny, 46);
      disc.fillStyle(0x2f4032, reached ? 0.55 : 0).fillCircle(x, ny, 46);
      disc.lineStyle(4, here ? UI.goldNum : 0x14121c).strokeCircle(x, ny, 46);
      if (here) disc.lineStyle(3, UI.goldNum, 0.45).strokeCircle(x, ny, 56);
      this.add.text(x, ny, reached ? `${i + 1}` : '?', displayStyle(30, { color: reached ? UI.text : UI.dim })).setOrigin(0.5);
      this.add.text(x, ny + 70, reached ? r.name : '???', displayStyle(19, { color: reached ? UI.text : UI.dim })).setOrigin(0.5);
      const bossDown = bosses.includes(r.boss);
      this.add
        .text(x, ny + 96, reached ? `${bossDown ? '✓' : '·'} ${ENEMIES[r.boss].name}` : 'Keşfedilmedi', textStyle(13, { color: bossDown ? UI.gold : UI.muted }))
        .setOrigin(0.5);
    });
    const endX = x0 + gap * ROUTE.length;
    this.add.text(endX, ny, '∞', displayStyle(40, { color: furthest >= ROUTE.length ? UI.gold : UI.dim })).setOrigin(0.5);
    this.add.text(endX, ny + 70, journeyName(journey + 1), displayStyle(17, { color: UI.muted })).setOrigin(0.5);

    const r = REGIONS[ROUTE[current]];
    const card = this.add.container(PANEL.x, top + 420);
    const bg = this.add.graphics();
    bg.fillStyle(UI.bgRaised).fillRoundedRect(-420, -60, 840, 120, 16).lineStyle(2, UI.panelEdge).strokeRoundedRect(-420, -60, 840, 120, 16);
    card.add(bg);
    card.add(this.add.text(-390, -30, `Şu an: ${r.name}`, displayStyle(22, { color: UI.gold })).setOrigin(0, 0.5));
    card.add(this.add.text(-390, 4, r.desc, textStyle(16, { color: UI.muted, wordWrap: { width: 780 } })).setOrigin(0, 0));
  }

  // ---------- Günlük ----------

  private journal() {
    const seen = STORY_ORDER.filter((id) => profile.data.story.seen.includes(id));
    const dialog = new StoryDialog(this);
    const top = PANEL.y - PANEL.h / 2;
    this.add.text(PANEL.x, top + 44, 'Kervanbaşının anlattıkları · okumak için tıkla', textStyle(15, { color: UI.muted })).setOrigin(0.5);
    if (seen.length === 0) {
      this.add.text(PANEL.x, PANEL.y, 'Henüz bir şey anlatılmadı.\nYola çık, Hüsnü konuşmayı sever.', textStyle(20, { color: UI.muted, align: 'center' })).setOrigin(0.5);
      return;
    }
    const cols = 2;
    const w = 440;
    const h = 64;
    seen.forEach((id, i) => {
      const x = PANEL.x - w / 2 - 10 + (i % cols) * (w + 20);
      const y = top + 100 + Math.floor(i / cols) * (h + 10);
      const c = this.add.container(x, y);
      const bg = this.add.graphics();
      bg.fillStyle(UI.panel2).fillRoundedRect(-w / 2, -h / 2, w, h, 12).lineStyle(2, UI.panelEdge).strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
      c.add(bg);
      c.add(this.add.text(-w / 2 + 18, -12, STORY[id].title, displayStyle(18, { color: UI.gold })).setOrigin(0, 0.5));
      const preview = STORY[id].lines[0];
      c.add(this.add.text(-w / 2 + 18, 12, preview.length > 58 ? `${preview.slice(0, 56)}…` : preview, textStyle(13, { color: UI.muted })).setOrigin(0, 0.5));
      const zone = this.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => !dialog.open && dialog.play([id], () => undefined));
      c.add(zone);
    });
  }

  // ---------- Görevler ----------

  private quests() {
    const q = profile.data.quests;
    const left = PANEL.x - PANEL.w / 2 + 56;
    let y = PANEL.y - PANEL.h / 2 + 46;
    this.add.text(left, y, 'Günlük görevler', displayStyle(24)).setOrigin(0, 0.5);
    this.add.text(PANEL.x + PANEL.w / 2 - 56, y, `Yenilenme: ${untilMidnight()}`, textStyle(15, { color: UI.muted })).setOrigin(1, 0.5);
    y += 50;
    y = this.board(q.daily, 'daily', left, y);
    y += 10;
    this.add.text(left, y, 'Haftalık görevler', displayStyle(24)).setOrigin(0, 0.5);
    y += 50;
    this.board(q.weekly, 'weekly', left, y);
  }

  private board(board: QuestBoard, kind: 'daily' | 'weekly', left: number, y: number) {
    board.items.forEach((slot, i) => {
      const def = questDef(kind, slot.id);
      if (!def) return;
      const row = this.add.container(0, y);
      row.add(this.add.image(left + 14, 0, icon(slot.done ? 'trophy' : 'sword')).setDisplaySize(28, 28).setAlpha(slot.done ? 1 : 0.6));
      row.add(this.add.text(left + 42, -12, def.desc, displayStyle(19, { color: slot.done ? UI.gold : UI.text })).setOrigin(0, 0.5));
      const bar = new Bar(this, left + 42 + 150, 16, 300, 'xp').setRatio(slot.progress / def.target, false);
      row.add(bar);
      row.add(this.add.text(left + 42 + 312, 16, slot.done ? 'Tamamlandı' : `${fmt(slot.progress)}/${fmt(def.target)}`, textStyle(14, { color: slot.done ? UI.gold : UI.muted })).setOrigin(0, 0.5));
      row.add(rewardRow(this, PANEL.x + PANEL.w / 2 - 56, 0, def.reward, 'right'));
      row.add(this.add.rectangle(PANEL.x, 36, PANEL.w - 80, 2, UI.panelEdge));
      row.setAlpha(0);
      this.tweens.add({ targets: row, alpha: 1, duration: 160, delay: 80 + i * 50 });
      y += 72;
    });
    return y;
  }

  // ---------- Ödül yolu ----------

  private track() {
    const { level, xp } = profile.data.account;
    const top = PANEL.y - PANEL.h / 2;
    this.add.text(PANEL.x, top + 54, `Seviye ${level} · ${titleFor(level)}`, displayStyle(28)).setOrigin(0.5);
    new Bar(this, PANEL.x, top + 98, 520, 'xp').setRatio(xp / xpForLevel(level), false);
    this.add.text(PANEL.x, top + 128, `Sonraki seviyeye ${fmt(xpForLevel(level) - xp)} XP`, textStyle(15, { color: UI.muted })).setOrigin(0.5);

    const first = Math.max(2, level - 1);
    const count = 7;
    const gap = 132;
    const x0 = PANEL.x - ((count - 1) * gap) / 2;
    const ny = top + 250;
    this.add.rectangle(PANEL.x, ny, gap * (count - 1), 6, UI.panelEdge);
    for (let i = 0; i < count; i++) {
      const lvl = first + i;
      const x = x0 + i * gap;
      const reached = lvl <= level;
      const next = lvl === level + 1;
      const disc = this.add.graphics();
      disc.fillStyle(reached ? 0x3d74c9 : next ? UI.goldNum : UI.bgRaised).fillCircle(x, ny, 30);
      disc.lineStyle(3, 0x14121c).strokeCircle(x, ny, 30);
      if (next) disc.lineStyle(4, UI.goldNum, 0.5).strokeCircle(x, ny, 38);
      this.add.text(x, ny, `${lvl}`, displayStyle(24, { color: next ? UI.ink : UI.text })).setOrigin(0.5);
      rewardsFor(lvl).forEach((r, j) => {
        const chip = rewardChip(this, 0, 0, r);
        chip.setPosition(x - chip.width / 2, ny + 60 + j * 30).setAlpha(reached ? 0.45 : 1);
      });
      if (reached) this.add.image(x + 22, ny - 22, icon('trophy')).setDisplaySize(20, 20);
    }
    this.add
      .text(PANEL.x, PANEL.y + PANEL.h / 2 - 50, 'Her tur XP kazandırır: dalga ×15 · öldürme ×1 · boss ×60. Görevler ek XP verir.', textStyle(15, { color: UI.muted }))
      .setOrigin(0.5);
  }

  // ---------- Başarımlar ----------

  private achievements() {
    const got = profile.data.achievements;
    const cols = 3;
    const w = 300;
    const h = 84;
    const x0 = PANEL.x - w - 14;
    const y0 = PANEL.y - PANEL.h / 2 + 64;
    this.add.text(PANEL.x + PANEL.w / 2 - 50, PANEL.y - PANEL.h / 2 - 26, `${got.length}/${ACHIEVEMENT_IDS.length}`, displayStyle(20, { color: UI.gold })).setOrigin(1, 0.5);
    ACHIEVEMENT_IDS.forEach((id, i) => {
      const def = ACHIEVEMENTS[id];
      const done = got.includes(id);
      const x = x0 + (i % cols) * (w + 14);
      const y = y0 + Math.floor(i / cols) * (h + 12);
      const c = this.add.container(x, y);
      const bg = this.add.graphics();
      bg.fillStyle(done ? UI.panel2 : UI.bgRaised).fillRoundedRect(-w / 2, -h / 2, w, h, 14);
      bg.lineStyle(3, done ? UI.goldNum : UI.panelEdge).strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
      c.add(bg);
      c.add(this.add.image(-w / 2 + 30, 0, icon('trophy')).setDisplaySize(34, 34).setAlpha(done ? 1 : 0.3));
      c.add(this.add.text(-w / 2 + 56, -20, def.name, displayStyle(18, { color: done ? UI.gold : UI.text })).setOrigin(0, 0.5));
      c.add(this.add.text(-w / 2 + 56, 2, def.desc, textStyle(13, { color: UI.muted })).setOrigin(0, 0.5));
      c.add(rewardRow(this, -w / 2 + 56, 24, def.reward));
      c.setAlpha(0);
      this.tweens.add({ targets: c, alpha: 1, duration: 160, delay: 40 + i * 25 });
    });
  }
}
