/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveIcon } from '@elastic/isomer-sdk';

/** Each icon slot as a paint value, ready for a `fill` or `stroke` attribute. */
export type ChartsIconPaint = Record<'accent' | 'bg' | 'fg' | 'muted', string>;

// EUI Borealis's first visualization color and its neighbours, as the
// fallbacks a host sees when it sets no `--isomer-icon-*` variable.
const paint: ChartsIconPaint = {
  accent: 'var(--isomer-icon-accent, #16c5c0)',
  bg: 'var(--isomer-icon-bg, #e6f9f7)',
  fg: 'var(--isomer-icon-fg, #1d2a3e)',
  muted: 'var(--isomer-icon-muted, #8ad8d4)',
};

/** A charts icon: a `bg` tile under `draw`'s glyph, with the pack's stroke conventions set on the root. */
export const chartsIcon = (
  draw: (paint: ChartsIconPaint) => string
): PrimitiveIcon => ({
  svg: `<svg viewBox="0 0 16 16" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" rx="3" fill="${paint.bg}"/>${draw(paint)}</svg>`,
});
