import Phaser from 'phaser';
import { SWIPE_MIN_PX } from '../config';
import type { Dir } from '../sim/grid';
import { bindPad } from './gamepad';

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
  bindPad(scene, { dir: h.onDir, confirm: h.onConfirm, back: h.onPause, pause: h.onPause });

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

  // Kaydırma parmak kalkmadan algılanır: eşik aşılınca dönülür ve çapa oraya taşınır,
  // böylece tek hamlede art arda dönüş yapılabilir
  let anchor: { x: number; y: number } | null = null;
  let turned = false;
  const threshold = () => SWIPE_MIN_PX / (scene.scale.displaySize.width / scene.scale.width);
  const swipe = (p: Phaser.Input.Pointer, min: number) => {
    if (!anchor) return;
    const dx = p.x - anchor.x;
    const dy = p.y - anchor.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < min) return;
    if (Math.abs(dx) > Math.abs(dy)) h.onDir(dx > 0 ? 'right' : 'left');
    else h.onDir(dy > 0 ? 'down' : 'up');
    anchor = { x: p.x, y: p.y };
    turned = true;
  };
  scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
    anchor = { x: p.x, y: p.y };
    turned = false;
  });
  scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
    if (p.isDown) swipe(p, threshold());
  });
  scene.input.on('pointerup', (p: Phaser.Input.Pointer) => {
    // Hızlı fiske hareket olayı yetişmeden bitebilir
    if (!turned) swipe(p, threshold() * 0.6);
    anchor = null;
  });
}
