/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { color, font, radius, space, stroke, type } from '../base';
import { literal, paddingXy, px } from '../scale';

/** `slideLayers`: ordered bands, top to bottom, each with an owner. */
export const layers = {
  gaps: { l: space.px16, m: space.px12, s: space.px8 },
  // Grid tracks from the mock; off the spacing ramp.
  nameColumn: px(320),
  ownerColumn: px(220),
  band: {
    fill: color.bgSurface,
    border: stroke.panel,
    radius: radius.panel,
    paddings: {
      l: paddingXy(space.px24, space.px36),
      m: paddingXy(space.px16, space.px32),
      s: paddingXy(space.px12, space.px28),
    },
  },
  name: {
    size: font.size.px40,
    weight: font.weight.extrabold,
    tracking: font.tracking.snug,
    lineHeight: font.lineHeight.snug,
  },
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
  dash: literal('—'),
  separator: literal('·'),
} as const;

/** Layers each step holds. */
export const layersFit = { l: 4, m: 5 } as const;
