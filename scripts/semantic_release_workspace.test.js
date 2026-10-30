/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  BUILD_INPUTS,
  publish,
  publishedFolders,
  shipsChange,
  shipsSince,
} from './semantic_release_workspace.js';
import { repoRoot, workspacePackages } from './workspace_packages.js';

vi.mock('node:child_process', () => ({ execFileSync: vi.fn() }));

afterEach(() => vi.clearAllMocks());

describe('publish', () => {
  it('publishes the workspace under latest', () => {
    publish();
    expect(execFileSync).toHaveBeenCalledExactlyOnceWith(
      'pnpm',
      [
        '-r',
        'publish',
        '--access',
        'public',
        '--tag',
        'latest',
        '--no-git-checks',
      ],
      { stdio: 'inherit', cwd: repoRoot }
    );
  });
});

describe('shipsSince', () => {
  it('ships when the revision is empty or unknown', () => {
    vi.mocked(execFileSync).mockImplementation(() => {
      throw new Error('missing');
    });
    expect(shipsSince('')).toBe(true);
    expect(shipsSince('0000000000000000000000000000000000000000')).toBe(true);
  });
});

const FOLDERS = ['isomer-runtime', 'isomer-sdk'];

const pkg = (folder, isPrivate) => ({
  folder,
  manifest: isPrivate ? { private: true } : {},
});

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

  it("counts a change to the Studio's in-package asset builder", () => {
    expect(
      shipsChange(
        ['packages/isomer-studio/build/build_app_assets.js'],
        publishedFolders(workspacePackages()),
        () => undefined
      )
    ).toBe(true);
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
  it('covers every root file a package tsconfig extends', () => {
    const extended = workspacePackages(repoRoot).flatMap(({ dir }) =>
      readdirSync(dir)
        .filter((file) => /^tsconfig.*\.json$/.test(file))
        .flatMap((file) => {
          const config = readFileSync(join(dir, file), 'utf-8');
          const { extends: base } = JSON.parse(config);
          const path =
            typeof base === 'string' ? relative(repoRoot, join(dir, base)) : '';
          return path && !path.startsWith('packages/') ? [path] : [];
        })
    );
    expect(extended).not.toEqual([]);
    expect(extended.filter((file) => !BUILD_INPUTS.includes(file))).toEqual([]);
  });
});
