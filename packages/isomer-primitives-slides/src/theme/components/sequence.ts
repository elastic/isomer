/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { color, font, radius, space, stroke, type } from '../base';
import { literal, paddingXy } from '../scale';

/** `slideSequence`: actors with lifelines, and the messages between them in order. */
export const sequence = {
  actor: {
    type: { ...type.mono, size: font.size.px28 },
    border: stroke.chip,
    radius: radius.chip,
    padding: paddingXy(space.px12, space.px24),
    fill: color.bgPage,
    gap: space.px12,
  },
  lifeline: stroke.hairline,
  // Labels never wrap, so leading only adds height.
  labelLineHeight: font.lineHeight.snug,
  // Masks the lifelines a label crosses.
  labelFill: color.bgPage,
  labelInset: space.px8,
  // From the sender's lifeline, for a label that would otherwise center on a skipped actor.
  labelOffset: space.px32,
  labelSizes: { l: font.size.px26, m: font.size.px24, s: font.size.px24 },
  labelGaps: { l: space.px4, m: space.px4, s: literal('0') },
  rowGaps: { l: space.px8, m: space.px4, s: literal('0') },
  arrow: literal('→'),
} as const;

/** Messages each step holds. */
export const sequenceFit = { l: 6, m: 7 } as const;
