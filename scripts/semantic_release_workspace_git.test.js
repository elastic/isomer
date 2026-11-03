/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { analyzeCommits, shipsSince } from './semantic_release_workspace.js';

/** `shipsSince` against a real repository, where its other tests stub git out. */
describe('shipsSince in a git repository', () => {
  let repo = '';

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

  /** Commits every change and returns the new head. */
  const commit = (message) => {
    git('add', '-A');
    git('commit', '-q', '-m', message);
    return git('rev-parse', 'HEAD');
  };

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), 'isomer-ships-since-'));
    git('init', '-q', '-b', 'main');
    write('packages/isomer-sdk/package.json', manifest('@elastic/isomer-sdk'));
    write('packages/isomer-sdk/src/index.ts', 'export const a = 1;\n');
    write('packages/slides/package.json', manifest('slides', true));
    write('packages/slides/src/index.ts', 'export const b = 1;\n');
    write('docs/index.md', '# Docs\n');
  });

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it('ships a change to a published package', () => {
    const base = commit('base');
    write('packages/isomer-sdk/src/index.ts', 'export const a = 2;\n');
    commit('change the sdk');
    expect(shipsSince(base, repo)).toBe(true);
  });

  it('does not ship a change to docs or a private package', () => {
    const base = commit('base');
    write('docs/index.md', '# Docs, edited\n');
    write('packages/slides/src/index.ts', 'export const b = 2;\n');
    commit('change docs and slides');
    expect(shipsSince(base, repo)).toBe(false);
  });

  it('ships a change to a package published at the revision and private now', () => {
    const base = commit('base');
    write(
      'packages/isomer-sdk/package.json',
      manifest('@elastic/isomer-sdk', true)
    );
    commit('make the sdk private');
    expect(shipsSince(base, repo)).toBe(true);
  });

  it('ships a change to a package removed since the revision', () => {
    const base = commit('base');
    rmSync(join(repo, 'packages/isomer-sdk'), { recursive: true });
    commit('remove the sdk');
    expect(shipsSince(base, repo)).toBe(true);
  });

  it('ships a published package moved into a private folder', () => {
    const source = Array.from(
      { length: 20 },
      (_, index) => `export const value${index} = ${index};`
    ).join('\n');
    const sdkManifest = (isPrivate) =>
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
    write('packages/isomer-sdk/package.json', sdkManifest(false));
    write('packages/isomer-sdk/src/index.ts', `${source}\n`);
    const base = commit('base');
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
    const root = commit('feat: add the sdk');
    const release = await analyzeCommits(
      { preset: 'angular' },
      {
        commits: [{ hash: root, message: 'feat: add the sdk' }],
        cwd: repo,
        lastRelease: {},
        logger: { log: () => undefined },
      }
    );
    expect(release).toBe('minor');
  });
});
