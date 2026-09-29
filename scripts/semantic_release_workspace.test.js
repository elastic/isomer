/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  BUILD_INPUTS,
  partitionCommits,
  releasePaths,
} from './semantic_release_workspace.js';
import { repoRoot, workspacePackages } from './workspace_packages.js';

const partition = (filesByHash) =>
  partitionCommits(
    Object.keys(filesByHash).map((hash) => ({ hash })),
    ({ hash }) => filesByHash[hash],
    releasePaths()
  );

const hashes = (commits) => commits.map(({ hash }) => hash);

describe('partitionCommits', () => {
  it('keeps a commit that changes a published package or a build input', () => {
    const { dropped, kept } = partition({
      build: ['tsconfig.base.json'],
      mixed: ['docs/index.md', 'packages/isomer-sdk/src/index.ts'],
      runtime: ['packages/isomer-runtime/package.json'],
    });
    expect(hashes(kept)).toEqual(['build', 'mixed', 'runtime']);
    expect(dropped).toEqual([]);
  });

  it('drops a commit that changes only private or unpublished paths', () => {
    const { dropped, kept } = partition({
      docs: ['docs/index.md', 'README.md'],
      empty: [],
      licenses: [
        'packages/isomer-primitives-slides/package.json',
        'packages/isomer-sdk/THIRD_PARTY_LICENSES.md',
      ],
      prefix: ['packages/isomer-sdk-extra/index.ts'],
      slides: ['packages/isomer-primitives-slides/src/registry.ts'],
    });
    expect(kept).toEqual([]);
    expect(hashes(dropped)).toEqual([
      'docs',
      'empty',
      'licenses',
      'prefix',
      'slides',
    ]);
  });
});

describe('releasePaths', () => {
  it('lists every non-private package folder and no private one', () => {
    const packages = workspacePackages();
    const paths = releasePaths();
    for (const { folder, manifest } of packages) {
      expect(paths.includes(`packages/${folder}/`)).toBe(
        manifest.private !== true
      );
    }
  });

  it('covers every local script the build runs', () => {
    const { scripts } = JSON.parse(
      readFileSync(join(repoRoot, 'package.json'), 'utf-8')
    );
    const pending = Object.entries(scripts)
      .filter(([name]) => name.startsWith('build:'))
      .flatMap(([, command]) => command.match(/scripts\/\w+\.js/g) ?? []);
    const seen = new Set();
    while (pending.length > 0) {
      const script = pending.pop();
      if (seen.has(script)) {
        continue;
      }
      seen.add(script);
      const source = readFileSync(join(repoRoot, script), 'utf-8');
      for (const [, imported] of source.matchAll(/from '\.\/(\w+\.js)'/g)) {
        pending.push(`scripts/${imported}`);
      }
    }
    expect(
      [...seen].filter((script) => !BUILD_INPUTS.includes(script))
    ).toEqual([]);
  });
});
