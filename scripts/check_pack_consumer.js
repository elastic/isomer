/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { repoRoot, workspacePackages } from './workspace_packages.js';

// Every package that publishes: the packed tarball of each must import with
// only its declared dependencies and required peers beside it.
const packageNames = workspacePackages()
  .filter(({ manifest }) => manifest.private !== true)
  .map(({ manifest }) => manifest.name);
const tempDir = mkdtempSync(join(tmpdir(), 'isomer-pack-consumer-'));

const linkDirectory = (target, path) => {
  if (existsSync(path)) {
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  symlinkSync(target, path, process.platform === 'win32' ? 'junction' : 'dir');
};

const packPackage = (packageName) => {
  const folder = packageName.slice(packageName.lastIndexOf('/') + 1);
  const packageDir = join(repoRoot, 'packages', folder);
  const sourceDir = packageDir;
  const packOutput = execFileSync(
    'pnpm',
    ['pack', '--json', '--pack-destination', tempDir],
    { cwd: packageDir, encoding: 'utf-8' }
  );
  const { filename } = JSON.parse(packOutput);
  const extractDir = join(tempDir, 'extract', folder);
  mkdirSync(extractDir, { recursive: true });
  execFileSync('tar', ['-xzf', filename, '-C', extractDir]);

  const dir = join(extractDir, 'package');
  const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'));
  return { dir, manifest, sourceDir };
};

/** Where pnpm installed `dependency` for the workspace package, or `undefined`. */
const installedDependency = (pkg, dependency) =>
  [
    join(pkg.sourceDir, 'node_modules', dependency),
    join(repoRoot, 'node_modules', dependency),
  ].find((candidate) => existsSync(candidate));

try {
  const packages = new Map(
    packageNames.map((packageName) => [packageName, packPackage(packageName)])
  );

  for (const [packageName, pkg] of packages) {
    const dependencies = Object.keys(pkg.manifest.dependencies ?? {});
    const requiredPeers = Object.keys(
      pkg.manifest.peerDependencies ?? {}
    ).filter(
      (peer) => pkg.manifest.peerDependenciesMeta?.[peer]?.optional !== true
    );

    for (const dependency of dependencies) {
      const packedDependency = packages.get(dependency);
      const installed = installedDependency(pkg, dependency);
      if (packedDependency) {
        linkDirectory(
          packedDependency.dir,
          join(pkg.dir, 'node_modules', dependency)
        );
      } else if (installed) {
        linkDirectory(installed, join(pkg.dir, 'node_modules', dependency));
      } else {
        throw new Error(
          `${packageName}: dependency "${dependency}" is not installed`
        );
      }
    }

    for (const peer of requiredPeers) {
      const installedPeer = resolve(repoRoot, 'node_modules', peer);
      if (!existsSync(installedPeer)) {
        throw new Error(
          `${packageName}: required peer "${peer}" is not installed`
        );
      }
      linkDirectory(installedPeer, join(pkg.dir, 'node_modules', peer));
      for (const dependency of dependencies) {
        const packedDependency = packages.get(dependency);
        if (packedDependency?.manifest.peerDependencies?.[peer]) {
          linkDirectory(
            installedPeer,
            join(packedDependency.dir, 'node_modules', peer)
          );
        }
      }
    }

    const consumerDir = join(tempDir, 'consumers', packageName);
    linkDirectory(pkg.dir, join(consumerDir, 'node_modules', packageName));
    execFileSync(
      process.execPath,
      ['--input-type=module', '--eval', `await import('${packageName}')`],
      { cwd: consumerDir, stdio: 'inherit' }
    );
    execFileSync(process.execPath, ['--eval', `require('${packageName}')`], {
      cwd: consumerDir,
      stdio: 'inherit',
    });

    console.log(
      `${packageName}: packed root imports passed with required peers (${requiredPeers.join(', ')}).`
    );
  }
} finally {
  rmSync(tempDir, { force: true, recursive: true });
}
