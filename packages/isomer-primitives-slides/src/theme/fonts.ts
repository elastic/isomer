/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLIDE_THEME } from './theme';

/** One face the `snapshot` surface needs registered to draw this pack as designed. */
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

// Roboto Mono ships no extrabold, so no mono style sets it.
const extrabold = Number(SLIDE_THEME.font.weight.extrabold.value);

// `slideTitle`'s definition term is the one italic run.
const italic = Number(SLIDE_THEME.title.definition.weight.value);

/** Derived from the theme, so a new weight cannot silently fall back to the nearest registered face. */
export const slideFontFaces: readonly SlideFontFace[] = [
  { family: sans, weight: italic, style: 'italic' },
  ...weights.map((weight): SlideFontFace => ({
    family: sans,
    weight,
    style: 'normal',
  })),
  ...weights
    .filter((weight) => weight !== extrabold)
    .map((weight): SlideFontFace => ({
      family: mono,
      weight,
      style: 'normal',
    })),
];
