/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, radius, space, stroke, type } from '../base';
import { literal, paddingXy } from '../scale';

export const label = {
  size: type.label.size,
  weight: type.label.weight,
  tracking: type.label.tracking,
  gap: space.px16,
} as const;

export const connector = {
  rail: stroke.rail,
  /** Arrowhead drawn from borders: 10px either side, 16px long. */
  headHalf: literal('10px'),
  headLength: literal('16px'),
  /** What assistive technology announces for a connector relating two sides. */
  label: literal('leads to'),
} as const;

export const placeholder = {
  stripe: space.px14,
  stripeEnd: space.px28,
  angle: literal('135deg'),
  border: stroke.hairline,
  radius: radius.panel,
  caption: literal('value pending'),
  captionType: { ...type.mono, size: font.size.px24 },
  captionPadding: paddingXy(space.px6, space.px14),
  captionRadius: radius.chipSmall,
} as const;

export const glyph = {
  arrow: literal('→'),
  separator: literal('·'),
  dash: literal('—'),
} as const;
