/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, space, stroke, type } from '../base';
import { literal, px } from '../scale';

import { glyph } from './shared';

export const split = {
  ratio: {
    even: { left: literal('1fr'), right: literal('1fr') },
    wideLeft: { left: literal('1.1fr'), right: literal('1fr') },
    narrowLeft: { left: literal('0.75fr'), right: literal('1.25fr') },
    // Fixed notes column, not spacing.
    aside: { left: literal('1fr'), right: px(500) },
  },
  /** `gap` sits either side of an empty middle track, 96 in all. */
  dividerGap: {
    gap: space.px48,
    rule: space.px96,
    hairline: space.px72,
    arrow: space.px24,
  },
  ruleWidth: stroke.bar,
  ruleRadius: px(2),
  hairlineWidth: stroke.hairline,
  arrowWidth: space.px72,
  label: { ...type.label, size: font.size.px26 },
  labelGap: space.px36,
  itemGap: space.px48,
  /** Between the sides of an `arrow` split where no arrow is drawn. */
  arrowGlyph: glyph.arrow,
  footnote: { ...type.bodyL, lineHeight: font.lineHeight.loose },
  footnoteGap: space.px64,
  // Measure, not spacing.
  footnoteMaxWidth: px(1300),
} as const;
