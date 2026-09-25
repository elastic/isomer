/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, radius, space, stroke, type } from '../base';
import { literal, paddingXy } from '../scale';

/** Uppercase label above a list, column, or lane. */
export const label = {
  size: type.label.size,
  weight: type.label.weight,
  tracking: type.label.tracking,
  gap: space.px16,
} as const;

/** Stand-in for a render or number that does not exist yet. Never fake content. */
export const placeholder = {
  stripe: literal('14px'),
  stripeEnd: literal('28px'),
  angle: literal('135deg'),
  border: stroke.hairline,
  radius: radius.panel,
  captionFontSize: font.size.px24,
  captionPadding: paddingXy(space.px6, space.px14),
  captionRadius: radius.chipSmall,
} as const;

/** Bordered panel shared by code, windows, and renders. */
export const panel = {
  border: stroke.panel,
  radius: radius.panel,
} as const;

/** Rail-and-arrow connector used by pipelines, lanes, graphs, and code traces. */
export const connector = {
  rail: stroke.rail,
  // Arrowhead drawn from borders: 10px either side, 16px long.
  headHalf: literal('10px'),
  headLength: literal('16px'),
} as const;
