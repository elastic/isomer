/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, radius, space, stroke, type } from '../base';
import { paddingXy } from '../scale';

/** `slideTable`: a headed grid of short cells, optionally grouped. */
export const table = {
  border: stroke.panel,
  radius: radius.chip,
  divider: stroke.panel,
  labelGap: space.px20,
  head: { ...type.label, tracking: font.tracking.label },
  headPadding: paddingXy(space.px14, space.px24),
  cell: {
    size: font.size.px30,
    weight: font.weight.regular,
    lineHeight: font.lineHeight.compact,
  },
  cellPadding: paddingXy(space.px16, space.px24),
  rowHeaderWeight: font.weight.bold,
  group: { ...type.label, tracking: font.tracking.label },
  groupPaddingTop: space.px16,
  /** Above every group after the first. */
  groupGap: space.px40,
  groupPaddingBottom: space.px12,
  groupPaddingX: space.px24,
  groupRule: stroke.hairline,
} as const;
