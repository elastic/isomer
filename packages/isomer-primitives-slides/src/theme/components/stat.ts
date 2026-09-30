/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScaleToken } from '@elastic/distillate';

import { extraboldAdvance, font, space, stroke, type } from '../base';
import { px, scalePx } from '../scale';

import { glyph } from './shared';

/** One line of `size` type, so a placeholder stands as tall as the value it replaces. */
const lineBox = (size: ScaleToken, lineHeight: ScaleToken): ScaleToken =>
  px(Math.round(scalePx(size) * parseFloat(lineHeight.value)));

export const stat = {
  rule: stroke.hairline,
  paddingTop: space.px40,
  gap: space.px40,
  value: type.statInline,
  body: type.bodyL,
  // Measure, not spacing.
  bodyMaxWidth: px(1000),
  /** Four digits at `statInline`, so the band keeps its shape. */
  placeholderWidth: px(
    Math.round(
      4 *
        (extraboldAdvance.digit + parseFloat(type.statInline.tracking.value)) *
        scalePx(type.statInline.size)
    )
  ),
  placeholderHeight: lineBox(type.statInline.size, type.statInline.lineHeight),
  dash: glyph.dash,
} as const;

export const statValueSizes = {
  l: type.stat.size,
  m: font.size.px128,
  s: font.size.px96,
} as const;

export const statPlaceholderHeights = {
  l: lineBox(statValueSizes.l, type.stat.lineHeight),
  m: lineBox(statValueSizes.m, type.stat.lineHeight),
  s: lineBox(statValueSizes.s, type.stat.lineHeight),
} as const;
