/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Publishes a prerelease of every non-private workspace package from the built checkout under the `next` dist-tag,
 * with no git tag or commit. Every package shares one snapshot version, so `pnpm publish` turns each `workspace:`
 * dependency and peer into that version and an `@next` set installs as one consistent build of `main`.
 *
 * Usage: `node scripts/publish_snapshot.js [--dry-run]`, after `pnpm build`.
 * `node scripts/publish_snapshot.js --since <rev>` prints `ships=true` or `ships=false` for `$GITHUB_OUTPUT`.
 */

import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import {
  publishPackages,
  setVersion,
  shipsSince,
} from './semantic_release_workspace.js';
import { repoRoot } from './workspace_packages.js';

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

const git = (...args) =>
  execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();

/** Versions every workspace manifest as the snapshot and publishes. The manifests stay rewritten; CI checkouts are throwaway. */
export const publishSnapshot = ({ dryRun }) => {
  const version = snapshotVersion({
    releaseTag: git('describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*'),
    sha: git('rev-parse', 'HEAD'),
    time: git('show', '-s', '--format=%cI', 'HEAD'),
  });
  setVersion(version);
  console.log('Publishing %s under %s', version, SNAPSHOT_TAG);
  publishPackages(SNAPSHOT_TAG, dryRun);
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values } = parseArgs({
    options: {
      'dry-run': { default: false, type: 'boolean' },
      since: { type: 'string' },
    },
  });
  if (values.since === undefined) {
    publishSnapshot({ dryRun: values['dry-run'] });
  } else {
    console.log(`ships=${shipsSince(values.since)}`);
  }
}
