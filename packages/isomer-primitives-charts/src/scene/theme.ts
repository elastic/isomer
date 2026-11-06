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

/** Text on `background`: whichever of the two schemes' text colors contrasts more. */
export const textOn = (
  background: SceneColor,
  canvas: SceneColor
): SceneColor => {
  if (background.length === 9) {
    const alpha = parseInt(background.slice(7), 16) / 255;
    background = `#${[1, 3, 5]
      .map((offset) =>
        Math.round(
          parseInt(background.slice(offset, offset + 2), 16) * alpha +
            parseInt(canvas.slice(offset, offset + 2), 16) * (1 - alpha)
        )
          .toString(16)
          .padStart(2, '0')
      )
      .join('')}`;
  }
  const { light, dark } = CHART_CHROME;
  return contrast(background, light.text) >= contrast(background, dark.text)
    ? light.text
    : dark.text;
};

/**
 * Table colors per scheme, EUI Borealis: `darkShade` for empty values,
 * `lightShade` for a bar's track, `lightestShade` for the header and footer,
 * and `textInk` and `textGhost` for text on a colored cell.
 */
export const TABLE_CHROME: Readonly<
  Record<
    ColorScheme,
    {
      readonly emptyValue: SceneColor;
      readonly barTrack: SceneColor;
      readonly header: SceneColor;
      readonly inkText: SceneColor;
      readonly ghostText: SceneColor;
    }
  >
> = {
  light: {
    emptyValue: '#5A6D8C',
    barTrack: '#CAD3E2',
    header: '#ECF1F9',
    inkText: '#07101F',
    ghostText: '#FFFFFF',
  },
  dark: {
    emptyValue: '#7186A8',
    barTrack: '#243147',
    header: '#172336',
    inkText: '#07101F',
    ghostText: '#FFFFFF',
  },
};

/** A table bar's fill when its column sets none: Lens's `DEFAULT_PROGRESS_BAR_COLOR`, `euiColorVis2`. */
export const DEFAULT_TABLE_BAR_COLOR: SceneColor = CATEGORICAL_PALETTE[2]!;

/**
 * Text on a colored table cell, as Lens's `getContrastColor`: `textGhost` on a
 * dark color (EUI `isColorDark`, relative luminance at most 0.179), else
 * `textInk`.
 */
export const contrastText = (
  background: SceneColor,
  scheme: ColorScheme
): SceneColor =>
  luminance(background) <= 0.179
    ? TABLE_CHROME[scheme].ghostText
    : TABLE_CHROME[scheme].inkText;
