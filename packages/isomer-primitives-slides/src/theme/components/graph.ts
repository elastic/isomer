/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { color, font, radius, space, stroke, type } from '../base';
import { literal, paddingXy, px } from '../scale';

/** `slideGraph`: named terms in a fixed chain, with one node above and one below. */
export const graph = {
  track: space.px64,
  row: space.px48,
  connectorInset: space.px6,
  node: {
    fill: color.bgSurface,
    border: stroke.panel,
    // Emphasis border from the mock; between the chip and bar strokes.
    emphasisBorder: px(2.5),
    radius: radius.panel,
    padding: paddingXy(space.px20, space.px24),
    paddings: {
      l: paddingXy(space.px20, space.px24),
      m: paddingXy(space.px16, space.px20),
      s: paddingXy(space.px12, space.px20),
    },
    gap: space.px8,
  },
  rows: { l: space.px48, m: space.px40, s: space.px32 },
  // Terms are one line, so leading only adds height.
  term: { ...type.nodeTitle, lineHeight: font.lineHeight.snug },
  termSizes: { l: type.nodeTitle.size, m: font.size.px32, s: font.size.px28 },
  body: type.bodyS,
  bodySizes: { l: type.bodyS.size, m: font.size.px24, s: font.size.px24 },
  captionSizes: { l: font.size.px30, m: font.size.px26, s: font.size.px24 },
  caption: {
    size: font.size.px30,
    weight: font.weight.regular,
    lineHeight: font.lineHeight.body,
  },
  // Measure on the 1920px canvas, not spacing.
  captionMaxWidth: px(720),
  arrow: literal('→'),
} as const;

/** Loads each step holds: node rows times the longest node's characters, plus the caption. */
export const graphFit = { l: 250, m: 280 } as const;
