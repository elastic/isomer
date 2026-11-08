/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  countPlaywright,
  requireChromium,
  runPlaywright,
} from './studio_spec.js';

const SUITES = [
  'packages/isomer-studio/e2e/playwright.config.ts',
  'packages/isomer-primitives-charts/e2e/playwright.config.ts',
];

requireChromium();
const args = process.argv.slice(2);
// Arguments may filter to one suite's specs, leaving the other nothing to run.
const suites =
  args.length > 0
    ? SUITES.filter((config) => countPlaywright(config, args) > 0)
    : SUITES;
if (suites.length === 0) {
  console.error(`No browser test matches: ${args.join(' ')}`);
  process.exit(1);
}
process.exit(
  suites
    .map((config) => runPlaywright(config, { args }))
    .find((status) => status !== 0) ?? 0
);
