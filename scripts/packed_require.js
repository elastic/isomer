/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  realpathSync,
  symlinkSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

export const linkDirectory = (target, path) => {
  if (existsSync(path)) {
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  symlinkSync(target, path, process.platform === 'win32' ? 'junction' : 'dir');
};

// Fails an import on any process warning, such as the `ExperimentalWarning`
// Node 22.12 prints when `require()` loads an ES module.
export const failOnWarning =
  "process.on('warning', (warning) => { console.error(warning); process.exitCode = 1; });";

export const consumerEnv = () =>
  Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key !== 'NODE_PATH')
  );

export const requireEntries = (specifiers, consumerDir) =>
  execFileSync(
    process.execPath,
    [
      '--eval',
      `${failOnWarning} ${specifiers.map((specifier) => `require(${JSON.stringify(specifier)});`).join(' ')}`,
    ],
    { cwd: consumerDir, env: consumerEnv(), encoding: 'utf-8' }
  );

/**
 * Copies the packed dependency graph into a staging directory, linking each copy only to its declared dependencies and required peers.
 * Only `pkg` is exposed in the consumer's `node_modules`.
 */
export const requireWithoutPeers = (
  pkg,
  specifiers,
  peers,
  workDir,
  packedPackages = new Map()
) => {
  const consumerDir = join(workDir, 'isolated-consumers', pkg.manifest.name);
  const stagingDir = join(workDir, 'isolated-staging', pkg.manifest.name);
  const copies = new Map();
  const copyPackage = (source) => {
    const { dir, manifest } = source;
    const {
      name,
      dependencies = {},
      peerDependencies = {},
      peerDependenciesMeta = {},
    } = manifest;
    if (copies.has(dir)) {
      return copies.get(dir);
    }
    const isolatedDir = join(stagingDir, name);
    copies.set(dir, isolatedDir);
    const ownModules = join(dir, 'node_modules');
    cpSync(dir, isolatedDir, {
      recursive: true,
      filter: (sourcePath) =>
        sourcePath !== ownModules && !sourcePath.startsWith(`${ownModules}/`),
    });
    const required = new Set([
      ...Object.keys(dependencies),
      ...Object.keys(peerDependencies).filter(
        (peer) => peerDependenciesMeta[peer]?.optional !== true
      ),
    ]);
    for (const dependency of required) {
      const target = join(ownModules, dependency);
      if (existsSync(target)) {
        const packed =
          dependency === pkg.manifest.name
            ? pkg
            : packedPackages.get(dependency);
        linkDirectory(
          packed ? copyPackage(packed) : realpathSync(target),
          join(isolatedDir, 'node_modules', dependency)
        );
      }
    }
    return isolatedDir;
  };
  linkDirectory(
    copyPackage(pkg),
    join(consumerDir, 'node_modules', pkg.manifest.name)
  );
  execFileSync(
    process.execPath,
    [
      '--eval',
      `
    for (const dir of ${JSON.stringify([...copies.values(), consumerDir])}) {
      for (const peer of ${JSON.stringify([...peers])}) {
        let resolved;
        try { resolved = require.resolve(peer, { paths: [dir] }); }
        catch (error) { if (error.code === 'MODULE_NOT_FOUND') continue; throw error; }
        throw new Error('optional peer "' + peer + '" resolves at ' + resolved);
      }
    }
  `,
    ],
    { cwd: consumerDir, env: consumerEnv(), encoding: 'utf-8' }
  );
  requireEntries(specifiers, consumerDir);
  return consumerDir;
};
