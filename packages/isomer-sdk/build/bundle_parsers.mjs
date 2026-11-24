/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Replaces Babel's `lib/cjs/render/markdown/parsers.js` with one CommonJS file
// that inlines the ESM-only Markdown packages it re-exports, then fails if any
// other CommonJS module still requires one of them.

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cjsDir = join(packageDir, 'lib/cjs');
const outfile = join(cjsDir, 'render/markdown/parsers.js');

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

const inlined = new Set(
  Object.keys(metafile.inputs).flatMap(
    (input) =>
      input.match(/.*node_modules\/((?:@[^/]+\/)?[^/]+)\//)?.slice(1) ?? []
  )
);
const requiresInlined = readdirSync(cjsDir, { recursive: true })
  .filter((file) => file.endsWith('.js'))
  .flatMap((file) =>
    [
      ...readFileSync(join(cjsDir, file), 'utf8').matchAll(
        /require\("([^"]+)"\)/g
      ),
    ]
      .map(([, specifier]) => specifier.match(/^(?:@[^/]+\/)?[^/]+/)[0])
      .filter((name) => inlined.has(name))
      .map((name) => `${file} requires ${name}`)
  );
if (requiresInlined.length > 0) {
  throw new Error(
    `Import the Markdown packages through src/render/markdown/parsers.ts, which the CommonJS build bundles:\n${requiresInlined.join('\n')}`
  );
}
