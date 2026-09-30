/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, space, stroke, type } from '../base';
import { literal, paddingXy, px } from '../scale';

export const list = {
  labelGap: space.px8,
  rule: stroke.hairline,
  rowPadding: paddingXy(space.px18, literal('0')),
  // Measure, not spacing.
  termWidth: px(300),
  columnGap: space.px16,
  term: { ...type.mono, size: font.size.px28, weight: font.weight.medium },
  body: type.body,
  /** A list with no terms drops its rules and sets rows closer. */
  plainGap: space.px12,
  plainBody: { ...type.body, lineHeight: font.lineHeight.list },
  footnoteGap: space.px28,
  footnote: { ...type.bodyS, lineHeight: font.lineHeight.loose },
} as const;
