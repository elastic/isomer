/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScaleToken } from '@elastic/distillate';

import { color, font, space, stroke, type } from '../base';
import { literal, px, scalePx } from '../scale';

import { currentToneLabel, glyph } from './shared';

const labelSizes = {
  l: font.size.px72,
  m: font.size.px56,
  s: font.size.px44,
} as const;
// Dot geometry, not spacing.
const dotSize = px(20);
const dotGap = px(13);

const railTop = (labelSize: ScaleToken): ScaleToken =>
  px(
    scalePx(labelSize) +
      scalePx(dotGap) +
      scalePx(dotSize) / 2 -
      scalePx(stroke.rail) / 2
  );

export const timeline = {
  gap: space.px56,
  labelSizes,
  label: {
    size: labelSizes.l,
    weight: font.weight.extrabold,
    tracking: font.tracking.heading,
    lineHeight: font.lineHeight.solid,
    whiteSpace: font.whiteSpace.nowrap,
  },
  dotSize,
  dotGap,
  halo: space.px8,
  haloColor: color.primaryTint,
  rail: stroke.rail,
  railColor: color.border,
  // Centers the rail on the dots, below one line of label.
  railTops: {
    l: railTop(labelSizes.l),
    m: railTop(labelSizes.m),
    s: railTop(labelSizes.s),
  },
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
  separator: glyph.separator,
  /** Closes the label and channel before the quote, in text, Markdown, and Slack. */
  labelEnd: literal('.'),
  toneLabel: currentToneLabel,
} as const;

/** The longest item's characters, label and channel included, times the item count. */
export const timelineFit = { l: 540, m: 600 } as const;
