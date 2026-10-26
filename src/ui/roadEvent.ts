import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { NARRATOR } from '../data/story';
import { NARRATOR_ART } from '../render/sprites';
import { view } from '../render/resolution';
import { canChoose, ROAD_EVENTS, type RoadEventId } from '../sim/roadEvents';
import type { World } from '../sim/types';
import { Button, slice } from './kit';
import { displayStyle, textStyle, UI } from './theme';

const BOX_W = 920;
const BOX_H = 430;
const BTN_W = 268;
const BTN_GAP = 18;

/** Dalga arasında Hüsnü'nün yol olayı: seçenekler, sonra sonucu anlatan cümle. */
export class RoadEventOverlay {
  private readonly root: Phaser.GameObjects.Container;
  private readonly title: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private readonly choices: Phaser.GameObjects.Container;
  private readonly next: Button;
  private buttons: Button[] = [];
  private allowed: boolean[] = [];
  private resolved = false;
  private readonly cy: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly h: { choose: (index: number) => string | null; done: () => void },
  ) {
    const { width, height } = view(scene);
    this.cy = height / 2 + 10;
    const cx = width / 2;
    const top = this.cy - BOX_H / 2;
    this.root = scene.add.container(0, 0).setDepth(56).setVisible(false);
    const shade = scene.add.rectangle(0, 0, width, height, UI.bg, 0.72).setOrigin(0).setInteractive();
    const box = slice(scene, 'ui.panel', cx, this.cy, BOX_W, BOX_H);

    const fx = cx - BOX_W / 2 + 120;
    const fy = top + 128;
    const face = scene.add.graphics();
    face.fillStyle(UI.panel2).fillCircle(fx, fy, 74).lineStyle(4, 0x14121c).strokeCircle(fx, fy, 74);
    face.lineStyle(3, UI.goldNum, 0.8).strokeCircle(fx, fy, 68);
    const parts: Phaser.GameObjects.GameObject[] = [shade, box, face];
    if (scene.textures.exists(NARRATOR_ART.normal)) parts.push(scene.add.image(fx, fy - 2, NARRATOR_ART.normal).setDisplaySize(150, 150));
    parts.push(scene.add.text(fx, fy + 88, NARRATOR, displayStyle(17, { color: UI.gold })).setOrigin(0.5));

    const tx = fx + 112;
    this.title = scene.add.text(tx, top + 52, '', displayStyle(28)).setOrigin(0, 0.5);
    this.body = scene.add.text(tx, top + 84, '', textStyle(20, { wordWrap: { width: cx + BOX_W / 2 - 44 - tx }, lineSpacing: 6 }));
    this.choices = scene.add.container(0, 0);
    this.next = new Button(scene, cx, this.cy + BOX_H / 2 - 62, 'Devam', () => this.finish(), { variant: 'primary', width: 240, height: 60 });
    this.root.add([...parts, this.title, this.body, this.choices, this.next]);

    scene.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (!this.open) return;
      const n = Number(e.key);
      if (n >= 1 && n <= this.buttons.length) this.confirm(n - 1);
    });
  }

  get open() {
    return this.root.visible;
  }

  show(w: World, id: RoadEventId) {
    const def = ROAD_EVENTS[id];
    this.resolved = false;
    this.title.setText(def.title);
    this.body.setText(def.text);
    this.choices.removeAll(true).setVisible(true);
    this.next.setVisible(false);
    const { width } = view(this.scene);
    const n = def.options.length;
    const x0 = width / 2 - ((n - 1) * (BTN_W + BTN_GAP)) / 2;
    const y = this.cy + BOX_H / 2 - 112;
    this.allowed = def.options.map((o) => canChoose(w, o));
    this.buttons = def.options.map((o, i) => {
      const x = x0 + i * (BTN_W + BTN_GAP);
      const b = new Button(this.scene, x, y, o.label, () => this.confirm(i), { width: BTN_W, height: 58, fontSize: 20 });
      b.setEnabled(this.allowed[i]);
      const hint = this.scene.add
        .text(x, y + 46, o.hint(w), textStyle(15, { color: this.allowed[i] ? UI.muted : UI.dim, align: 'center', wordWrap: { width: BTN_W } }))
        .setOrigin(0.5, 0);
      this.choices.add([b, hint]);
      return b;
    });
    this.root.setVisible(true).setAlpha(0);
    this.scene.tweens.add({ targets: this.root, alpha: 1, duration: 200 });
    audio.play('click');
  }

  /** Seçeneği seçer; index yoksa (Enter) yalnızca sonuç ekranını kapatır. */
  confirm(index?: number) {
    if (!this.open) return;
    if (this.resolved) return this.finish();
    if (index === undefined || !this.allowed[index]) return;
    const line = this.h.choose(index);
    if (line === null) return;
    audio.play('click');
    this.resolved = true;
    // Tıklanan düğme kendi olayının içinde yok edilmesin; bir sonraki olayda temizlenir
    for (const b of this.buttons) b.setEnabled(false);
    this.choices.setVisible(false);
    this.buttons = [];
    this.body.setText(line);
    this.next.setVisible(true);
  }

  private finish() {
    if (!this.resolved) return;
    this.root.setVisible(false);
    this.h.done();
  }

  hide() {
    this.root.setVisible(false);
  }
}
