/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import { analyzeCommits, shipsSince } from './semantic_release_workspace.js';

/** Nine git processes at most per case (four in its body, five in `shipsSince`); one has taken 1.1 s in full local runs. */
const TIMEOUT_MS = 9 * 1_500;

/** `shipsSince` against a real repository, where its other tests stub git out. */
describe('shipsSince in a git repository', { timeout: TIMEOUT_MS }, () => {
  let template = '';
  let repo = '';
  /** The fixture's only commit, a root commit, in every copy of the template. */
  let base = '';

  const git = (...args) =>
    execFileSync(
      'git',
      [
        '-c',
        'user.name=Test',
        '-c',
        'user.email=test@example.com',
        '-c',
        'commit.gpgsign=false',
        '-c',
        'core.hooksPath=/dev/null',
        ...args,
      ],
      { cwd: repo, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }
    ).trim();

  const write = (path, text) => {
    mkdirSync(dirname(join(repo, path)), { recursive: true });
    writeFileSync(join(repo, path), text);
  };

  const manifest = (name, isPrivate = false) =>
    JSON.stringify({ name, ...(isPrivate ? { private: true } : {}) });

  /** Long enough that git still pairs the files as a rename when the manifest gains `private`. */
  const sdkManifest = (isPrivate = false) =>
    `${JSON.stringify(
      {
        name: '@elastic/isomer-sdk',
        description: 'Moved into a private folder by this test.',
        license: 'Elastic-2.0',
        ...(isPrivate ? { private: true } : {}),
      },
      null,
      2
    )}\n`;

  const commit = (message) => {
    git('add', '-A');
    git('commit', '-q', '-m', message);
  };

  beforeAll(() => {
    template = mkdtempSync(join(tmpdir(), 'isomer-ships-since-'));
    repo = template;
    git('init', '-q', '-b', 'main');
    write('packages/isomer-sdk/package.json', sdkManifest());
    write(
      'packages/isomer-sdk/src/index.ts',
      `${Array.from(
        { length: 20 },
        (_, index) => `export const value${index} = ${index};`
      ).join('\n')}\n`
    );
    write('packages/slides/package.json', manifest('slides', true));
    write('packages/slides/src/index.ts', 'export const b = 1;\n');
    write('docs/index.md', '# Docs\n');
    commit('feat: add the sdk');
    base = git('rev-parse', 'HEAD');
  });

  afterAll(() => {
    rmSync(template, { recursive: true, force: true });
  });

  beforeEach(() => {
    // A failed `mkdtempSync` must not leave `afterEach` holding the template.
    repo = '';
    repo = mkdtempSync(join(tmpdir(), 'isomer-ships-since-'));
    cpSync(template, repo, { recursive: true });
  });

  afterEach(() => {
    if (repo !== '') {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it('ships a change to a published package', () => {
    write('packages/isomer-sdk/src/index.ts', 'export const a = 2;\n');
    commit('change the sdk');
    expect(shipsSince(base, repo)).toBe(true);
  });

  it('does not ship a change to docs or a private package', () => {
    write('docs/index.md', '# Docs, edited\n');
    write('packages/slides/src/index.ts', 'export const b = 2;\n');
    commit('change docs and slides');
    expect(shipsSince(base, repo)).toBe(false);
  });

  it('ships a change to a package published at the revision and private now', () => {
    write('packages/isomer-sdk/package.json', sdkManifest(true));
    commit('make the sdk private');
    expect(shipsSince(base, repo)).toBe(true);
  });

  it('ships a change to a package removed since the revision', () => {
    rmSync(join(repo, 'packages/isomer-sdk'), { recursive: true });
    commit('remove the sdk');
    expect(shipsSince(base, repo)).toBe(true);
  });

  it('ships a published package moved into a private folder', () => {
    git('mv', 'packages/isomer-sdk', 'packages/sdk-internal');
    write('packages/sdk-internal/package.json', sdkManifest(true));
    commit('move the sdk into a private folder');
    expect(
      git('diff', '--name-only', base, 'HEAD').split('\n'),
      'git reports the move as a rename'
    ).toEqual([
      'packages/sdk-internal/package.json',
      'packages/sdk-internal/src/index.ts',
    ]);
    expect(shipsSince(base, repo)).toBe(true);
  });

  it('analyzes a root commit when there is no previous release', async () => {
    const release = await analyzeCommits(
      { preset: 'angular' },
      {
        commits: [{ hash: base, message: 'feat: add the sdk' }],
        cwd: repo,
        lastRelease: {},
        logger: { log: () => undefined },
      }
    );
    expect(release).toBe('minor');
  });
});
