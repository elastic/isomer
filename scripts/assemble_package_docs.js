/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { repoRoot, workspacePackages } from './workspace_packages.js';

/** `isomer-primitives-slides` assembles as `slides`, `isomer-sdk` as `sdk`. */
const docsAlias = (folder) => folder.replace(/^isomer-(?:primitives-)?/, '');

/** @type {ReadonlyArray<{ dest: string; src: string }>} */
export const PACKAGE_DOCS = workspacePackages()
  .filter(({ dir }) => existsSync(join(dir, 'docs')))
  .map(({ folder }) => ({
    dest: `docs/${docsAlias(folder)}`,
    src: `packages/${folder}/docs`,
  }));

const packageFolderToAlias = new Map(
  PACKAGE_DOCS.map(({ dest, src }) => [
    src.split('/')[1],
    dest.slice('docs/'.length),
  ])
);

const CROSS_PACKAGE_LINK = /\]\(\.\.\/\.\.\/(isomer-[^/]+)\/docs\/([^)]+)\)/g;

const rewriteAssembledMarkdown = (text) =>
  text.replace(CROSS_PACKAGE_LINK, (match, folder, rest) => {
    const alias = packageFolderToAlias.get(folder);
    return alias ? `](../${alias}/${rest})` : match;
  });

const rewriteTree = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      rewriteTree(path);
      continue;
    }
    if (!entry.name.endsWith('.md')) {
      continue;
    }
    const original = readFileSync(path, 'utf8');
    const rewritten = rewriteAssembledMarkdown(original);
    if (rewritten !== original) {
      writeFileSync(path, rewritten);
    }
  }
};

export const assemblePackageDocs = () => {
  for (const { dest, src } of PACKAGE_DOCS) {
    const destPath = resolve(repoRoot, dest);
    const srcPath = resolve(repoRoot, src);
    if (!existsSync(srcPath)) {
      continue;
    }
    rmSync(destPath, { force: true, recursive: true });
    cpSync(srcPath, destPath, { recursive: true });
    rewriteTree(destPath);
  }
};

const invokedDirectly =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

/**
 * Codex clones the repository and builds `docs/` as committed, so the copies
 * are committed too. `--check` fails when they drift from `packages/*\/docs`.
 */
const checkAssembledDocs = () => {
  const git = (...args) =>
    spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).stdout.trim();
  const drift = [
    git('diff', '--name-status', '--', 'docs'),
    git('ls-files', '--others', '--exclude-standard', '--', 'docs'),
  ]
    .filter(Boolean)
    .join('\n');
  if (drift !== '') {
    console.error(
      'docs/ is out of date with packages/*/docs. Run `pnpm docs:assemble` and commit the result:\n' +
        drift
    );
    process.exit(1);
  }
};

if (invokedDirectly) {
  assemblePackageDocs();
  if (process.argv.includes('--check')) {
    checkAssembledDocs();
  }
}
