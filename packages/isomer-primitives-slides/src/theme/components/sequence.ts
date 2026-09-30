/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, radius, space, stroke, type } from '../base';
import { literal, paddingXy } from '../scale';

import { glyph } from './shared';

const actorPaddingX = space.px24;
const actorType = { ...type.mono, size: font.size.px28 };

export const sequence = {
  actor: {
    type: actorType,
    sizes: { l: actorType.size, m: font.size.px26, s: font.size.px24 },
    border: stroke.chip,
    radius: radius.chip,
    paddings: {
      l: paddingXy(space.px12, actorPaddingX),
      m: paddingXy(space.px12, actorPaddingX),
      s: paddingXy(space.px8, actorPaddingX),
    },
    paddingX: actorPaddingX,
    gaps: { l: space.px12, m: space.px12, s: space.px8 },
  },
  lifeline: stroke.hairline,
  // Most labels hold one line, where leading only adds height.
  labelLineHeight: font.lineHeight.solid,
  labelInset: space.px8,
  // From the sender's lifeline.
  labelOffset: space.px32,
  labelSizes: { l: font.size.px26, m: font.size.px24, s: font.size.px24 },
  labelGaps: { l: space.px4, m: space.px4, s: literal('0') },
  rowGaps: { l: space.px8, m: space.px4, s: literal('0') },
  arrow: glyph.arrow,
  /** What assistive technology announces between a message's sender and receiver. */
  direction: literal('to'),
} as const;

export const sequenceFit = { l: 7, m: 8 } as const;
