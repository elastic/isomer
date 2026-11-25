/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Replaces Babel's `lib/cjs/render/markdown/parsers.js` with one CommonJS file
// that inlines the ESM-only Markdown packages it re-exports. `pnpm
// check:module-graph` fails if the CommonJS build still requires any of them.

import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outfile = join(packageDir, 'lib/cjs/render/markdown/parsers.js');

const { metafile } = await build({
  entryPoints: [join(packageDir, 'src/render/markdown/parsers.ts')],
  outfile,
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node22',
  metafile: true,
  logLevel: 'warning',
});

const external = Object.values(metafile.inputs).flatMap(({ imports }) =>
  imports.filter((imported) => imported.external).map(({ path }) => path)
);
if (external.length > 0) {
  throw new Error(
    `${relative(packageDir, outfile)} must inline every import, but leaves ${external.join(', ')} external`
  );
}
