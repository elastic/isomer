/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { space, stroke, type } from '../base';
import { literal, px } from '../scale';

/** `slideStat`: one headline number beside the sentence that explains it. */
export const stat = {
  rule: stroke.hairline,
  paddingTop: space.px40,
  gap: space.px40,
  value: type.statInline,
  body: type.bodyL,
  // Measure on the 1920px canvas, not spacing.
  bodyMaxWidth: px(1000),
  // Roughly a four-character value at `statInline`, so the band keeps its shape.
  placeholderWidth: px(320),
  /** One `statInline` line, whose line height is 1. */
  placeholderHeight: type.statInline.size,
  placeholderCaption: literal('value pending'),
} as const;
