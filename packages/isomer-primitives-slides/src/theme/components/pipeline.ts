/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, radius, space, stroke, type } from '../base';
import { paddingXy, px, scalePx } from '../scale';

import { glyph } from './shared';

const circleSize = space.px72;
const terminalPaddingX = space.px20;

export const pipeline = {
  gap: space.px48,
  rail: stroke.rail,
  // Centers the rail on the step circles.
  railTop: px(scalePx(circleSize) / 2 - scalePx(stroke.rail) / 2),
  circleSize,
  numeral: { size: font.size.px32, weight: font.weight.bold },
  titleGap: space.px36,
  title: type.itemTitle,
  titleSizes: { l: type.itemTitle.size, m: font.size.px36, s: font.size.px32 },
  bodyGap: space.px16,
  body: type.body,
  bodySizes: { l: type.body.size, m: font.size.px26, s: font.size.px24 },
  terminal: {
    type: type.mono,
    padding: paddingXy(space.px14, terminalPaddingX),
    paddingX: terminalPaddingX,
    border: stroke.chip,
    radius: radius.chip,
  },
  chip: {
    type: { ...type.mono, size: font.size.px30, weight: font.weight.medium },
    padding: paddingXy(space.px14, space.px22),
    border: stroke.chip,
    radius: radius.chip,
  },
  connectorMin: space.px32,
  bracket: {
    border: stroke.rail,
    height: space.px28,
    gap: space.px28,
    radius: radius.chip,
  },
  caption: {
    gap: space.px32,
    itemGap: space.px12,
    trailing: space.px48,
    label: {
      ...type.label,
      size: font.size.px26,
      tracking: font.tracking.label,
    },
    title: { ...type.itemTitle, size: font.size.px40 },
    body: type.body,
  },
  arrow: glyph.arrow,
  dash: glyph.dash,
} as const;

export const pipelineFit = { l: 940, m: 1030 } as const;
