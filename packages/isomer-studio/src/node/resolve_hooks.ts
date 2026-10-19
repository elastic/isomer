/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'node:fs';
import type {
  InitializeHook,
  ResolveFnOutput,
  ResolveHook,
  ResolveHookSync,
} from 'node:module';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { isStudioSpecifier, sharedResolveDir } from './project_resolution';

/** Node module hooks applying `sharedResolveDir` and the Studio fallback to every `import` and `require`. */
export interface ResolveHooksData {
  projectDir: string;
  studioDir: string;
}

const parentIn = (dir: string): string =>
  pathToFileURL(join(dir, 'package.json')).href;

/** Where to resolve `specifier` from, in order; every parent but the last is passed over when it finds nothing. */
export const parentsFor = (
  specifier: string,
  parentURL: string | undefined,
  { projectDir, studioDir }: ResolveHooksData
): (string | undefined)[] => {
  const importer = parentURL?.startsWith('file:')
    ? fileURLToPath(parentURL)
    : undefined;
  const shared = sharedResolveDir(specifier, importer, projectDir);
  return [
    ...(shared === undefined ? [] : [parentIn(shared)]),
    parentURL,
    ...(isStudioSpecifier(specifier) ? [parentIn(studioDir)] : []),
  ];
};

/** The Studio's own `import` entry, which `require` cannot resolve from its ESM-only `exports` but can load. */
const studioEntry = (studioDir: string): string => {
  const { exports } = JSON.parse(
    readFileSync(join(studioDir, 'package.json'), 'utf8')
  ) as { exports: { '.': { import: string } } };
  return pathToFileURL(join(studioDir, exports['.'].import)).href;
};

const isNotFound = (error: unknown): boolean =>
  error instanceof Error &&
  'code' in error &&
  (error.code === 'ERR_MODULE_NOT_FOUND' || error.code === 'MODULE_NOT_FOUND');

/** For `module.registerHooks`, which also sees `require`. */
export const resolveSync =
  (data: ResolveHooksData): ResolveHookSync =>
  (specifier, context, nextResolve) => {
    const requireFrom = (parentURL: string): string =>
      specifier === '@elastic/isomer-studio' &&
      parentURL === parentIn(data.studioDir)
        ? studioEntry(data.studioDir)
        : pathToFileURL(createRequire(parentURL).resolve(specifier)).href;
    // `require` resolves from the requiring module whatever `parentURL` says, so another parent resolves here.
    const resolveFrom = (parentURL: string | undefined): ResolveFnOutput =>
      parentURL === context.parentURL ||
      parentURL === undefined ||
      !context.conditions.includes('require')
        ? nextResolve(specifier, { ...context, parentURL })
        : { url: requireFrom(parentURL), shortCircuit: true };
    const attempt = ([parentURL, ...rest]: (
      string | undefined
    )[]): ResolveFnOutput => {
      try {
        return resolveFrom(parentURL);
      } catch (error) {
        if (!rest.length || !isNotFound(error)) {
          throw error;
        }
        return attempt(rest);
      }
    };
    return attempt(parentsFor(specifier, context.parentURL, data));
  };

let data: ResolveHooksData | undefined;

/** For `module.register`, on a Node without `registerHooks`. */
export const initialize: InitializeHook<ResolveHooksData> = (given) => {
  data = given;
};

export const resolve: ResolveHook = async (specifier, context, nextResolve) => {
  if (data === undefined) {
    return nextResolve(specifier, context);
  }
  const attempt = async ([parentURL, ...rest]: (
    string | undefined
  )[]): Promise<ResolveFnOutput> => {
    try {
      return await nextResolve(specifier, { ...context, parentURL });
    } catch (error) {
      if (!rest.length || !isNotFound(error)) {
        throw error;
      }
      return attempt(rest);
    }
  };
  return attempt(parentsFor(specifier, context.parentURL, data));
};
