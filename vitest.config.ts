/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configDefaults, defineConfig } from 'vitest/config';

import { sourceAliases } from './scripts/source_aliases.js';

/** Packages with their own Vitest project, which the root project leaves alone. */
const OWN_PROJECTS = ['packages/isomer-studio'];

export default defineConfig({
  resolve: { alias: sourceAliases() },
  test: {
    passWithNoTests: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          globals: true,
          environment: 'node',
          include: [
            'packages/*/src/**/*.test.ts',
            'examples/*/src/**/*.test.ts',
            'examples/*/server/**/*.test.ts',
            'scripts/**/*.test.js',
          ],
          exclude: [
            ...configDefaults.exclude,
            ...OWN_PROJECTS.map((dir) => `${dir}/**`),
          ],
        },
      },
      ...OWN_PROJECTS.map((dir) => `${dir}/vitest.config.ts`),
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['packages/*/src/**/*.{ts,tsx}'],
      exclude: [
        ...(configDefaults.coverage.exclude ?? []),
        '**/*.test.{ts,tsx}',
        '**/*.d.ts',
        '**/fixtures/**',
      ],
    },
  },
});
