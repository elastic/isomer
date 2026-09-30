/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, space, stroke, type } from '../base';
import { literal, paddingXy, px, scalePx } from '../scale';

const rowPaddingY = space.px12;
const name = type.mono;
// Middle of a name's first line, so a wrapped name keeps its tick level with the note.
const tickTop = px(
  (scalePx(name.size) * parseFloat(name.lineHeight.value)) / 2
);

export const tree = {
  root: { ...type.mono, size: font.size.px30, weight: font.weight.medium },
  rootGap: space.px16,
  // Measure, not spacing.
  nameWidth: px(290),
  columnGap: space.px16,
  rowPaddingY,
  rowPadding: paddingXy(rowPaddingY, literal('0')),
  name,
  body: type.bodyS,
  /** Connectors are borders: Roboto Mono has no box-drawing glyphs. */
  connector: stroke.hairline,
  // Rail under the root's first character.
  railInset: px(8),
  tickWidth: space.px16,
  tickTop,
  /** A `└` rail runs from the row's top edge to the tick. */
  railLastHeight: px(scalePx(rowPaddingY) + scalePx(tickTop)),
  nameIndent: space.px32,
  /** Text, Markdown, and Slack only. */
  glyph: {
    branch: literal('├─'),
    last: literal('└─'),
    /** Between the padded name column and the note. */
    gutter: literal('  '),
  },
} as const;
