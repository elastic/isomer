/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { analyzeCommits as analyzeAll } from '@semantic-release/commit-analyzer';
import { generateNotes as generateAllNotes } from '@semantic-release/release-notes-generator';

import { repoRoot, workspacePackages } from './workspace_packages.js';

/** Root files that shape every published package's build output. */
export const BUILD_INPUTS = [
  'scripts/build_cjs.js',
  'scripts/rewrite_specifiers.js',
  'scripts/workspace_packages.js',
  'scripts/write_cjs_manifest.js',
  'tsconfig.base.json',
];

/** Paths a commit must touch to drive a release: each published package's folder, plus {@link BUILD_INPUTS}. */
export const releasePaths = () => [
  ...workspacePackages()
    .filter(({ manifest }) => manifest.private !== true)
    .map(({ folder }) => `packages/${folder}/`),
  ...BUILD_INPUTS,
];

/**
 * Splits commits by whether any file they change is under one of `paths`.
 * `THIRD_PARTY_LICENSES.md` never counts: it lists the whole repo's build closure, so any dependency change rewrites every package's copy.
 */
export const partitionCommits = (commits, changedFiles, paths) => {
  const touches = (file) =>
    !file.endsWith('/THIRD_PARTY_LICENSES.md') &&
    paths.some((path) =>
      path.endsWith('/') ? file.startsWith(path) : file === path
    );
  const kept = [];
  const dropped = [];
  for (const commit of commits) {
    (changedFiles(commit).some(touches) ? kept : dropped).push(commit);
  }
  return { dropped, kept };
};

const releasableCommits = ({ commits, cwd }) =>
  partitionCommits(
    commits,
    ({ hash }) =>
      execFileSync(
        'git',
        [
          'diff-tree',
          '--root',
          '-r',
          '--no-commit-id',
          '--name-only',
          '-m',
          '--first-parent',
          hash,
        ],
        { cwd, encoding: 'utf-8' }
      )
        .split('\n')
        .filter(Boolean),
    releasePaths()
  );

const writeJson = (path, value) => {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};

/** `@semantic-release/commit-analyzer`, over only the commits that change a published package. */
export const analyzeCommits = (pluginConfig, context) => {
  const { logger } = context;
  const { dropped, kept } = releasableCommits(context);
  logger.log(
    'Analyzing %d of %d commits; %d change no published package',
    kept.length,
    kept.length + dropped.length,
    dropped.length
  );
  for (const { hash, subject } of dropped) {
    logger.log('Skipping %s %s', hash.slice(0, 8), subject);
  }
  return analyzeAll(pluginConfig, { ...context, commits: kept });
};

/** `@semantic-release/release-notes-generator`, over the same commits as {@link analyzeCommits}. */
export const generateNotes = (pluginConfig, context) =>
  generateAllNotes(pluginConfig, {
    ...context,
    commits: releasableCommits(context).kept,
  });

/** Keep every workspace package on the same version as the release. */
export const prepare = (_pluginConfig, context) => {
  const { nextRelease, logger } = context;
  const { version } = nextRelease;

  const rootPath = join(repoRoot, 'package.json');
  const rootManifest = JSON.parse(readFileSync(rootPath, 'utf-8'));
  rootManifest.version = version;
  writeJson(rootPath, rootManifest);

  for (const pkg of workspacePackages()) {
    pkg.manifest.version = version;
    writeJson(join(pkg.dir, 'package.json'), pkg.manifest);
    logger.log('Set %s to %s', pkg.manifest.name, version);
  }
};

/** Publishes every workspace package that is not `private`. */
export const publish = (_pluginConfig, context) => {
  const { logger, nextRelease } = context;
  const names = workspacePackages()
    .filter(({ manifest }) => manifest.private !== true)
    .map(({ manifest }) => manifest.name);
  logger.log('Publishing %s at %s', names.join(', '), nextRelease.version);
  execFileSync(
    'pnpm',
    [
      '-r',
      ...names.flatMap((name) => ['--filter', name]),
      'publish',
      '--access',
      'public',
      '--no-git-checks',
    ],
    { stdio: 'inherit', cwd: repoRoot }
  );
};
