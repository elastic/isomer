/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, space, type } from '../base';
import { px, trackList } from '../scale';

/** The title column's share, then the other column's. */
export const titleShares = [1.1, 1] as const;

export const title = {
  columns: trackList(titleShares),
  columnGap: space.px96,
  // The mark's size, not spacing.
  logoSize: px(88),
  logoGap: space.px56,
  eyebrow: {
    size: font.size.px26,
    weight: font.weight.semibold,
    tracking: font.tracking.labelWide,
  },
  display: type.display,
  displaySizes: {
    l: type.display.size,
    m: font.size.px176,
    s: font.size.px128,
  },
  displayGap: space.px20,
  tagline: {
    size: font.size.px52,
    weight: font.weight.medium,
    tracking: font.tracking.tight,
    lineHeight: font.lineHeight.heading,
  },
  taglineGap: space.px36,
  definition: {
    size: font.size.px28,
    weight: font.weight.regular,
    lineHeight: font.lineHeight.loose,
  },
  definitionGap: space.px56,
  termGap: space.px16,
  // Measure, not spacing.
  definitionMaxWidth: px(760),
} as const;
