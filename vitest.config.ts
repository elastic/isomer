/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configDefaults, defineConfig } from 'vitest/config';

import { sourceAliases } from './scripts/source_aliases.js';

export default defineConfig({
  resolve: { alias: sourceAliases() },
  test: {
    globals: true,
    environment: 'node',
    passWithNoTests: true,
    include: [
      'packages/*/src/**/*.test.ts',
      'docs/deck/src/**/*.test.ts',
      'apps/*/server/**/*.test.ts',
      'scripts/**/*.test.js',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['packages/*/src/**/*.ts'],
      exclude: [
        ...(configDefaults.coverage.exclude ?? []),
        '**/*.test.ts',
        '**/*.d.ts',
      ],
    },
  },
});
