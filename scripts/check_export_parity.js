/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { isEsmOnly, workspacePackages } from './workspace_packages.js';

const toCjsPath = (importPath) => {
  if (!importPath.startsWith('./dist/')) {
    throw new Error(
      `import target must start with ./dist/, got "${importPath}"`
    );
  }
  return `./dist/cjs/${importPath.slice('./dist/'.length)}`;
};

const toTypesPath = (importPath) => importPath.replace(/\.js$/, '.d.ts');

const violations = [];

for (const pkg of workspacePackages()) {
  const { exports: exportMap, main, module, types, name } = pkg.manifest;
  const esmOnly = isEsmOnly(pkg.manifest);
  const conditionNames = esmOnly
    ? ['types', 'import']
    : ['types', 'import', 'require'];
  if (exportMap === undefined || typeof exportMap !== 'object') {
    violations.push(`${name}: missing exports map`);
    continue;
  }

  for (const [key, conditions] of Object.entries(exportMap)) {
    const label = `${name} exports["${key}"]`;
    if (conditions === null || typeof conditions !== 'object') {
      violations.push(`${label}: must be a conditions object`);
      continue;
    }

    for (const cond of conditionNames) {
      if (typeof conditions[cond] !== 'string') {
        violations.push(`${label}: missing "${cond}" condition`);
      }
    }
    if (esmOnly && conditions.require !== undefined) {
      violations.push(`${label}: an ESM-only package has no "require"`);
    }

    if (conditionNames.some((cond) => typeof conditions[cond] !== 'string')) {
      continue;
    }

    if (!esmOnly) {
      const expectedRequire = toCjsPath(conditions.import);
      if (conditions.require !== expectedRequire) {
        violations.push(
          `${label}: require "${conditions.require}" should be "${expectedRequire}"`
        );
      }
    }

    const expectedTypes = toTypesPath(conditions.import);
    if (conditions.types !== expectedTypes) {
      violations.push(
        `${label}: types "${conditions.types}" should be "${expectedTypes}"`
      );
    }

    for (const cond of conditionNames) {
      const target = conditions[cond];
      const absolute = join(pkg.dir, target);
      if (!existsSync(absolute)) {
        violations.push(`${label}: ${cond} target missing on disk: ${target}`);
      }
    }
  }

  const root = exportMap['.'];
  if (root && typeof root === 'object') {
    if (esmOnly && main !== undefined) {
      violations.push(`${name}: an ESM-only package has no "main"`);
    }
    if (!esmOnly && main !== root.require) {
      violations.push(
        `${name}: "main" (${main}) must equal exports["."].require (${root.require})`
      );
    }
    if (module !== root.import) {
      violations.push(
        `${name}: "module" (${module}) must equal exports["."].import (${root.import})`
      );
    }
    if (types !== root.types) {
      violations.push(
        `${name}: "types" (${types}) must equal exports["."].types (${root.types})`
      );
    }
  }
}

if (violations.length > 0) {
  console.error('\nExport parity check failed:');
  for (const violation of violations) {
    console.error(`  ${violation}`);
  }
  process.exit(1);
}

console.log(
  `Export parity check passed: ${workspacePackages().length} package(s).`
);
