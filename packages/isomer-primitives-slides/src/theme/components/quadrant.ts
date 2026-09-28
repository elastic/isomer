/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { color, font, radius, space, stroke, type } from '../base';
import { literal, paddingXy, px } from '../scale';

/** `slideQuadrant`: a 2 × 2 plot on two labeled axes. */
export const quadrant = {
  // Axis-label track from the mock; off the spacing ramp.
  axisColumn: px(140),
  rowGap: space.px16,
  columnGap: space.px24,
  axis: stroke.rail,
  cell: {
    paddings: {
      l: paddingXy(space.px28, space.px36),
      m: paddingXy(space.px20, space.px32),
      s: paddingXy(space.px16, space.px28),
    },
    gaps: { l: space.px16, m: space.px12, s: space.px12 },
  },
  caption: type.bodyS,
  chip: {
    type: { ...type.mono, size: font.size.px30 },
    fill: color.bgSurface,
    border: stroke.chip,
    radius: radius.chip,
    paddings: {
      l: paddingXy(space.px12, space.px24),
      m: paddingXy(space.px8, space.px20),
      s: paddingXy(space.px6, space.px16),
    },
  },
  chipSizes: { l: font.size.px30, m: font.size.px26, s: font.size.px24 },
  chipGaps: { l: space.px16, m: space.px12, s: space.px12 },
  arrow: literal('→'),
  separator: literal('·'),
} as const;

/** Loads each step holds: the fullest top cell's items plus the fullest bottom cell's. */
export const quadrantFit = { l: 4, m: 6 } as const;
