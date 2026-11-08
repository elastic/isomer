/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  requireChromium,
  runPlaywright,
  runStudioSpec,
} from './studio_spec.js';

requireChromium();
const args = process.argv.slice(2);
const studio = runStudioSpec({ args });
// Arguments may filter to a Studio spec, leaving the charts specs nothing to run.
const charts = runPlaywright(
  'packages/isomer-primitives-charts/e2e/playwright.config.ts',
  { args: args.length > 0 ? [...args, '--pass-with-no-tests'] : [] }
);
process.exit(studio || charts);
