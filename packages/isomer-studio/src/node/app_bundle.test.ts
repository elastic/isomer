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
import { dirname, join, relative, sep } from 'node:path';

import { build } from 'esbuild';

import {
  appBuildOptions,
  appEntry,
  appStylesheets,
  reactDirectories,
  reactFromConfig,
} from './app_bundle';

let root: string;

const write = (path: string, contents: string) => {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, contents);
  return file;
};

/** A package that marks each of its files with `name`, so the bundle shows which copy it took. */
const fakeReact = (dir: string, name: string, files: readonly string[]) => {
  write(
    join(dir, 'package.json'),
    JSON.stringify({
      name,
      version: '1.0.0',
      main: 'index.js',
      browser: { './server.js': './server.browser.js' },
    })
  );
  ['index.js', ...files].forEach((file) =>
    write(
      join(dir, file),
      `export const from = ${JSON.stringify(join(dir, file))};\n`
    )
  );
};

beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'isomer-studio-bundle-')));
  fakeReact('consumer/node_modules/react', 'react', ['jsx-runtime.js']);
  fakeReact('consumer/node_modules/react-dom', 'react-dom', [
    'client.js',
    'server.js',
    'server.browser.js',
  ]);
  // A pack that ships its own React, as a mismatched peer install leaves it.
  write(
    'consumer/node_modules/pack/package.json',
    JSON.stringify({ name: 'pack', version: '1.0.0', main: 'index.js' })
  );
  write(
    'consumer/node_modules/pack/index.js',
    [
      "export { from as react } from 'react';",
      "export { from as jsx } from 'react/jsx-runtime';",
      "export { from as server } from 'react-dom/server';",
      '',
    ].join('\n')
  );
  fakeReact('consumer/node_modules/pack/node_modules/react', 'react', [
    'jsx-runtime.js',
  ]);
  fakeReact('consumer/node_modules/pack/node_modules/react-dom', 'react-dom', [
    'server.js',
    'server.browser.js',
  ]);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

const bundledInputs = async (configPath: string): Promise<string[]> => {
  const { metafile } = await build({
    stdin: {
      contents: [
        "export * from 'pack';",
        "export { from as client } from 'react-dom/client';",
        '',
      ].join('\n'),
      resolveDir: dirname(configPath),
    },
    absWorkingDir: root,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    write: false,
    metafile: true,
    logLevel: 'silent',
    plugins: [reactFromConfig(configPath)],
  });
  return Object.keys(metafile.inputs).map((input) =>
    input.split(sep).join('/')
  );
};

describe('reactFromConfig', () => {
  it("resolves every React import into the config's React, taking each package's browser build", async () => {
    const configPath = write('consumer/isomer-studio.config.ts', '');
    const inputs = await bundledInputs(configPath);
    const reactInputs = inputs.filter((input) =>
      /\/react(-dom)?\//.test(input)
    );

    expect(reactInputs.sort()).toEqual(
      [
        'consumer/node_modules/react-dom/client.js',
        'consumer/node_modules/react-dom/server.browser.js',
        'consumer/node_modules/react/index.js',
        'consumer/node_modules/react/jsx-runtime.js',
      ].sort()
    );
    const [react, reactDom] = reactDirectories(configPath);
    expect(
      reactInputs.every((input) =>
        [react, reactDom].some(
          (directory) =>
            directory !== undefined &&
            !relative(directory, join(root, input)).startsWith('..')
        )
      )
    ).toBe(true);
  });
});

describe('appEntry', () => {
  const configPath = '/work/pack/isomer-studio.config.ts';

  it('mounts the config with the mode’s host', () => {
    expect(appEntry(configPath, 'build')).toContain(
      `import config from "${configPath}";`
    );
    expect(appEntry(configPath, 'build')).toContain(
      'mountStudio(config, staticHost(config));'
    );
    expect(appEntry(configPath, 'dev')).toContain(
      'mountStudio(config, devHost(config));'
    );
  });

  it('accepts config updates in dev only', () => {
    expect(appEntry(configPath, 'dev')).toContain(
      `import.meta.hot.accept("${configPath}", (next) => {`
    );
    expect(appEntry(configPath, 'build')).not.toContain('import.meta.hot');
  });
});

describe('appBuildOptions', () => {
  it("bundles a lazy app's module and global CSS into one stylesheet, leaving Monaco's out", async () => {
    write(
      'consumer/node_modules/monaco-editor/package.json',
      JSON.stringify({ name: 'monaco-editor', version: '1.0.0' })
    );
    write(
      'consumer/node_modules/monaco-editor/editor.css',
      '.monaco { color: blue; }\n'
    );
    write(
      'consumer/node_modules/monaco-editor/index.js',
      "import './editor.css';\nexport const monaco = true;\n"
    );
    write(
      'consumer/app.module.css',
      ['jpg', 'jpeg', 'gif', 'webp', 'avif', 'otf']
        .map(
          (extension) =>
            `.${extension} { background: url("./image.${extension}"); }`
        )
        .concat('.box { color: red; }')
        .join('\n')
    );
    for (const extension of ['jpg', 'jpeg', 'gif', 'webp', 'avif', 'otf']) {
      write(`consumer/image.${extension}`, extension);
    }
    write(
      'consumer/app.css',
      '@font-face { font-family: Fixture; src: url("./fixture.woff2"); }\n'
    );
    write('consumer/fixture.woff2', 'font');
    write(
      'consumer/app.js',
      [
        "import styles from './app.module.css';",
        "import './app.css';",
        'export default styles.box;',
        '',
      ].join('\n')
    );
    const entry = write(
      'consumer/entry.js',
      [
        "import { monaco } from 'monaco-editor';",
        "export const load = () => import('./app.js');",
        'export { monaco };',
        '',
      ].join('\n')
    );
    const configPath = write('consumer/isomer-studio.config.ts', '');

    const { metafile } = await build({
      ...appBuildOptions({ configPath, assetsDir: join(root, 'out/assets') }),
      entryPoints: { app: entry },
      absWorkingDir: root,
      minify: false,
      metafile: true,
    });
    const { bundle, chunks } = appStylesheets(metafile, 'consumer/entry.js');

    expect(bundle).toBe('out/assets/app.css');
    const css = readFileSync(join(root, 'out/assets/app.css'), 'utf8');
    expect(css).toMatch(/\.app_box\b/);
    expect(css).toMatch(/url\("\.\/media\/fixture-[A-Z0-9]+\.woff2"\)/);
    expect(css).not.toContain('.monaco');
    expect(css.match(/url\("\.\/media\/image-[A-Z0-9]+\.\w+"\)/g)).toHaveLength(
      6
    );
    expect(chunks.length).toBeGreaterThan(0);
    expect(
      chunks.every((chunk) => chunk.startsWith('out/assets/chunks/'))
    ).toBe(true);
    expect(existsSync(join(root, chunks[0] ?? ''))).toBe(true);
  });

  it('minifies for production', () => {
    expect(
      appBuildOptions({
        configPath: '/work/pack/isomer-studio.config.ts',
        assetsDir: '/out/assets',
      })
    ).toMatchObject({
      minify: true,
      define: { 'process.env.NODE_ENV': '"production"' },
    });
  });
});
