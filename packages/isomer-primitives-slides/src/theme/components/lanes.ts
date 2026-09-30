/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, radius, space, stroke, type } from '../base';
import { literal, paddingXy, px, scalePx } from '../scale';

import { glyph } from './shared';

const rowHeight = space.px88;

export const lanes = {
  // Track width, not spacing.
  labelColumn: px(240),
  bracketColumn: space.px72,
  rowHeight,
  rowGap: space.px48,
  label: { ...type.label, size: font.size.px26, tracking: font.tracking.label },
  chip: {
    type: { ...type.mono, weight: font.weight.medium },
    padding: paddingXy(space.px14, space.px22),
    border: stroke.chip,
    radius: radius.chip,
  },
  line: stroke.rail,
  lineMin: space.px32,
  bracket: {
    border: stroke.rail,
    radius: radius.panel,
    // From the first lane's center to the second's.
    inset: px(scalePx(rowHeight) / 2),
    stub: space.px36,
  },
  join: {
    type: { ...type.mono, size: font.size.px30, weight: font.weight.medium },
    padding: paddingXy(space.px20, space.px32),
    radius: radius.panel,
  },
  notes: {
    gap: space.px72,
    columnGap: space.px96,
    rowGap: space.px48,
    itemGap: space.px12,
    title: type.nodeTitle,
    body: type.body,
  },
  arrow: glyph.arrow,
  /** Joins the two lanes' names in what assistive technology announces for the merge. */
  mergeJoiner: literal('and'),
} as const;
