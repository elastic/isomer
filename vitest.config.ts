/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'node:path';

import { configDefaults, defineConfig } from 'vitest/config';

import { workspacePackages } from './scripts/workspace_packages.js';

const typesEntry = (target: unknown): string | undefined =>
  typeof target === 'object' &&
  target !== null &&
  'types' in target &&
  typeof target.types === 'string'
    ? target.types
    : undefined;

/**
 * One alias per package export, pointing at the source the declaration is
 * built from, so tests never load `dist`. Subpaths come before the root entry
 * because the first matching alias wins.
 */
const sourceAliases = () =>
  workspacePackages().flatMap(({ dir, manifest }) =>
    Object.entries(manifest.exports ?? {})
      .sort(([a], [b]) => Number(a === '.') - Number(b === '.'))
      .flatMap(([key, target]) => {
        const types = typesEntry(target);
        return types === undefined
          ? []
          : [
              {
                find:
                  key === '.'
                    ? manifest.name
                    : `${manifest.name}/${key.slice(2)}`,
                replacement: resolve(
                  dir,
                  types
                    .replace(/^\.\/dist\//, 'src/')
                    .replace(/\.d\.ts$/, '.ts')
                ),
              },
            ];
      })
  );

export default defineConfig({
  resolve: { alias: sourceAliases() },
  test: {
    globals: true,
    environment: 'node',
    passWithNoTests: true,
    include: ['packages/*/src/**/*.test.ts', 'scripts/**/*.test.js'],
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
