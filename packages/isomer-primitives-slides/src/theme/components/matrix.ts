/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, radius, space, stroke, type } from '../base';
import { literal, px } from '../scale';

// Mark geometry from the mock; off the spacing ramp.
const markSize = px(28);

/** `slideMatrix`: rows of yes, partial, or no marks under named columns. */
export const matrix = {
  // Row-label track from the mock, wider than any spacing step.
  labelWidth: px(340),
  head: { ...type.mono, size: font.size.px28, weight: font.weight.medium },
  headPaddingBottom: space.px18,
  headRule: stroke.hairline,
  label: {
    size: font.size.px30,
    weight: font.weight.bold,
    lineHeight: font.lineHeight.item,
  },
  rowRule: stroke.panel,
  // The highlighted column's band reaches this far above its heading.
  bandTop: space.px14,
  bandRadius: radius.chipSmall,
  rowPaddings: { l: space.px20, m: space.px14, s: space.px4 },
  markSize,
  ring: stroke.rail,
  dashWidth: px(24),
  dashHeight: stroke.rail,
  legendTop: space.px32,
  legendGap: space.px48,
  legendItemGap: space.px14,
  legendMarkSize: px(24),
  legend: type.bodyS,
  /** What each mark means, in the legend and in the degraded tables. */
  markWords: {
    full: literal('Yes'),
    partial: literal('Partial'),
    none: literal('No'),
  },
} as const;

/** Rows each step holds; `s` tightens row padding for up to eight. */
export const matrixFit = { l: 4, m: 5 } as const;
