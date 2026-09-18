/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

'use strict';

// Runs as its own process, spawned by check_exports.js. This file only ever
// `require()`s the packages — never `import()`s them — so it never shares a
// process with the ESM checks. Mixing `import` and `require` on the same
// package in one process is the dual-package hazard.

const { resolve } = require('node:path');

/** The workspace manifests, serialized by check_exports.js. */
const workspacePackages = JSON.parse(process.argv[2] ?? '[]');

const exportSpecifier = (packageName, key) =>
  key === '.' ? packageName : `${packageName}/${key.slice(2)}`;

let loaded = 0;

for (const pkg of workspacePackages) {
  const { name, exports: exportMap, main } = pkg.manifest;
  if (exportMap === undefined || typeof exportMap !== 'object') {
    throw new Error(`${name}: missing exports map`);
  }

  for (const key of Object.keys(exportMap)) {
    require(exportSpecifier(name, key));
    loaded += 1;
  }

  const mainEntry = require(resolve(pkg.dir, main));
  if (mainEntry === undefined) {
    throw new Error(`${name}: "main" (${main}) resolved to undefined`);
  }
}

console.log(
  `CJS package export check passed: ${loaded} entry point(s), "main" verified.`
);
