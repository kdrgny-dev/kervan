import Phaser from 'phaser';
import type { Dir } from '../sim/grid';

export interface PadHandlers {
  dir?: (d: Dir) => void;
  confirm?: () => void;
  back?: () => void;
  pause?: () => void;
}

const STICK_DEADZONE = 0.5;

// Standart eşleme: 0=A, 1=B, 9=Start, 12-15=d-pad
const BUTTON_DIRS: Record<number, Dir> = { 12: 'up', 13: 'down', 14: 'left', 15: 'right' };

export function bindPad(scene: Phaser.Scene, h: PadHandlers) {
  const gp = scene.input.gamepad;
  if (!gp) return;

  const onDown = (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
    const dir = BUTTON_DIRS[button.index];
    if (dir) h.dir?.(dir);
    else if (button.index === 0) h.confirm?.();
    else if (button.index === 1) h.back?.();
    else if (button.index === 9) h.pause?.();
  };
  gp.on('down', onDown);

  // Analog çubuk: yalnızca yön değiştiğinde tetikle
  let last: Dir | null = null;
  const poll = () => {
    const pad = gp.getAll()[0];
    if (!pad) return;
    const { x, y } = pad.leftStick;
    let d: Dir | null = null;
    if (Math.max(Math.abs(x), Math.abs(y)) > STICK_DEADZONE) {
      d = Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : y > 0 ? 'down' : 'up';
    }
    if (d && d !== last) h.dir?.(d);
    last = d;
  };
  scene.events.on(Phaser.Scenes.Events.UPDATE, poll);

  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    gp.off('down', onDown);
    scene.events.off(Phaser.Scenes.Events.UPDATE, poll);
  });
}
