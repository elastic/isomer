/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, radius, space, stroke, type } from '../base';
import { literal, paddingXy, px, scalePx } from '../scale';

import { frame } from './frame';

const slideWidth = scalePx(frame.width);
const slideHeight = scalePx(frame.height);

const output = {
  family: font.family.mono,
  size: font.size.px24,
  weight: font.weight.regular,
  lineHeight: font.lineHeight.compact,
} as const;

export const render = {
  caption: { ...type.mono, size: font.size.px24 },
  captionGap: space.px14,
  panel: {
    border: stroke.panel,
    radius: radius.panel,
    aspect: literal('16 / 9'),
  },
  /** The embedded slide at full size, centered in the panel before it is scaled. */
  slide: {
    width: frame.width,
    height: frame.height,
    offsetX: px(-slideWidth / 2),
    offsetY: px(-slideHeight / 2),
  },
  /** The largest scale a render draws its slide at; 0.38 × 1920 ≈ 730, a split column beside a code panel. */
  maxScale: literal('0.38'),
  output,
  /** One output line's box, so a blank line keeps its height. */
  outputLine: px(scalePx(output.size) * parseFloat(output.lineHeight.value)),
  outputPadding: paddingXy(space.px16, space.px24),
  /** Characters the Slack block type is padded to, so block text lines up. */
  slackTypeColumn: literal('9'),
  separator: frame.separator,
  placeholder: {
    stripe: px(14),
    stripeEnd: px(28),
    angle: literal('135deg'),
    border: stroke.hairline,
    captionPadding: paddingXy(space.px6, space.px14),
    captionRadius: radius.chipSmall,
  },
} as const;
