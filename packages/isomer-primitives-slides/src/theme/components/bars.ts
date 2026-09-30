/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, radius, space, type } from '../base';
import { literal, px } from '../scale';

export const bars = {
  // Track width, not spacing.
  labelWidth: px(340),
  /** The label column's most of a narrower layout's width. */
  labelMaxShare: literal('45%'),
  rowGaps: { l: space.px28, m: space.px20, s: space.px8 },
  // Bar thickness per step, not spacing.
  barHeights: { l: px(48), m: px(40), s: px(32) },
  barRadius: radius.chipSmall,
  /** The least a positive value's bar draws, however small its share. */
  barMinWidth: px(6),
  /** Leaves room for the longest bar's value. */
  barMaxShare: literal('85%'),
  label: { weight: font.weight.bold, tracking: font.tracking.none },
  labelSizes: { l: font.size.px32, m: font.size.px30, s: font.size.px28 },
  valueGap: space.px24,
  value: {
    size: font.size.px40,
    weight: font.weight.extrabold,
    tracking: font.tracking.snug,
    lineHeight: font.lineHeight.solid,
    whiteSpace: font.whiteSpace.nowrap,
  },
  valueSizes: { l: font.size.px40, m: font.size.px36, s: font.size.px32 },
  /** Before the smallest printable step, for a positive value that rounds to zero. */
  valueBelow: literal('<'),
  detail: { ...type.mono, size: font.size.px24 },
  detailGaps: { l: space.px8, m: space.px8, s: space.px4 },
  /** Column headings of the degraded tables. */
  heads: {
    label: literal('Label'),
    value: literal('Value'),
    detail: literal('Detail'),
  },
} as const;

/** How a bar's value prints on every surface. */
export const barsValueLocale = 'en-US';

export const barsValueFormat = {
  maximumFractionDigits: 2,
  useGrouping: false,
} as const satisfies Intl.NumberFormatOptions;

/** Two per label line, one per detail line. */
export const barsFit = { l: 13, m: 16 } as const;
