/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRequire } from 'node:module';
import { join } from 'node:path';

import { build, type Plugin } from 'esbuild';

const TYPESCRIPT = /\.[mc]?tsx?$/;

/**
 * Inlines what resolves to TypeScript and leaves everything else external by
 * its resolved absolute path, so each import loads the copy its own importer
 * resolves, wherever the bundle is written.
 */
const keepBuiltExternal: Plugin = {
  name: 'keep-built-external',
  setup: (esbuild) => {
    esbuild.onResolve({ filter: /.*/ }, async (args) => {
      if (args.pluginData === 'resolving' || args.kind === 'entry-point') {
        return undefined;
      }
      const found = await esbuild.resolve(args.path, {
        kind: args.kind,
        resolveDir: args.resolveDir,
        importer: args.importer,
        pluginData: 'resolving',
      });
      if (found.errors.length > 0) {
        return { errors: found.errors };
      }
      if (found.external) {
        return { path: args.path, external: true };
      }
      if (TYPESCRIPT.test(found.path)) {
        return found;
      }
      if (/^[./]/.test(args.path)) {
        return { path: found.path, external: true };
      }
      // A package resolves as Node's `require` resolves it from its importer,
      // so the bundle loads the CommonJS build a host would, not esbuild's pick.
      const importer =
        args.importer === '' || args.importer === '<stdin>'
          ? join(args.resolveDir, 'noop.js')
          : args.importer;
      try {
        return {
          path: createRequire(importer).resolve(args.path),
          external: true,
        };
      } catch {
        return { path: args.path, external: true };
      }
    });
  },
};

/** Bundles `entry`, resolved from `resolveDir`, to one CommonJS file at `outfile`. */
export const bundleSourceEntry = async ({
  entry,
  resolveDir,
  outfile,
}: {
  entry: string;
  resolveDir: string;
  outfile: string;
}): Promise<void> => {
  await build({
    stdin: {
      contents: `module.exports = require(${JSON.stringify(entry)});`,
      resolveDir,
      loader: 'js',
    },
    bundle: true,
    platform: 'node',
    format: 'cjs',
    jsx: 'automatic',
    outfile,
    logLevel: 'silent',
    plugins: [keepBuiltExternal],
  });
};
