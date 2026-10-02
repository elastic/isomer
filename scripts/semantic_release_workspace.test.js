/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  BUILD_INPUTS,
  BUILD_SLICES,
  partitionCommits,
  publish,
  publishedFolders,
  shipsChange,
} from './semantic_release_workspace.js';
import { repoRoot, workspacePackages } from './workspace_packages.js';

vi.mock('node:child_process', () => ({ execFileSync: vi.fn() }));

afterEach(() => vi.clearAllMocks());

describe('publish', () => {
  it.each([
    [undefined, 'latest'],
    [null, 'latest'],
    ['alpha', 'alpha'],
    ['beta', 'beta'],
    ['1.x', 'release-1.x'],
    ['1.2.x', 'release-1.2.x'],
    ['1.x.x', 'release-1.x.x'],
  ])('publishes channel %s with npm tag %s', (channel, tag) => {
    publish(
      {},
      {
        logger: { log() {} },
        nextRelease: { version: '0.1.0', channel },
      }
    );
    expect(execFileSync).toHaveBeenCalledExactlyOnceWith(
      'pnpm',
      [
        '-r',
        ...workspacePackages()
          .filter(({ manifest }) => manifest.private !== true)
          .flatMap(({ manifest }) => ['--filter', manifest.name]),
        'publish',
        '--access',
        'public',
        '--tag',
        tag,
        '--no-git-checks',
      ],
      { stdio: 'inherit', cwd: repoRoot }
    );
  });
});

const FOLDERS = ['isomer-runtime', 'isomer-sdk'];

const pkg = (folder, isPrivate) => ({
  folder,
  manifest: isPrivate ? { private: true } : {},
});

const reference = (path) => ({ path });

const workspace = (...paths) =>
  JSON.stringify({ files: [], references: paths.map(reference) });

const ships = (files, roots = {}) =>
  shipsChange(files, FOLDERS, (file, side) => roots[file]?.[side]);

describe('shipsChange', () => {
  it.each([
    ['a build input', ['tsconfig.base.json']],
    [
      'a published file among others',
      ['docs/index.md', 'packages/isomer-sdk/src/index.ts'],
    ],
    ['a published manifest', ['packages/isomer-runtime/package.json']],
  ])('counts %s', (_, files) => {
    expect(ships(files)).toBe(true);
  });

  it.each([
    ['docs', ['docs/index.md', 'README.md']],
    ['nothing', []],
    [
      'license reports and a private manifest',
      [
        'packages/isomer-primitives-slides/package.json',
        'packages/isomer-sdk/THIRD_PARTY_LICENSES.md',
      ],
    ],
    [
      'a sibling folder sharing a prefix',
      ['packages/isomer-sdk-extra/index.ts'],
    ],
    [
      'a private package',
      ['packages/isomer-primitives-slides/src/registry.ts'],
    ],
  ])('ignores %s', (_, files) => {
    expect(ships(files)).toBe(false);
  });

  describe('tsconfig.workspace.json', () => {
    const sdk = 'packages/isomer-sdk/tsconfig.build.json';
    const slides = 'packages/isomer-primitives-slides/tsconfig.build.json';
    const runtime = 'packages/isomer-runtime/tsconfig.build.json';
    const change = (before, after) =>
      ships(['tsconfig.workspace.json'], {
        'tsconfig.workspace.json': { after, before },
      });

    it('counts a repointed, removed, or first published reference', () => {
      expect(
        change(
          workspace(sdk),
          workspace('packages/isomer-sdk/tsconfig.other.json')
        )
      ).toBe(true);
      expect(change(workspace(sdk, runtime), workspace(sdk))).toBe(true);
      expect(change(undefined, workspace(sdk))).toBe(true);
    });

    it('ignores a private reference or a reorder', () => {
      expect(change(workspace(sdk), workspace(sdk, slides))).toBe(false);
      expect(
        change(workspace(sdk, runtime), workspace(runtime, `./${sdk}`))
      ).toBe(false);
      expect(change(undefined, workspace(slides))).toBe(false);
    });
  });

  describe('package.json', () => {
    const manifest = (scripts, devDependencies = {}) =>
      JSON.stringify({ devDependencies, scripts });
    const change = (before, after) =>
      ships(['package.json'], { 'package.json': { after, before } });
    const build = { build: 'pnpm build:esm', 'build:esm': 'tsc --build' };

    it('counts a changed build script', () => {
      expect(
        change(
          manifest(build),
          manifest({ ...build, 'build:esm': 'tsc --build --force' })
        )
      ).toBe(true);
    });

    it('ignores other scripts and dependencies', () => {
      expect(
        change(
          manifest(build),
          manifest({ ...build, test: 'vitest' }, { zod: '^4' })
        )
      ).toBe(false);
    });
  });
});

describe('partitionCommits', () => {
  it('splits commits by the predicate', () => {
    const commits = ['a', 'b', 'c'].map((hash) => ({ hash }));
    expect(partitionCommits(commits, ({ hash }) => hash !== 'b')).toEqual({
      dropped: [{ hash: 'b' }],
      kept: [{ hash: 'a' }, { hash: 'c' }],
    });
  });
});

describe('publishedFolders', () => {
  it('lists every non-private workspace package and no private one', () => {
    const folders = publishedFolders(workspacePackages());
    for (const { folder, manifest } of workspacePackages()) {
      expect(folders.includes(folder)).toBe(manifest.private !== true);
    }
  });

  it('keeps a package published at the last release that is now private or gone', () => {
    expect(
      publishedFolders(
        [pkg('isomer-sdk'), pkg('isomer-runtime', true)],
        [
          pkg('isomer-sdk'),
          pkg('isomer-runtime'),
          pkg('isomer-gone'),
          pkg('slides', true),
        ]
      )
    ).toEqual(['isomer-sdk', 'isomer-runtime', 'isomer-gone']);
  });
});

describe('build inputs', () => {
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
  it('covers every root JSON file the build names', () => {
    const { scripts } = JSON.parse(
      readFileSync(join(repoRoot, 'package.json'), 'utf-8')
    );
    const named = Object.entries(scripts)
      .filter(([name]) => name.startsWith('build:'))
      .flatMap(
        ([, command]) => command.match(/(?<=^|\s)[\w.]+\.json\b/g) ?? []
      );
    expect(named).not.toEqual([]);
    expect(
      named.filter(
        (file) =>
          !BUILD_INPUTS.includes(file) && !Object.hasOwn(BUILD_SLICES, file)
      )
    ).toEqual([]);
  });
});
