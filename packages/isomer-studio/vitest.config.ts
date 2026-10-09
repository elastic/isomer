/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

import { sourceAliases } from '../../scripts/source_aliases.js';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: {
    alias: [
      ...sourceAliases(),
      { find: /^@elastic\/eui$/, replacement: '@elastic/eui/test-env' },
    ],
  },
  oxc: {
    jsx: { runtime: 'automatic', importSource: '@emotion/react' },
  },
  test: {
    name: 'studio',
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test_setup.ts'],
    // Tests that mount the whole Studio with EUI under jsdom take seconds, more on CI runners.
    testTimeout: 30_000,
  },
});
