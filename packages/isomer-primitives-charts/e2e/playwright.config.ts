/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  forbidOnly: Boolean(process.env.CI),
  reporter: 'list',
  outputDir: '../../../test-results/charts',
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
