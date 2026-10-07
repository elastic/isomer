/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveIcon } from '@elastic/isomer-sdk';

// Fallbacks a host sees when it sets no `--isomer-icon-*` variable.
const SLIDE_ICON_HUES = {
  indigo: { bg: '#ebeefd', muted: '#b8c2f4', accent: '#3d5ad8', fg: '#46507a' },
  blue: { bg: '#e8f1fb', muted: '#a9c6e8', accent: '#3f7bbf', fg: '#3f5670' },
  teal: { bg: '#e2f4f3', muted: '#9fd6d2', accent: '#2a8f88', fg: '#355e5b' },
  violet: { bg: '#f1ebfb', muted: '#cdb9ef', accent: '#7a4fcf', fg: '#54456e' },
  yellow: { bg: '#fdf3d3', muted: '#f4d77e', accent: '#d69e0b', fg: '#6b5a2a' },
  green: { bg: '#e4f4e8', muted: '#a8d5b4', accent: '#4a8a5c', fg: '#3d5c45' },
} as const;

/** The hue family a slides primitive's icon is drawn in. */
export type SlideIconHue = keyof typeof SLIDE_ICON_HUES;

/** Each icon slot as a paint value, ready for a `fill` or `stroke` attribute. */
export type SlideIconPaint = Record<'accent' | 'bg' | 'fg' | 'muted', string>;

/** A slides icon: a `bg` tile under `draw`'s glyph, with the pack's stroke conventions set on the root. */
export const slideIcon = (
  hue: SlideIconHue,
  draw: (paint: SlideIconPaint) => string
): PrimitiveIcon => {
  const { accent, bg, fg, muted } = SLIDE_ICON_HUES[hue];
  const paint: SlideIconPaint = {
    accent: `var(--isomer-icon-accent, ${accent})`,
    bg: `var(--isomer-icon-bg, ${bg})`,
    fg: `var(--isomer-icon-fg, ${fg})`,
    muted: `var(--isomer-icon-muted, ${muted})`,
  };
  return {
    svg: `<svg viewBox="0 0 16 16" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" rx="3" fill="${paint.bg}"/>${draw(paint)}</svg>`,
  };
};
