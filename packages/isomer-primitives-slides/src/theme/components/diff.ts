/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, monoAdvance, space, stroke } from '../base';
import { literal, scalePx } from '../scale';

import { code } from './code';
import { frameContentWidth } from './frame';

export const diff = {
  file: code.file,
  fileGap: code.fileGap,
  border: code.border,
  radius: code.radius,
  paddingY: code.paddingY,
  paddingEnd: code.paddingX,
  text: code.text,
  denseText: code.denseText,
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

/** Characters a line holds on a full-width slide before its panel clips it. */
export const diffLineMaxLength = (dense: boolean): number => {
  const inner =
    frameContentWidth -
    2 * scalePx(diff.border) -
    scalePx(diff.gutter) -
    scalePx(diff.paddingEnd);
  const size = dense ? diff.denseText.size : diff.text.size;
  return Math.floor(inner / (monoAdvance * scalePx(size)));
};
