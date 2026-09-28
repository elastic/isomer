/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, space, stroke, type } from '../base';
import { literal, paddingXy, px } from '../scale';

/** `slideTree`: a folder and the entries directly inside it. */
export const tree = {
  root: { ...type.mono, size: font.size.px30, weight: font.weight.medium },
  rootGap: space.px16,
  // Name column on the 1920px canvas, not spacing.
  nameWidth: px(290),
  columnGap: space.px16,
  rowPaddingY: space.px12,
  rowPadding: paddingXy(space.px12, literal('0')),
  name: type.mono,
  body: type.bodyS,
  /** Connectors are borders: Roboto Mono has no box-drawing glyphs. */
  connector: stroke.hairline,
  // Rail under the root's first character; the tick runs to just short of the name.
  railInset: px(8),
  tickWidth: space.px16,
  nameIndent: space.px32,
  /** Text and markdown only. */
  glyph: {
    branch: literal('├─'),
    last: literal('└─'),
  },
} as const;
