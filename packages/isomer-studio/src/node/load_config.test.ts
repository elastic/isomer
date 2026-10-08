/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment node

import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { parseCliArgs } from '../cli/args';

import {
  assertSingleReact,
  loadStudioConfig,
  nearestTsconfig,
  resolveConfigPath,
} from './load_config';

let root: string;

const write = (path: string, contents: string) => {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, contents);
  return file;
};

const fakePackage = (
  dir: string,
  name: string,
  files: Record<string, string> = {}
) => {
  write(
    join(dir, 'package.json'),
    JSON.stringify({ name, version: '1.0.0', main: 'index.js' })
  );
  write(join(dir, 'index.js'), 'module.exports = {};\n');
  Object.entries(files).forEach(([file, contents]) =>
    write(join(dir, file), contents)
  );
};

const JSX_RUNTIME = `exports.jsx = (type, props) => ({ type, props });
exports.jsxs = exports.jsx;
exports.Fragment = 'fragment';
`;

beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'isomer-studio-load-')));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('resolveConfigPath', () => {
  it('finds a default name in the directory', () => {
    const config = write('pack/isomer-studio.config.tsx', '');
    expect(resolveConfigPath(join(root, 'pack'))).toBe(config);
  });

  it('resolves --config against --cwd', () => {
    const config = write('pack/studio/custom.config.ts', '');
    const args = parseCliArgs(
      ['check', '--cwd', 'pack', '--config', 'studio/custom.config.ts'],
      root
    );
    if (args.command === 'help') {
      throw new Error('Expected the check command.');
    }
    expect(resolveConfigPath(args.cwd, args.config)).toBe(config);
  });

  it('says what it looked for when there is no config', () => {
    expect(() => resolveConfigPath(root)).toThrow(
      `No Studio config in ${root}: pass --config, or add one of isomer-studio.config.ts, isomer-studio.config.tsx, isomer-studio.config.js.`
    );
    expect(() => resolveConfigPath(root, 'missing.ts')).toThrow(
      `No Studio config at ${join(root, 'missing.ts')}.`
    );
  });
});

describe('loadStudioConfig', () => {
  beforeEach(() => {
    fakePackage('node_modules/react', 'react', {
      'jsx-runtime.js': JSX_RUNTIME,
    });
    fakePackage(
      'node_modules/@elastic/isomer-runtime',
      '@elastic/isomer-runtime'
    );
  });

  it.each([
    ['an ES module', 'module'],
    ['a CommonJS', 'commonjs'],
  ])(
    'compiles TypeScript and JSX with the nearest tsconfig in %s project',
    async (_kind, type) => {
      write('package.json', JSON.stringify({ name: 'consumer', type }));
      write(
        'tsconfig.json',
        JSON.stringify({ compilerOptions: { jsx: 'react-jsx' } })
      );
      write(
        'src/badge.tsx',
        'export const badge: { type: unknown } = <strong>Fixture</strong>;\n'
      );
      const configPath = write(
        'isomer-studio.config.ts',
        `import { badge } from './src/badge';

interface Config {
  title: string;
  runtime: { surfaces: Record<string, unknown> };
}

const config: Config = { title: String(badge.type), runtime: { surfaces: {} } };
export default config;
`
      );

      const config = await loadStudioConfig(configPath);

      expect(config.title).toBe('strong');
      expect(nearestTsconfig(configPath)).toBe(join(root, 'tsconfig.json'));
    }
  );

  it('imports a JavaScript config with no loader, unwrapping a CommonJS default', async () => {
    const configPath = write(
      'isomer-studio.config.cjs',
      'exports.default = { title: "CommonJS", runtime: { surfaces: {} } };\n'
    );
    const config = await loadStudioConfig(configPath, { loader: 'none' });
    expect(config.title).toBe('CommonJS');
  });

  it('rejects a default export that is not a Studio config', async () => {
    const configPath = write(
      'isomer-studio.config.mjs',
      'export default { title: "No runtime" };\n'
    );
    await expect(
      loadStudioConfig(configPath, { loader: 'none' })
    ).rejects.toThrow(
      `${configPath} must default-export defineStudioConfig({ runtime, ... }).`
    );
  });
});

describe('assertSingleReact', () => {
  it('passes when the config and the runtime share React', () => {
    fakePackage('node_modules/react', 'react');
    fakePackage(
      'node_modules/@elastic/isomer-runtime',
      '@elastic/isomer-runtime'
    );
    expect(() =>
      assertSingleReact(write('isomer-studio.config.ts', ''))
    ).not.toThrow();
  });

  it('names both copies when the runtime resolves its own React', () => {
    fakePackage('node_modules/react', 'react');
    fakePackage(
      'node_modules/@elastic/isomer-runtime',
      '@elastic/isomer-runtime'
    );
    fakePackage(
      'node_modules/@elastic/isomer-runtime/node_modules/react',
      'react'
    );
    const configPath = write('isomer-studio.config.ts', '');

    expect(() => assertSingleReact(configPath)).toThrow(
      [
        'The Studio config and @elastic/isomer-runtime resolve different copies of React:',
        `  config:  ${join(root, 'node_modules/react')}`,
        `  runtime: ${join(root, 'node_modules/@elastic/isomer-runtime/node_modules/react')}`,
        'Install one React for both, for example by deduplicating your lockfile.',
      ].join('\n')
    );
  });

  it('fails when React is not installed beside the config', () => {
    const configPath = write('isomer-studio.config.ts', '');
    expect(() => assertSingleReact(configPath)).toThrow(
      `React is not installed where the Studio config is: ${configPath}.`
    );
  });
});
