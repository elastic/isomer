/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  linkDirectory,
  requireEntries,
  requireWithoutPeers,
} from './packed_require.js';

const writePackage = (dir, manifest, files) => {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify(manifest));
  for (const [file, contents] of Object.entries(files)) {
    writeFileSync(join(dir, file), contents);
  }
};

describe('requireWithoutPeers', () => {
  let root;
  let pkg;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'isomer-packed-require-'));
    const manifest = {
      name: 'fixture-pack',
      exports: { '.': './index.js', './peer': './peer.js' },
      dependencies: { 'fixture-dep': '1.0.0' },
      peerDependencies: { 'fixture-peer': '1.0.0' },
      peerDependenciesMeta: { 'fixture-peer': { optional: true } },
    };
    pkg = { dir: join(root, 'packed', 'fixture-pack'), manifest };
    writePackage(pkg.dir, manifest, {
      'index.js': "require('fixture-dep');\n",
      'peer.js': "require('fixture-peer');\n",
    });
    for (const name of ['fixture-dep', 'fixture-peer']) {
      const dir = join(root, 'installed', name);
      writePackage(dir, { name, main: 'index.js' }, { 'index.js': '' });
      // Linking the optional peer reproduces another package's required-peer propagation.
      linkDirectory(dir, join(pkg.dir, 'node_modules', name));
    }
    linkDirectory(
      pkg.dir,
      join(root, 'consumer', 'node_modules', 'fixture-pack')
    );
  });

  afterEach(() => {
    rmSync(root, { force: true, recursive: true });
  });

  it('loads an entry that needs only dependencies', () => {
    expect(() =>
      requireWithoutPeers(
        pkg,
        ['fixture-pack'],
        new Set(['fixture-peer']),
        join(root, 'work')
      )
    ).not.toThrow();
  });

  it('fails an entry that loads an optional peer linked into the package', () => {
    expect(() =>
      requireEntries(['fixture-pack/peer'], join(root, 'consumer'))
    ).not.toThrow();
    expect(() =>
      requireWithoutPeers(
        pkg,
        ['fixture-pack/peer'],
        new Set(['fixture-peer']),
        join(root, 'work')
      )
    ).toThrow();
  });

  it('fails when an optional peer resolves above the isolated copy', () => {
    linkDirectory(
      join(root, 'installed', 'fixture-peer'),
      join(root, 'work', 'node_modules', 'fixture-peer')
    );
    expect(() =>
      requireWithoutPeers(
        pkg,
        ['fixture-pack'],
        new Set(['fixture-peer']),
        join(root, 'work')
      )
    ).toThrow('optional peer "fixture-peer" resolves at');
  });
});
