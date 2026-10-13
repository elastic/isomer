/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { chromium } from '@playwright/test';

import { repoRoot } from './workspace_packages.js';

const INSTALL = 'pnpm exec playwright install chromium';

/** Exits with the install command when Playwright's Chromium is missing. */
export const requireChromium = () => {
  if (!existsSync(chromium.executablePath())) {
    console.error(
      `Chromium for Playwright is not installed. Run:\n\n  ${INSTALL}\n\nOn Linux, add --with-deps.`
    );
    process.exit(1);
  }
};

/** Runs the Studio's Playwright spec and returns its exit status. */
export const runStudioSpec = ({ args = [], env = process.env } = {}) => {
  const cli = createRequire(import.meta.url).resolve('@playwright/test/cli');
  const { status } = spawnSync(
    process.execPath,
    [
      cli,
      'test',
      '-c',
      join(repoRoot, 'packages/isomer-studio/e2e/playwright.config.ts'),
      ...args,
    ],
    { cwd: repoRoot, env, stdio: 'inherit' }
  );
  return status ?? 1;
};
