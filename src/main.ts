import Phaser from 'phaser';
import { CELL, GRID_H, GRID_W } from './config';
import { audio } from './audio/audio';
import { profile } from './meta/profile';
import { toggleFullscreen } from './platform';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { HeroSelectScene } from './scenes/HeroSelectScene';
import { MenuScene } from './scenes/MenuScene';
import { SettingsScene } from './scenes/SettingsScene';
import { ShopScene } from './scenes/ShopScene';

audio.configure(profile.data.settings);
audio.unlockOnGesture();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GRID_W * CELL,
  height: GRID_H * CELL,
  backgroundColor: '#14121c',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  audio: { noAudio: true },
  input: { gamepad: true },
  scene: [BootScene, MenuScene, HeroSelectScene, GameScene, ShopScene, SettingsScene],
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'F11') {
    e.preventDefault();
    void toggleFullscreen(game.scale);
  }
});

if (import.meta.env.DEV) Object.assign(window, { __kervan: game, __profile: profile });
