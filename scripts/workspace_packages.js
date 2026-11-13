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

/**
 * Each dependency or peer a publishable package lists that a consumer could not install with it. A package that
 * publishes now may list no private one, unseeded included; an unseeded package may also list another unseeded one.
 *
 * @param {PackageManifest[]} manifests
 * @returns {string[]}
 */
export const unpublishableReferences = (manifests) => {
  const byName = new Map(
    manifests.map((manifest) => [manifest.name, manifest])
  );
  return manifests.filter(isPublishable).flatMap((manifest) =>
    ['dependencies', 'peerDependencies', 'optionalDependencies'].flatMap(
      (field) =>
        Object.keys(manifest[field] ?? {}).flatMap((name) => {
          const listed = byName.get(name);
          if (!listed || listed.private !== true) {
            return [];
          }
          if (!isPublishable(listed)) {
            return [
              `${manifest.name} ${field} lists ${name}, which never publishes`,
            ];
          }
          return manifest.private === true
            ? []
            : [
                `${manifest.name} ${field} lists ${name}, which is not on npm until it is seeded`,
              ];
        })
    )
  );
};

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
