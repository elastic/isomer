/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cq, type ScaleToken } from '@elastic/distillate';

/** Mode-invariant length. Distillate inlines `.value`; the cq twin is unused in this pack. */
export const px = (n: number): ScaleToken => cq(`${n}px`, `${n}px`);

/** Shorthand padding `Y X` from two length tokens. */
export const paddingXy = (y: ScaleToken, x: ScaleToken): ScaleToken =>
  cq(`${y.value} ${x.value}`, `${y.value} ${x.value}`);

/** Unitless or keyword theme leaf (font stack, weight, line height). */
export const literal = (value: string): ScaleToken => cq(value, value);

/** Numeric pixels from a {@link ScaleToken}, for the frame's geometry. */
export const scalePx = (token: ScaleToken): number => parseFloat(token.value);
