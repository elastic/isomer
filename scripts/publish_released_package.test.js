/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  branchTag,
  publishBlockers,
  publishReleasedPackage,
} from './publish_released_package.js';

const TREE = '/tmp/isomer-v0.4.0-abc';

const packages = [
  {
    dir: `${TREE}/packages/isomer-sdk`,
    folder: 'isomer-sdk',
    manifest: { name: '@elastic/isomer-sdk', version: '0.0.0-development' },
  },
  {
    dir: `${TREE}/packages/isomer-primitives-slides`,
    folder: 'isomer-primitives-slides',
    manifest: { name: '@elastic/isomer-primitives-slides', private: true },
  },
];

vi.mock('node:child_process', () => ({ execFileSync: vi.fn() }));
vi.mock('node:fs', () => ({
  mkdtempSync: vi.fn(() => TREE),
  rmSync: vi.fn(),
  writeFileSync: vi.fn(),
}));
vi.mock('./workspace_packages.js', () => ({
  repoRoot: '/repo',
  workspacePackages: vi.fn(() => packages),
}));
vi.spyOn(console, 'log').mockImplementation(() => {});

const published = new Set();

beforeEach(() => {
  vi.mocked(execFileSync).mockImplementation((command, args) => {
    if (command === 'git' && args[0] === 'describe') {
      return 'v0.4.0\n';
    }
    if (command === 'npm') {
      return published.has(args[1]) ? '0.4.0\n' : '';
    }
    return '';
  });
});

afterEach(() => {
  published.clear();
  vi.clearAllMocks();
});

const calls = (command, subcommand) =>
  vi
    .mocked(execFileSync)
    .mock.calls.filter(
      ([name, [first]]) => name === command && first === subcommand
    );

const publishCall = () => {
  const [call] = calls('pnpm', '-r');
  return call;
};

describe('publishReleasedPackage', () => {
  it('builds and publishes the package from a worktree of the tag', () => {
    publishReleasedPackage({
      branch: 'main',
      dryRun: false,
      name: '@elastic/isomer-sdk',
    });
    expect(calls('git', 'worktree').map(([, args]) => args)).toEqual([
      ['worktree', 'add', '--detach', TREE, 'v0.4.0'],
      ['worktree', 'remove', '--force', TREE],
    ]);
    expect(calls('pnpm', 'install')[0][2]).toMatchObject({ cwd: TREE });
    expect(calls('pnpm', 'build')[0][2]).toMatchObject({ cwd: TREE });
    expect(vi.mocked(writeFileSync)).toHaveBeenCalledWith(
      `${TREE}/packages/isomer-sdk/package.json`,
      expect.stringContaining('"version": "0.4.0"')
    );
    const [, args, options] = publishCall();
    expect(args).toEqual([
      '-r',
      '--filter',
      '@elastic/isomer-sdk',
      'publish',
      '--access',
      'public',
      '--tag',
      'latest',
      '--no-git-checks',
    ]);
    expect(options).toMatchObject({ cwd: TREE });
  });

  it('passes --dry-run to pnpm publish', () => {
    publishReleasedPackage({
      branch: 'main',
      dryRun: true,
      name: '@elastic/isomer-sdk',
    });
    expect(publishCall()[1].at(-1)).toBe('--dry-run');
  });

  it('publishes a maintenance release under its channel tag', () => {
    publishReleasedPackage({
      branch: '1.x',
      dryRun: false,
      name: '@elastic/isomer-sdk',
    });
    expect(publishCall()[1]).toContain('release-1.x');
  });

  it('removes the worktree and publishes nothing when blocked', () => {
    published.add('@elastic/isomer-sdk@0.4.0');
    expect(() =>
      publishReleasedPackage({
        branch: 'main',
        dryRun: false,
        name: '@elastic/isomer-sdk',
      })
    ).toThrow('already published');
    expect(calls('git', 'worktree')).toHaveLength(2);
    expect(calls('pnpm', 'install')).toEqual([]);
    expect(publishCall()).toBeUndefined();
  });
});

describe('publishBlockers', () => {
  const blockers = (overrides) =>
    publishBlockers({
      name: '@elastic/isomer-sdk',
      packages,
      published: false,
      ...overrides,
    });

  it('allows an unpublished public package', () => {
    expect(blockers()).toEqual([]);
  });

  it.each([
    ['an unknown package', { name: '@elastic/nope' }],
    ['a private package', { name: '@elastic/isomer-primitives-slides' }],
    ['an already published version', { published: true }],
  ])('blocks %s', (_, overrides) => {
    expect(blockers(overrides)).toHaveLength(1);
  });
});

describe('branchTag', () => {
  it.each([
    ['main', 'latest'],
    ['beta', 'beta'],
    ['alpha', 'alpha'],
    ['1.x', 'release-1.x'],
    ['1.2.x', 'release-1.2.x'],
  ])('tags a release from %s as %s', (branch, tag) => {
    expect(branchTag(branch)).toBe(tag);
  });

  it('refuses a branch that does not release', () => {
    expect(() => branchTag('feat/thing')).toThrow('not a release branch');
  });
});
