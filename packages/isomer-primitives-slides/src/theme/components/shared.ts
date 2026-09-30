/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { space, stroke, type } from '../base';
import { literal } from '../scale';

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

/** A toned title's non-color cue: a filled dot for `primary`, a ring for `accent`. */
export const tone = {
  cue: { size: space.px14, gap: space.px12, ring: stroke.rail },
  /** Text, Markdown, and Slack only; the image draws the cue from its box. */
  glyph: { primary: literal('●'), accent: literal('○') },
  /** What assistive technology announces for the cue, unless a primitive names its tones itself. */
  label: { primary: literal('Primary'), accent: literal('Accent') },
} as const;

export const glyph = {
  arrow: literal('→'),
  separator: literal('·'),
  dash: literal('—'),
} as const;

/** Marks the current item or column in text, Markdown, and Slack. */
export const current = {
  mark: literal('now'),
} as const;
