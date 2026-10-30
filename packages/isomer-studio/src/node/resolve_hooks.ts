/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, readFileSync } from 'node:fs';
import type {
  InitializeHook,
  ResolveFnOutput,
  ResolveHook,
  ResolveHookSync,
} from 'node:module';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { moduleUrl } from './node_module.cjs';
import {
  isStudioSpecifier,
  packageNameOf,
  sharedResolveDir,
} from './project_resolution';

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

/** The `type` of the `package.json` nearest `file`. */
const packageTypeOf = (file: string): unknown => {
  for (let dir = dirname(file); dirname(dir) !== dir; dir = dirname(dir)) {
    const manifest = join(dir, 'package.json');
    if (existsSync(manifest)) {
      return (JSON.parse(readFileSync(manifest, 'utf8')) as { type?: unknown })
        .type;
    }
  }
  return undefined;
};

/** The relative specifier of each statement-leading `import` or `export … from`; `import(` and CommonJS never match. Quotes are `\x22` and `\x27`, which `scripts/specifiers.js` reads past. */
const RELATIVE_SPECIFIERS =
  /^\s*(?:import|export)\b[^\x22\x27]*?[\x22\x27](\.{1,2}\/[^\x22\x27]*)[\x22\x27]/gm;

const NODE_EXTENSION = /\.(?:[cm]?js|json|node)$/;

/** Whether `source` imports a sibling without its extension, which Node's ESM resolver never resolves and a bundler does. */
const importsWithoutExtension = (source: string): boolean =>
  [...source.matchAll(RELATIVE_SPECIFIERS)].some(
    ([, specifier]) => !NODE_EXTENSION.test(specifier ?? '')
  );

/**
 * Node cannot run an ESM build made for bundlers, whose `.js` files sit in a package without `"type": "module"` and import each other without extensions.
 * A bare `import` that lands on one takes the package's distinct `require` build instead, as a `require` from the same file would; CommonJS, and ESM that Node can run, stay where Node resolved them.
 */
export const requireBuildFor = (
  specifier: string,
  resolved: ResolveFnOutput
): ResolveFnOutput => {
  const { url } = resolved;
  if (
    packageNameOf(specifier) === undefined ||
    !url.startsWith('file:') ||
    !url.endsWith('.js') ||
    packageTypeOf(fileURLToPath(url)) === 'module' ||
    !importsWithoutExtension(readFileSync(fileURLToPath(url), 'utf8'))
  ) {
    return resolved;
  }
  try {
    const required = pathToFileURL(createRequire(url).resolve(specifier)).href;
    // One entry for both conditions has no CommonJS build to take, so Node loads it as it is.
    return required === url
      ? resolved
      : { url: required, format: 'commonjs', shortCircuit: true };
  } catch {
    return resolved;
  }
};

const isNotFound = (error: unknown): boolean =>
  error instanceof Error &&
  'code' in error &&
  (error.code === 'ERR_MODULE_NOT_FOUND' || error.code === 'MODULE_NOT_FOUND');

/** For `module.registerHooks`, which also sees `require`. */
export const resolveSync =
  (data: ResolveHooksData): ResolveHookSync =>
  (specifier, context, nextResolve) => {
    const isRequire = context.conditions.includes('require');
    // `require` resolves from the requiring module whatever `parentURL` says, so another parent resolves here.
    const resolveFrom = (parentURL: string | undefined): ResolveFnOutput =>
      parentURL === context.parentURL || parentURL === undefined || !isRequire
        ? nextResolve(specifier, { ...context, parentURL })
        : {
            url: pathToFileURL(createRequire(parentURL).resolve(specifier))
              .href,
            shortCircuit: true,
          };
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
    const resolved = attempt(parentsFor(specifier, context.parentURL, data));
    return isRequire ? resolved : requireBuildFor(specifier, resolved);
  };

/** Node's CommonJS resolver, which `module.register` hooks never see. */
interface CommonJsLoader {
  _resolveFilename: (
    this: unknown,
    request: string,
    parent: { filename?: string | null } | undefined,
    ...rest: unknown[]
  ) => string;
}

/** Applies {@link resolveSync} to `require` on a Node without `registerHooks`, wrapping the resolver as `tsx` does. */
export const patchRequire = (hooksData: ResolveHooksData): void => {
  const loader = createRequire(moduleUrl)('node:module') as CommonJsLoader;
  const original = loader._resolveFilename;
  const resolveRequire = resolveSync(hooksData);
  loader._resolveFilename = function (request, parent, ...rest) {
    const { url } = resolveRequire(
      request,
      {
        conditions: ['require', 'node'],
        importAttributes: {},
        parentURL: parent?.filename
          ? pathToFileURL(parent.filename).href
          : undefined,
      },
      (specifier) => {
        const resolved = original.call(this, specifier, parent, ...rest);
        return {
          url: isAbsolute(resolved) ? pathToFileURL(resolved).href : resolved,
        };
      }
    );
    return url.startsWith('file:') ? fileURLToPath(url) : url;
  };
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
  const resolved = await attempt(
    parentsFor(specifier, context.parentURL, data)
  );
  return context.conditions.includes('require')
    ? resolved
    : requireBuildFor(specifier, resolved);
};
