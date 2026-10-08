/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Writes the pack-independent half of the asset contract to `dist/app/`. The CLI adds `assets/app.js`, which bundles the Studio with a config.

import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appDir = join(packageDir, 'dist', 'app');
const assetsDir = join(appDir, 'assets');

const INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <base href="./" />
    <title>Isomer Studio</title>
    <link rel="icon" href="data:," />
    <link rel="stylesheet" href="assets/app.css" />
    <link rel="stylesheet" href="assets/slack.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="assets/app.js"></script>
  </body>
</html>
`;

const APP_CSS = `@import '${require.resolve('monaco-editor/min/vs/editor/editor.main.css')}';

html,
body,
#root {
  margin: 0;
  height: 100%;
}
`;

const WORKERS = {
  'editor.worker': 'monaco-editor/esm/vs/editor/editor.worker.js',
  'ts.worker': 'monaco-editor/esm/vs/language/typescript/ts.worker.js',
  'json.worker': 'monaco-editor/esm/vs/language/json/json.worker.js',
};

rmSync(appDir, { force: true, recursive: true });
mkdirSync(assetsDir, { recursive: true });
writeFileSync(join(appDir, 'index.html'), INDEX_HTML);

await build({
  stdin: {
    contents: APP_CSS,
    loader: 'css',
    resolveDir: packageDir,
    sourcefile: 'app.css',
  },
  outfile: join(assetsDir, 'app.css'),
  bundle: true,
  minify: true,
  loader: { '.ttf': 'file' },
  assetNames: '[name]-[hash]',
  logLevel: 'warning',
});

await build({
  entryPoints: { slack: require.resolve('slack-blocks-to-jsx/dist/style.css') },
  outdir: assetsDir,
  bundle: true,
  minify: true,
  logLevel: 'warning',
});

await build({
  entryPoints: Object.fromEntries(
    Object.entries(WORKERS).map(([name, path]) => [name, require.resolve(path)])
  ),
  outdir: assetsDir,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  logLevel: 'warning',
});

copyFileSync(
  require.resolve('esbuild-wasm/esbuild.wasm'),
  join(assetsDir, 'esbuild.wasm')
);

console.log(`Wrote @elastic/isomer-studio app assets to ${appDir}.`);
