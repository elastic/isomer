/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, space, type } from '../base';
import { px } from '../scale';

/** `slideHeading`: the claim and lede every content slide opens with. */
export const heading = {
  title: type.heading,
  titleSizes: { l: type.heading.size, m: font.size.px64, s: font.size.px56 },
  lede: type.lede,
  ledeGap: space.px28,
  // Measures on the 1920px canvas, not spacing.
  titleMaxWidth: px(1560),
  ledeMaxWidth: px(1400),
} as const;

/** Title characters each step holds: two lines at `l`, then a third line's worth at `m`. */
export const headingFit = { l: 72, m: 100 } as const;
