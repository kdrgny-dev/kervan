import type Phaser from 'phaser';

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const UI = {
  bg: 0x14121c,
  panel: 0x231f2e,
  panelEdge: 0x3a3348,
  primary: 0xd9a441,
  primaryHover: 0xe8b955,
  secondary: 0x3a3348,
  secondaryHover: 0x4a4258,
  text: '#f4efe6',
  muted: '#a39c8f',
  gold: '#f0c23b',
  gem: '#5ef0e0',
  danger: '#ff7a6a',
};

export const textStyle = (size: number, extra: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: FONT,
  fontSize: `${size}px`,
  color: UI.text,
  ...extra,
});
