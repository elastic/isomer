/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, radius, space, stroke, type } from '../base';

export const table = {
  border: stroke.panel,
  radius: radius.chip,
  divider: stroke.panel,
  labelLineHeight: type.label.lineHeight,
  labelGap: space.px20,
  head: { ...type.label, tracking: font.tracking.label },
  headPaddingsY: { l: space.px14, m: space.px12, s: space.px8 },
  cell: {
    weight: font.weight.regular,
    lineHeight: font.lineHeight.compact,
  },
  cellSizes: { l: font.size.px30, m: font.size.px26, s: font.size.px24 },
  cellPaddingsY: { l: space.px16, m: space.px12, s: space.px4 },
  /** Cells, headings, and group labels share it, so columns line up. */
  paddingsX: { l: space.px24, m: space.px20, s: space.px16 },
  rowHeaderWeight: font.weight.bold,
  group: { ...type.label, tracking: font.tracking.label },
  groupPaddingsTop: { l: space.px16, m: space.px12, s: space.px8 },
  /** Above every group after the first. */
  groupGaps: { l: space.px40, m: space.px32, s: space.px16 },
  groupPaddingsBottom: { l: space.px12, m: space.px8, s: space.px4 },
  groupRule: stroke.hairline,
} as const;
