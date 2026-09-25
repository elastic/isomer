/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

import type { FontLoader } from '@elastic/isomer-image-takumi';

const require = createRequire(import.meta.url);

const family = (
  pkg: string,
  name: string,
  slug: string,
  weights: readonly number[],
  style: 'normal' | 'italic' = 'normal'
): FontLoader[] =>
  weights.map((weight) => {
    const file = require.resolve(
      `${pkg}/files/${slug}-latin-${weight}-${style}.woff2`
    );
    return { name, weight, style, data: () => readFile(file) };
  });

/** The faces the browser loads in `main.tsx`, for the image surface. */
export const deckFonts: readonly FontLoader[] = [
  ...family('@fontsource/inter', 'Inter', 'inter', [400, 500, 600, 700, 800]),
  ...family('@fontsource/inter', 'Inter', 'inter', [400], 'italic'),
  ...family(
    '@fontsource/roboto-mono',
    'Roboto Mono',
    'roboto-mono',
    [400, 500, 600, 700]
  ),
];
