/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { consumerEnv } from './packed_require.js';
import { splitDiagnostics } from './tsc_diagnostics.js';

const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc');

const compileDiagnostics = (project) => {
  const result = spawnSync(
    process.execPath,
    [tsc, '-p', project, '--pretty', 'false'],
    { encoding: 'utf-8', env: consumerEnv() }
  );
  if (result.error) {
    throw result.error;
  }
  const diagnostics = splitDiagnostics(result.stdout);
  if (
    result.status !== 0 &&
    diagnostics.errors.length === 0 &&
    diagnostics.known.length === 0
  ) {
    throw new Error(`tsc exited ${result.status}: ${result.stderr}`);
  }
  return diagnostics;
};

export const checkDeclarations = (
  specifiers,
  typesConsumerDir,
  node10Unresolvable = new Set()
) => {
  mkdirSync(typesConsumerDir, { recursive: true });
  const resolutions = [
    ['commonjs', 'node10'],
    ['nodenext', 'nodenext'],
    ['esnext', 'bundler'],
  ];
  for (const [module, moduleResolution] of resolutions) {
    const checked = specifiers.filter(
      (specifier) =>
        moduleResolution !== 'node10' || !node10Unresolvable.has(specifier)
    );
    writeFileSync(
      join(typesConsumerDir, 'index.ts'),
      `${checked.map((specifier, index) => `import type * as entry${index} from '${specifier}';`).join('\n')}\nexport type { ${checked.map((_, index) => `entry${index}`).join(', ')} };\n`
    );
    writeFileSync(
      join(typesConsumerDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          module,
          moduleResolution,
          target: 'es2022',
          lib: ['es2023', 'dom'],
          strict: true,
          skipLibCheck: false,
          esModuleInterop: true,
          noEmit: true,
          types: ['node'],
        },
        files: ['index.ts'],
      })
    );
    const { known, errors } = compileDiagnostics(typesConsumerDir);
    for (const diagnostic of known) {
      console.warn(`Known @elastic/charts declaration error: ${diagnostic}`);
    }
    if (errors.length > 0) {
      for (const diagnostic of errors) {
        console.error(diagnostic);
      }
      throw new Error(
        `Packed declarations fail to compile under ${moduleResolution} resolution.`
      );
    }
    console.log(
      `Packed declarations of ${checked.length} entry points compile under ${moduleResolution} resolution.`
    );
  }
};
