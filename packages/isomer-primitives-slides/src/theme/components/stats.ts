/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, space, stroke, type } from '../base';
import { px } from '../scale';

import { stat } from './stat';

/** `slideStats`: two to four comparable numbers in ruled columns. */
export const stats = {
  rule: stroke.hairline,
  columnPadding: space.px48,
  value: type.stat,
  valueSizes: { l: type.stat.size, m: font.size.px128, s: font.size.px96 },
  unit: type.statUnit,
  unitGap: space.px12,
  label: {
    size: font.size.px40,
    weight: font.weight.bold,
    tracking: font.tracking.none,
    lineHeight: font.lineHeight.item,
  },
  labelGap: space.px32,
  bodyGap: space.px12,
  body: type.body,
  // One `stat` line: 200px at line height 0.9.
  placeholderHeight: px(180),
  placeholderCaption: stat.placeholderCaption,
} as const;
