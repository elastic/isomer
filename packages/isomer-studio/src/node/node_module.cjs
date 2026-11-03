/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-check
// CommonJS in source and in both builds, so `__filename` is this directory and Babel never compiles this `import()` to `require()`.
'use strict';

const { pathToFileURL } = require('node:url');

/** A module URL in this directory, to resolve its siblings and the Studio's dependencies from. */
exports.moduleUrl = pathToFileURL(__filename).href;

/**
 * Node's own `import()`, for ESM-only dependencies and `file:` URLs.
 *
 * @param {string} specifier
 * @returns {Promise<unknown>}
 */
exports.importNative = (specifier) => import(specifier);
