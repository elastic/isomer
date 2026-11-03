/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Node loads the CommonJS build, so every export and `main` must `require`.
// The ESM build is for bundlers; `check_pack_consumer.js` bundles it.

import { createRequire } from 'node:module';
import { join } from 'node:path';

import { repoRoot, workspacePackages } from './workspace_packages.js';

const require = createRequire(join(repoRoot, 'package.json'));

const exportSpecifier = (packageName, key) =>
  key === '.' ? packageName : `${packageName}/${key.slice(2)}`;

let loaded = 0;

for (const pkg of workspacePackages()) {
  const { name, exports: exportMap, main } = pkg.manifest;
  if (exportMap === undefined || typeof exportMap !== 'object') {
    throw new Error(`${name}: missing exports map`);
  }

  // A package requires itself by name, whether or not the root depends on it.
  const requireFromPackage = createRequire(join(pkg.dir, 'package.json'));
  for (const key of Object.keys(exportMap)) {
    requireFromPackage(exportSpecifier(name, key));
    loaded += 1;
  }

  if (require(join(pkg.dir, main)) === undefined) {
    throw new Error(`${name}: "main" (${main}) resolved to undefined`);
  }
}

console.log(
  `Package export check passed: ${loaded} entry point(s) and every "main" load through require.`
);
