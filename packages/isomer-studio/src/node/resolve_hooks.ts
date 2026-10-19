/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InitializeHook, ResolveHook } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { isStudioSpecifier, sharedResolveDir } from './project_resolution';

/** Node module hooks applying `sharedResolveDir` and the Studio fallback to every `import`. */
export interface ResolveHooksData {
  projectDir: string;
  studioDir: string;
}

let data: ResolveHooksData | undefined;

export const initialize: InitializeHook<ResolveHooksData> = (given) => {
  data = given;
};

const parentIn = (dir: string): string =>
  pathToFileURL(join(dir, 'package.json')).href;

const isNotFound = (error: unknown): boolean =>
  error instanceof Error &&
  'code' in error &&
  error.code === 'ERR_MODULE_NOT_FOUND';

export const resolve: ResolveHook = async (specifier, context, nextResolve) => {
  if (data === undefined) {
    return nextResolve(specifier, context);
  }
  const { projectDir, studioDir } = data;
  const { parentURL } = context;
  const importer = parentURL?.startsWith('file:')
    ? fileURLToPath(parentURL)
    : undefined;
  const shared = sharedResolveDir(specifier, importer, projectDir);
  if (shared !== undefined) {
    try {
      return await nextResolve(specifier, {
        ...context,
        parentURL: parentIn(shared),
      });
    } catch (error) {
      if (!isNotFound(error)) {
        throw error;
      }
    }
  }
  if (!isStudioSpecifier(specifier)) {
    return nextResolve(specifier, context);
  }
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (!isNotFound(error)) {
      throw error;
    }
    return nextResolve(specifier, {
      ...context,
      parentURL: parentIn(studioDir),
    });
  }
};
