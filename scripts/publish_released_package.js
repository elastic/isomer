/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Publishes one package at the latest release tag, for a release whose publish step failed partway.
 * The package is installed, built, and packed from a worktree of the tag, so nothing merged since reaches it.
 *
 * Usage: `node scripts/publish_released_package.js <package-name> [--dry-run]`
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import { npmTag, publishPackages } from './semantic_release_workspace.js';
import { repoRoot, workspacePackages } from './workspace_packages.js';

/** Branches `.releaserc.json` releases from. */
const RELEASE_BRANCH = /^(?:main|beta|alpha|\d+(?:\.(?:\d+|x))?\.x)$/;

/** Why `name` cannot publish from the tagged `packages`; empty when it can. */
export const publishBlockers = ({ name, packages, published }) => {
  const pkg = packages.find(({ manifest }) => manifest.name === name);
  if (pkg === undefined) {
    return [`${name} is not a workspace package at the release tag`];
  }
  return [
    ...(pkg.manifest.private === true ? [`${name} is private`] : []),
    ...(published ? [`${name} is already published at this version`] : []),
  ];
};

/** The npm dist-tag a release from `branch` publishes under, matching semantic-release's channels. */
export const branchTag = (branch) => {
  if (!RELEASE_BRANCH.test(branch)) {
    throw new Error(`${branch} is not a release branch`);
  }
  return npmTag(branch === 'main' ? undefined : branch);
};

const run = (command, args, cwd = repoRoot) =>
  execFileSync(command, args, {
    cwd,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();

const isPublished = (name, version) => {
  try {
    return run('npm', ['view', `${name}@${version}`, 'version']) !== '';
  } catch {
    return false;
  }
};

/** Publishes `name` at the latest `v*` tag reachable from `HEAD`, under `branch`'s dist-tag. */
export const publishReleasedPackage = ({ branch, dryRun, name }) => {
  const tag = branchTag(branch);
  const gitTag = run('git', [
    'describe',
    '--tags',
    '--abbrev=0',
    '--match',
    'v[0-9]*',
    'HEAD',
  ]);
  const version = gitTag.slice(1);
  const tree = mkdtempSync(join(tmpdir(), `isomer-${gitTag}-`));
  run('git', ['worktree', 'add', '--detach', tree, gitTag]);
  try {
    const packages = workspacePackages(tree);
    const blockers = publishBlockers({
      name,
      packages,
      published: isPublished(name, version),
    });
    if (blockers.length > 0) {
      throw new Error(
        `Cannot publish ${name}@${version}:\n- ${blockers.join('\n- ')}`
      );
    }
    for (const args of [['install', '--frozen-lockfile'], ['build']]) {
      execFileSync('pnpm', args, { cwd: tree, stdio: 'inherit' });
    }
    for (const { dir, manifest } of packages) {
      writeFileSync(
        join(dir, 'package.json'),
        `${JSON.stringify({ ...manifest, version }, null, 2)}\n`
      );
    }
    console.log('Publishing %s at %s under %s', name, version, tag);
    publishPackages([name], tag, dryRun ? ['--dry-run'] : [], tree);
  } finally {
    run('git', ['worktree', 'remove', '--force', tree]);
    rmSync(tree, { force: true, recursive: true });
  }
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
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
  publishReleasedPackage({
    branch:
      process.env.GITHUB_REF_NAME ??
      run('git', ['rev-parse', '--abbrev-ref', 'HEAD']),
    dryRun,
    name,
  });
}
