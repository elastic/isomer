/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Pins the workspace's peers to one target through `pnpm.overrides`, for a CI
// job that then runs `pnpm install --no-frozen-lockfile`. Never commit the result.
//
//   floor   the lowest version each published peer range admits
//   kibana  what elastic/kibana's `package.json` pins on `main`
//   latest  the highest version each published peer range admits, with its types

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import semver from 'semver';

import { repoRoot, workspacePackages } from './workspace_packages.js';

const PEERS = ['react', 'react-dom', 'zod'];
const TYPES = { react: '@types/react', 'react-dom': '@types/react-dom' };
const KIBANA_MANIFEST =
  'https://raw.githubusercontent.com/elastic/kibana/main/package.json';

const target = process.argv[2];

const sdk = workspacePackages().find(
  ({ manifest }) => manifest.name === '@elastic/isomer-sdk'
);
const rangeOf = (peer) => {
  const range = sdk.manifest.peerDependencies?.[peer];
  if (!range) {
    throw new Error(`@elastic/isomer-sdk declares no "${peer}" peer`);
  }
  return range;
};

const publishedVersions = (name) =>
  JSON.parse(
    execFileSync('npm', ['view', name, 'versions', '--json'], {
      encoding: 'utf-8',
    })
  );

const highest = (name, range) => {
  const version = semver.maxSatisfying(publishedVersions(name), range);
  if (!version) {
    throw new Error(`no published ${name} satisfies ${range}`);
  }
  return version;
};

const targets = {
  floor: async () =>
    Object.fromEntries(
      PEERS.map((peer) => [peer, semver.minVersion(rangeOf(peer)).version])
    ),
  kibana: async () => {
    const response = await fetch(KIBANA_MANIFEST);
    if (!response.ok) {
      throw new Error(`${KIBANA_MANIFEST}: ${response.status}`);
    }
    const { dependencies = {}, devDependencies = {} } = await response.json();
    const pinned = { ...devDependencies, ...dependencies };
    return Object.fromEntries(
      [...PEERS, ...Object.values(TYPES)].flatMap((name) =>
        pinned[name] ? [[name, pinned[name]]] : []
      )
    );
  },
  latest: async () => {
    const versions = Object.fromEntries(
      PEERS.map((peer) => [peer, highest(peer, rangeOf(peer))])
    );
    for (const [peer, types] of Object.entries(TYPES)) {
      versions[types] = highest(types, `^${semver.major(versions[peer])}`);
    }
    return versions;
  },
};

if (!Object.hasOwn(targets, target)) {
  console.error(
    `Usage: node scripts/apply_peer_target.js <${Object.keys(targets).join('|')}>`
  );
  process.exit(1);
}

const versions = await targets[target]();
const manifestPath = join(repoRoot, 'package.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
manifest.pnpm = {
  ...manifest.pnpm,
  overrides: { ...manifest.pnpm?.overrides, ...versions },
};
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

for (const [name, version] of Object.entries(versions)) {
  console.log(`${target}: ${name}@${version}`);
}
