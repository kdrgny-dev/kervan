import Phaser from 'phaser';
import { SWIPE_MIN_PX } from '../config';
import type { Dir } from '../sim/grid';

const KEYS: Record<string, Dir> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
};

export interface ControlHandlers {
  onDir: (dir: Dir) => void;
  onConfirm: () => void;
  onPause: () => void;
}

export function bindControls(scene: Phaser.Scene, h: ControlHandlers) {
  scene.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
    const dir = KEYS[e.code];
    if (dir) {
      e.preventDefault();
      h.onDir(dir);
    } else if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyR') {
      h.onConfirm();
    } else if (e.code === 'Escape' || e.code === 'KeyP') {
      h.onPause();
    }
  });

  let start: { x: number; y: number } | null = null;
  scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
    start = { x: p.x, y: p.y };
  });
  scene.input.on('pointerup', (p: Phaser.Input.Pointer) => {
    if (!start) return;
    const dx = p.x - start.x;
    const dy = p.y - start.y;
    start = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN_PX) return;
    if (Math.abs(dx) > Math.abs(dy)) h.onDir(dx > 0 ? 'right' : 'left');
    else h.onDir(dy > 0 ? 'down' : 'up');
  });
}
