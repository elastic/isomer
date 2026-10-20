/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

import semver from 'semver';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  publishSnapshot,
  snapshotSet,
  snapshotVersion,
  snapshotVersions,
} from './publish_snapshot.js';

const SHA = '1f6b018e0c2d4e6f8a0b1c2d3e4f5a6b7c8d9e0f';
const SNAPSHOT = '0.4.1-main.20261020203334.g1f6b018';

const pkg = (folder, manifest) => ({
  dir: `/repo/packages/${folder}`,
  folder,
  manifest: { version: '0.0.0-development', ...manifest },
});

const packages = [
  pkg('isomer-image-takumi', { name: '@elastic/isomer-image-takumi' }),
  pkg('isomer-primitives-slides', {
    name: '@elastic/isomer-primitives-slides',
    private: true,
  }),
  pkg('isomer-runtime', {
    name: '@elastic/isomer-runtime',
    peerDependencies: { '@elastic/isomer-sdk': 'workspace:^' },
  }),
  pkg('isomer-sdk', { name: '@elastic/isomer-sdk' }),
  pkg('isomer-studio', {
    name: '@elastic/isomer-studio',
    dependencies: {
      '@elastic/isomer-image-takumi': 'workspace:*',
      react: '^18.2.0',
    },
    peerDependencies: {
      '@elastic/isomer-runtime': 'workspace:^',
      '@elastic/isomer-sdk': 'workspace:^',
    },
  }),
];

vi.mock('node:child_process', () => ({ execFileSync: vi.fn() }));
vi.mock('node:fs', () => ({ writeFileSync: vi.fn() }));
vi.mock('./workspace_packages.js', () => ({
  repoRoot: '/repo',
  workspacePackages: vi.fn(() => packages),
}));
vi.spyOn(console, 'log').mockImplementation(() => {});

const published = new Set();

beforeEach(() => {
  vi.mocked(execFileSync).mockImplementation((command, args) => {
    if (command === 'git') {
      return {
        describe: 'v0.4.0\n',
        'rev-parse': `${SHA}\n`,
        show: '2026-10-20T16:33:34-04:00\n',
      }[args[0]];
    }
    if (command === 'npm') {
      return published.has(args[1]) ? `${SNAPSHOT}\n` : '';
    }
    return '';
  });
});

afterEach(() => {
  published.clear();
  vi.clearAllMocks();
});

const publishCalls = () =>
  vi.mocked(execFileSync).mock.calls.filter(([command]) => command === 'pnpm');

const written = () =>
  Object.fromEntries(
    vi
      .mocked(writeFileSync)
      .mock.calls.map(([path, text]) => [path, JSON.parse(text).version])
  );

describe('publishSnapshot', () => {
  it('publishes the package and its workspace dependencies under next', () => {
    publishSnapshot({ dryRun: false, name: '@elastic/isomer-studio' });
    const [[, args, options]] = publishCalls();
    expect(args).toEqual([
      '-r',
      '--filter',
      '@elastic/isomer-studio',
      '--filter',
      '@elastic/isomer-image-takumi',
      'publish',
      '--access',
      'public',
      '--tag',
      'next',
      '--no-git-checks',
    ]);
    expect(options).toMatchObject({ cwd: '/repo' });
  });

  it('versions the snapshot set as the snapshot and every peer as the release', () => {
    publishSnapshot({ dryRun: false, name: '@elastic/isomer-studio' });
    expect(written()).toEqual({
      '/repo/packages/isomer-image-takumi/package.json': SNAPSHOT,
      '/repo/packages/isomer-primitives-slides/package.json': '0.4.0',
      '/repo/packages/isomer-runtime/package.json': '0.4.0',
      '/repo/packages/isomer-sdk/package.json': '0.4.0',
      '/repo/packages/isomer-studio/package.json': SNAPSHOT,
    });
  });

  it('passes --dry-run to pnpm publish', () => {
    publishSnapshot({ dryRun: true, name: '@elastic/isomer-studio' });
    expect(publishCalls()[0][1].at(-1)).toBe('--dry-run');
  });

  it('does nothing when the commit is already published', () => {
    published.add(`@elastic/isomer-studio@${SNAPSHOT}`);
    published.add(`@elastic/isomer-image-takumi@${SNAPSHOT}`);
    publishSnapshot({ dryRun: false, name: '@elastic/isomer-studio' });
    expect(publishCalls()).toEqual([]);
    expect(vi.mocked(writeFileSync)).not.toHaveBeenCalled();
  });

  it('refuses a private package before touching a manifest', () => {
    expect(() =>
      publishSnapshot({
        dryRun: false,
        name: '@elastic/isomer-primitives-slides',
      })
    ).toThrow('is private');
    expect(vi.mocked(writeFileSync)).not.toHaveBeenCalled();
  });
});

describe('snapshotVersion', () => {
  const version = (overrides) =>
    snapshotVersion({
      releaseTag: 'v0.4.0',
      sha: SHA,
      time: '2026-10-20T16:33:34-04:00',
      ...overrides,
    });

  it('is a prerelease of the next patch, stamped with the UTC commit time', () => {
    expect(version()).toBe(SNAPSHOT);
  });

  it('is valid semver even for an all-digit sha with a leading zero', () => {
    expect(semver.valid(version({ sha: '0123456789' }))).not.toBeNull();
  });

  it('sorts after its release and before the next one, by commit time', () => {
    const later = version({ time: '2026-10-21T00:00:00Z' });
    expect(semver.gt(version(), '0.4.0')).toBe(true);
    expect(semver.lt(later, '0.4.1')).toBe(true);
    expect(semver.gt(later, version())).toBe(true);
  });

  it('stays out of the release range consumers install', () => {
    expect(semver.satisfies(version(), '^0.4.0')).toBe(false);
  });

  it('refuses a tag that is not a release', () => {
    expect(() => version({ releaseTag: 'v0.4.0-beta.1' })).toThrow(
      'not a release tag'
    );
  });
});

describe('snapshotSet', () => {
  it('follows workspace dependencies but not peers', () => {
    expect(snapshotSet('@elastic/isomer-studio', packages)).toEqual([
      '@elastic/isomer-studio',
      '@elastic/isomer-image-takumi',
    ]);
  });

  it('refuses an unknown package', () => {
    expect(() => snapshotSet('@elastic/nope', packages)).toThrow(
      'not a workspace package'
    );
  });
});

describe('snapshotVersions', () => {
  it('assigns the snapshot to the set and the release to the rest', () => {
    expect(
      snapshotVersions({
        names: ['@elastic/isomer-sdk'],
        packages: packages.slice(2, 4),
        release: '0.4.0',
        snapshot: SNAPSHOT,
      })
    ).toEqual({
      '@elastic/isomer-runtime': '0.4.0',
      '@elastic/isomer-sdk': SNAPSHOT,
    });
  });
});
