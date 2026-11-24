/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { checkDeclarations } from './packed_declarations.js';
import {
  importEntries,
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
      types: './index.d.ts',
      dependencies: { 'fixture-dep': '1.0.0' },
      peerDependencies: { 'fixture-peer': '1.0.0' },
      peerDependenciesMeta: { 'fixture-peer': { optional: true } },
    };
    pkg = { dir: join(root, 'packed', 'fixture-pack'), manifest };
    writePackage(pkg.dir, manifest, {
      'index.js': "require('fixture-dep');\n",
      'index.d.ts': 'export type Value = number;\n',
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

  it('hides a transitive packed dependency the entry does not declare', () => {
    const transitiveDir = join(root, 'installed', 'fixture-transitive');
    const transitive = {
      dir: transitiveDir,
      manifest: { name: 'fixture-transitive', main: 'index.js' },
    };
    writePackage(transitiveDir, transitive.manifest, { 'index.js': '' });
    const dependencyDir = join(root, 'installed', 'fixture-dep');
    const dependency = {
      dir: dependencyDir,
      manifest: {
        name: 'fixture-dep',
        main: 'index.js',
        dependencies: { 'fixture-transitive': '1.0.0' },
      },
    };
    writePackage(dependencyDir, dependency.manifest, {
      'index.js': "require('fixture-transitive');\n",
    });
    linkDirectory(
      transitiveDir,
      join(dependencyDir, 'node_modules', 'fixture-transitive')
    );
    writeFileSync(join(pkg.dir, 'peer.js'), "require('fixture-transitive');\n");
    const packed = new Map([
      ['fixture-dep', dependency],
      ['fixture-transitive', transitive],
    ]);
    const run = (specifier) =>
      requireWithoutPeers(
        pkg,
        [specifier],
        new Set(['fixture-peer']),
        join(root, 'work'),
        packed
      );
    expect(() => run('fixture-pack')).not.toThrow();
    expect(() => run('fixture-pack/peer')).toThrow(
      "Cannot find module 'fixture-transitive'"
    );
  });

  it('resolves declaration-only types from staged copies', () => {
    const require = createRequire(import.meta.url);
    const nodeTypes = dirname(require.resolve('@types/node/package.json'));
    const typesDir = join(root, 'installed', 'fixture-types');
    writePackage(
      typesDir,
      { name: '@types/fixture-types', types: 'index.d.ts' },
      { 'index.d.ts': 'export type Value = number;' }
    );
    writeFileSync(
      join(pkg.dir, 'index.d.ts'),
      "export type { Value } from 'fixture-types';"
    );
    const run = (workDir, typesPackages) => {
      const consumer = requireWithoutPeers(
        pkg,
        ['fixture-pack'],
        new Set(['fixture-peer']),
        join(root, workDir),
        new Map(),
        typesPackages
      );
      linkDirectory(
        nodeTypes,
        join(consumer, 'node_modules', '@types', 'node')
      );
      linkDirectory(
        typesDir,
        join(consumer, 'node_modules', '@types', 'fixture-types')
      );
      return consumer;
    };
    expect(() =>
      checkDeclarations(
        ['fixture-pack'],
        run('with', new Map([['fixture-types', typesDir]]))
      )
    ).not.toThrow();
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() =>
        checkDeclarations(['fixture-pack'], run('without', new Map()))
      ).toThrow('Packed declarations fail');
    } finally {
      errors.mockRestore();
    }
  }, 30000);

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

  it('rejects an optional peer imported through a contaminated packed dependency', () => {
    const dir = join(root, 'installed', 'fixture-dep');
    const manifest = {
      name: 'fixture-dep',
      main: 'index.js',
      peerDependencies: { 'fixture-peer': '1.0.0' },
      peerDependenciesMeta: { 'fixture-peer': { optional: true } },
    };
    writePackage(dir, manifest, { 'index.js': "require('fixture-peer');\n" });
    linkDirectory(
      join(root, 'installed', 'fixture-peer'),
      join(dir, 'node_modules', 'fixture-peer')
    );
    expect(() =>
      requireEntries(['fixture-pack'], join(root, 'consumer'))
    ).not.toThrow();
    expect(() =>
      requireWithoutPeers(
        pkg,
        ['fixture-pack'],
        new Set(['fixture-peer']),
        join(root, 'work'),
        new Map([['fixture-dep', { dir, manifest }]])
      )
    ).toThrow();
  });

  it('ignores NODE_PATH when probing and loading entries', () => {
    const run = (specifier, workDir) =>
      spawnSync(
        process.execPath,
        [
          '--input-type=module',
          '--eval',
          `
        import { requireWithoutPeers } from ${JSON.stringify(new URL('./packed_require.js', import.meta.url).href)};
        requireWithoutPeers(${JSON.stringify(pkg)}, [${JSON.stringify(specifier)}], new Set(['fixture-peer']), ${JSON.stringify(join(root, workDir))});
      `,
        ],
        {
          encoding: 'utf-8',
          env: { ...process.env, NODE_PATH: join(root, 'installed') },
        }
      );
    const valid = run('fixture-pack', 'valid');
    expect(valid.status, valid.stderr).toBe(0);
    const invalid = run('fixture-pack/peer', 'invalid');
    expect(invalid.status).not.toBe(0);
    expect(invalid.stderr).toContain("Cannot find module 'fixture-peer'");
  });

  it.each(['direct', 'dependency'])(
    'rejects a %s declaration-only optional-peer import',
    (location) => {
      const require = createRequire(import.meta.url);
      const nodeTypes = dirname(require.resolve('@types/node/package.json'));
      const dependencyDir = join(root, 'installed', 'fixture-dep');
      const dependency = {
        dir: dependencyDir,
        manifest: {
          name: 'fixture-dep',
          main: 'index.js',
          types: 'index.d.ts',
          peerDependencies: { 'fixture-peer': '1.0.0' },
          peerDependenciesMeta: { 'fixture-peer': { optional: true } },
        },
      };
      writePackage(dependencyDir, dependency.manifest, {
        'index.js': '',
        'index.d.ts': 'export type Value = number;',
      });
      writeFileSync(
        join(root, 'installed', 'fixture-peer', 'index.d.ts'),
        'export type Value = number;'
      );
      linkDirectory(
        join(root, 'installed', 'fixture-peer'),
        join(dependencyDir, 'node_modules', 'fixture-peer')
      );
      const packed = new Map([['fixture-dep', dependency]]);
      const validConsumer = requireWithoutPeers(
        pkg,
        ['fixture-pack'],
        new Set(['fixture-peer']),
        join(root, 'valid'),
        packed
      );
      linkDirectory(
        nodeTypes,
        join(validConsumer, 'node_modules', '@types', 'node')
      );
      expect(() =>
        checkDeclarations(['fixture-pack'], validConsumer)
      ).not.toThrow();
      writeFileSync(
        join(pkg.dir, 'index.d.ts'),
        location === 'direct'
          ? "export type { Value } from 'fixture-peer';"
          : "export type { Value } from 'fixture-dep';"
      );
      if (location === 'dependency') {
        writeFileSync(
          join(dependencyDir, 'index.d.ts'),
          "export type { Value } from 'fixture-peer';"
        );
      }
      const consumer = join(root, 'consumer');
      linkDirectory(
        nodeTypes,
        join(consumer, 'node_modules', '@types', 'node')
      );
      expect(() => checkDeclarations(['fixture-pack'], consumer)).not.toThrow();
      const isolatedConsumer = requireWithoutPeers(
        pkg,
        ['fixture-pack'],
        new Set(['fixture-peer']),
        join(root, 'invalid'),
        packed
      );
      linkDirectory(
        nodeTypes,
        join(isolatedConsumer, 'node_modules', '@types', 'node')
      );
      const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        expect(() =>
          checkDeclarations(['fixture-pack'], isolatedConsumer)
        ).toThrow('Packed declarations fail');
        expect(errors).toHaveBeenCalledWith(
          expect.stringContaining("Cannot find module 'fixture-peer'")
        );
      } finally {
        errors.mockRestore();
      }
    },
    30000
  );
});

