/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @typedef {object} PackageManifest
 * @property {string} name
 * @property {Record<string, unknown>} [exports]
 * @property {string} [main]
 * @property {boolean} [private]
 * @property {string[]} [files]
 * @property {Record<string, string>} [dependencies]
 * @property {Record<string, string>} [devDependencies]
 * @property {Record<string, string>} [peerDependencies]
 * @property {Record<string, string>} [optionalDependencies]
 */

/** @returns {Array<{ dir: string; folder: string; manifest: PackageManifest }>} */
export const workspacePackages = () => {
  const packagesDir = join(repoRoot, 'packages');
  if (!existsSync(packagesDir)) {
    return [];
  }
  return readdirSync(packagesDir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        existsSync(join(packagesDir, entry.name, 'package.json'))
    )
    .map((entry) => {
      const dir = join(packagesDir, entry.name);
      /** @type {PackageManifest} */
      const manifest = JSON.parse(
        readFileSync(join(dir, 'package.json'), 'utf-8')
      );
      return { dir, folder: entry.name, manifest };
    })
    .sort((a, b) => a.folder.localeCompare(b.folder));
};
