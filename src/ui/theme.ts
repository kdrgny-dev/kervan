import type Phaser from 'phaser';
import { RES } from '../render/resolution';

export const FONT = '"Nunito", system-ui, -apple-system, "Segoe UI", sans-serif';
export const FONT_DISPLAY = '"Grandstander", "Nunito", system-ui, sans-serif';

/** docs/design/stage4/tokens.json */
export const UI = {
  bg: 0x14121c,
  bgRaised: 0x1b1826,
  panel: 0x231f2e,
  panel2: 0x2d2839,
  panelEdge: 0x3a3348,
  edgeHi: 0x51486a,
  primary: 0xf0c23b,
  primaryHover: 0xf7d978,
  secondary: 0x51486a,
  secondaryHover: 0x5e5479,
  goldNum: 0xf0c23b,
  xpNum: 0x7fb3ec,
  bossNum: 0x8e5bc9,
  dangerNum: 0xe5533d,
  successNum: 0x6fbf5a,
  text: '#f4efe6',
  muted: '#a39c8f',
  dim: '#6f6879',
  gold: '#f0c23b',
  gem: '#7fb3ec',
  danger: '#ff7a6a',
  ink: '#14121c',
};

export const MOTION = { fast: 120, base: 200, slow: 320 };

export const textStyle = (size: number, extra: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: FONT,
  fontSize: `${size}px`,
  fontStyle: '700',
  color: UI.text,
  resolution: RES,
  ...extra,
});

export const displayStyle = (size: number, extra: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: FONT_DISPLAY,
  fontSize: `${size}px`,
  fontStyle: '900',
  color: UI.text,
  resolution: RES,
  ...extra,
});
