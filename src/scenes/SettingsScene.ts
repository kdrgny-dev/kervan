import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { bindPad } from '../input/gamepad';
import { profile } from '../meta/profile';
import type { Settings } from '../meta/save';
import { isDesktop, isFullscreen, toggleFullscreen } from '../platform';
import { icon, type IconName } from '../ui/assets';
import { Button, enter, panel, ribbon, Toggle } from '../ui/kit';
import { backdrop, fadeIn } from '../ui/screen';
import { textStyle, UI } from '../ui/theme';
import { sharpen, view } from '../render/resolution';

const ROWS: { key: keyof Settings | 'fullscreen'; label: string; icon?: IconName }[] = [
  { key: 'shake', label: 'Ekran sarsıntısı' },
  { key: 'damageNumbers', label: 'Hasar sayıları' },
  { key: 'sfx', label: 'Ses efektleri', icon: 'sound' },
  { key: 'music', label: 'Müzik', icon: 'music' },
  { key: 'fullscreen', label: 'Tam ekran', icon: 'fullscreen' },
];

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('settings');
  }

  create() {
    sharpen(this.cameras.main);
    const { width, height } = view(this);
    const settings = profile.data.settings;
    fadeIn(this);
    backdrop(this);

    const box = this.add.container(width / 2, 318);
    box.add(panel(this, 0, 0, 516, 446));
    box.add(ribbon(this, 0, -222, 'Ayarlar', { icon: 'settings', width: 300 }));
    enter(this, box, { y: -48 }, 0, 200);

    const rowH = 72;
    ROWS.forEach((row, i) => {
      const y = -125 + i * rowH;
      const line = this.add.container(0, y);
      if (row.icon) line.add(this.add.image(-208, 0, icon(row.icon)).setDisplaySize(28, 28));
      line.add(this.add.text(-174, 0, row.label, textStyle(20)).setOrigin(0, 0.5));
      if (i < ROWS.length - 1) line.add(this.add.rectangle(0, rowH / 2, 448, 2, UI.panelEdge));

      if (row.key === 'fullscreen' && !isDesktop && !this.sys.game.device.fullscreen.available) {
        // iPhone Safari tam ekran API'sini desteklemez; ana ekrandan açılınca zaten tam ekran
        line.add(this.add.text(176 + 40, 0, 'Ana ekrana ekle', textStyle(15, { color: UI.muted })).setOrigin(1, 0.5));
      } else if (row.key === 'fullscreen') {
        const t = new Toggle(this, 176, 0, false, () => void toggleFullscreen(this.scale).then(sync));
        const sync = () => this.time.delayedCall(150, async () => t.set(await isFullscreen(this.scale)));
        void sync();
        line.add(t);
      } else {
        const key = row.key;
        line.add(
          new Toggle(this, 176, 0, settings[key], (v) => {
            settings[key] = v;
            profile.save();
            audio.configure(settings);
          }),
        );
      }
      box.add(line);
      line.setAlpha(0);
      this.tweens.add({ targets: line, alpha: 1, duration: 140, delay: 80 + i * 40, ease: 'Quad.Out' });
    });

    new Button(this, width / 2, height - 86, 'Geri', () => this.scene.start('menu'), { width: 196, height: 64, icon: 'back' });
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('menu'));
    bindPad(this, { back: () => this.scene.start('menu') });
  }
}
