/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { BuildOptions, Plugin } from 'esbuild';

export type AppMode = 'build' | 'dev';

const here = dirname(fileURLToPath(import.meta.url));

/** The package's prebuilt, pack-independent assets: `dist/app/`. */
export const APP_DIR = resolve(here, '../../dist/app');

/** Without an extension, so the bundle takes `dist/browser/*.js`, or the `.ts(x)` beside it under test. */
const browserModule = (name: string): string =>
  resolve(here, '../browser', name);

const HOSTS: Readonly<Record<AppMode, { module: string; name: string }>> = {
  dev: { module: 'dev_host', name: 'devHost' },
  build: { module: 'static_host', name: 'staticHost' },
};

/** The bundle's entry: the config's default export mounted with the mode's host functions. */
export const appEntry = (configPath: string, mode: AppMode): string => {
  const { module, name } = HOSTS[mode];
  return [
    `import config from ${JSON.stringify(configPath)};`,
    `import { mountStudio } from ${JSON.stringify(browserModule('mount'))};`,
    `import { ${name} } from ${JSON.stringify(browserModule(module))};`,
    `mountStudio(config, ${name}(config));`,
    '',
  ].join('\n');
};

/** The package directories of the config's `react` and `react-dom`, which every React import in the bundle resolves into. */
export const reactDirectories = (configPath: string): string[] => {
  const require = createRequire(configPath);
  return ['react', 'react-dom'].map((name) =>
    dirname(require.resolve(`${name}/package.json`))
  );
};

const REACT_SPECIFIER = /^react(-dom)?(\/.*)?$/;

/**
 * Resolves `react`, `react-dom` and their subpaths as if imported from the config, so the app, the pack and
 * Emotion share the config's React. Re-resolving the specifier, rather than aliasing a directory, keeps
 * each package's `browser` and `exports` mappings, which pick `react-dom/server`'s browser build.
 */
export const reactFromConfig = (configPath: string): Plugin => ({
  name: 'isomer-studio-react',
  setup: (build) => {
    build.onResolve(
      { filter: REACT_SPECIFIER },
      async ({ path, kind, pluginData }) => {
        if (pluginData === REACT_SPECIFIER) {
          return undefined;
        }
        const result = await build.resolve(path, {
          kind,
          resolveDir: dirname(configPath),
          pluginData: REACT_SPECIFIER,
        });
        return result.errors.length
          ? { errors: result.errors }
          : { path: result.path };
      }
    );
  },
});

const ENTRY = 'isomer-studio:app';

const entryPlugin = (configPath: string, mode: AppMode): Plugin => ({
  name: 'isomer-studio-entry',
  setup: (build) => {
    build.onResolve({ filter: /^isomer-studio:app$/ }, ({ path }) => ({
      path,
      namespace: 'isomer-studio',
    }));
    build.onLoad({ filter: /.*/, namespace: 'isomer-studio' }, () => ({
      contents: appEntry(configPath, mode),
      resolveDir: dirname(configPath),
      loader: 'js',
    }));
  },
});

/** esbuild options for `assets/app.js` and its chunks, written to `assetsDir`. */
export const appBuildOptions = ({
  configPath,
  mode,
  assetsDir,
  plugins = [],
}: {
  configPath: string;
  mode: AppMode;
  assetsDir: string;
  plugins?: Plugin[] | undefined;
}): BuildOptions => ({
  entryPoints: { app: ENTRY },
  outdir: assetsDir,
  chunkNames: 'chunks/[name]-[hash]',
  assetNames: 'media/[name]-[hash]',
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  // `assets/app.css` carries Monaco's stylesheet; its modules' own CSS imports would duplicate it.
  loader: {
    '.css': 'empty',
    '.ttf': 'file',
    '.woff': 'file',
    '.woff2': 'file',
    '.png': 'file',
    '.svg': 'file',
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(
      mode === 'dev' ? 'development' : 'production'
    ),
    global: 'globalThis',
  },
  minify: mode === 'build',
  sourcemap: mode === 'dev' ? 'linked' : false,
  logLevel: 'warning',
  plugins: [
    entryPlugin(configPath, mode),
    reactFromConfig(configPath),
    ...plugins,
  ],
});

const HTML_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"]/g, (char) => HTML_ESCAPES[char] ?? char);

/** `dist/app/index.html` with the deployment's `<base href>` and the config's title. */
export const renderIndexHtml = ({
  base,
  title = 'Isomer Studio',
}: {
  base: string;
  title?: string | undefined;
}): string => {
  const template = readFileSync(join(APP_DIR, 'index.html'), 'utf8');
  return template
    .replace('<base href="./" />', `<base href="${escapeHtml(base)}" />`)
    .replace(
      '<title>Isomer Studio</title>',
      `<title>${escapeHtml(title)}</title>`
    );
};
