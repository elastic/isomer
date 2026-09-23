/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'node:path';

import { workspacePackages } from './workspace_packages.js';

/** @param {unknown} target */
const typesEntry = (target) =>
  typeof target === 'object' &&
  target !== null &&
  'types' in target &&
  typeof target.types === 'string'
    ? target.types
    : undefined;

/**
 * One alias per package export, pointing at the source the declaration is
 * built from, so Vitest and the deck never load `dist`. Subpaths come before
 * the root entry because the first matching alias wins.
 *
 * @returns {Array<{ find: string; replacement: string }>}
 */
export const sourceAliases = () =>
  workspacePackages().flatMap(({ dir, manifest }) =>
    Object.entries(manifest.exports ?? {})
      .sort(([a], [b]) => Number(a === '.') - Number(b === '.'))
      .flatMap(([key, target]) => {
        const types = typesEntry(target);
        return types === undefined
          ? []
          : [
              {
                find:
                  key === '.'
                    ? manifest.name
                    : `${manifest.name}/${key.slice(2)}`,
                replacement: resolve(
                  dir,
                  types
                    .replace(/^\.\/dist\//, 'src/')
                    .replace(/\.d\.ts$/, '.ts')
                ),
              },
            ];
      })
  );
