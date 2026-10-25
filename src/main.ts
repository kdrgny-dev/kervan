import Phaser from 'phaser';
import { CELL, GRID_H, GRID_W } from './config';
import { audio } from './audio/audio';
import { profile } from './meta/profile';
import { toggleFullscreen } from './platform';
import { BootScene, PreloadScene } from './scenes/BootScene';
import { CampaignScene } from './scenes/CampaignScene';
import { CollectionScene } from './scenes/CollectionScene';
import { ProgressScene } from './scenes/ProgressScene';
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
  scene: [BootScene, PreloadScene, MenuScene, HeroSelectScene, GameScene, ShopScene, SettingsScene, ProgressScene, CollectionScene, CampaignScene],
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'F11') {
    e.preventDefault();
    void toggleFullscreen(game.scale);
  }
});

if (import.meta.env.DEV) Object.assign(window, { __kervan: game, __profile: profile });
