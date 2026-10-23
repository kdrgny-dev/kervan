import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { profile } from '../meta/profile';
import type { Settings } from '../meta/save';
import { bindPad } from '../input/gamepad';
import { Button } from '../ui/Button';
import { textStyle, UI } from '../ui/theme';

const TOGGLES: { key: keyof Settings; label: string; note?: string }[] = [
  { key: 'shake', label: 'Ekran sarsıntısı' },
  { key: 'damageNumbers', label: 'Hasar sayıları' },
  { key: 'sfx', label: 'Ses efektleri' },
  { key: 'music', label: 'Müzik' },
];

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('settings');
  }

  create() {
    const { width, height } = this.scale;
    const settings = profile.data.settings;
    this.add.rectangle(width / 2, height / 2, width, height, UI.bg);
    this.add.text(width / 2, 70, 'Ayarlar', textStyle(40, { fontStyle: 'bold' })).setOrigin(0.5);

    TOGGLES.forEach((t, i) => {
      const y = 180 + i * 80;
      const label = () => `${t.label}: ${settings[t.key] ? 'Açık' : 'Kapalı'}${t.note ? `  (${t.note})` : ''}`;
      const btn: Button = new Button(
        this,
        width / 2,
        y,
        label(),
        () => {
          settings[t.key] = !settings[t.key];
          profile.save();
          audio.configure(settings);
          btn.setLabel(label());
        },
        { width: 480 },
      );
    });

    const fs = () => (this.scale.isFullscreen ? 'Tam ekrandan çık' : 'Tam ekran');
    const fsBtn: Button = new Button(this, width / 2, 180 + TOGGLES.length * 80, fs(), () => {
      this.scale.toggleFullscreen();
      this.time.delayedCall(100, () => fsBtn.setLabel(fs()));
    }, { width: 480 });

    new Button(this, width / 2, height - 70, 'Geri', () => this.scene.start('menu'), { width: 220 });
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('menu'));
    bindPad(this, { back: () => this.scene.start('menu') });
  }
}
