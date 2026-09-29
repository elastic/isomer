/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, radius, space, stroke, type } from '../base';
import { paddingXy, px } from '../scale';

import { glyph } from './shared';

export const layers = {
  gaps: { l: space.px16, m: space.px12, s: space.px8 },
  // Track widths, not spacing.
  nameColumn: px(320),
  ownerColumn: px(220),
  band: {
    border: stroke.panel,
    radius: radius.panel,
    paddings: {
      l: paddingXy(space.px24, space.px36),
      m: paddingXy(space.px16, space.px32),
      s: paddingXy(space.px12, space.px28),
    },
  },
  name: { ...type.itemTitle, size: font.size.px40 },
  nameSizes: { l: font.size.px40, m: font.size.px36, s: font.size.px32 },
  body: type.body,
  bodySizes: { l: type.body.size, m: font.size.px26, s: font.size.px24 },
  chip: {
    type: { ...type.mono, weight: font.weight.medium },
    border: stroke.panel,
    radius: radius.chipSmall,
    padding: paddingXy(space.px4, space.px14),
  },
  chipSizes: { l: type.mono.size, m: font.size.px24, s: font.size.px24 },
  chipGap: space.px12,
  dash: glyph.dash,
  separator: glyph.separator,
} as const;

export const layersFit = { l: 4, m: 5 } as const;
