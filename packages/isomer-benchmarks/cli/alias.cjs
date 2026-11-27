/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Preloaded with `--require` into a `compare` child on the swapped side when
// `--alias` is given: resolves each named specifier as another, such as
// `@elastic/charts` as `@elastic/charts/headless`. Preloaded, it is in
// `require.cache` before the `load` suite counts, so it adds no module there.

const Module = require('node:module');

const aliases = JSON.parse(process.env.ISOMER_BENCH_ALIAS ?? '{}');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  return resolve.call(
    this,
    Object.hasOwn(aliases, request) ? aliases[request] : request,
    ...rest
  );
};
