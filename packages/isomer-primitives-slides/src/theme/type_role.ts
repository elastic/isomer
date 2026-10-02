/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScaleToken } from '@elastic/distillate';

/** A `type` role: size plus whichever of weight, tracking, leading, family, `text-transform`, and `white-space` it sets. */
export interface TypeRole {
  family?: ScaleToken;
  size: ScaleToken;
  weight?: ScaleToken;
  tracking?: ScaleToken;
  lineHeight?: ScaleToken;
  transform?: ScaleToken;
  whiteSpace?: ScaleToken;
}

/** Scale tokens inline, so a string carries them where a `decls` fragment cannot. */
export const typeRole = ({
  family,
  size,
  weight,
  tracking,
  lineHeight,
  transform,
  whiteSpace,
}: TypeRole): string =>
  [
    family ? `font-family: ${family.value};` : '',
    `font-size: ${size.value};`,
    weight ? `font-weight: ${weight.value};` : '',
    tracking ? `letter-spacing: ${tracking.value};` : '',
    lineHeight ? `line-height: ${lineHeight.value};` : '',
    transform ? `text-transform: ${transform.value};` : '',
    whiteSpace ? `white-space: ${whiteSpace.value};` : '',
  ]
    .filter(Boolean)
    .join(' ');
