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
import { pathToFileURL } from 'node:url';

import {
  installDirectory,
  isSharedSpecifier,
  isStudioSpecifier,
  packageNameOf,
  projectDirectory,
  sharedResolveDir,
} from './project_resolution';
import {
  initialize,
  parentsFor,
  requireBuildFor,
  resolve,
  resolveSync,
} from './resolve_hooks';

const PROJECT = '/work/pack';

describe('packageNameOf', () => {
  it.each([
    ['react', 'react'],
    ['react-dom/server', 'react-dom'],
    ['@elastic/isomer-sdk/markdown', '@elastic/isomer-sdk'],
    ['./local', undefined],
    ['/abs/path.js', undefined],
    ['node:fs', undefined],
    ['virtual:isomer-studio/app', undefined],
  ])('names the package of %s', (specifier, name) => {
    expect(packageNameOf(specifier)).toBe(name);
  });
});

describe('specifier classes', () => {
  it('tells shared packages from the ones the Studio provides', () => {
    expect(isSharedSpecifier('react/jsx-runtime')).toBe(true);
    expect(isSharedSpecifier('@elastic/isomer-sdk/html')).toBe(true);
    expect(isSharedSpecifier('react-is')).toBe(false);
    expect(isStudioSpecifier('@elastic/isomer-runtime')).toBe(true);
    expect(isStudioSpecifier('@elastic/isomer-studio')).toBe(true);
    expect(isStudioSpecifier('@elastic/isomer-sdk')).toBe(false);
  });
});

describe('sharedResolveDir', () => {
  it('sends a shared package imported from outside the project to the project', () => {
    expect(
      sharedResolveDir('react', '/cache/node_modules/runtime/x.js', PROJECT)
    ).toBe(PROJECT);
  });

  it('leaves imports from inside the project, other packages, and virtual importers alone', () => {
    expect(
      sharedResolveDir('react', `${PROJECT}/node_modules/x/y.js`, PROJECT)
    ).toBeUndefined();
    expect(
      sharedResolveDir('moment', '/cache/node_modules/eui/x.js', PROJECT)
    ).toBeUndefined();
    expect(
      sharedResolveDir('react', '\0virtual:isomer-studio/app', PROJECT)
    ).toBeUndefined();
    expect(sharedResolveDir('react', undefined, PROJECT)).toBeUndefined();
  });
});

describe('directories', () => {
  let root: string;

  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'isomer-studio-project-')));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('finds the nearest package.json above a path', () => {
    mkdirSync(join(root, 'pack/.isomer-studio'), { recursive: true });
    writeFileSync(join(root, 'pack/package.json'), '{}');
    expect(projectDirectory(join(root, 'pack/.isomer-studio/config.mts'))).toBe(
      join(root, 'pack')
    );
  });

  it('takes the node_modules the Studio is installed in, or the Studio itself', () => {
    const studio = join(root, 'cache/node_modules/@elastic/isomer-studio');
    mkdirSync(studio, { recursive: true });
    expect(installDirectory(studio)).toBe(join(root, 'cache/node_modules'));
    mkdirSync(join(root, 'repo/packages/isomer-studio'), { recursive: true });
    expect(installDirectory(join(root, 'repo/packages/isomer-studio'))).toBe(
      join(root, 'repo/packages/isomer-studio')
    );
  });
});

