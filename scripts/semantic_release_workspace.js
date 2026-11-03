/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The semantic-release plugin for the workspace: commit analysis and notes over only the commits that change a
 * published package, one version for every package, and `pnpm publish` so `workspace:` ranges resolve.
 * The commit analyzer and notes generator load lazily, so the snapshot gate in `release.yml` runs without an install.
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join, posix } from 'node:path';

import { repoRoot, workspacePackages } from './workspace_packages.js';

/** Root files that shape every published package's build output. */
export const BUILD_INPUTS = ['tsconfig.base.json'];

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
 * Whether a change to `files` alters a package published from `folders`.
 * `read(file, side)` returns a root file's text `'before'` or `'after'` the change, or `undefined` when absent.
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

/** Folders published now or at `rev`, so removing or privatizing a package still counts. */
const foldersSince = (cwd, rev) =>
  publishedFolders(
    workspacePackages(cwd),
    rev === undefined ? [] : packagesAt(cwd, rev)
  );

const shipsBetween = (cwd, from, to, folders) =>
  shipsChange(
    // Without renames, a moved file lists its old path as well as its new one.
    git(cwd, ['diff', '--no-renames', '--name-only', from, to])
      .split('\n')
      .filter(Boolean),
    folders,
    (file, side) => readAt(cwd, side === 'before' ? from : to, file)
  );

/** Whether `HEAD` changes a published package since `rev`; true when `rev` is empty or unknown, as on a first push. */
export const shipsSince = (rev, cwd = repoRoot) => {
  try {
    git(cwd, ['cat-file', '-e', `${rev}^{commit}`]);
  } catch {
    return true;
  }
  return shipsBetween(cwd, rev, 'HEAD', foldersSince(cwd, rev));
};

/** The tree with no files, which a root commit's diff starts from. */
const emptyTree = (cwd) =>
  execFileSync('git', ['hash-object', '-t', 'tree', '--stdin'], {
    cwd,
    encoding: 'utf-8',
    input: '',
  }).trim();

/** A commit's first parent, or the empty tree for a root commit. */
const firstParentOf = (cwd, hash) =>
  git(cwd, ['log', '-1', '--format=%P', hash]).trim().split(' ')[0] ||
  emptyTree(cwd);

/** Commits since the last release that change a published package, judged on each one's first-parent diff. */
const releasableCommits = ({ commits, cwd, lastRelease }) => {
  const folders = foldersSince(cwd, lastRelease?.gitHead);
  return commits.filter(({ hash }) =>
    shipsBetween(cwd, firstParentOf(cwd, hash), hash, folders)
  );
};

/** `@semantic-release/commit-analyzer`, over only the commits that change a published package. */
export const analyzeCommits = async (pluginConfig, context) => {
  const { analyzeCommits: analyze } =
    await import('@semantic-release/commit-analyzer');
  const commits = releasableCommits(context);
  context.logger.log(
    'Analyzing %d of %d commits; the rest change no published package',
    commits.length,
    context.commits.length
  );
  return analyze(pluginConfig, { ...context, commits });
};

/** `@semantic-release/release-notes-generator`, over the same commits as {@link analyzeCommits}. */
export const generateNotes = async (pluginConfig, context) => {
  const { generateNotes: generate } =
    await import('@semantic-release/release-notes-generator');
  return generate(pluginConfig, {
    ...context,
    commits: releasableCommits(context),
  });
};

/** Writes `version` into every workspace manifest, so `pnpm publish` resolves each `workspace:` range to it. */
export const setVersion = (version, packages = workspacePackages()) => {
  for (const { dir, manifest } of packages) {
    writeFileSync(
      join(dir, 'package.json'),
      `${JSON.stringify({ ...manifest, version }, null, 2)}\n`
    );
  }
};

/**
 * Publishes every workspace package under npm dist-tag `tag`.
 * `pnpm -r publish` skips private packages and any already on the registry at its version, so a rerun publishes the rest.
 */
export const publishPackages = (tag, dryRun = false) => {
  execFileSync(
    'pnpm',
    [
      '-r',
      'publish',
      '--access',
      'public',
      '--tag',
      tag,
      '--no-git-checks',
      ...(dryRun ? ['--dry-run'] : []),
    ],
    { stdio: 'inherit', cwd: repoRoot }
  );
};

export const prepare = (_pluginConfig, { nextRelease }) =>
  setVersion(nextRelease.version);

export const publish = () => publishPackages('latest');
