/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, space, stroke, type } from '../base';
import { literal, px } from '../scale';

/** `slideSplit`: two columns of statements or slide nodes. */
export const split = {
  /** Column tracks per ratio. */
  ratio: {
    even: { left: literal('1fr'), right: literal('1fr') },
    wideLeft: { left: literal('1.1fr'), right: literal('1fr') },
    narrowLeft: { left: literal('0.75fr'), right: literal('1.25fr') },
  },
  /** Column gap per divider. `gap` sits either side of an empty middle track, 96 in all. */
  dividerGap: {
    gap: space.px48,
    rule: space.px96,
    arrow: space.px24,
  },
  ruleWidth: stroke.bar,
  // Rounds the 4px rule's ends.
  ruleRadius: px(2),
  arrowWidth: space.px72,
  label: { ...type.label, size: font.size.px26 },
  labelGap: space.px36,
  /** Between a run of statements and a node, or two nodes. */
  blockGap: space.px48,
  statement: {
    size: font.size.px52,
    weight: font.weight.bold,
    tracking: font.tracking.snug,
    lineHeight: font.lineHeight.snug,
  },
  statementGap: space.px22,
  /** Marks a statement in Slack, which has no list syntax. */
  slackBullet: literal('•'),
  footnote: { ...type.bodyL, lineHeight: font.lineHeight.loose },
  footnoteGap: space.px64,
  // A measure on the 1920px canvas, not spacing.
  footnoteMaxWidth: px(1300),
} as const;
