/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, radius, space, stroke, type } from '../base';
import { paddingXy } from '../scale';

/** `slideColumns`: two to four parallel options in ruled columns. */
export const columns = {
  rule: stroke.hairline,
  columnPadding: space.px56,
  gap: space.px28,
  title: { ...type.itemTitle, size: font.size.px48 },
  titleSizes: { l: font.size.px48, m: font.size.px40, s: font.size.px32 },
  tagGap: space.px12,
  tag: { ...type.mono, size: font.size.px30, weight: font.weight.medium },
  tagBorder: stroke.panel,
  tagRadius: radius.chipSmall,
  tagPadding: paddingXy(space.px6, space.px16),
  body: type.body,
  bodySizes: { l: type.body.size, m: font.size.px26, s: font.size.px24 },
  footnoteMargin: space.px72,
  footnotePadding: space.px32,
  footnoteGap: space.px16,
  footnote: { ...type.body, size: font.size.px30 },
  footnoteCode: { family: font.family.mono, weight: font.weight.medium },
} as const;

/** Row loads each step holds: the longest column's characters times the column count, plus the footnote. */
export const columnsFit = { l: 400, m: 520 } as const;
