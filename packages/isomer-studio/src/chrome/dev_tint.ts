/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeModifications } from '@elastic/eui';
import { EuiThemeBorealis } from '@elastic/eui-theme-borealis';

import { hexToOklch, oklchToHex } from './oklch';

const HEX = /^#([0-9a-f]{6})$/i;
/** Role colors, and the selection, which reads as primary in every mode. */
const ROLE =
  /primary|accent|success|warning|danger|risk|neutral|assistance|highlight|link|select/i;
const SURFACE = /^(background|border)|^body$/;

/** Strength of the tint relative to Borealis's own blue: `1` is as green as Borealis is blue, `0` is gray. */
const CHROMA = 0.6;

/** Moves `hex` onto `hue` in OKLCH, keeping its perceived lightness. */
export const tintNeutral = (hex: string, hue: number): string => {
  const { l, c } = hexToOklch(hex);
  return oklchToHex({ l, c: c * CHROMA, h: hue });
};

const { DARK } = EuiThemeBorealis.root.colors;

/** The dev shell's color: Borealis dark's light success background. */
const devShell = DARK.backgroundLightSuccess;
if (typeof devShell !== 'string') {
  throw new Error('Borealis dark has no backgroundLightSuccess color');
}
const { h: DEV_HUE } = hexToOklch(devShell);

/** Borealis dark's blue-gray backgrounds and borders moved onto the dev shell's green. Text and role colors are untouched. */
export const DEV_DARK_COLORS: Readonly<Record<string, string>> =
  Object.fromEntries(
    Object.entries(DARK).flatMap(([key, value]) =>
      typeof value === 'string' &&
      HEX.test(value) &&
      SURFACE.test(key) &&
      !ROLE.test(key)
        ? [[key, tintNeutral(value, DEV_HUE)]]
        : []
    )
  );

export const DEV_TINT: EuiThemeModifications = {
  colors: { DARK: DEV_DARK_COLORS },
};
