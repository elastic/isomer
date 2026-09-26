/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, radius, space, type } from '../base';
import { literal, px } from '../scale';

// Bar thickness per step, from the mock's 48; off the spacing ramp.
const barHeights = { l: px(48), m: px(40), s: px(32) };

/** `slideBars`: labeled horizontal bars, at most one highlighted. */
export const bars = {
  // Label track from the mock, wider than any spacing step.
  labelWidth: px(340),
  rowGaps: { l: space.px28, m: space.px20, s: space.px8 },
  barHeights,
  barRadius: radius.chipSmall,
  /** The longest bar's share of its track, leaving room for its value. */
  barMaxShare: literal('85%'),
  label: { weight: font.weight.bold },
  labelSizes: { l: font.size.px32, m: font.size.px30, s: font.size.px28 },
  valueGap: space.px24,
  value: {
    size: font.size.px40,
    weight: font.weight.extrabold,
    tracking: font.tracking.snug,
    lineHeight: font.lineHeight.solid,
  },
  valueSizes: { l: font.size.px40, m: font.size.px36, s: font.size.px32 },
  detail: { ...type.mono, size: font.size.px24 },
  detailGaps: { l: space.px8, m: space.px8, s: space.px4 },
  /** Column headings of the degraded tables. */
  heads: {
    label: literal('Label'),
    value: literal('Value'),
    detail: literal('Detail'),
  },
} as const;

/** Load each step holds: two per bar, one per detail line. */
export const barsFit = { l: 13, m: 16 } as const;
