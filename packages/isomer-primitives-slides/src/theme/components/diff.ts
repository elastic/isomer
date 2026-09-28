/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, space, stroke } from '../base';
import { literal } from '../scale';

import { code } from './code';

/** `slideDiff`: a `slideCode` panel with a marker gutter. */
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
  marker: { add: literal('+'), remove: literal('−') },
  /** What assistive technology announces for a marker, which the image draws as a glyph. */
  markerLabel: { add: literal('Added'), remove: literal('Removed') },
} as const;
