/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, space, stroke } from '../base';
import { literal, scalePx } from '../scale';

import { code, codePanelColumns } from './code';
import { frameContentWidth } from './frame';

/** `slideDiff` draws in `slideCode`'s panel; these are what it adds. */
export const diff = {
  gutter: space.px56,
  bar: stroke.bar,
  markerWeight: font.weight.medium,
  /** Drawn in the gutter and printed as the unified-diff prefix. */
  marker: { add: literal('+'), remove: literal('-'), context: literal(' ') },
  /** What assistive technology announces for a marker the image draws as a glyph. */
  markerLabel: { add: literal('Added'), remove: literal('Removed') },
} as const;

/** Lines that fit under a heading with a caption; past `codeDenseAfter` they take `denseText`. */
export const diffMaxLines = 14;

/** Characters a line holds across `width`, a full-width slide by default, before its panel clips it. */
export const diffLineMaxLength = (
  dense: boolean,
  width = frameContentWidth
): number =>
  codePanelColumns(width, scalePx(diff.gutter) + scalePx(code.paddingX), dense);
