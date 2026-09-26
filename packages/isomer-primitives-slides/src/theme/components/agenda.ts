/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, space, stroke } from '../base';
import { literal, px } from '../scale';

/** `slideAgenda`: every section of the talk, the current one marked. */
export const agenda = {
  rule: stroke.hairline,
  // Number column from the mock; a track width, not spacing.
  numberWidth: px(160),
  number: {
    size: font.size.px56,
    weight: font.weight.extrabold,
    tracking: font.tracking.heading,
    lineHeight: font.lineHeight.snug,
  },
  numberSizes: { l: font.size.px56, m: font.size.px48, s: font.size.px36 },
  title: {
    size: font.size.px48,
    weight: font.weight.bold,
    tracking: font.tracking.snug,
    lineHeight: font.lineHeight.snug,
  },
  titleSizes: { l: font.size.px48, m: font.size.px40, s: font.size.px30 },
  rowPaddings: { l: space.px24, m: space.px20, s: space.px12 },
  count: {
    size: font.size.px26,
    weight: font.weight.regular,
    tracking: font.tracking.none,
    lineHeight: font.lineHeight.snug,
  },
  countGap: space.px32,
  /** Stands in for the current section's count. */
  here: literal('You are here'),
  /** Marks the current section in text and markdown. */
  hereMark: literal('you are here'),
  separator: literal('·'),
} as const;

/** Section counts each step holds at the frame's reference room. */
export const agendaFit = { l: 4, m: 5 } as const;
