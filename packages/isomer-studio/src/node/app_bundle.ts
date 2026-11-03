/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { BuildOptions, Metafile, Plugin } from 'esbuild';

import { moduleUrl } from './node_module.cjs';
import {
  isStudioSpecifier,
  projectDirectory,
  sharedResolveDir,
} from './project_resolution';

export type AppMode = 'build' | 'dev';

const here = dirname(fileURLToPath(moduleUrl));

/** Whether the CLI runs from its TypeScript source, as `pnpm studio:dev` does, rather than from `lib/cjs`. */
export const RUNS_FROM_SOURCE = basename(dirname(here)) === 'src';

/** The package root, whether this module runs from `lib/cjs/node` or `src/node`. */
export const PACKAGE_DIR = resolve(
  here,
  RUNS_FROM_SOURCE ? '../..' : '../../..'
);

/** The package's prebuilt, pack-independent assets: `lib/app/`. */
export const APP_DIR = join(PACKAGE_DIR, 'lib/app');

/** Without an extension, so the bundle takes the ESM build's `lib/esm/browser/*.js`, or the `.ts(x)` source when the CLI runs from it. */
export const browserModule = (name: string): string =>
  RUNS_FROM_SOURCE
    ? resolve(here, '../browser', name)
    : join(PACKAGE_DIR, 'lib/esm/browser', name);

const HOSTS: Readonly<Record<AppMode, { module: string; name: string }>> = {
  dev: { module: 'dev_host', name: 'devHost' },
  build: { module: 'static_host', name: 'staticHost' },
};

