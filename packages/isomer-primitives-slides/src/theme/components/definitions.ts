/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, space, stroke, type } from '../base';
import { literal, paddingXy } from '../scale';

export const definitions = {
  rule: stroke.hairline,
  columnGap: space.px64,
  rowPaddings: {
    l: paddingXy(space.px28, literal('0')),
    m: paddingXy(space.px20, literal('0')),
    s: paddingXy(space.px14, literal('0')),
  },
  rowGap: space.px8,
  term: { ...type.mono, size: font.size.px32, weight: font.weight.medium },
  termSizes: { l: font.size.px32, m: font.size.px28, s: font.size.px26 },
  body: type.body,
  bodySizes: { l: type.body.size, m: font.size.px26, s: font.size.px24 },
} as const;

/** Past this many terms the list splits into two columns. */
export const definitionsSingleColumnMax = 4;

/** The longest column's characters times the column count. */
export const definitionsFit = { l: 480, m: 560 } as const;