describe('resolve hooks', () => {
  const STUDIO = '/cache/node_modules/@elastic/isomer-studio';
  const data = { projectDir: PROJECT, studioDir: STUDIO };
  const parent = (dir: string) => pathToFileURL(join(dir, 'package.json')).href;
  const notFound = (code: string) =>
    Object.assign(new Error('missing'), { code });

  beforeAll(() => {
    void initialize?.(data);
  });

  /** The `parentURL` of each resolution `hook` asks for, where `found` says which parents have the package. */
  const asked = async (
    hook: 'sync' | 'async',
    specifier: string,
    importer: string,
    found: (parentURL: string | undefined) => boolean
  ) => {
    const parents: (string | undefined)[] = [];
    const next =
      (code: string) =>
      (_specifier: string, context?: { parentURL?: string | undefined }) => {
        parents.push(context?.parentURL);
        if (!found(context?.parentURL)) {
          throw notFound(code);
        }
        return { url: String(context?.parentURL) };
      };
    const context = {
      conditions: [],
      importAttributes: {},
      parentURL: importer,
    };
    if (hook === 'sync') {
      resolveSync(data)(specifier, context, next('MODULE_NOT_FOUND'));
    } else {
      await resolve(specifier, context, next('ERR_MODULE_NOT_FOUND'));
    }
    return parents;
  };

  describe.each(['sync', 'async'] as const)('%s', (hook) => {
    it('resolves a shared package imported from the Studio as the project does', async () => {
      const importer = pathToFileURL(`${STUDIO}/lib/cjs/node/check.js`).href;
      expect(await asked(hook, 'react', importer, () => true)).toEqual([
        parent(PROJECT),
      ]);
    });

    it('falls back to the Studio for its own packages the project lacks', async () => {
      const importer = pathToFileURL(`${PROJECT}/isomer-studio.config.ts`).href;
      expect(
        await asked(
          hook,
          '@elastic/isomer-runtime',
          importer,
          (url) => url !== importer
        )
      ).toEqual([importer, parent(STUDIO)]);
    });

    it('prefers the project for the packages the Studio provides', async () => {
      const importer = pathToFileURL(`${PROJECT}/isomer-studio.config.ts`).href;
      expect(
        await asked(hook, '@elastic/isomer-runtime', importer, () => true)
      ).toEqual([importer]);
    });
  });

  it('resolves a require from the Studio itself, since require ignores parentURL', () => {
    const root = realpathSync(
      mkdtempSync(join(tmpdir(), 'isomer-studio-req-'))
    );
    try {
      const studioDir = join(root, 'cache/node_modules/@elastic/isomer-studio');
      const runtimeDir = join(
        root,
        'cache/node_modules/@elastic/isomer-runtime'
      );
      mkdirSync(join(studioDir, 'lib/cjs'), { recursive: true });
      mkdirSync(runtimeDir, { recursive: true });
      writeFileSync(
        join(studioDir, 'package.json'),
        JSON.stringify({
          name: '@elastic/isomer-studio',
          exports: { '.': { require: './lib/cjs/index.js' } },
        })
      );
      writeFileSync(join(studioDir, 'lib/cjs/index.js'), '');
      writeFileSync(
        join(runtimeDir, 'package.json'),
        JSON.stringify({ name: '@elastic/isomer-runtime', main: 'index.js' })
      );
      writeFileSync(join(runtimeDir, 'index.js'), '');
      const hook = resolveSync({ projectDir: join(root, 'pack'), studioDir });
      const context = {
        conditions: ['require', 'node'],
        importAttributes: {},
        parentURL: pathToFileURL(join(root, 'pack/isomer-studio.config.ts'))
          .href,
      };
      const missing = () => {
        throw notFound('MODULE_NOT_FOUND');
      };

      expect(hook('@elastic/isomer-runtime', context, missing)).toEqual({
        url: pathToFileURL(join(runtimeDir, 'index.js')).href,
        shortCircuit: true,
      });
      expect(hook('@elastic/isomer-studio', context, missing)).toEqual({
        url: pathToFileURL(join(studioDir, 'lib/cjs/index.js')).href,
        shortCircuit: true,
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('takes the CommonJS build for an import that lands on ESM built for bundlers, and leaves CommonJS, ESM Node runs, and single-entry ESM alone', () => {
    const root = realpathSync(
      mkdtempSync(join(tmpdir(), 'isomer-studio-esm-'))
    );
    try {
      const write = (path: string, text: string) => {
        mkdirSync(dirname(join(root, path)), { recursive: true });
        writeFileSync(join(root, path), text);
      };
      const exportsMap = {
        '.': {
          import: './lib/esm/index.js',
          require: './lib/cjs/index.js',
        },
      };
      write(
        'node_modules/bundled/package.json',
        JSON.stringify({ name: 'bundled', exports: exportsMap })
      );
      write(
        'node_modules/native/package.json',
        JSON.stringify({ name: 'native', type: 'module', exports: exportsMap })
      );
      for (const name of ['dual', 'multiline', 'runnable']) {
        write(
          `node_modules/${name}/package.json`,
          JSON.stringify({ name, exports: exportsMap })
        );
      }
      write(
        'node_modules/multiline/lib/esm/index.js',
        "import './setup.js';\nexport {\n  value,\n} from '../shared';\n"
      );
      write(
        'node_modules/runnable/lib/esm/index.js',
        "import './setup.js';\nexport { value } from './value.js';\n"
      );
      for (const name of ['multiline', 'runnable']) {
        write(`node_modules/${name}/lib/cjs/index.js`, '');
      }
      for (const name of ['bundled', 'native']) {
        write(
          `node_modules/${name}/lib/esm/index.js`,
          "export { value } from './value';\n"
        );
        write(`node_modules/${name}/lib/cjs/index.js`, '');
      }
      write(
        'node_modules/single/package.json',
        JSON.stringify({ name: 'single', exports: { '.': './index.js' } })
      );
      write(
        'node_modules/single/index.js',
        "export { value } from './value.js';\n"
      );
      write(
        'node_modules/dual/lib/esm/index.js',
        "module.exports = { flavor: 'import', load: () => import('./x') };\n"
      );
      write(
        'node_modules/dual/lib/cjs/index.js',
        "module.exports = { flavor: 'require' };\n"
      );
      const landed = (name: string) => ({
        url: pathToFileURL(join(root, 'node_modules', name, 'lib/esm/index.js'))
          .href,
      });

      expect(requireBuildFor('bundled', landed('bundled'))).toEqual({
        url: pathToFileURL(join(root, 'node_modules/bundled/lib/cjs/index.js'))
          .href,
        format: 'commonjs',
        shortCircuit: true,
      });
      expect(requireBuildFor('multiline', landed('multiline'))).toEqual({
        url: pathToFileURL(
          join(root, 'node_modules/multiline/lib/cjs/index.js')
        ).href,
        format: 'commonjs',
        shortCircuit: true,
      });
      expect(requireBuildFor('native', landed('native'))).toEqual(
        landed('native')
      );
      expect(requireBuildFor('runnable', landed('runnable'))).toEqual(
        landed('runnable')
      );
      expect(requireBuildFor('./index.js', landed('bundled'))).toEqual(
        landed('bundled')
      );
      expect(requireBuildFor('dual', landed('dual'))).toEqual(landed('dual'));
      const single = {
        url: pathToFileURL(join(root, 'node_modules/single/index.js')).href,
      };
      expect(requireBuildFor('single', single)).toEqual(single);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('lists the parents to try in order', () => {
    const importer = pathToFileURL(`${STUDIO}/lib/cjs/index.js`).href;
    expect(parentsFor('zod', importer, data)).toEqual([
      parent(PROJECT),
      importer,
    ]);
    expect(parentsFor('moment', importer, data)).toEqual([importer]);
  });
});
