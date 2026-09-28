/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { color, font, radius, space, stroke, type } from '../base';
import { literal, paddingXy, px, scalePx } from '../scale';

const rowHeight = space.px88;

/** `slideLanes`: two chip rows bracketed into one join node. */
export const lanes = {
  // Grid tracks from the mock; off the spacing ramp.
  labelColumn: px(240),
  bracketColumn: space.px72,
  rowHeight,
  rowGap: space.px48,
  label: {
    size: font.size.px26,
    weight: font.weight.bold,
    tracking: font.tracking.label,
    lineHeight: font.lineHeight.body,
  },
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
    // Runs from the center of the first lane to the center of the second.
    inset: px(scalePx(rowHeight) / 2),
    stub: space.px36,
  },
  join: {
    type: { ...type.mono, size: font.size.px30, weight: font.weight.medium },
    padding: paddingXy(space.px20, space.px32),
    radius: radius.panel,
    color: color.onPrimary,
    fill: color.primary,
  },
  notes: {
    gap: space.px72,
    columnGap: space.px96,
    rowGap: space.px48,
    itemGap: space.px12,
    title: {
      size: font.size.px36,
      weight: font.weight.extrabold,
      tracking: font.tracking.snug,
      lineHeight: font.lineHeight.item,
    },
    body: type.body,
  },
  arrow: literal('→'),
} as const;
