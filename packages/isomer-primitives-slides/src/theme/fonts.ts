/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLIDE_THEME } from './theme';

/** One face the image surface needs registered to draw this pack as designed. */
export interface SlideFontFace {
  family: string;
  weight: number;
  style: 'italic' | 'normal';
}

const firstFamily = (stack: string): string =>
  stack.split(',')[0]?.trim().replace(/^'|'$/g, '') ?? stack;

const sans = firstFamily(SLIDE_THEME.font.family.sans.value);
const mono = firstFamily(SLIDE_THEME.font.family.mono.value);

const weights = [
  ...new Set(
    Object.values(SLIDE_THEME.font.weight).map((token) => Number(token.value))
  ),
].sort((a, b) => a - b);

/**
 * The faces to register with an image backend, derived from the theme so a new
 * weight token cannot silently fall back to the nearest registered face. The
 * host maps each to a font file; `slideTitle`'s definition line is the one
 * italic run.
 */
export const slideFontFaces: readonly SlideFontFace[] = [
  { family: sans, weight: 400, style: 'italic' },
  ...weights.map((weight): SlideFontFace => ({
    family: sans,
    weight,
    style: 'normal',
  })),
  ...weights.map((weight): SlideFontFace => ({
    family: mono,
    weight,
    style: 'normal',
  })),
];
