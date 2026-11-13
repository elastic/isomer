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
 * @property {{ packedFiles?: string[]; unseeded?: boolean }} [isomer]
 */

/**
 * Whether the package publishes, or will once npm seeds its name: `isomer.unseeded` marks a package kept `private` only until then, so the packed checks and license files treat it as published.
 *
 * @param {PackageManifest} manifest
 */
export const isPublishable = (manifest) =>
  manifest.private !== true || manifest.isomer?.unseeded === true;

/** @returns {Array<{ dir: string; folder: string; manifest: PackageManifest }>} */
export const workspacePackages = (root = repoRoot) => {
  const packagesDir = join(root, 'packages');
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
