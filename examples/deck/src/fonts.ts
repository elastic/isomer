/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

import type { FontLoader } from '@elastic/isomer-image-takumi';
import { slideFontFaces } from '@elastic/isomer-primitives-slides';

const require = createRequire(import.meta.url);

/** Where `@fontsource/*` keeps each family the pack's theme names, and the weights it ships. */
const fontsource: Record<
  string,
  { pkg: string; slug: string; weights: readonly number[] }
> = {
  Inter: {
    pkg: '@fontsource/inter',
    slug: 'inter',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
  },
  'Roboto Mono': {
    pkg: '@fontsource/roboto-mono',
    slug: 'roboto-mono',
    weights: [100, 200, 300, 400, 500, 600, 700],
  },
};

/**
 * The pack's faces as takumi loaders, the same files `main.tsx` loads in the
 * browser. A weight a family does not ship is dropped rather than substituted.
 */
export const deckFonts: readonly FontLoader[] = slideFontFaces.flatMap(
  ({ family, weight, style }) => {
    const source = fontsource[family];
    if (source === undefined || !source.weights.includes(weight)) {
      return [];
    }
    const file = require.resolve(
      `${source.pkg}/files/${source.slug}-latin-${weight}-${style}.woff2`
    );
    return [{ name: family, weight, style, data: () => readFile(file) }];
  }
);
