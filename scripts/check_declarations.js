/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, globSync, readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, relative, resolve, sep } from 'node:path';

import { isPackedFile } from './packed_files.js';
import { specifiersIn } from './specifiers.js';
import { workspacePackages } from './workspace_packages.js';

const BUILTINS = new Set(builtinModules);

const packageNameOf = (specifier) => {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
};

const violations = [];

for (const pkg of workspacePackages()) {
  const libDir = resolve(pkg.dir, 'lib');
  if (!existsSync(libDir)) {
    violations.push({
      file: pkg.manifest.name,
      specifier: 'lib/',
      reason: 'lib/ is missing. Run `pnpm build` before this check.',
    });
    continue;
  }

  const declared = new Set([
    pkg.manifest.name,
    ...Object.keys(pkg.manifest.dependencies ?? {}),
    ...Object.keys(pkg.manifest.peerDependencies ?? {}),
    ...Object.keys(pkg.manifest.optionalDependencies ?? {}),
  ]);

  // `packedFiles` are self-contained bundles, not compiler output.
  const emitted = globSync('**/*.{js,cjs,d.ts,d.cts}', { cwd: libDir }).filter(
    (file) =>
      !isPackedFile(
        `lib/${file.split(sep).join('/')}`,
        pkg.manifest.isomer?.packedFiles
      )
  );
  for (const file of emitted) {
    const absolute = resolve(libDir, file);
    for (const specifier of specifiersIn(readFileSync(absolute, 'utf-8'))) {
      if (specifier.startsWith('.')) {
        const target = resolve(dirname(absolute), specifier);
        // Each build stays within its own directory: `lib/esm` or `lib/cjs`.
        const buildDir = resolve(libDir, file.split(sep)[0]);
        if (target !== buildDir && !target.startsWith(`${buildDir}${sep}`)) {
          violations.push({
            file: `${pkg.folder}/${file}`,
            specifier,
            reason: `relative import escapes its build (resolves to ${relative(pkg.dir, target)})`,
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
    console.error(`  lib/${file}\n    "${specifier}" — ${reason}`);
  }
  console.error(
    `\n${violations.length} declaration check failure(s).\n` +
      'Emitted files must not point outside their build, and bare specifiers must be declared dependencies.'
  );
  process.exit(1);
}

console.log(
  'Package declaration check passed: no unresolvable references in lib/.'
);
