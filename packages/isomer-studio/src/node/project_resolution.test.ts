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
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  installDirectory,
  isSharedSpecifier,
  isStudioSpecifier,
  packageNameOf,
  projectDirectory,
  sharedResolveDir,
} from './project_resolution';
import { initialize, parentsFor, resolve, resolveSync } from './resolve_hooks';

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
      const importer = pathToFileURL(`${STUDIO}/dist/node/check.js`).href;
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
      mkdirSync(join(studioDir, 'dist'), { recursive: true });
      mkdirSync(runtimeDir, { recursive: true });
      writeFileSync(
        join(studioDir, 'package.json'),
        JSON.stringify({ exports: { '.': { import: './dist/index.js' } } })
      );
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
      const installed = vi.fn(() => ({
        url: 'file:///pack/node_modules/x.js',
      }));
      for (const next of [missing, installed]) {
        expect(hook('@elastic/isomer-studio', context, next)).toEqual({
          url: pathToFileURL(join(studioDir, 'dist/index.js')).href,
          shortCircuit: true,
        });
      }
      expect(installed).not.toHaveBeenCalled();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('lists the parents to try in order', () => {
    const importer = pathToFileURL(`${STUDIO}/dist/index.js`).href;
    expect(parentsFor('zod', importer, data)).toEqual([
      parent(PROJECT),
      importer,
    ]);
    expect(parentsFor('moment', importer, data)).toEqual([importer]);
  });
});
