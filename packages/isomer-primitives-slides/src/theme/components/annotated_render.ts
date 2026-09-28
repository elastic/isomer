/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, space, stroke, type } from '../base';
import { px, scalePx, trackList } from '../scale';

import { columnWidth, frame } from './frame';
import { slideFit } from './render';

const shares = [1.45, 1] as const;
const gap = space.px72;

/** `slideAnnotatedRender`: a render with numbered pins, and a legend beside it. */
export const annotatedRender = {
  columns: trackList(shares),
  gap,
  /** The render at `l` fills its column; `m` and `s` leave room under a taller heading. */
  fits: {
    l: slideFit(
      Math.floor((columnWidth(shares, gap) / scalePx(frame.width)) * 1000) /
        1000
    ),
    m: slideFit(0.42),
    s: slideFit(0.36),
  },
  pin: {
    size: space.px56,
    ring: stroke.bar,
    numeral: { size: font.size.px28, weight: font.weight.bold },
  },
  legend: {
    rule: stroke.hairline,
    /** Row padding and type per step; `m` and `s` fit five or six pins under a taller heading. */
    steps: {
      l: {
        padding: space.px24,
        title: font.size.px32,
        body: font.size.px26,
      },
      m: {
        padding: space.px12,
        title: font.size.px32,
        body: font.size.px26,
      },
      s: {
        padding: space.px8,
        title: font.size.px28,
        body: font.size.px24,
      },
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

/** Width of the legend's text, beside its numbered discs. */
export const annotatedRenderLegendWidth =
  columnWidth(shares, gap, 1) -
  scalePx(annotatedRender.legend.marker) -
  scalePx(annotatedRender.legend.columnGap);
