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
import { dirname, join, relative, sep } from 'node:path';

import { build } from 'esbuild';

import {
  appBuildOptions,
  appEntry,
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
  it('mounts the config with the mode’s host', () => {
    const configPath = '/work/pack/isomer-studio.config.ts';
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
});

describe('appBuildOptions', () => {
  it('minifies a build and maps sources in dev', () => {
    const options = {
      configPath: '/work/pack/isomer-studio.config.ts',
      assetsDir: '/out/assets',
    };
    expect(appBuildOptions({ ...options, mode: 'build' })).toMatchObject({
      minify: true,
      sourcemap: false,
      define: { 'process.env.NODE_ENV': '"production"' },
    });
    expect(appBuildOptions({ ...options, mode: 'dev' })).toMatchObject({
      minify: false,
      sourcemap: 'linked',
      define: { 'process.env.NODE_ENV': '"development"' },
    });
  });
});
