/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineConfig, devices } from '@playwright/test';

/** Captures comparison cases from a local Kibana; never part of `pnpm verify` or CI. */
export default defineConfig({
  testDir: '.',
  testMatch: 'capture.spec.ts',
  workers: 1,
  timeout: 30 * 60_000,
  expect: { timeout: 120_000 },
  reporter: 'list',
  outputDir: '../../../../test-results/capture',
  use: {
    ...devices['Desktop Chrome'],
    deviceScaleFactor: 1,
    // The compose file's Linux browser, so text draws as CI's Chromium draws it.
    connectOptions: {
      wsEndpoint: process.env.CAPTURE_BROWSER ?? 'ws://127.0.0.1:3000/',
    },
  },
});
