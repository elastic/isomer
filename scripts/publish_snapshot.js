/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Publishes a prerelease of one package from the built checkout under the `next` dist-tag, with no git tag or commit.
 * Its workspace `dependencies` publish at the same snapshot version; its workspace peers keep the latest release's
 * range, because a host supplies those and hosts install releases.
 *
 * Usage: `node scripts/publish_snapshot.js <package-name> [--dry-run]`, after `pnpm build`.
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import { publishPackages } from './semantic_release_workspace.js';
import { repoRoot, workspacePackages } from './workspace_packages.js';

export const SNAPSHOT_TAG = 'next';

const RELEASE_TAG = /^v(\d+)\.(\d+)\.(\d+)$/;

/**
 * `<release + 1 patch>-main.<UTC commit time>.g<short sha>`: after the release it builds on, before any later one,
 * ordered by commit time. The `g` keeps an all-digit sha from being a numeric identifier with a leading zero.
 */
export const snapshotVersion = ({ releaseTag, sha, time }) => {
  const match = RELEASE_TAG.exec(releaseTag);
  if (match === null) {
    throw new Error(`${releaseTag} is not a release tag`);
  }
  const [, major, minor, patch] = match;
  const stamp = new Date(time).toISOString().replace(/\D/g, '').slice(0, 14);
  return `${major}.${minor}.${Number(patch) + 1}-main.${stamp}.g${sha.slice(0, 7)}`;
};

const isWorkspace = (range) => range.startsWith('workspace:');

/** `name` and the workspace packages it depends on, transitively, through `dependencies`. */
export const snapshotSet = (name, packages) => {
  const byName = new Map(packages.map((pkg) => [pkg.manifest.name, pkg]));
  const names = [];
  const visit = (next) => {
    const pkg = byName.get(next);
    if (pkg === undefined) {
      throw new Error(`${next} is not a workspace package`);
    }
    if (pkg.manifest.private === true) {
      throw new Error(`${next} is private`);
    }
    if (names.includes(next)) {
      return;
    }
    names.push(next);
    for (const [dep, range] of Object.entries(
      pkg.manifest.dependencies ?? {}
    )) {
      if (isWorkspace(range)) {
        visit(dep);
      }
    }
  };
  visit(name);
  return names;
};

/** Every workspace package's version for the publish: the snapshot for `names`, the release for the rest. */
export const snapshotVersions = ({ names, packages, release, snapshot }) =>
  Object.fromEntries(
    packages.map(({ manifest }) => [
      manifest.name,
      names.includes(manifest.name) ? snapshot : release,
    ])
  );

const run = (args) =>
  execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();

const isPublished = (name, version) => {
  try {
    return (
      execFileSync('npm', ['view', `${name}@${version}`, 'version'], {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim() !== ''
    );
  } catch {
    return false;
  }
};

/**
 * Writes the versions into the workspace manifests so `pnpm publish` turns `workspace:*` into the snapshot and
 * `workspace:^` peers into `^<release>`, then publishes `name` and its workspace dependencies under `next`.
 * The manifests are left rewritten; this runs in a throwaway CI checkout.
 */
export const publishSnapshot = ({ dryRun, name }) => {
  const packages = workspacePackages();
  const names = snapshotSet(name, packages);
  const releaseTag = run([
    'describe',
    '--tags',
    '--abbrev=0',
    '--match',
    'v[0-9]*',
    'HEAD',
  ]);
  const snapshot = snapshotVersion({
    releaseTag,
    sha: run(['rev-parse', 'HEAD']),
    time: run(['show', '-s', '--format=%cI', 'HEAD']),
  });
  if (names.every((next) => isPublished(next, snapshot))) {
    console.log('%s is already published; nothing to do', snapshot);
    return;
  }
  const versions = snapshotVersions({
    names,
    packages,
    release: releaseTag.slice(1),
    snapshot,
  });
  for (const { dir, manifest } of packages) {
    writeFileSync(
      join(dir, 'package.json'),
      `${JSON.stringify({ ...manifest, version: versions[manifest.name] }, null, 2)}\n`
    );
  }
  console.log(
    'Publishing %s at %s under %s, with workspace peers at ^%s',
    names.join(', '),
    snapshot,
    SNAPSHOT_TAG,
    releaseTag.slice(1)
  );
  publishPackages(names, SNAPSHOT_TAG, dryRun ? ['--dry-run'] : []);
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
      'Usage: node scripts/publish_snapshot.js <package-name> [--dry-run]'
    );
  }
  publishSnapshot({ dryRun, name });
}
