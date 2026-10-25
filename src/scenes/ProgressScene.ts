import Phaser from 'phaser';
import { ENEMIES } from '../data/enemies';
import { ACHIEVEMENT_IDS, ACHIEVEMENTS, rewardsFor, titleFor, xpForLevel } from '../data/progression';
import { journeyName, REGIONS, ROUTE } from '../data/regions';
import { STORY, STORY_ORDER } from '../data/story';
import { StoryDialog } from '../ui/dialog';
import { MAP, MAP_NODES } from '../render/sprites';
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
    this.add.text(PANEL.x, top + 38, `Kervan Yolu · ${journeyName(journey)}`, displayStyle(26)).setOrigin(0.5);

    // Parşömen harita: manifestteki düğüm noktaları 1100 × 420 tuvale göre
    const mapW = 900;
    const scale = mapW / 1100;
    const ox = PANEL.x - mapW / 2;
    const oy = top + 64;
    const at = (key: keyof typeof MAP_NODES) => [ox + MAP_NODES[key][0] * scale, oy + MAP_NODES[key][1] * scale] as const;
    if (this.textures.exists(MAP.route)) this.add.image(ox, oy, MAP.route).setOrigin(0).setDisplaySize(mapW, 420 * scale);

    ROUTE.forEach((id, i) => {
      const r = REGIONS[id];
      const [x, y] = at(id);
      const reached = journey > 1 || i <= current;
      const here = i === current;
      if (here) {
        const ring = this.add.circle(x, y, 40, UI.goldNum, 0).setStrokeStyle(4, UI.goldNum);
        this.tweens.add({ targets: ring, scale: { from: 1, to: 1.25 }, alpha: { from: 1, to: 0 }, duration: 1100, repeat: -1 });
      }
      const icon = this.add.image(x, y, MAP.icons[id]).setDisplaySize(64, 64);
      if (!reached) icon.setTint(0x3a3348);
      const label = this.add.text(x, y + 44, reached ? r.name : '???', displayStyle(17, { color: reached ? UI.ink : '#6f6879' })).setOrigin(0.5);
      label.setStroke('#f0e6d2', 5);
      if (reached && bosses.includes(r.boss)) this.add.text(x + 26, y - 26, '✓', displayStyle(20, { color: '#3f7f3a' })).setOrigin(0.5).setStroke('#f0e6d2', 5);
    });
    const [hx, hy] = at('horizon');
    this.add.text(hx - 20, hy + 34, journeyName(journey + 1), displayStyle(14, { color: UI.ink })).setOrigin(0.5).setStroke('#f0e6d2', 4);

    const r = REGIONS[ROUTE[current]];
    const card = this.add.container(PANEL.x, top + 456);
    const bg = this.add.graphics();
    bg.fillStyle(UI.bgRaised).fillRoundedRect(-450, -46, 900, 92, 16).lineStyle(2, UI.panelEdge).strokeRoundedRect(-450, -46, 900, 92, 16);
    card.add(bg);
    card.add(this.add.image(-410, 0, MAP.icons[ROUTE[current]]).setDisplaySize(52, 52));
    card.add(this.add.text(-372, -20, `Şu an: ${r.name} · boss: ${ENEMIES[r.boss].name}`, displayStyle(19, { color: UI.gold })).setOrigin(0, 0.5));
    card.add(this.add.text(-372, 4, r.desc, textStyle(15, { color: UI.muted, wordWrap: { width: 800 } })).setOrigin(0, 0));
    card.add(this.add.text(430, -20, `En iyi dalga: ${profile.data.lifetime.bestWave}`, textStyle(14, { color: UI.muted })).setOrigin(1, 0.5));
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
