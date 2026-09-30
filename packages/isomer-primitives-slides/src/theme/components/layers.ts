/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, radius, space, stroke, type } from '../base';
import { literal, paddingXy, px } from '../scale';

import { glyph } from './shared';

const bandPaddingX = { l: space.px36, m: space.px32, s: space.px28 } as const;
const bandPaddingY = { l: space.px24, m: space.px16, s: space.px12 } as const;
const chipPaddingX = space.px14;
const chipPaddingY = space.px4;
const nameType = { ...type.itemTitle, size: font.size.px40 };

export const layers = {
  gaps: { l: space.px16, m: space.px12, s: space.px8 },
  // Track widths, not spacing.
  nameColumn: px(320),
  ownerColumn: px(220),
  band: {
    border: stroke.panel,
    radius: radius.panel,
    paddings: {
      l: paddingXy(bandPaddingY.l, bandPaddingX.l),
      m: paddingXy(bandPaddingY.m, bandPaddingX.m),
      s: paddingXy(bandPaddingY.s, bandPaddingX.s),
    },
    paddingX: bandPaddingX,
    paddingY: bandPaddingY,
  },
  // Kept clear between a band's content and its owner.
  ownerGap: space.px24,
  name: nameType,
  nameSizes: { l: nameType.size, m: font.size.px36, s: font.size.px32 },
  body: type.body,
  bodySizes: { l: type.body.size, m: font.size.px26, s: font.size.px24 },
  chip: {
    type: { ...type.mono, weight: font.weight.medium },
    border: stroke.panel,
    radius: radius.chipSmall,
    padding: paddingXy(chipPaddingY, chipPaddingX),
    paddingX: chipPaddingX,
    paddingY: chipPaddingY,
  },
  chipSizes: { l: type.mono.size, m: font.size.px24, s: font.size.px24 },
  chipGap: space.px12,
  /** Between chips in text, Markdown, and Slack. */
  chipJoiner: literal(', '),
  dash: glyph.dash,
  separator: glyph.separator,
} as const;
