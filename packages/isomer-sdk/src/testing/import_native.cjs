/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-check
// CommonJS in source and in both builds, so Babel never compiles this `import()` to `require()`.
'use strict';

/**
 * Node's own `import()`.
 *
 * @param {string} specifier
 * @returns {Promise<Record<string, unknown>>}
 */
exports.importNative = (specifier) => import(specifier);
