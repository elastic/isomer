/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

import type { FontLoader } from '@elastic/isomer-image-takumi';

import { SLIDE_THEME } from '../../theme/theme';

const require = createRequire(import.meta.url);

/**
 * Weights `SLIDE_THEME` declares, plus 400 for everything that inherits the
 * document default. Derived rather than listed so a new weight token cannot
 * silently fall back to the nearest registered face.
 */
const themeWeights = [
  400,
  ...Object.values(SLIDE_THEME.font.weight).map((token) => Number(token.value)),
].sort((a, b) => a - b);

/**
 * `@fontsource/*` ships woff2, which takumi decodes natively, so the files are
 * passed as-is. Roboto Mono stops at 700 and Inter reaches 900; a weight the
 * family does not ship is dropped rather than substituted.
 */
const fontsourceFamily = (
  pkg: string,
  family: string,
  slug: string,
  available: readonly number[]
): FontLoader[] =>
  themeWeights
    .filter((weight) => available.includes(weight))
    .map((weight) => {
      const file = require.resolve(
        `${pkg}/files/${slug}-latin-${weight}-normal.woff2`
      );
      return { name: family, weight, data: () => readFile(file) };
    });

/** Registered in order, which is also takumi's fallback order. */
export const deckFonts: readonly FontLoader[] = [
  ...fontsourceFamily(
    '@fontsource/inter',
    'Inter',
    'inter',
    [100, 200, 300, 400, 500, 600, 700, 800, 900]
  ),
  ...fontsourceFamily(
    '@fontsource/roboto-mono',
    'Roboto Mono',
    'roboto-mono',
    [100, 200, 300, 400, 500, 600, 700]
  ),
];
