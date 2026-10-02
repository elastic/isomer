/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, posix } from 'node:path';

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

const inPublishedFolder = (path, folders) =>
  folders.some((folder) =>
    posix.normalize(path).startsWith(`packages/${folder}/`)
  );

/** Root JSON files whose change counts only when the slice a published build reads from them changes. */
export const BUILD_SLICES = {
  'package.json': ({ scripts = {} }) =>
    Object.entries(scripts)
      .filter(([name]) => name === 'build' || name.startsWith('build:'))
      .sort(),
  'tsconfig.workspace.json': ({ references = [] }, folders) =>
    references
      .map(({ path }) => posix.normalize(path))
      .filter((path) => inPublishedFolder(path, folders))
      .sort(),
};

/** Folders of every package that is not `private` in any of `packageSets`. */
export const publishedFolders = (...packageSets) => [
  ...new Set(
    packageSets
      .flat()
      .filter(({ manifest }) => manifest.private !== true)
      .map(({ folder }) => folder)
  ),
];

/**
 * Whether a commit changing `files` alters a package published from `folders`.
 * `read(file, side)` returns a root file's text `'before'` or `'after'` the commit, or `undefined` when absent.
 * `THIRD_PARTY_LICENSES.md` never counts: it lists the whole repo's build closure, so any dependency change rewrites every package's copy.
 */
export const shipsChange = (files, folders, read) =>
  files.some((file) => {
    if (Object.hasOwn(BUILD_SLICES, file)) {
      const slice = (side) =>
        JSON.stringify(
          BUILD_SLICES[file](JSON.parse(read(file, side) ?? '{}'), folders)
        );
      return slice('before') !== slice('after');
    }
    return (
      !file.endsWith('/THIRD_PARTY_LICENSES.md') &&
      (inPublishedFolder(file, folders) || BUILD_INPUTS.includes(file))
    );
  });

/** Splits commits by `releases(commit)`. */
export const partitionCommits = (commits, releases) => {
  const kept = [];
  const dropped = [];
  for (const commit of commits) {
    (releases(commit) ? kept : dropped).push(commit);
  }
  return { dropped, kept };
};

const git = (cwd, args) =>
  execFileSync('git', args, {
    cwd,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

const readAt = (cwd, rev, path) => {
  try {
    return git(cwd, ['show', `${rev}:${path}`]);
  } catch {
    return undefined;
  }
};

const packagesAt = (cwd, rev) =>
  git(cwd, ['ls-tree', '-d', '--name-only', rev, 'packages/'])
    .split('\n')
    .filter(Boolean)
    .map((path) => posix.basename(path))
    .flatMap((folder) => {
      const manifest = readAt(cwd, rev, `packages/${folder}/package.json`);
      return manifest === undefined
        ? []
        : [{ folder, manifest: JSON.parse(manifest) }];
    });

/** Packages published now or at the last release both count, so removing or privatizing one still releases. */
const releasableCommits = ({ commits, cwd, lastRelease: { gitHead } = {} }) => {
  const folders = publishedFolders(
    workspacePackages(),
    gitHead ? packagesAt(cwd, gitHead) : []
  );
  return partitionCommits(commits, ({ hash }) =>
    shipsChange(
      git(cwd, [
        'diff-tree',
        '--root',
        '-r',
        '--no-commit-id',
        '--name-only',
        '-m',
        '--first-parent',
        hash,
      ])
        .split('\n')
        .filter(Boolean),
      folders,
      (file, side) => readAt(cwd, side === 'before' ? `${hash}^` : hash, file)
    )
  );
};

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
  const channel = nextRelease.channel ?? 'latest';
  // npm rejects maintenance branch names such as `1.x` as semver ranges.
  const tag = /^\d+(?:\.(?:\d+|x))?\.x$/.test(channel)
    ? `release-${channel}`
    : channel;
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
      '--tag',
      tag,
      '--no-git-checks',
    ],
    { stdio: 'inherit', cwd: repoRoot }
  );
};
