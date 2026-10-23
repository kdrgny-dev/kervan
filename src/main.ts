import Phaser from 'phaser';
import { CELL, GRID_H, GRID_W } from './config';
import { GameScene } from './scenes/GameScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GRID_W * CELL,
  height: GRID_H * CELL,
  backgroundColor: '#14121c',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [GameScene],
});

if (import.meta.env.DEV) Object.assign(window, { __kervan: game });
