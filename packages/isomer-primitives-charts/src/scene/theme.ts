/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The one source of every color the resolver supplies itself: chrome tokens and
// the default categorical palette. Values are EUI Borealis tokens, which
// `theme.test.ts` checks against the theme package.

import type { ColorValue } from '../schema/colors';

import type { ColorScheme, SceneChrome, SceneColor } from './types';

/** Chrome per scheme: EUI Borealis `textParagraph`, `textSubdued`, `borderBasePlain`, `borderBaseSubdued` and `backgroundBasePlain`. */
export const CHART_CHROME: Readonly<Record<ColorScheme, SceneChrome>> = {
  light: {
    text: '#384861',
    textSubdued: '#516381',
    axis: '#CAD3E2',
    gridLine: '#E3E8F2',
    background: '#FFFFFF',
    border: '#CAD3E2',
  },
  dark: {
    text: '#B4C1D5',
    textSubdued: '#98A8C3',
    axis: '#485975',
    gridLine: '#2B394F',
    background: '#111C2C',
    border: '#485975',
  },
};

/** The default categorical palette, EUI Borealis `euiColorVis0`–`euiColorVis9`, the same in both schemes. */
export const CATEGORICAL_PALETTE: readonly SceneColor[] = [
  '#16C5C0',
  '#A6EDEA',
  '#61A2FF',
  '#BFDBFF',
  '#EE72A6',
  '#FFC7DB',
  '#F6726A',
  '#FFC9C2',
  '#EAAE01',
  '#FCD883',
];

/** A palette entry by index, wrapping past the end. */
export const categoricalColor = (index: number): SceneColor =>
  CATEGORICAL_PALETTE[
    ((index % CATEGORICAL_PALETTE.length) + CATEGORICAL_PALETTE.length) %
      CATEGORICAL_PALETTE.length
  ]!;

/** A node color, concrete for `scheme`. */
export const resolveColor = (
  color: ColorValue,
  scheme: ColorScheme
): SceneColor => {
  if ('token' in color) {
    return CHART_CHROME[scheme][color.token];
  }
  if ('palette' in color) {
    return categoricalColor(color.index);
  }
  const hex = color[scheme];
  return hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;
};

const channel = (hex: string, offset: number) => {
  const full =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex.slice(0, 7);
  const value = parseInt(full.slice(offset, offset + 2), 16) / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

// WCAG relative luminance of a `#rgb`, `#rrggbb` or `#rrggbbaa` color.
const luminance = (hex: string): number =>
  0.2126 * channel(hex, 1) +
  0.7152 * channel(hex, 3) +
  0.0722 * channel(hex, 5);

const contrast = (a: string, b: string) => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high! + 0.05) / (low! + 0.05);
};

// A `#rrggbbaa` color drawn over an opaque `#rrggbb` canvas; any other color as is.
const composite = (color: SceneColor, canvas: SceneColor): SceneColor => {
  if (color.length !== 9) {
    return color;
  }
  const alpha = parseInt(color.slice(7), 16) / 255;
  return `#${[1, 3, 5]
    .map((offset) =>
      Math.round(
        parseInt(color.slice(offset, offset + 2), 16) * alpha +
          parseInt(canvas.slice(offset, offset + 2), 16) * (1 - alpha)
      )
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`;
};

/** Text on `background`: whichever of the two schemes' text colors contrasts more. */
export const textOn = (
  background: SceneColor,
  canvas: SceneColor
): SceneColor => {
  const opaque = composite(background, canvas);
  const { light, dark } = CHART_CHROME;
  return contrast(opaque, light.text) >= contrast(opaque, dark.text)
    ? light.text
    : dark.text;
};

/**
 * Table colors per scheme, EUI Borealis: `darkShade` for empty values,
 * `lightShade` for a bar's track, `lightestShade` for the header and footer,
 * `backgroundBasePrimary` for emphasized rows, and `textInk` and `textGhost`
 * for text on a colored cell.
 */
export const TABLE_CHROME: Readonly<
  Record<
    ColorScheme,
    {
      readonly emptyValue: SceneColor;
      readonly barTrack: SceneColor;
      readonly header: SceneColor;
      readonly emphasis: SceneColor;
      readonly inkText: SceneColor;
      readonly ghostText: SceneColor;
    }
  >
> = {
  light: {
    emptyValue: '#5A6D8C',
    barTrack: '#CAD3E2',
    header: '#ECF1F9',
    emphasis: '#F1F6FF',
    inkText: '#07101F',
    ghostText: '#FFFFFF',
  },
  dark: {
    emptyValue: '#7186A8',
    barTrack: '#243147',
    header: '#172336',
    emphasis: '#0A2342',
    inkText: '#07101F',
    ghostText: '#FFFFFF',
  },
};

/** A table bar's fill when its column sets none: Lens's `DEFAULT_PROGRESS_BAR_COLOR`, `euiColorVis2`. */
export const DEFAULT_TABLE_BAR_COLOR: SceneColor = CATEGORICAL_PALETTE[2]!;

