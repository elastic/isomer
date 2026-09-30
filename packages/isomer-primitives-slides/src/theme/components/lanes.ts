/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, radius, space, stroke, type } from '../base';
import { literal, paddingXy, px, scalePx } from '../scale';

import { glyph } from './shared';

const rowHeights = { l: space.px88, m: space.px72, s: space.px56 } as const;
const chipPaddingX = { l: space.px22, m: space.px18, s: space.px12 } as const;
const labelType = {
  ...type.label,
  size: font.size.px26,
  tracking: font.tracking.label,
};
const joinType = {
  ...type.mono,
  size: font.size.px30,
  weight: font.weight.medium,
};
const joinPaddingX = { l: space.px32, m: space.px24, s: space.px16 } as const;

export const lanes = {
  // Column widths, not spacing.
  labelColumns: { l: px(240), m: px(200), s: px(160) },
  bracketColumns: { l: space.px72, m: space.px56, s: space.px32 },
  rowHeights,
  rowGaps: { l: space.px48, m: space.px32, s: space.px24 },
  label: labelType,
  labelSizes: { l: labelType.size, m: font.size.px24, s: font.size.px24 },
  chip: {
    type: { ...type.mono, weight: font.weight.medium },
    paddings: {
      l: paddingXy(space.px14, chipPaddingX.l),
      m: paddingXy(space.px12, chipPaddingX.m),
      s: paddingXy(space.px8, chipPaddingX.s),
    },
    paddingX: chipPaddingX,
    border: stroke.chip,
    radius: radius.chip,
  },
  chipSizes: { l: type.mono.size, m: font.size.px24, s: font.size.px24 },
  line: stroke.rail,
  lineMins: { l: space.px32, m: space.px24, s: space.px12 },
  bracket: {
    border: stroke.rail,
    radius: radius.panel,
    // From the first lane's center to the second's.
    insets: {
      l: px(scalePx(rowHeights.l) / 2),
      m: px(scalePx(rowHeights.m) / 2),
      s: px(scalePx(rowHeights.s) / 2),
    },
    stubs: { l: space.px36, m: space.px28, s: space.px16 },
  },
  join: {
    type: joinType,
    paddings: {
      l: paddingXy(space.px20, joinPaddingX.l),
      m: paddingXy(space.px16, joinPaddingX.m),
      s: paddingXy(space.px12, joinPaddingX.s),
    },
    paddingX: joinPaddingX,
    radius: radius.panel,
  },
  joinSizes: { l: joinType.size, m: font.size.px26, s: font.size.px24 },
  notes: {
    gaps: { l: space.px72, m: space.px48, s: space.px32 },
    columnGaps: { l: space.px96, m: space.px64, s: space.px48 },
    rowGaps: { l: space.px48, m: space.px32, s: space.px24 },
    itemGap: space.px12,
    title: type.nodeTitle,
    titleSizes: {
      l: type.nodeTitle.size,
      m: font.size.px32,
      s: font.size.px28,
    },
    body: type.body,
    bodySizes: { l: type.body.size, m: font.size.px26, s: font.size.px24 },
  },
  arrow: glyph.arrow,
  /** Joins the two lanes' names in what assistive technology announces for the merge. */
  mergeJoiner: literal('and'),
} as const;
