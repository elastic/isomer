/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Publishes one package at the latest release tag, for a release whose publish step failed partway.
 *
 * Usage: `node scripts/publish_released_package.js <package-name> [--dry-run]`
 */

import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import {
  prepare,
  publishedFolders,
  publishPackages,
  shipsChange,
} from './semantic_release_workspace.js';
import { repoRoot, workspacePackages } from './workspace_packages.js';

/** Why `name` cannot publish at the release tag from this tree; empty when it can. */
export const publishBlockers = ({ files, name, packages, published, read }) => {
  const pkg = packages.find(({ manifest }) => manifest.name === name);
  if (pkg === undefined) {
    return [`${name} is not a workspace package`];
  }
  return [
    ...(pkg.manifest.private === true ? [`${name} is private`] : []),
    ...(published ? [`${name} is already published at this version`] : []),
    ...(shipsChange(files, publishedFolders(packages), read)
      ? ['a published package changed since the release tag']
      : []),
  ];
};

/** The npm dist-tag for `version`: its prerelease id, or `latest`. */
export const distTag = (version) =>
  /^\d+\.\d+\.\d+-([0-9A-Za-z-]+)/.exec(version)?.[1] ?? 'latest';

const run = (command, args) =>
  execFileSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

const tryRun = (command, args) => {
  try {
    return run(command, args);
  } catch {
    return undefined;
  }
};

const main = () => {
  const {
    positionals: [name],
    values: { 'dry-run': dryRun },
  } = parseArgs({
    allowPositionals: true,
    options: { 'dry-run': { default: false, type: 'boolean' } },
  });
  if (!name) {
    throw new Error(
      'Usage: node scripts/publish_released_package.js <package-name> [--dry-run]'
    );
  }

  const tag = run('git', [
    'describe',
    '--tags',
    '--abbrev=0',
    '--match',
    'v[0-9]*',
    'HEAD',
  ]);
  const version = tag.slice(1);
  const blockers = publishBlockers({
    files: run('git', ['diff', '--name-only', tag, 'HEAD'])
      .split('\n')
      .filter(Boolean),
    name,
    packages: workspacePackages(),
    published: Boolean(
      tryRun('npm', ['view', `${name}@${version}`, 'version'])
    ),
    read: (file, side) =>
      tryRun('git', ['show', `${side === 'before' ? tag : 'HEAD'}:${file}`]),
  });
  if (blockers.length > 0) {
    throw new Error(
      `Cannot publish ${name}@${version}:\n- ${blockers.join('\n- ')}`
    );
  }

  prepare({}, { logger: console, nextRelease: { version } });
  console.log('Publishing %s at %s', name, version);
  publishPackages([name], distTag(version), dryRun ? ['--dry-run'] : []);
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
