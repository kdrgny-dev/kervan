import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { DEDE, NARRATOR, STORY, type StoryBeat, type StoryId } from '../data/story';
import { DEDE_ART, NARRATOR_ART } from '../render/sprites';
import { slice } from './kit';
import { displayStyle, textStyle, UI } from './theme';
import { view } from '../render/resolution';

const TYPE_MS = 18;

/** Kervanbaşının konuşma kutusu; satırları daktilo efektiyle gösterir. */
export class StoryDialog {
  private readonly root: Phaser.GameObjects.Container;
  private readonly title: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly nameTag: Phaser.GameObjects.Text;
  private readonly portrait?: Phaser.GameObjects.Image;
  private queue: StoryId[] = [];
  private lines: string[] = [];
  private line = 0;
  private shown = 0;
  private typing?: Phaser.Time.TimerEvent;
  private onBeatDone: (id: StoryId) => void = () => undefined;
  private current?: StoryId;

  constructor(private readonly scene: Phaser.Scene) {
    const { width, height } = view(scene);
    this.root = scene.add.container(0, 0).setDepth(80).setVisible(false);
    const shade = scene.add.rectangle(0, 0, width, height, UI.bg, 0.55).setOrigin(0).setInteractive();
    shade.on('pointerup', () => this.advance());
    const boxY = height - 150;
    const box = slice(scene, 'ui.panel', width / 2, boxY, 900, 220);

    const fx = width / 2 - 360;
    const face = scene.add.graphics();
    face.fillStyle(UI.panel2).fillCircle(fx, boxY - 24, 74).lineStyle(4, 0x14121c).strokeCircle(fx, boxY - 24, 74);
    face.lineStyle(3, UI.goldNum, 0.8).strokeCircle(fx, boxY - 24, 68);
    if (scene.textures.exists(NARRATOR_ART.normal)) {
      this.portrait = scene.add.image(fx, boxY - 26, NARRATOR_ART.normal).setDisplaySize(150, 150);
    }
    this.nameTag = scene.add.text(fx, boxY + 62, NARRATOR, displayStyle(17, { color: UI.gold })).setOrigin(0.5);

    this.title = scene.add.text(width / 2 - 270, boxY - 84, '', displayStyle(26)).setOrigin(0, 0.5);
    this.body = scene.add.text(width / 2 - 270, boxY - 52, '', textStyle(20, { wordWrap: { width: 650 }, lineSpacing: 6 })).setOrigin(0, 0);
    this.hint = scene.add.text(width / 2 + 420, boxY + 86, 'Devam ▸', displayStyle(16, { color: UI.muted })).setOrigin(1, 0.5);
    scene.tweens.add({ targets: this.hint, alpha: { from: 1, to: 0.35 }, duration: 600, yoyo: true, repeat: -1 });

    this.root.add([shade, box, face, ...(this.portrait ? [this.portrait] : []), this.nameTag, this.title, this.body, this.hint]);
    scene.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (this.open && (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape')) this.advance();
    });
  }

  get open() {
    return this.root.visible;
  }

  /** Sıradaki anları gösterir; her an bitince onBeatDone çağrılır. */
  play(ids: StoryId[], onBeatDone: (id: StoryId) => void) {
    this.queue = [...ids];
    this.onBeatDone = onBeatDone;
    this.next();
  }

  advance() {
    if (!this.open) return;
    if (this.shown < this.lines[this.line].length) {
      this.typing?.remove();
      this.shown = this.lines[this.line].length;
      this.body.setText(this.lines[this.line]);
      return;
    }
    audio.play('click');
    this.line++;
    if (this.line < this.lines.length) return this.type();
    if (this.current) this.onBeatDone(this.current);
    this.next();
  }

  private next() {
    const id = this.queue.shift();
    if (!id) {
      this.root.setVisible(false);
      return;
    }
    this.current = id;
    this.lines = STORY[id].lines;
    this.line = 0;
    this.title.setText(STORY[id].title);
    const beat: StoryBeat = STORY[id];
    const art = beat.voice === 'dede' ? DEDE_ART : NARRATOR_ART;
    const face = art[beat.mood ?? 'normal'];
    if (this.portrait && this.scene.textures.exists(face)) this.portrait.setTexture(face).setDisplaySize(150, 150);
    this.nameTag.setText(beat.voice === 'dede' ? DEDE : NARRATOR);
    if (!this.root.visible) {
      this.root.setVisible(true).setAlpha(0);
      this.scene.tweens.add({ targets: this.root, alpha: 1, duration: 200 });
    }
    this.type();
  }

  private type() {
    this.typing?.remove();
    this.shown = 0;
    this.body.setText('');
    const text = this.lines[this.line];
    this.typing = this.scene.time.addEvent({
      delay: TYPE_MS,
      repeat: text.length - 1,
      callback: () => {
        this.shown++;
        this.body.setText(text.slice(0, this.shown));
      },
    });
  }
}
