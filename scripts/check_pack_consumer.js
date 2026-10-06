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
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { repoRoot, workspacePackages } from './workspace_packages.js';

const workspace = workspacePackages();
const privateNames = new Set(
  workspace
    .filter(({ manifest }) => manifest.private === true)
    .map(({ manifest }) => manifest.name)
);

// Every package that publishes: the packed tarball of each must import with
// only its declared dependencies and required peers beside it.
const publishing = workspace.filter(
  ({ manifest }) => manifest.private !== true
);
const packageNames = publishing.map(({ manifest }) => manifest.name);

// A published package cannot reach one that never publishes.
const privateReferences = publishing.flatMap(({ manifest }) =>
  ['dependencies', 'peerDependencies', 'optionalDependencies'].flatMap(
    (field) =>
      Object.keys(manifest[field] ?? {})
        .filter((name) => privateNames.has(name))
        .map((name) => `${manifest.name} ${field} lists private ${name}`)
  )
);
if (privateReferences.length > 0) {
  for (const reference of privateReferences) {
    console.error(reference);
  }
  process.exit(1);
}
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

// Fails an import on any process warning, such as the `ExperimentalWarning`
// Node 22.12 prints when `require()` loads an ES module.
const failOnWarning =
  "process.on('warning', (warning) => { console.error(warning); process.exitCode = 1; });";

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

  // Every packed package gets its dependencies before any is imported, since
  // one package's import loads another's packed copy.
  const requiredPeersOf = new Map();
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
    requiredPeersOf.set(packageName, requiredPeers);
  }

  for (const [packageName, pkg] of packages) {
    const requiredPeers = requiredPeersOf.get(packageName);
    const consumerDir = join(tempDir, 'consumers', packageName);
    linkDirectory(pkg.dir, join(consumerDir, 'node_modules', packageName));
    execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        `${failOnWarning} await import('${packageName}')`,
      ],
      { cwd: consumerDir, stdio: 'inherit' }
    );
    execFileSync(
      process.execPath,
      ['--eval', `${failOnWarning} require('${packageName}')`],
      { cwd: consumerDir, stdio: 'inherit' }
    );

    console.log(
      `${packageName}: packed root imports passed with required peers (${requiredPeers.join(', ')}).`
    );
  }

  // `assertPackRegistrationComplete` loads files by itself, so each module
  // system's build must load a primitive directory.
  const sdkName = '@elastic/isomer-sdk';
  const sdkConsumerDir = join(tempDir, 'consumers', sdkName);
  const primitivesDir = join(tempDir, 'registration', 'primitives');
  mkdirSync(join(primitivesDir, 'demo'), { recursive: true });
  writeFileSync(
    join(primitivesDir, 'demo', 'index.ts'),
    "exports.demoPrimitive = { type: 'demo', catalog: {}, schema: {}, renderers: {} };\n"
  );
  const registrationCall = `assertPackRegistrationComplete({ primitivesDir: ${JSON.stringify(primitivesDir)}, registered: [{ type: 'demo' }] })`;
  // Node strips TypeScript by default only from 22.18.
  const stripTypes = process.features.typescript
    ? []
    : ['--experimental-strip-types'];
  execFileSync(
    process.execPath,
    [
      ...stripTypes,
      '--input-type=module',
      '--eval',
      `const { assertPackRegistrationComplete } = await import('${sdkName}/testing'); await ${registrationCall};`,
    ],
    { cwd: sdkConsumerDir, stdio: 'inherit' }
  );
  execFileSync(
    process.execPath,
    [
      ...stripTypes,
      '--eval',
      `const { assertPackRegistrationComplete } = require('${sdkName}/testing'); ${registrationCall}.catch((error) => { console.error(error); process.exit(1); });`,
    ],
    { cwd: sdkConsumerDir, stdio: 'inherit' }
  );
  console.log(
    `${sdkName}: packed assertPackRegistrationComplete loaded primitives through import and require.`
  );
} finally {
  rmSync(tempDir, { force: true, recursive: true });
}
