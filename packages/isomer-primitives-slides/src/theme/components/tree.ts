/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, monoAdvance, space, stroke, type } from '../base';
import { literal, paddingXy, px, scalePx } from '../scale';

const rowPaddingY = space.px12;

export const tree = {
  root: { ...type.mono, size: font.size.px30, weight: font.weight.medium },
  rootGap: space.px16,
  // Measure, not spacing.
  nameWidth: px(290),
  columnGap: space.px16,
  rowPaddingY,
  rowPadding: paddingXy(rowPaddingY, literal('0')),
  name: type.mono,
  body: type.bodyS,
  /** Connectors are borders: Roboto Mono has no box-drawing glyphs. */
  connector: stroke.hairline,
  // Rail under the root's first character.
  railInset: px(8),
  tickWidth: space.px16,
  nameIndent: space.px32,
  /** Text and Markdown only. */
  glyph: {
    branch: literal('├─'),
    last: literal('└─'),
  },
} as const;

/** Columns a name holds before it reaches its note. */
export const treeNameMaxLength = Math.floor(
  (scalePx(tree.nameWidth) - scalePx(tree.nameIndent)) /
    (monoAdvance * scalePx(tree.name.size))
);
