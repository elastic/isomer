/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Node loads the CommonJS build, so every export and `main` must `require`.
// The ESM build is for bundlers; `check_pack_consumer.js` bundles it.
// Each package loads in its own process, as a consumer loads it: the static
// Elastic Charts engine carries its own copy of the browser engine, and the
// two register the same style modules.

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { workspacePackages } from './workspace_packages.js';

const exportSpecifier = (packageName, key) =>
  key === '.' ? packageName : `${packageName}/${key.slice(2)}`;

/** Requires every export and `main` of the package in `dir`; returns how many entries loaded. */
const loadPackage = (dir) => {
  const pkg = workspacePackages().find((candidate) => candidate.dir === dir);
  if (pkg === undefined) {
    throw new Error(`${dir}: not a workspace package`);
  }
  const { name, exports: exportMap, main } = pkg.manifest;
  if (exportMap === undefined || typeof exportMap !== 'object') {
    throw new Error(`${name}: missing exports map`);
  }

  // A package requires itself by name, whether or not the root depends on it.
  const requireFromPackage = createRequire(join(pkg.dir, 'package.json'));
  for (const key of Object.keys(exportMap)) {
    requireFromPackage(exportSpecifier(name, key));
  }

  if (requireFromPackage(join(pkg.dir, main)) === undefined) {
    throw new Error(`${name}: "main" (${main}) resolved to undefined`);
  }
  return Object.keys(exportMap).length;
};

const [, , only] = process.argv;

if (only !== undefined) {
  process.stdout.write(String(loadPackage(only)));
} else {
  let loaded = 0;
  for (const { dir, manifest } of workspacePackages()) {
    const child = spawnSync(
      process.execPath,
      [fileURLToPath(import.meta.url), dir],
      { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'inherit'] }
    );
    if (child.status !== 0) {
      throw new Error(`${manifest.name}: an export or "main" failed to load`);
    }
    loaded += Number(child.stdout);
  }
  console.log(
    `Package export check passed: ${loaded} entry point(s) and every "main" load through require.`
  );
}
