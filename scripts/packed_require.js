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
import { createRequire } from 'node:module';
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

export const requireEntries = (specifiers, consumerDir) =>
  execFileSync(
    process.execPath,
    [
      '--eval',
      `${failOnWarning} ${specifiers.map((specifier) => `require('${specifier}');`).join(' ')}`,
    ],
    { cwd: consumerDir, stdio: 'inherit' }
  );

/**
 * Requires `specifiers` from a copy of `pkg` under `workDir` that holds only its dependencies and required peers, since
 * another package's required peer may already be linked into `pkg` itself. Fails when any of `peers` still resolves there.
 *
 * @param {{ dir: string; manifest: { name: string; dependencies?: object; peerDependencies?: object } }} pkg
 * @param {string[]} specifiers
 * @param {Set<string>} peers
 * @param {string} workDir
 */
export const requireWithoutPeers = (pkg, specifiers, peers, workDir) => {
  const { name, dependencies = {}, peerDependencies = {} } = pkg.manifest;
  const isolatedDir = join(workDir, 'isolated', name);
  const ownModules = join(pkg.dir, 'node_modules');
  cpSync(pkg.dir, isolatedDir, {
    recursive: true,
    filter: (source) => !source.startsWith(ownModules),
  });
  for (const linked of [
    ...Object.keys(dependencies),
    ...Object.keys(peerDependencies).filter((peer) => !peers.has(peer)),
  ]) {
    const target = join(ownModules, linked);
    if (existsSync(target)) {
      linkDirectory(
        realpathSync(target),
        join(isolatedDir, 'node_modules', linked)
      );
    }
  }
  const isolatedRequire = createRequire(join(isolatedDir, 'package.json'));
  for (const peer of peers) {
    let resolved;
    try {
      resolved = isolatedRequire.resolve(peer);
    } catch {
      continue;
    }
    throw new Error(`${name}: optional peer "${peer}" resolves at ${resolved}`);
  }
  const consumerDir = join(workDir, 'isolated-consumers', name);
  linkDirectory(isolatedDir, join(consumerDir, 'node_modules', name));
  requireEntries(specifiers, consumerDir);
};
