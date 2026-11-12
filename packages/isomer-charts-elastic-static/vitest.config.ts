/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

import { sourceAliases } from '../../scripts/source_aliases.js';

// The browser engine's source, aliased here, must build its specs from this
// package's Elastic Charts, which `collectSpecs` collects from: one ESM
// tree for both entries, since the `exports` map hides the files under `dist`.
const charts = dirname(
  createRequire(import.meta.url).resolve('@elastic/charts/package.json')
);

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: {
    alias: [
      {
        find: /^@elastic\/charts\/dist\/headless$/,
        replacement: `${charts}/dist/esm/headless/index.mjs`,
      },
      {
        find: /^@elastic\/charts$/,
        replacement: `${charts}/dist/esm/index.mjs`,
      },
      ...sourceAliases(),
    ],
  },
  test: {
    name: 'charts-elastic-static',
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
