/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, space, stroke, type } from '../base';
import { px, scalePx } from '../scale';

import { glyph } from './shared';
import { stat, statPlaceholderHeights, statValueSizes } from './stat';

// Centers the arrow on the digits.
const arrowLift = 0.38;

const rule = stroke.hairline;
const notePadding = space.px56;
// Measure, not spacing.
const noteMeasure = px(480);

export const delta = {
  columnGap: space.px56,
  rowGap: space.px40,
  // Track width, not spacing.
  arrowWidth: px(200),
  arrowLifts: {
    l: px(Math.round(scalePx(statValueSizes.l) * arrowLift)),
    m: px(Math.round(scalePx(statValueSizes.m) * arrowLift)),
    s: px(Math.round(scalePx(statValueSizes.s) * arrowLift)),
  },
  label: { ...type.label, tracking: font.tracking.label },
  labelGap: space.px24,
  value: { ...type.stat, whiteSpace: font.whiteSpace.nowrap },
  valueSizes: statValueSizes,
  placeholderHeights: statPlaceholderHeights,
  placeholderWidth: stat.placeholderWidth,
  rule,
  notePadding,
  noteGap: space.px16,
  noteBottom: space.px12,
  // Border to border: its measure, padding, and rule.
  noteMinWidth: px(scalePx(noteMeasure) + scalePx(notePadding) + scalePx(rule)),
  change: {
    size: font.size.px72,
    weight: font.weight.extrabold,
    tracking: font.tracking.heading,
    lineHeight: font.lineHeight.solid,
  },
  body: type.bodyL,
  /** Joins before and after in text, Markdown, and Slack. */
  arrow: glyph.arrow,
} as const;
