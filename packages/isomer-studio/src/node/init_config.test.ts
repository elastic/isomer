/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment node

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import {
  initConfigSource,
  isPrimitivePack,
  packEntry,
  packImports,
  writeInitConfig,
} from './init_config';
import { loadStudioConfig } from './load_config';

let root: string;

const write = (path: string, contents: string) => {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, contents);
  return file;
};

const PACK = (id: string) =>
  `{ id: '${id}', primitives: [], types: new Set() }`;

/** A CommonJS package, so a config `tsx` loads with `require` reaches it the same way. */
const fakeModule = (name: string, source: string) => {
  write(
    `node_modules/${name}/package.json`,
    JSON.stringify({ name, main: 'index.js' })
  );
  write(`node_modules/${name}/index.js`, source);
};

/** A project with React 18, a runtime whose result lists the packs it was given, and `defineStudioConfig`. */
const project = (manifest: Record<string, unknown> = {}) => {
  write('package.json', JSON.stringify({ name: 'my-pack', ...manifest }));
  fakeModule('react', 'module.exports = {};\n');
  write(
    'node_modules/react/package.json',
    JSON.stringify({ name: 'react', version: '18.3.1', main: 'index.js' })
  );
  fakeModule(
    '@elastic/isomer-runtime',
    'exports.createIsomerRuntime = ({ packs }) => ({ surfaces: {}, primitives: [], packs: packs.map(({ id }) => id) });\n'
  );
  fakeModule(
    '@elastic/isomer-studio',
    'exports.defineStudioConfig = (config) => config;\n'
  );
};

const roots: string[] = [];

beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'isomer-studio-init-')));
  roots.push(root);
});

// `tsx` registers its CommonJS hook once per process, holding the first project's tsconfig, so each project outlives its test.
afterAll(() => {
  roots.forEach((dir) => rmSync(dir, { recursive: true, force: true }));
});

describe('packEntry', () => {
  it('prefers the source index over the manifest entry', () => {
    project({ main: 'dist/index.js' });
    write('dist/index.js', '');
    const source = write('src/index.ts', '');
    expect(packEntry(root)).toBe(source);
  });

  it('takes a JavaScript index', () => {
    project();
    const source = write('index.js', '');
    expect(packEntry(root)).toBe(source);
  });

  it('falls back to the root export, then module, then main', () => {
    project({
      exports: { '.': { import: './dist/index.mjs' } },
      main: 'dist/index.cjs',
    });
    const main = write('dist/index.cjs', '');
    expect(packEntry(root)).toBe(main);
    const rootExport = write('dist/index.mjs', '');
    expect(packEntry(root)).toBe(rootExport);
  });

  it('says what it looked for', () => {
    project();
    expect(() => packEntry(root)).toThrow(
      `No pack entry in ${root}: add src/index.ts, or point package.json "main" at the module that exports the pack.`
    );
  });

  it('needs a package.json', () => {
    expect(() => packEntry(root)).toThrow(`No package.json in ${root}`);
  });
});

describe('isPrimitivePack', () => {
  it('recognizes what definePrimitivePack returns', () => {
    expect(isPrimitivePack({ id: 'a', primitives: [], types: new Set() })).toBe(
      true
    );
    expect(isPrimitivePack({ id: 'a', primitives: [] })).toBe(false);
    expect(isPrimitivePack(null)).toBe(false);
  });
});

describe('packImports', () => {
  const pack = { id: 'a', primitives: [], types: new Set() };

  it('lists named packs and a default pack', () => {
    expect(packImports({ a: pack, b: 1, default: pack })).toEqual({
      named: ['a'],
      isDefault: true,
      onDefault: [],
    });
  });

  it('reads a default object only when nothing else is a pack', () => {
    expect(packImports({ default: { a: pack, b: 1 } })).toEqual({
      named: [],
      isDefault: false,
      onDefault: ['a'],
    });
  });
});

describe('initConfigSource', () => {
  it('imports named and default packs', () => {
    expect(
      initConfigSource({
        entry: './src/index',
        imports: { named: ['a', 'b'], isDefault: true, onDefault: [] },
        title: "Ann's pack",
      })
    ).toBe(
      [
        "import { createIsomerRuntime } from '@elastic/isomer-runtime';",
        "import { defineStudioConfig } from '@elastic/isomer-studio';",
        '',
        "import pack, { a, b } from './src/index';",
        '',
        'export default defineStudioConfig({',
        "  title: 'Ann\\'s pack',",
        '  runtime: createIsomerRuntime({ packs: [pack, a, b] }),',
        '});',
        '',
      ].join('\n')
    );
  });

  it('reads packs off a default object', () => {
    expect(
      initConfigSource({
        entry: './index',
        imports: { named: [], isDefault: false, onDefault: ['a'] },
      })
    ).toContain(
      "import entry from './index';\n\nexport default defineStudioConfig({\n  runtime: createIsomerRuntime({ packs: [entry.a] }),"
    );
  });
});

describe('writeInitConfig', () => {
  it.each([
    ['an ES module', 'module'],
    ['a CommonJS', 'commonjs'],
  ])(
    'writes isomer-studio.config.ts beside a tsconfig.json in %s project',
    async (_kind, type) => {
      project({ type });
      write('tsconfig.json', '{}');
      write('src/index.tsx', `export const mine = ${PACK('mine')};\n`);

      const configPath = await writeInitConfig(root);
      expect(configPath).toBe(join(root, 'isomer-studio.config.ts'));
      expect(readFileSync(configPath, 'utf8')).toContain(
        "import { mine } from './src/index';"
      );
      const config = await loadStudioConfig(configPath);
      expect(config).toMatchObject({
        title: 'my-pack',
        runtime: { packs: ['mine'] },
      });
    }
  );

  it.each([
    ['an ES module', 'module'],
    ['a CommonJS', 'commonjs'],
  ])(
    'writes isomer-studio.config.js without one in %s project',
    async (_kind, type) => {
      project({ type });
      write(
        'index.js',
        type === 'module'
          ? `export const mine = ${PACK('mine')};\n`
          : `exports.mine = ${PACK('mine')};\n`
      );

      const configPath = await writeInitConfig(root);
      expect(configPath).toBe(join(root, 'isomer-studio.config.js'));
      expect(readFileSync(configPath, 'utf8')).toContain(
        "import { mine } from './index.js';"
      );
      const config = await loadStudioConfig(configPath);
      expect(config.runtime).toMatchObject({ packs: ['mine'] });
    }
  );

  it('refuses to replace a config or write one for no pack', async () => {
    project({ type: 'module' });
    write('src/index.ts', 'export const nothing = 1;\n');
    await expect(writeInitConfig(root)).rejects.toThrow(
      './src/index.ts exports no primitive pack.'
    );
    expect(existsSync(join(root, 'isomer-studio.config.js'))).toBe(false);
    const existing = write('isomer-studio.config.ts', '');
    await expect(writeInitConfig(root)).rejects.toThrow(
      `${existing} already exists.`
    );
  });
});
