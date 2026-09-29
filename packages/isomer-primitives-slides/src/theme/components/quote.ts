/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, space, stroke, type } from '../base';
import { literal, px } from '../scale';

import { glyph } from './shared';

export const quote = {
  text: {
    size: font.size.px96,
    weight: font.weight.bold,
    tracking: font.tracking.heading,
    lineHeight: font.lineHeight.snug,
  },
  textSizes: { l: font.size.px96, m: font.size.px76, s: font.size.px64 },
  /** Hangs the open quote into the margin so the words align with the attribution. */
  hang: literal('-0.42em'),
  // Measure, not spacing.
  maxWidth: px(1500),
  attributionGap: space.px64,
  ruleGap: space.px28,
  ruleWidth: space.px64,
  rule: stroke.rail,
  source: { ...type.bodyL, weight: font.weight.bold },
  context: type.body,
  quoteOpen: literal('“'),
  quoteClose: literal('”'),
  /** Leads the attribution in text, Markdown, and Slack. */
  dash: glyph.dash,
} as const;

/** About four lines at `l`, five at `m`. */
export const quoteFit = { l: 100, m: 170 } as const;
