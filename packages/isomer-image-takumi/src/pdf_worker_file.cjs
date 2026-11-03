/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-check
// CommonJS in source and in both builds, so `__dirname` is the directory it sits in, unless a bundler has inlined it.
'use strict';

const { existsSync } = require('node:fs');
const { dirname, join } = require('node:path');

const here = typeof __dirname === 'string' ? __dirname : undefined;
const loader = here && join(here, 'pdf_worker_source.cjs');

/** The CommonJS build's worker, the one Node can start: in `lib/cjs` beside either build's copy of this file, else beside the package's `require` entry. */
const built = () => {
  const beside = here && join(here, '../cjs/pdf_worker.js');
  return beside && existsSync(beside)
    ? beside
    : join(
        dirname(require.resolve('@elastic/isomer-image-takumi')),
        'pdf_worker.js'
      );
};

/**
 * The PDF worker's module: the CommonJS build's or, run from `src`, a loader
 * that runs its TypeScript source under tsx, so either build's engine starts the same worker.
 * Resolved when a worker starts, so a missing worker fails that PDF call, not the import.
 *
 * @returns {{ file: string }}
 */
exports.pdfWorker = () => ({
  file: loader && existsSync(loader) ? loader : built(),
});
