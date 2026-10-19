/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative } from 'node:path';

/** Packages a project and the Studio must load one copy of: imported from outside the project, they resolve from it. */
export const SHARED_PACKAGES = [
  'react',
  'react-dom',
  '@elastic/isomer-sdk',
  'zod',
] as const;

/** Packages a config may import without installing: when the project lacks them, they resolve from the Studio's install. */
export const STUDIO_PACKAGES = [
  '@elastic/isomer-runtime',
  '@elastic/isomer-studio',
] as const;

/** The package a bare specifier names, or `undefined` for a relative, absolute or URL specifier. */
export const packageNameOf = (specifier: string): string | undefined => {
  if (/^[./]|^[a-z][a-z\d+.-]*:/i.test(specifier) || isAbsolute(specifier)) {
    return undefined;
  }
  const [scope = '', name] = specifier.split('/');
  return scope.startsWith('@') ? `${scope}/${name ?? ''}` : scope;
};

const names = (list: readonly string[]) => (specifier: string) => {
  const name = packageNameOf(specifier);
  return name !== undefined && list.includes(name);
};

export const isSharedSpecifier = names(SHARED_PACKAGES);

export const isStudioSpecifier = names(STUDIO_PACKAGES);

/** Whether `path` is `dir` or inside it. */
export const isInside = (dir: string, path: string): boolean => {
  const inside = relative(dir, path);
  return !inside.startsWith('..') && !isAbsolute(inside);
};

/** The real directory of the `package.json` nearest `path`, else `path`'s directory. */
export const projectDirectory = (path: string): string => {
  for (let dir = dirname(path); dirname(dir) !== dir; dir = dirname(dir)) {
    if (existsSync(join(dir, 'package.json'))) {
      return realpathSync(dir);
    }
  }
  return dirname(path);
};

/** The `node_modules` directory the Studio is installed in, which also holds what it depends on. */
export const installDirectory = (studioDir: string): string => {
  const real = realpathSync(studioDir);
  for (let dir = real; dirname(dir) !== dir; dir = dirname(dir)) {
    if (basename(dir) === 'node_modules') {
      return dir;
    }
  }
  return real;
};

/** Where a resolver should look for `specifier` first, imported from `importer`: the project for a shared package from outside it, otherwise `undefined`. */
export const sharedResolveDir = (
  specifier: string,
  importer: string | undefined,
  projectDir: string
): string | undefined =>
  importer !== undefined &&
  isAbsolute(importer) &&
  isSharedSpecifier(specifier) &&
  !isInside(projectDir, importer)
    ? projectDir
    : undefined;
