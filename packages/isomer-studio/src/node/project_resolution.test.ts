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
import { initialize, resolve } from './resolve_hooks';

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

describe('resolve hook', () => {
  const STUDIO = '/cache/node_modules/@elastic/isomer-studio';
  const parent = (dir: string) => pathToFileURL(join(dir, 'package.json')).href;
  const notFound = () =>
    Object.assign(new Error('missing'), { code: 'ERR_MODULE_NOT_FOUND' });

  beforeAll(() => {
    void initialize?.({ projectDir: PROJECT, studioDir: STUDIO });
  });

  /** The `parentURL` of each resolution the hook asks for. */
  const run = async (
    specifier: string,
    importer: string,
    found: (parentURL: string | undefined) => boolean
  ) => {
    const parents: (string | undefined)[] = [];
    await resolve(
      specifier,
      { conditions: [], importAttributes: {}, parentURL: importer },
      (next, context) => {
        parents.push(context?.parentURL);
        if (!found(context?.parentURL)) {
          throw notFound();
        }
        return { url: `${String(context?.parentURL)}#${next}` };
      }
    );
    return { parents };
  };

  it('resolves a shared package imported from the Studio as the project does', async () => {
    const importer = pathToFileURL(`${STUDIO}/dist/node/check.js`).href;
    const { parents } = await run('react', importer, () => true);
    expect(parents).toEqual([parent(PROJECT)]);
  });

  it('falls back to the Studio for its own packages the project lacks', async () => {
    const importer = pathToFileURL(`${PROJECT}/.isomer-studio/c.mts`).href;
    const { parents } = await run(
      '@elastic/isomer-runtime',
      importer,
      (url) => url !== importer
    );
    expect(parents).toEqual([importer, parent(STUDIO)]);
  });

  it('prefers the project for the packages the Studio provides', async () => {
    const importer = pathToFileURL(`${PROJECT}/isomer-studio.config.ts`).href;
    const { parents } = await run(
      '@elastic/isomer-runtime',
      importer,
      () => true
    );
    expect(parents).toEqual([importer]);
  });
});