/** The bundle's entry: the config's default export mounted with the mode's host functions. In `dev`, a changed config re-renders the mounted Studio in place. */
export const appEntry = (configPath: string, mode: AppMode): string => {
  const { module, name } = HOSTS[mode];
  const config = JSON.stringify(configPath);
  return [
    `import config from ${config};`,
    `import { mountStudio } from ${JSON.stringify(browserModule('mount'))};`,
    `import { ${name} } from ${JSON.stringify(browserModule(module))};`,
    `const studio = mountStudio(config, ${name}(config));`,
    ...(mode === 'dev'
      ? [
          'if (import.meta.hot) {',
          `  import.meta.hot.accept(${config}, (next) => {`,
          `    if (next) studio.update(next.default, ${name}(next.default));`,
          '  });',
          '}',
        ]
      : []),
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

const SKIP = Symbol.for('elastic.isomer.studio.project_resolution');

/** Resolves `SHARED_PACKAGES` from the project when imported from outside it, and `STUDIO_PACKAGES` from the Studio when the project lacks them. */
export const projectResolution = (configPath: string): Plugin => {
  const projectDir = projectDirectory(configPath);
  return {
    name: 'isomer-studio-project-resolution',
    setup: (build) => {
      build.onResolve(
        { filter: /^[^./]/ },
        async ({ path, importer, kind, resolveDir, pluginData }) => {
          if (pluginData === SKIP || REACT_SPECIFIER.test(path)) {
            return undefined;
          }
          const resolveFrom = async (dir: string) =>
            build.resolve(path, { kind, resolveDir: dir, pluginData: SKIP });
          const shared = sharedResolveDir(path, importer, projectDir);
          if (shared !== undefined) {
            const result = await resolveFrom(shared);
            if (!result.errors.length) {
              return { path: result.path };
            }
          }
          if (!isStudioSpecifier(path)) {
            return undefined;
          }
          const own = await resolveFrom(resolveDir);
          const result = own.errors.length
            ? await resolveFrom(PACKAGE_DIR)
            : own;
          return result.errors.length
            ? { errors: own.errors }
            : { path: result.path };
        }
      );
    },
  };
};

const ENTRY = 'isomer-studio:app';

const entryPlugin = (configPath: string): Plugin => ({
  name: 'isomer-studio-entry',
  setup: (build) => {
    build.onResolve({ filter: /^isomer-studio:app$/ }, ({ path }) => ({
      path,
      namespace: 'isomer-studio',
    }));
    build.onLoad({ filter: /.*/, namespace: 'isomer-studio' }, () => ({
      contents: appEntry(configPath, 'build'),
      resolveDir: dirname(configPath),
      loader: 'js',
    }));
  },
});

/** Fonts and images a stylesheet or module may reference, emitted to `assets/media/`. */
const ASSET_LOADERS = Object.fromEntries(
  [
    '.avif',
    '.eot',
    '.gif',
    '.ico',
    '.jpeg',
    '.jpg',
    '.otf',
    '.png',
    '.svg',
    '.ttf',
    '.webp',
    '.woff',
    '.woff2',
  ].map((extension) => [extension, 'file' as const])
);

/** `assets/studio.css` already carries Monaco's stylesheet, which Monaco's modules also import piecemeal. */
const monacoCssEmpty: Plugin = {
  name: 'isomer-studio-monaco-css',
  setup: (build) => {
    build.onLoad({ filter: /[\\/]monaco-editor[\\/].*\.css$/ }, () => ({
      contents: '',
      loader: 'empty',
    }));
  },
};

/** esbuild options for a static build's `assets/app.js` and its chunks, written to `assetsDir`. */
export const appBuildOptions = ({
  configPath,
  assetsDir,
  plugins = [],
}: {
  configPath: string;
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
  loader: {
    '.css': 'css',
    '.module.css': 'local-css',
    ...ASSET_LOADERS,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    global: 'globalThis',
  },
  minify: true,
  logLevel: 'warning',
  plugins: [
    entryPlugin(configPath),
    reactFromConfig(configPath),
    projectResolution(configPath),
    monacoCssEmpty,
    ...plugins,
  ],
});

/** The bundle entry's id in an esbuild metafile. */
const APP_ENTRY_POINT = `isomer-studio:${ENTRY}`;

/**
 * The entry's CSS bundle, relative to the working directory: every CSS file the config reaches, lazy chunks
 * included, with `url()`s relative to `assets/`. The per-chunk CSS esbuild also writes is never linked.
 */
export const appStylesheets = (
  metafile: Metafile,
  entryPoint: string = APP_ENTRY_POINT
): { bundle: string | undefined; chunks: string[] } => {
  const bundle = Object.values(metafile.outputs).find(
    (output) => output.entryPoint === entryPoint
  )?.cssBundle;
  return {
    bundle,
    chunks: Object.keys(metafile.outputs).filter(
      (output) => output.endsWith('.css') && output !== bundle
    ),
  };
};

const SLACK_STYLESHEET = '<link rel="stylesheet" href="assets/slack.css" />';

const HTML_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"]/g, (char) => HTML_ESCAPES[char] ?? char);

/** `lib/app/index.html` with the deployment's `<base href>`, the config's title, and the entry script. */
export const renderIndexHtml = ({
  base,
  title = 'Isomer Studio',
  entry = 'assets/app.js',
  stylesheets = [],
}: {
  base: string;
  title?: string | undefined;
  entry?: string | undefined;
  /** Linked after the Studio's own stylesheets, relative to `base`. */
  stylesheets?: readonly string[] | undefined;
}): string => {
  const template = readFileSync(join(APP_DIR, 'index.html'), 'utf8');
  return template
    .replace('<base href="./" />', `<base href="${escapeHtml(base)}" />`)
    .replace(
      '<title>Isomer Studio</title>',
      `<title>${escapeHtml(title)}</title>`
    )
    .replace(
      SLACK_STYLESHEET,
      [
        SLACK_STYLESHEET,
        ...stylesheets.map(
          (href) => `<link rel="stylesheet" href="${escapeHtml(href)}" />`
        ),
      ].join('\n    ')
    )
    .replace(
      '<script type="module" src="assets/app.js"></script>',
      `<script type="module" src="${escapeHtml(entry)}"></script>`
    );
};
