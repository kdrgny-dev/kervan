import Phaser from 'phaser';
import { CANVAS } from './render/resolution';
import { audio } from './audio/audio';
import { profile } from './meta/profile';
import { isDesktop, toggleFullscreen } from './platform';
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
audio.preload();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: CANVAS.width,
  height: CANVAS.height,
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

// Web sürümü ana ekrana eklenip çevrimdışı oynanabilsin; masaüstü paketi dosyaları zaten taşır
if (import.meta.env.PROD && !isDesktop && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('./sw.js').catch(() => undefined));
  // Yeni sürüm inince açık sayfa eski kodda kalıyor; oyun ortasında değilse yenile
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !game.scene.isActive('game')) location.reload();
  });
}
