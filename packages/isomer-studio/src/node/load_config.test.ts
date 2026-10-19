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
  assertSingleEui,
  assertSingleReact,
  createStudioImporter,
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
  files: Record<string, string> = {},
  version = '1.0.0'
) => {
  write(
    join(dir, 'package.json'),
    JSON.stringify({ name, version, main: 'index.js' })
  );
  write(join(dir, 'index.js'), 'module.exports = {};\n');
  Object.entries(files).forEach(([file, contents]) =>
    write(join(dir, file), contents)
  );
};

const fakeReact = (
  dir = 'node_modules/react',
  files: Record<string, string> = {},
  version = '18.3.1'
) => fakePackage(dir, 'react', files, version);

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
      `No Studio config in ${root}. Run \`npx @elastic/isomer-studio init\` to create one, or pass --config.`
    );
    expect(() => resolveConfigPath(root, 'missing.ts')).toThrow(
      `No Studio config at ${join(root, 'missing.ts')}.`
    );
  });
});

describe('loadStudioConfig', () => {
  beforeEach(() => {
    fakeReact('node_modules/react', { 'jsx-runtime.js': JSX_RUNTIME });
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

  it('imports the config and a module it names into one module graph', async () => {
    write('package.json', JSON.stringify({ name: 'consumer', type: 'module' }));
    write('tsconfig.json', '{}');
    write('src/shared.ts', 'export const shared: number = Math.random();\n');
    const fontsPath = write(
      'fonts.ts',
      "export { shared as default } from './src/shared';\n"
    );
    const configPath = write(
      'isomer-studio.config.ts',
      `import { shared } from './src/shared';

export default { title: 'Shared', runtime: { surfaces: {} }, shared };
`
    );
    const importModule = createStudioImporter(configPath);

    const config = await loadStudioConfig(configPath, { importModule });

    expect(await importModule(fontsPath)).toHaveProperty(
      'default',
      Reflect.get(config, 'shared')
    );
  });

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

describe('studio apps', () => {
  beforeEach(() => {
    fakeReact();
    fakePackage(
      'node_modules/@elastic/isomer-runtime',
      '@elastic/isomer-runtime'
    );
  });

  it('accepts valid apps', async () => {
    const configPath = write(
      'isomer-studio.config.mjs',
      `export default {
  runtime: { surfaces: {} },
  apps: [{ id: 'deck', title: 'Deck', icon: { svg: '<svg/>' }, load: () => import('./app.mjs') }],
};
`
    );
    const config = await loadStudioConfig(configPath, { loader: 'none' });
    expect(config.apps?.map(({ id }) => id)).toEqual(['deck']);
  });

  it('names every invalid app', async () => {
    const configPath = write(
      'isomer-studio.config.mjs',
      `export default {
  runtime: { surfaces: {} },
  apps: [
    { id: 'deck', title: 'Deck', load: () => null },
    { id: 'deck', title: '', load: 'app.tsx' },
    { id: 'Bad Id', title: 'Bad', load: () => null, icon: '<svg/>' },
    null,
  ],
};
`
    );
    await expect(
      loadStudioConfig(configPath, { loader: 'none' })
    ).rejects.toThrow(
      [
        `${configPath} has invalid apps:`,
        '  apps[1] ("deck"): id is used by an earlier app.',
        '  apps[1] ("deck"): title must be a non-empty string.',
        '  apps[1] ("deck"): load must be a function.',
        '  apps[2] ("Bad Id"): id must match ^[a-z][a-z0-9-]*$.',
        '  apps[2] ("Bad Id"): icon must be { svg: string }.',
        '  apps[3] must be an object.',
      ].join('\n')
    );
  });

  it('checks EUI only for a config with apps', async () => {
    fakePackage('node_modules/@elastic/eui', '@elastic/eui');
    const withoutApps = write(
      'plain.config.mjs',
      'export default { runtime: { surfaces: {} } };\n'
    );
    await expect(
      loadStudioConfig(withoutApps, { loader: 'none' })
    ).resolves.toBeDefined();

    const withApps = write(
      'apps.config.mjs',
      `export default {
  runtime: { surfaces: {} },
  apps: [{ id: 'deck', title: 'Deck', load: () => import('./app.mjs') }],
};
`
    );
    await expect(
      loadStudioConfig(withApps, { loader: 'none' })
    ).rejects.toThrow(
      `@elastic/eui\n    config: ${join(root, 'node_modules/@elastic/eui')}`
    );
  });

  it('rejects apps that are not an array', async () => {
    const configPath = write(
      'isomer-studio.config.mjs',
      'export default { runtime: { surfaces: {} }, apps: {} };\n'
    );
    await expect(
      loadStudioConfig(configPath, { loader: 'none' })
    ).rejects.toThrow('apps must be an array.');
  });
});

describe('assertSingleEui', () => {
  const studioDir = () => {
    write(
      'studio/package.json',
      JSON.stringify({
        name: '@elastic/isomer-studio',
        dependencies: { '@elastic/eui': '1.0.0', moment: '2.0.0' },
        peerDependencies: { react: '^18.2.0' },
      })
    );
    return join(root, 'studio');
  };

  it('passes when the config and the Studio share EUI and Emotion', () => {
    const studio = studioDir();
    fakePackage('node_modules/@elastic/eui', '@elastic/eui');
    fakePackage('node_modules/@emotion/react', '@emotion/react');
    expect(() =>
      assertSingleEui(write('app/isomer-studio.config.ts', ''), studio)
    ).not.toThrow();
  });

  it('names each copy that differs, and the versions to install', () => {
    const studio = studioDir();
    fakePackage('node_modules/@emotion/react', '@emotion/react');
    fakePackage('studio/node_modules/@elastic/eui', '@elastic/eui');
    fakePackage('app/node_modules/@elastic/eui', '@elastic/eui');
    const configPath = write('app/isomer-studio.config.ts', '');

    expect(() => assertSingleEui(configPath, studio)).toThrow(
      [
        'The Studio config and @elastic/isomer-studio resolve different copies of packages that Studio apps share:',
        '  @elastic/eui',
        `    config: ${join(root, 'app/node_modules/@elastic/eui')}`,
        `    studio: ${join(root, 'studio/node_modules/@elastic/eui')}`,
        "Install the Studio's versions beside the config, then deduplicate your lockfile: @elastic/eui@1.0.0, react@^18.2.0, react-dom, @emotion/react, @emotion/css, @elastic/eui-theme-borealis, @elastic/datemath, moment@2.0.0.",
      ].join('\n')
    );
  });
});

describe('assertSingleReact', () => {
  it('passes when the config and the runtime share React', () => {
    fakeReact();
    fakePackage(
      'node_modules/@elastic/isomer-runtime',
      '@elastic/isomer-runtime'
    );
    expect(() =>
      assertSingleReact(write('isomer-studio.config.ts', ''))
    ).not.toThrow();
  });

  it('names both copies when the runtime resolves its own React', () => {
    fakeReact();
    fakePackage(
      'node_modules/@elastic/isomer-runtime',
      '@elastic/isomer-runtime'
    );
    fakeReact('node_modules/@elastic/isomer-runtime/node_modules/react');
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
      `React is not installed where the Studio config is: ${configPath}. Install react@18 and react-dom@18.`
    );
  });

  it('fails when the config resolves a React other than 18', () => {
    fakeReact('node_modules/react', {}, '19.1.0');
    const configPath = write('isomer-studio.config.ts', '');
    expect(() => assertSingleReact(configPath)).toThrow(
      `Isomer Studio needs React 18, which EUI requires; ${configPath} resolves React 19.1.0.`
    );
  });
});
