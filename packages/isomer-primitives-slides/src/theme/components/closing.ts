/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, space, stroke, type } from '../base';
import { trackList } from '../scale';

/** The title column's share, then the other column's. */
export const closingShares = [1, 1] as const;

/** `slideClosing`: where to go next, as links and reading paths. */
export const closing = {
  columns: trackList(closingShares),
  columnGap: space.px96,
  title: type.closingTitle,
  titleSizes: {
    l: type.closingTitle.size,
    m: font.size.px128,
    s: font.size.px104,
  },
  linksGap: space.px32,
  linksTop: space.px72,
  linkGap: space.px6,
  link: { size: font.size.px48, weight: font.weight.semibold },
  rule: stroke.hairline,
  pathPaddingY: space.px22,
  pathGap: space.px6,
  pathTitle: { size: font.size.px34, weight: font.weight.bold },
  pathBody: { ...type.bodyS, lineHeight: font.lineHeight.item },
} as const;
