/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, space, stroke } from '../base';
import { literal } from '../scale';

/** `slideRoadmap`: ruled columns of planned work, one of them current. */
export const roadmap = {
  rule: stroke.hairline,
  columnPadding: space.px56,
  title: {
    size: font.size.px56,
    weight: font.weight.extrabold,
    tracking: font.tracking.heading,
    lineHeight: font.lineHeight.solid,
  },
  titleSizes: { l: font.size.px56, m: font.size.px48, s: font.size.px40 },
  statusGap: space.px16,
  itemsGaps: { l: space.px28, m: space.px24, s: space.px20 },
  itemRule: stroke.hairline,
  itemPaddings: { l: space.px20, m: space.px16, s: space.px12 },
  itemGap: space.px6,
  itemTitle: {
    size: font.size.px32,
    weight: font.weight.bold,
    tracking: font.tracking.none,
    lineHeight: font.lineHeight.item,
  },
  itemTitleSizes: { l: font.size.px32, m: font.size.px28, s: font.size.px26 },
  itemBody: {
    size: font.size.px26,
    weight: font.weight.regular,
    tracking: font.tracking.none,
    lineHeight: font.lineHeight.compact,
  },
  itemBodySizes: { l: font.size.px26, m: font.size.px24, s: font.size.px24 },
  separator: literal('·'),
  /** Marks the current column in text and markdown. */
  currentMark: literal('now'),
} as const;

/** Row loads each step holds: the longest column's characters times the column count. */
export const roadmapFit = { l: 440, m: 540 } as const;
