/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, radius, space, stroke, type } from '../base';
import { literal, paddingXy, px, scalePx } from '../scale';

const line = stroke.hairline;
const rowGap = space.px28;
const nameSize = font.size.px34;
const nameLineHeight = font.lineHeight.item;
// Centers a tick on the first line of its target's name.
const tickTop = px(
  (scalePx(nameSize) * parseFloat(nameLineHeight.value)) / 2 - scalePx(line) / 2
);

/** `slideFanout`: one source feeding several targets through a spine. */
export const fanout = {
  source: { ...type.mono, size: font.size.px30 },
  sourceBorder: stroke.chip,
  sourcePadding: paddingXy(space.px20, space.px28),
  sourceRadius: radius.panel,
  line,
  stem: space.px48,
  tick: space.px32,
  tickGap: space.px24,
  tickTop,
  // Each target draws the spine down across the gap to the next, and the last only to its tick.
  spineReach: px(-scalePx(rowGap)),
  spineEnd: px(scalePx(tickTop) + scalePx(line)),
  rowGap,
  name: {
    ...type.mono,
    size: nameSize,
    weight: font.weight.medium,
    lineHeight: nameLineHeight,
  },
  nameGap: space.px4,
  body: {
    size: font.size.px24,
    weight: font.weight.regular,
    lineHeight: font.lineHeight.item,
  },
  arrow: literal('→'),
} as const;
