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

import { loadStudioConfig } from './load_config';
import {
  GENERATED_CONFIG_DIR,
  initConfigSource,
  isPrimitivePack,
  packEntry,
  packImports,
  writeGeneratedConfig,
  writeInitConfig,
} from './zero_config';

let root: string;

const write = (path: string, contents: string) => {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, contents);
  return file;
};

const PACK = (id: string) =>
  `{ id: '${id}', primitives: [], types: new Set() }`;

/** A project with React 18 and a runtime whose surfaces list the packs it was given. */
const project = (manifest: Record<string, unknown> = {}) => {
  write('package.json', JSON.stringify({ name: 'my-pack', ...manifest }));
  write(
    'node_modules/react/package.json',
    JSON.stringify({ name: 'react', version: '18.3.1', main: 'index.js' })
  );
  write('node_modules/react/index.js', 'module.exports = {};\n');
  write(
    'node_modules/@elastic/isomer-runtime/package.json',
    JSON.stringify({
      name: '@elastic/isomer-runtime',
      type: 'module',
      exports: './index.js',
    })
  );
  write(
    'node_modules/@elastic/isomer-runtime/index.js',
    'export const createIsomerRuntime = ({ packs }) => ({ surfaces: {}, primitives: [], packs: packs.map(({ id }) => id) });\n'
  );
};

beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'isomer-studio-zero-')));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('packEntry', () => {
  it('prefers the source index over the manifest entry', () => {
    project({ main: 'dist/index.js' });
    write('dist/index.js', '');
    const source = write('src/index.ts', '');
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
      `No pack entry in ${root}: add src/index.tsx or src/index.ts, or pass --config.`
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

describe('writeGeneratedConfig', () => {
  it('registers every pack the entry exports, once, under the package name', async () => {
    project({ type: 'module' });
    write(
      'src/index.ts',
      [
        `export const first = ${PACK('first')};`,
        'export const again = first;',
        `export default ${PACK('second')};`,
        'export const notAPack = { id: "x" };',
        '',
      ].join('\n')
    );

    const { configPath, entry } = writeGeneratedConfig(root);
    expect(entry).toBe('./src/index.ts');
    expect(configPath).toBe(
      join(root, GENERATED_CONFIG_DIR, 'isomer-studio.config.mts')
    );
    expect(
      readFileSync(join(root, GENERATED_CONFIG_DIR, '.gitignore'), 'utf8')
    ).toBe('*\n');

    const config = await loadStudioConfig(configPath);
    expect(config.title).toBe('my-pack');
    expect(config.runtime).toMatchObject({ packs: ['first', 'second'] });
  });

  it('reads packs off a CommonJS default export', async () => {
    project();
    write('index.ts', `module.exports = { cjs: ${PACK('cjs')} };\n`);
    const config = await loadStudioConfig(
      writeGeneratedConfig(root).configPath
    );
    expect(config.runtime).toMatchObject({ packs: ['cjs'] });
  });

  it('names the entry when it exports no pack', async () => {
    project({ type: 'module' });
    write('src/index.ts', 'export const nothing = 1;\n');
    await expect(
      loadStudioConfig(writeGeneratedConfig(root).configPath)
    ).rejects.toThrow('./src/index.ts exports no primitive pack.');
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
  it('writes isomer-studio.config.ts for an ES module project, and loads', async () => {
    project({ type: 'module' });
    write(
      'node_modules/@elastic/isomer-studio/package.json',
      JSON.stringify({
        name: '@elastic/isomer-studio',
        type: 'module',
        exports: './index.js',
      })
    );
    write(
      'node_modules/@elastic/isomer-studio/index.js',
      'export const defineStudioConfig = (config) => config;\n'
    );
    write('src/index.tsx', `export const mine = ${PACK('mine')};\n`);

    const configPath = await writeInitConfig(root);
    expect(configPath).toBe(join(root, 'isomer-studio.config.ts'));
    expect(readFileSync(configPath, 'utf8')).toContain(
      "import { mine } from './src/index';"
    );
    const config = await loadStudioConfig(configPath);
    expect(config.runtime).toMatchObject({ packs: ['mine'] });
  });

  it('writes .mts for a CommonJS project', async () => {
    project();
    write('src/index.ts', `export const mine = ${PACK('mine')};\n`);
    expect(await writeInitConfig(root)).toBe(
      join(root, 'isomer-studio.config.mts')
    );
  });

  it('refuses to replace a config or write one for no pack', async () => {
    project({ type: 'module' });
    write('src/index.ts', 'export const nothing = 1;\n');
    await expect(writeInitConfig(root)).rejects.toThrow(
      './src/index.ts exports no primitive pack.'
    );
    expect(existsSync(join(root, 'isomer-studio.config.ts'))).toBe(false);
    const existing = write('isomer-studio.config.js', '');
    await expect(writeInitConfig(root)).rejects.toThrow(
      `${existing} already exists.`
    );
  });
});
