/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { space, stroke, type } from '../base';
import { literal, paddingXy, px } from '../scale';

export const bulletList = {
  labelGap: space.px8,
  rule: stroke.hairline,
  rowPadding: paddingXy(space.px20, literal('0')),
  markerGap: space.px24,
  item: type.bodyL,
  // As wide as the check, one `bodyL` line tall.
  markerWidth: space.px24,
  markerHeight: px(45),
  dotSize: px(12),
  // The check is an L of two borders turned 45°.
  checkAngle: literal('45deg'),
  checkWidth: px(11),
  checkHeight: px(22),
  checkStroke: stroke.rail,
  crossGlyph: literal('×'),
  /** Text and Markdown only; the image draws the check from borders. */
  checkGlyph: literal('✓'),
  /** What assistive technology announces for a marker the image draws without words. */
  checkLabel: literal('Included'),
  crossLabel: literal('Left out'),
} as const;
