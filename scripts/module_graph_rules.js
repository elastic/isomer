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
    ...Object.fromEntries(
      ['./schema', './scene', './resolve'].map((entry) => [
        entry,
        CHARTS_CONTRACT_FORBIDDEN,
      ])
    ),
    // The runtime and `react-dom` are `./testing`'s optional peers alone.
    '.': ['@elastic/isomer-runtime', 'react-dom'],
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
