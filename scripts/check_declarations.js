/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, globSync, readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, relative, resolve, sep } from 'node:path';

import { specifiersIn } from './specifiers.js';
import { workspacePackages } from './workspace_packages.js';

const BUILTINS = new Set(builtinModules);

const packageNameOf = (specifier) => {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
};

const violations = [];

for (const pkg of workspacePackages()) {
  const distDir = resolve(pkg.dir, 'dist');
  if (!existsSync(distDir)) {
    violations.push({
      file: pkg.manifest.name,
      specifier: 'dist/',
      reason: 'dist/ is missing. Run `pnpm build` before this check.',
    });
    continue;
  }

  const declared = new Set([
    pkg.manifest.name,
    ...Object.keys(pkg.manifest.dependencies ?? {}),
    ...Object.keys(pkg.manifest.peerDependencies ?? {}),
    ...Object.keys(pkg.manifest.optionalDependencies ?? {}),
  ]);

  for (const file of globSync('**/*.{js,d.ts}', { cwd: distDir })) {
    const absolute = resolve(distDir, file);
    for (const specifier of specifiersIn(readFileSync(absolute, 'utf-8'))) {
      if (specifier.startsWith('.')) {
        const target = resolve(dirname(absolute), specifier);
        if (target !== distDir && !target.startsWith(`${distDir}${sep}`)) {
          violations.push({
            file: `${pkg.folder}/${file}`,
            specifier,
            reason: `relative import escapes dist/ (resolves to ${relative(pkg.dir, target)})`,
          });
        }
        const isCjs = file.startsWith(`cjs${sep}`);
        if (!isCjs && !/\.[a-zA-Z0-9]+$/.test(specifier)) {
          violations.push({
            file: `${pkg.folder}/${file}`,
            specifier,
            reason:
              'relative import is missing a file extension (build:specifiers should have rewritten it)',
          });
        }
        continue;
      }

      if (specifier.startsWith('node:') || BUILTINS.has(specifier)) {
        continue;
      }

      const name = packageNameOf(specifier);
      if (!declared.has(name)) {
        violations.push({
          file: `${pkg.folder}/${file}`,
          specifier,
          reason: `"${name}" is not a declared dependency of ${pkg.manifest.name}`,
        });
      }
    }
  }
}

if (violations.length > 0) {
  console.error('');
  for (const { file, specifier, reason } of violations) {
    console.error(`  dist/${file}\n    "${specifier}" — ${reason}`);
  }
  console.error(
    `\n${violations.length} declaration check failure(s).\n` +
      'Emitted files must not point outside this package, and relative specifiers must include a file extension.'
  );
  process.exit(1);
}

console.log(
  'Package declaration check passed: no unresolvable references in dist/.'
);
