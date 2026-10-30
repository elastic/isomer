/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-check
// CommonJS in both builds, so `__dirname` locates the worker beside either.
'use strict';

const { existsSync } = require('node:fs');
const { join } = require('node:path');

// The CommonJS build's worker, in `cjs/` beside the ESM build's copy of this file or beside the CommonJS build's.
const built = [
  join(__dirname, 'cjs', 'pdf_worker.js'),
  join(__dirname, 'pdf_worker.js'),
];

/**
 * The PDF worker's module: the CommonJS build's or, run from `src`, a loader
 * that runs its TypeScript source under tsx, so either build's engine starts the same worker.
 * Resolved when a worker starts, so a missing worker fails that PDF call, not the import.
 *
 * @returns {{ file: string }}
 */
exports.pdfWorker = () => ({
  file:
    built.find((file) => existsSync(file)) ??
    join(__dirname, 'pdf_worker_source.cjs'),
});
