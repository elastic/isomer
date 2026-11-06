/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as esbuild from 'esbuild';
import { describe, expect, it } from 'vitest';

import { bannedReason, checkEntry, parseArgs } from './check_hermes_imports.js';

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, 'check_hermes_imports.js');
const fixture = (...parts) =>
  join(here, 'fixtures', 'hermes_imports', ...parts);
const violation = (name) => fixture('violations', `${name}.ts`);

const summarize = ({ violations }) =>
  violations.map(({ kind, detail }) => `${kind}: ${detail}`);

describe('checkEntry', () => {
  it('passes a clean entry, preferring .native files and ignoring near-misses', async () => {
    const result = await checkEntry(esbuild, fixture('clean', 'entry.ts'));
    expect(result.violations).toEqual([]);
    expect(result.modules).toBe(3);
  });

  it.each([
    ['react_dom', 'import: "react-dom/client" (react-dom: needs a DOM)'],
    ['react_dom_server', 'import: "react-dom/server" (react-dom: needs a DOM)'],
    ['node_prefixed', 'import: "node:fs" (Node built-in)'],
    ['node_bare', 'import: "path" (Node built-in)'],
    ['node_subpath', 'import: "fs/promises" (Node built-in)'],
    ['node_require', 'import: "crypto" (Node built-in)'],
    [
      'elastic_charts',
      'import: "@elastic/charts" (@elastic/charts: needs a DOM)',
    ],
    [
      'runtime_root',
      'import: "@elastic/isomer-runtime" (@elastic/isomer-runtime: the runtime root, which reaches react-dom/server)',
    ],
    ['message_channel', 'global: MessageChannel'],
    ['message_channel_typeof', 'global: MessageChannel'],
    ['structured_clone', 'global: structuredClone'],
    ['document', 'global: document'],
    ['structured_clone_destructure', 'global: structuredClone'],
    ['structured_clone_alias', 'global: structuredClone'],
    ['structured_clone_computed', 'global: structuredClone'],
    ['structured_clone_assignment', 'global: structuredClone'],
    ['structured_clone_global_this', 'global: structuredClone'],
    ['top_level_await', 'syntax: top-level await'],
    ['import_meta', 'syntax: import.meta'],
  ])('fails on %s', async (name, expected) => {
    const result = await checkEntry(esbuild, violation(name));
    expect(summarize(result)).toEqual([expected]);
  });

  it('allows shadowed global owners and local destructuring', async () => {
    const result = await checkEntry(
      esbuild,
      fixture('clean', 'destructure.ts')
    );
    expect(result.violations).toEqual([]);
  });

  it('names the module that reaches a banned import', async () => {
    const result = await checkEntry(esbuild, violation('transitive'));
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].where).toMatch(/transitive_dep\.ts$/);
  });

  it('names the module that uses a banned global', async () => {
    const result = await checkEntry(esbuild, violation('structured_clone'));
    expect(result.violations[0].where).toMatch(/structured_clone\.ts$/);
  });

  it('takes extra modules and globals from options', async () => {
    const extraBan = await checkEntry(esbuild, violation('extra_ban'), {
      bans: ['some-web-only-lib'],
    });
    expect(summarize(extraBan)).toEqual([
      'import: "some-web-only-lib/box" (some-web-only-lib: banned by --ban)',
    ]);

    const extraGlobal = await checkEntry(esbuild, violation('document'), {
      globals: ['document'],
    });
    expect(summarize(extraGlobal)).toEqual(['global: document']);
  });

  it('bans React for an entry that must not render', async () => {
    const result = await checkEntry(esbuild, violation('react'), {
      bans: ['react'],
    });
    expect(summarize(result)).toEqual([
      'import: "react" (react: banned by --ban)',
    ]);
  });

  it('allows a banned global in modules named by allowGlobalIn', async () => {
    const result = await checkEntry(
      esbuild,
      violation('message_channel_typeof'),
      {
        allowGlobalIn: ['message_channel_typeof'],
      }
    );
    expect(result.violations).toEqual([]);
  });
});

describe('bannedReason', () => {
  it('bans the runtime root but not its subpaths', () => {
    expect(bannedReason('@elastic/isomer-runtime')).toMatch(/runtime root/);
    expect(bannedReason('@elastic/isomer-runtime/testing')).toBeUndefined();
  });

  it('bans every react-dom and @elastic/charts subpath', () => {
    expect(bannedReason('react-dom/server.browser')).toMatch(/react-dom/);
    expect(bannedReason('@elastic/charts/dist/theme')).toMatch(
      /@elastic\/charts/
    );
  });

  it('leaves look-alike packages alone', () => {
    expect(bannedReason('react-dom-extra')).toBeUndefined();
    expect(bannedReason('@elastic/charts-extra')).toBeUndefined();
    expect(bannedReason('pathe')).toBeUndefined();
    expect(bannedReason('react')).toBeUndefined();
  });
});

describe('parseArgs', () => {
  it('rejects a missing value and unknown flags', () => {
    expect(() => parseArgs(['--ban'])).toThrow('--ban needs a value');
    expect(() => parseArgs(['--nope', 'a.ts'])).toThrow(
      'unknown option --nope'
    );
    expect(() => parseArgs([])).toThrow('no entries given');
  });
});

describe('CLI', () => {
  const run = (...args) =>
    spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });

  it('exits 0 for clean entries', () => {
    const { status, stdout } = run(fixture('clean', 'entry.ts'));
    expect(status).toBe(0);
    expect(stdout).toContain('Hermes import check passed: 1 entry point(s).');
  });

  it('exits 1 and lists every failing entry', () => {
    const { status, stderr } = run(
      fixture('clean', 'entry.ts'),
      violation('react_dom'),
      violation('top_level_await')
    );
    expect(status).toBe(1);
    expect(stderr).toContain('react_dom.ts');
    expect(stderr).toContain('top_level_await.ts');
  });

  it('rejects DOM globals with the default CLI configuration', () => {
    const { status, stderr } = run(violation('document'));
    expect(status).toBe(1);
    expect(stderr).toContain('global: document');
  });

  it('exits 2 on usage errors', () => {
    expect(run().status).toBe(2);
    expect(run('does/not/exist.ts').status).toBe(2);
  });
});
