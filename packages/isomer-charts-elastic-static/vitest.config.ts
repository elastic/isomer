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
// package's Elastic Charts, whose `<Chart>` collects them.
const charts = dirname(
  createRequire(import.meta.url).resolve('@elastic/charts/package.json')
);

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: {
    alias: [
      { find: /^@elastic\/charts(\/.*)?$/, replacement: `${charts}$1` },
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