/**
 * Text on a colored table cell, as Lens's `getContrastColor`: `textGhost` on a
 * dark color (EUI `isColorDark`, relative luminance at most 0.179), else
 * `textInk`. A translucent color is judged as drawn over `canvas`.
 */
export const contrastText = (
  background: SceneColor,
  canvas: SceneColor,
  scheme: ColorScheme
): SceneColor =>
  luminance(composite(background, canvas)) <= 0.179
    ? TABLE_CHROME[scheme].ghostText
    : TABLE_CHROME[scheme].inkText;

// CIE Lab under D65, as chroma-js converts it, which Kibana's palettes mix with.
const LAB = {
  Xn: 0.95047,
  Yn: 1,
  Zn: 1.08883,
  t0: 0.137931034,
  t1: 0.206896552,
  t2: 0.12841855,
  t3: 0.008856452,
} as const;

const toLinear = (channel: number) => {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

const fromLinear = (value: number) =>
  255 * (value <= 0.00304 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055);

const xyzToLab = (t: number) =>
  t > LAB.t3 ? Math.cbrt(t) : t / LAB.t2 + LAB.t0;

const labToXyz = (t: number) =>
  t > LAB.t1 ? t * t * t : LAB.t2 * (t - LAB.t0);

/** A color's alpha, 0 to 255: 255 for `#rrggbb`. */
const alphaOf = (hex: string): number => {
  const full = resolveColor({ light: hex, dark: hex }, 'light');
  return full.length === 9 ? parseInt(full.slice(7, 9), 16) : 255;
};

// `[lightness, chroma, hue]`; hue is NaN for a gray, which has none.
const toLch = (hex: string): [number, number, number] => {
  const full = resolveColor({ light: hex, dark: hex }, 'light');
  const [r, g, b] = [1, 3, 5].map((offset) =>
    toLinear(parseInt(full.slice(offset, offset + 2), 16))
  ) as [number, number, number];
  const x = xyzToLab((0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / LAB.Xn);
  const y = xyzToLab((0.2126729 * r + 0.7151522 * g + 0.072175 * b) / LAB.Yn);
  const z = xyzToLab((0.0193339 * r + 0.119192 * g + 0.9503041 * b) / LAB.Zn);
  const a = 500 * (x - y);
  const bb = 200 * (y - z);
  const c = Math.sqrt(a * a + bb * bb);
  const h = (Math.atan2(bb, a) * (180 / Math.PI) + 360) % 360;
  return [Math.max(0, 116 * y - 16), c, Math.round(c * 10000) === 0 ? NaN : h];
};

const fromLch = (
  [l, c, h]: [number, number, number],
  alpha = 255
): SceneColor => {
  const hue = ((Number.isNaN(h) ? 0 : h) * Math.PI) / 180;
  const y0 = (l + 16) / 116;
  const x = LAB.Xn * labToXyz(y0 + (Math.cos(hue) * c) / 500);
  const y = LAB.Yn * labToXyz(y0);
  const z = LAB.Zn * labToXyz(y0 - (Math.sin(hue) * c) / 200);
  return `#${[
    3.2404542 * x - 1.5371385 * y - 0.4985314 * z,
    -0.969266 * x + 1.8760108 * y + 0.041556 * z,
    0.0556434 * x - 0.2040259 * y + 1.0572252 * z,
  ]
    .map((linear) => Math.min(255, Math.max(0, Math.round(fromLinear(linear)))))
    .concat(alpha === 255 ? [] : [alpha])
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
};

/**
 * `color` mixed toward `toward` by `amount` (0 to 1) in LCH, as chroma-js's
 * `mix(color, toward, amount, 'lch')`: the shorter way round the hue circle,
 * and a gray takes the other color's hue. Alpha mixes linearly, and an
 * opaque result is `#rrggbb`.
 */
export const mixLch = (
  color: SceneColor,
  toward: SceneColor,
  amount: number
): SceneColor => {
  const [l0, c0, h0] = toLch(color);
  const [l1, c1, h1] = toLch(toward);
  let hue = NaN;
  if (!Number.isNaN(h0) && !Number.isNaN(h1)) {
    const turn = h1 - h0;
    const delta = turn > 180 ? turn - 360 : turn < -180 ? turn + 360 : turn;
    hue = h0 + amount * delta;
  } else if (!Number.isNaN(h0)) {
    hue = h0;
  } else if (!Number.isNaN(h1)) {
    hue = h1;
  }
  const [a0, a1] = [alphaOf(color), alphaOf(toward)];
  return fromLch(
    [l0 + amount * (l1 - l0), c0 + amount * (c1 - c0), hue],
    Math.round(a0 + amount * (a1 - a0))
  );
};

/** The fill of a mosaic's outer layer, which its inner slices cover: Lens's transparent white. */
export const TRANSPARENT: SceneColor = '#FFFFFF00';

/**
 * A heat map's colors when its node states no bands, lowest first: Lens's
 * default `temperature` palette at its default five steps, EUI's
 * `euiPaletteForTemperature(5)`, the same in both schemes.
 */
export const HEATMAP_PALETTE: readonly SceneColor[] = [
  '#61A2FF',
  '#CFE1FF',
  '#F6F9FC',
  '#FFD4CF',
  '#F6726A',
];
