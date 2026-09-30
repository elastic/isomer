/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, space, stroke, type } from '../base';
import { px, trackList } from '../scale';

export const annotatedRenderShares = [1.45, 1] as const;

export const annotatedRender = {
  columns: trackList(annotatedRenderShares),
  gap: space.px72,
  pin: {
    size: space.px56,
    ring: stroke.bar,
    numeral: { size: font.size.px28, weight: font.weight.bold },
  },
  legend: {
    rule: stroke.hairline,
    /** Row padding and type per step. */
    steps: {
      l: { padding: space.px24, title: font.size.px32, body: font.size.px26 },
      m: { padding: space.px12, title: font.size.px32, body: font.size.px26 },
      s: { padding: space.px8, title: font.size.px28, body: font.size.px24 },
    },
    columnGap: space.px24,
    marker: space.px48,
    // Inside its 48px column; no spacing step between 40 and 48.
    disc: px(44),
    numeral: { size: font.size.px24, weight: font.weight.bold },
    textGap: space.px6,
    title: {
      size: font.size.px32,
      weight: font.weight.bold,
      tracking: font.tracking.none,
      lineHeight: font.lineHeight.snug,
    },
    body: type.bodyS,
  },
} as const;
