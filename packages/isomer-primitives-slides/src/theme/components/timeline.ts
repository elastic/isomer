/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { color, font, space, stroke, type } from '../base';
import { literal, px, scalePx } from '../scale';

const labelSize = font.size.px72;
// Dot geometry from the mock; off the spacing ramp.
const dotSize = px(20);
const dotGap = px(13);

/** `slideTimeline`: dated columns on a rail, one of them current. */
export const timeline = {
  gap: space.px56,
  label: {
    size: labelSize,
    weight: font.weight.extrabold,
    tracking: font.tracking.heading,
    lineHeight: font.lineHeight.solid,
  },
  dotSize,
  dotGap,
  halo: space.px8,
  haloColor: color.primaryTint,
  rail: stroke.rail,
  railColor: color.border,
  // Centers the rail on the dots: label line, gap, then half a dot, less half the rail.
  railTop: px(
    scalePx(labelSize) +
      scalePx(dotGap) +
      scalePx(dotSize) / 2 -
      scalePx(stroke.rail) / 2
  ),
  channelGap: space.px36,
  headingGap: space.px14,
  headingSizes: { l: font.size.px36, m: font.size.px32, s: font.size.px28 },
  heading: {
    size: font.size.px36,
    weight: font.weight.bold,
    lineHeight: font.lineHeight.item,
  },
  bodyGap: space.px20,
  body: type.body,
  bodySizes: { l: type.body.size, m: font.size.px26, s: font.size.px24 },
  quoteOpen: literal('“'),
  quoteClose: literal('”'),
  separator: literal('·'),
  /** Marks the current item in text, markdown, and Slack. */
  currentMark: literal('now'),
} as const;

/** Row loads each step holds: the longest item's characters times the item count. */
export const timelineFit = { l: 500, m: 620 } as const;
