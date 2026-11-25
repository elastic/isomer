/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { build } from 'esbuild';

const MARKDOWN_PARSERS = [
  'mdast-util-from-markdown',
  'mdast-util-gfm',
  'mdast-util-to-markdown',
  'micromark-extension-gfm',
];

// The charts contracts carry no renderer or Markdown parser, and build on the SDK's `./schema` entry alone.
const CHARTS_CONTRACT_FORBIDDEN = [
  'react',
  'react-dom',
  '@elastic/charts',
  '@elastic/isomer-runtime',
  ...MARKDOWN_PARSERS,
  { under: '@elastic/isomer-sdk', except: '@elastic/isomer-sdk/schema' },
  // Its own entries are external to the check, so what they reach would go unchecked.
  '@elastic/isomer-primitives-charts',
];

/**
 * Specifiers that must stay unreachable from an entry, by package and export key; each covers its package's subpaths.
 * The SDK's rendering entries may reach bare `react`, which carries React renderers through the shared dispatcher, but never `react-dom/server`; `./schema` and the charts entries reach neither.
 */
export const RULES = {
  '@elastic/isomer-sdk': {
    '.': ['react-dom', 'react-dom/server'],
    './text': ['react-dom', 'react-dom/server'],
    './markdown': ['react-dom', 'react-dom/server'],
    './slack': ['react-dom', 'react-dom/server'],
    './author': ['react-dom', 'react-dom/server'],
    './schema': ['react', 'react-dom', ...MARKDOWN_PARSERS],
  },
  '@elastic/isomer-primitives-charts': {
    // `./scene` exports the style helpers chart engines author with; the contracts and resolver load no stylesheet machinery.
    './schema': [...CHARTS_CONTRACT_FORBIDDEN, '@elastic/distillate'],
    './scene': CHARTS_CONTRACT_FORBIDDEN,
    './resolve': [...CHARTS_CONTRACT_FORBIDDEN, '@elastic/distillate'],
    // The runtime and `react-dom` are `./testing`'s optional peers alone, and the pack's own entries, `./testing` among them, are external to the check.
    '.': [
      '@elastic/isomer-runtime',
      'react-dom',
      '@elastic/isomer-primitives-charts',
    ],
  },
};

const coversPackage = (specifier, name) =>
  specifier === name || specifier.startsWith(`${name}/`);

/**
 * Matches `specifier` against a rule: a string covers the package and its
 * subpaths, `{ under, except }` the same minus one allowed specifier.
 */
export const matchesForbidden = (specifier, rule) =>
  typeof rule === 'string'
    ? coversPackage(specifier, rule)
    : coversPackage(specifier, rule.under) && specifier !== rule.except;

/** Every bare specifier reachable from `entryFile` through its relative imports. */
const reachableBareSpecifiers = async (entryFile) => {
  const { metafile } = await build({
    entryPoints: [entryFile],
    bundle: true,
    write: false,
    metafile: true,
    packages: 'external',
    platform: 'neutral',
    logLevel: 'silent',
  });
  return new Set(
    Object.values(metafile.inputs).flatMap(({ imports }) =>
      imports.filter(({ external }) => external).map(({ path }) => path)
    )
  );
};

/** The specifiers reachable from `entryFile` that `forbidden` rules out. */
export const forbiddenReachable = async (entryFile, forbidden) =>
  [...(await reachableBareSpecifiers(entryFile))].filter((specifier) =>
    forbidden.some((rule) => matchesForbidden(specifier, rule))
  );

/** The packages an esbuild bundle drew from `node_modules`, read from its metafile. */
export const bundledPackagesOf = async (entryFile) => {
  const { metafile } = await build({
    entryPoints: [entryFile],
    bundle: true,
    write: false,
    metafile: true,
    platform: 'node',
    logLevel: 'silent',
  });
  return new Set(
    Object.keys(metafile.inputs).flatMap(
      (input) =>
        input.match(/.*node_modules\/((?:@[^/]+\/)?[^/]+)\//)?.slice(1) ?? []
    )
  );
};

const packageOf = (specifier) => specifier.match(/^(?:@[^/]+\/)?[^/]+/)?.[0];

/** Bare specifiers the CommonJS graph from `entryFiles` still loads from one of `bundled`, as esbuild parses each `require`. */
export const requiresBundled = async (entryFiles, bundled) => {
  const { metafile } = await build({
    entryPoints: entryFiles,
    bundle: true,
    write: false,
    metafile: true,
    outdir: 'out',
    packages: 'external',
    platform: 'node',
    format: 'cjs',
    logLevel: 'silent',
  });
  return Object.entries(metafile.inputs).flatMap(([input, { imports }]) =>
    imports
      .filter(({ external, path }) => external && bundled.has(packageOf(path)))
      .map(({ path }) => ({ input, specifier: path }))
  );
};
