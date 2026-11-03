/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Every package ships the EUI layout: ESM for bundlers under `lib/esm`, and
// CommonJS with its declarations under `lib/cjs`. Each export, and the
// top-level `main`, `module` and `types`, must name the same module in each.

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { workspacePackages } from './workspace_packages.js';

const CONDITIONS = ['types', 'import', 'require', 'default'];

/** The `lib/cjs` target and declaration for an `import` target under `lib/esm`. */
const expectedFor = (importPath) => {
  if (!importPath.startsWith('./lib/esm/') || !importPath.endsWith('.js')) {
    throw new Error(
      `import target must be a .js file under ./lib/esm/, got "${importPath}"`
    );
  }
  const require = `./lib/cjs/${importPath.slice('./lib/esm/'.length)}`;
  return {
    require,
    default: require,
    types: require.replace(/\.js$/, '.d.ts'),
  };
};

const bare = (path) => path?.replace(/^\.\//, '');

const violations = [];

for (const pkg of workspacePackages()) {
  const {
    exports: exportMap,
    main,
    module,
    name,
    type,
    types,
    typesVersions,
  } = pkg.manifest;
  if (type !== undefined) {
    violations.push(
      `${name}: declares "type": "${type}"; the layout has no package type`
    );
  }
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
    if (Object.keys(conditions).join() !== CONDITIONS.join()) {
      violations.push(
        `${label}: conditions must be exactly ${CONDITIONS.join(', ')}, in that order`
      );
      continue;
    }

    let expected;
    try {
      expected = expectedFor(conditions.import);
    } catch (error) {
      violations.push(`${label}: ${error.message}`);
      continue;
    }
    for (const [cond, target] of Object.entries(expected)) {
      if (conditions[cond] !== target) {
        violations.push(
          `${label}: ${cond} "${conditions[cond]}" should be "${target}"`
        );
      }
    }
    for (const cond of CONDITIONS) {
      if (!existsSync(join(pkg.dir, conditions[cond]))) {
        violations.push(
          `${label}: ${cond} target missing on disk: ${conditions[cond]}`
        );
      }
    }

    // `typesVersions` gives subpaths their declarations under `moduleResolution: node`.
    if (key !== '.') {
      const mapped = typesVersions?.['*']?.[key.slice(2)];
      if (mapped?.length !== 1 || mapped[0] !== conditions.types) {
        violations.push(
          `${name} typesVersions["*"]["${key.slice(2)}"] must be ["${conditions.types}"]`
        );
      }
    }
  }

  const root = exportMap['.'];
  if (root && typeof root === 'object') {
    for (const [field, value, target] of [
      ['main', main, root.require],
      ['module', module, root.import],
      ['types', types, root.types],
    ]) {
      if (value === undefined || bare(value) !== bare(target)) {
        violations.push(
          `${name}: "${field}" (${value}) must name exports["."] (${target})`
        );
      }
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
