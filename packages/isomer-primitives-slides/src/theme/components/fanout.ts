/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, radius, space, stroke, type } from '../base';
import { literal, paddingXy } from '../scale';

/** `slideFanout`: one source feeding several targets through a spine. */
export const fanout = {
  source: { ...type.mono, size: font.size.px30 },
  sourceBorder: stroke.chip,
  sourcePadding: paddingXy(space.px20, space.px28),
  sourceRadius: radius.panel,
  line: stroke.hairline,
  stem: space.px48,
  tick: space.px32,
  tickGap: space.px24,
  spinePaddingY: space.px8,
  rowGap: space.px28,
  name: {
    ...type.mono,
    size: font.size.px34,
    weight: font.weight.medium,
    lineHeight: font.lineHeight.item,
  },
  nameGap: space.px4,
  body: {
    size: font.size.px24,
    weight: font.weight.regular,
    lineHeight: font.lineHeight.item,
  },
  arrow: literal('→'),
} as const;
