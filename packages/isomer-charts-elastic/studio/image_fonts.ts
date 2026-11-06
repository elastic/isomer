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

/** Inter at the weights Elastic Charts and the charts pack draw with. */
const fonts: FontLoader[] = [400, 500, 600, 700].map((weight) => ({
  name: 'Inter',
  weight,
  style: 'normal',
  data: () =>
    readFile(
      require.resolve(
        `@fontsource/inter/files/inter-latin-${weight}-normal.woff2`
      )
    ),
}));

export default fonts;
