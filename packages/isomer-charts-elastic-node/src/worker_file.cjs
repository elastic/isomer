/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-check
// CommonJS in source and in both builds, so `__dirname` is the directory it sits in and `require.resolve` works in either.
'use strict';

const { existsSync } = require('node:fs');
const { dirname, join } = require('node:path');

const here = typeof __dirname === 'string' ? __dirname : undefined;
const loader = here && join(here, 'worker_source.cjs');

/** The CommonJS build's worker, the one Node can start: in `lib/cjs` beside either build's copy of this file, else beside the package's `require` entry. */
const built = () => {
  const beside = here && join(here, '../cjs/worker.js');
  return beside && existsSync(beside)
    ? beside
    : join(
        dirname(require.resolve('@elastic/isomer-charts-elastic-node')),
        'worker.js'
      );
};

/**
 * The drawing worker's module: the CommonJS build's or, run from `src`, a
 * loader that runs its TypeScript source under tsx. Resolved when a worker
 * starts, so a missing worker fails that start, not the import.
 *
 * @returns {{ file: string }}
 */
exports.chartsWorker = () => ({
  file: loader && existsSync(loader) ? loader : built(),
});

/**
 * Elastic Charts' stylesheet for a scheme, as the host installed it.
 *
 * @param {'light' | 'dark'} scheme
 * @returns {string}
 */
exports.chartsStylesheetPath = (scheme) =>
  // tsx, running from source, tags resolved paths with a query.
  require
    .resolve(`@elastic/charts/dist/theme_${scheme}.css`)
    .replace(/\?.*$/, '');

/**
 * React DOM and the Elastic Charts engine as Node loads them, through
 * `require`: the CommonJS builds, whichever build of this package runs.
 *
 * @returns {{
 *   reactDom: typeof import('react-dom'),
 *   client: typeof import('react-dom/client'),
 *   engine: typeof import('@elastic/isomer-charts-elastic'),
 * }}
 */
exports.loadDrawingModules = () => ({
  reactDom: require('react-dom'),
  client: require('react-dom/client'),
  engine: require('@elastic/isomer-charts-elastic'),
});
