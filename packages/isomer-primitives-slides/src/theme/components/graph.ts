/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { color, font, radius, space, stroke, type } from '../base';
import { literal, paddingXy, px } from '../scale';

import { glyph, tone } from './shared';

export const graph = {
  track: space.px64,
  connectorInset: space.px6,
  node: {
    fill: color.bgSurface,
    border: stroke.panel,
    emphasisBorder: stroke.bar,
    radius: radius.panel,
    paddings: {
      l: paddingXy(space.px20, space.px24),
      m: paddingXy(space.px16, space.px20),
      s: paddingXy(space.px12, space.px20),
    },
    gap: space.px8,
  },
  rows: { l: space.px48, m: space.px40, s: space.px32 },
  // Terms are one line, so leading only adds height.
  term: { ...type.nodeTitle, lineHeight: font.lineHeight.snug },
  termSizes: { l: type.nodeTitle.size, m: font.size.px32, s: font.size.px28 },
  body: type.bodyS,
  bodySizes: { l: type.bodyS.size, m: font.size.px24, s: font.size.px24 },
  caption: {
    size: font.size.px30,
    weight: font.weight.regular,
    lineHeight: font.lineHeight.body,
  },
  captionSizes: { l: font.size.px30, m: font.size.px26, s: font.size.px24 },
  // Measure, not spacing.
  captionMaxWidth: px(720),
  arrow: glyph.arrow,
  /** Between relations in text, Markdown, and Slack. */
  relationJoiner: literal(', '),
  /** What assistive technology announces for the cue on the emphasized node. */
  toneLabel: { ...tone.label, primary: literal('Focus') },
} as const;

export const graphMaxMain = 4;

/** Node rows times the longest node's characters, plus the caption. */
export const graphFit = { l: 150, m: 280 } as const;
