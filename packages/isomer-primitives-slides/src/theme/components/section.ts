/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, space, stroke, type } from '../base';
import { trackList } from '../scale';

/** The title column's share, then the other column's. */
export const sectionShares = [1.2, 1] as const;

/** `slideSection`: a big number and title beside what the section covers. */
export const section = {
  columns: trackList(sectionShares),
  columnGap: space.px96,
  number: type.sectionNumber,
  title: type.sectionTitle,
  titleSizes: {
    l: type.sectionTitle.size,
    m: font.size.px96,
    s: font.size.px72,
  },
  titleGap: space.px48,
  rule: stroke.hairline,
  rowPaddingY: space.px24,
  row: {
    size: font.size.px34,
    weight: font.weight.regular,
    lineHeight: font.lineHeight.list,
  },
} as const;
