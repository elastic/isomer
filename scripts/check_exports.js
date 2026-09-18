/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { workspacePackages } from './workspace_packages.js';

const exportSpecifier = (packageName, key) =>
  key === '.' ? packageName : `${packageName}/${key.slice(2)}`;

let loaded = 0;

for (const pkg of workspacePackages()) {
  const { name, exports: exportMap } = pkg.manifest;
  if (exportMap === undefined || typeof exportMap !== 'object') {
    throw new Error(`${name}: missing exports map`);
  }

  for (const key of Object.keys(exportMap)) {
    const specifier = exportSpecifier(name, key);
    await import(specifier);
    loaded += 1;
  }
}

console.log(`Package export check passed: ${loaded} ESM entry point(s).`);

const cjsCheck = resolve(
  dirname(fileURLToPath(import.meta.url)),
  'check_exports_cjs.cjs'
);
execFileSync(
  process.execPath,
  [cjsCheck, JSON.stringify(workspacePackages())],
  { stdio: 'inherit' }
);