describe('importEntries', () => {
  let root;
  let consumer;

  const install = (exportConditions, cjs = 'exports.value = 1;\n') => {
    writePackage(
      join(consumer, 'node_modules', 'fixture-dual'),
      { name: 'fixture-dual', exports: { '.': exportConditions } },
      {}
    );
    for (const [file, contents] of Object.entries({
      'cjs/index.js': cjs,
      'esm/index.js': "export { value } from './value';\n",
      'esm/value.js': 'export const value = 1;\n',
    })) {
      const path = join(consumer, 'node_modules', 'fixture-dual', file);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, contents);
    }
  };

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'isomer-import-entries-'));
    consumer = join(root, 'consumer');
  });

  afterEach(() => rmSync(root, { force: true, recursive: true }));

  it('fails a package whose `import` is ESM for bundlers alone', () => {
    install({ import: './esm/index.js', require: './cjs/index.js' });
    expect(() => importEntries(['fixture-dual'], consumer)).toThrow(
      /ERR_MODULE_NOT_FOUND/
    );
  });

  it('passes once a `node` condition names the CommonJS build', () => {
    install({
      node: './cjs/index.js',
      import: './esm/index.js',
      require: './cjs/index.js',
    });
    expect(() => importEntries(['fixture-dual'], consumer)).not.toThrow();
  });

  it('fails when `import()` cannot see a name `require()` exports', () => {
    install(
      { node: './cjs/index.js' },
      "const name = 'value'; module.exports[name] = 1;\n"
    );
    expect(() => importEntries(['fixture-dual'], consumer)).toThrow(
      /lacks value/
    );
  });
});
