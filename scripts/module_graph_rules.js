/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { build } from 'esbuild';

/** Reported when a reached module loads one by a computed specifier, which no graph can follow. */
export const OPAQUE_LOAD = '<opaque module load>';

// `createRequire`'s only source, so a hoisted or aliased loader cannot hide behind it.
const MODULE_LOADERS = ['module', 'node:module'];

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
  ...MODULE_LOADERS,
  OPAQUE_LOAD,
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
      ...MODULE_LOADERS,
      OPAQUE_LOAD,
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

// Over esbuild's normalized output, minus its `//` path comments: any `require` token and `import()` of anything but a string.
const OPAQUE_LOAD_PATTERN = /\brequire\b|__require|\bimport\(\s*(?![`'"])/;
const hasOpaqueLoad = (text) =>
  OPAQUE_LOAD_PATTERN.test(text.replace(/^\s*\/\/.*$/gm, ''));

/** Every bare specifier reachable from `entryFile` through its relative imports, plus `OPAQUE_LOAD` when a reached module loads by a computed specifier. */
const reachableBareSpecifiers = async (entryFile) => {
  const { metafile, outputFiles } = await build({
    entryPoints: [entryFile],
    bundle: true,
    write: false,
    metafile: true,
    packages: 'external',
    platform: 'neutral',
    format: 'esm',
    legalComments: 'none',
    logLevel: 'silent',
    outdir: 'out',
  });
  const specifiers = new Set(
    Object.values(metafile.inputs).flatMap(({ imports }) =>
      imports.filter(({ external }) => external).map(({ path }) => path)
    )
  );
  if (outputFiles.some(({ text }) => hasOpaqueLoad(text))) {
    specifiers.add(OPAQUE_LOAD);
  }
  return specifiers;
};

/** The specifiers reachable from `entryFile` that `forbidden` rules out. */
export const forbiddenReachable = async (entryFile, forbidden) =>
  [...(await reachableBareSpecifiers(entryFile))].filter((specifier) =>
    forbidden.some((rule) => matchesForbidden(specifier, rule))
  );
