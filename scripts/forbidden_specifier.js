/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { builtinModules } from 'node:module';

const BUILTINS = new Set(builtinModules);

/** Whether `specifier` falls under `forbidden`: the package and its subpaths, or, for `node:`, any Node built-in, bare or prefixed. */
export const matchesForbidden = (specifier, forbidden) =>
  forbidden === 'node:'
    ? specifier.startsWith('node:') || BUILTINS.has(specifier.split('/')[0])
    : specifier === forbidden || specifier.startsWith(`${forbidden}/`);
