/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { ReactNode } from 'react';
import { tsImport } from 'tsx/esm/api';

import type { StudioConfig } from '../config';

export type ConfigLoader = 'none' | 'tsx';

export const DEFAULT_CONFIG_NAMES = [
  'isomer-studio.config.ts',
  'isomer-studio.config.tsx',
  'isomer-studio.config.js',
] as const;

/** `config` against `cwd`, or the first default name that exists there. */
export const resolveConfigPath = (cwd: string, config?: string): string => {
  if (config !== undefined) {
    const path = resolve(cwd, config);
    if (!existsSync(path)) {
      throw new Error(`No Studio config at ${path}.`);
    }
    return path;
  }
  const found = DEFAULT_CONFIG_NAMES.map((name) => resolve(cwd, name)).find(
    (path) => existsSync(path)
  );
  if (found === undefined) {
    throw new Error(
      `No Studio config in ${cwd}: pass --config, or add one of ${DEFAULT_CONFIG_NAMES.join(', ')}.`
    );
  }
  return found;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isStudioConfig = (value: unknown): value is StudioConfig =>
  isRecord(value) &&
  isRecord(value.runtime) &&
  isRecord(value.runtime.surfaces);

/** The default export, unwrapping the extra `default` a CommonJS build adds. */
const defaultExport = (namespace: unknown): unknown => {
  const outer = isRecord(namespace) ? namespace.default : undefined;
  return isRecord(outer) && !isStudioConfig(outer) ? outer.default : outer;
};

const reactDirectory = (from: string): string | undefined => {
  try {
    return dirname(
      realpathSync(createRequire(from).resolve('react/package.json'))
    );
  } catch {
    return undefined;
  }
};

/** The installed entry of `@elastic/isomer-runtime` as seen from `configPath`; its `exports` hide `package.json`. */
const runtimeEntry = (configPath: string): string | undefined => {
  try {
    return createRequire(configPath).resolve('@elastic/isomer-runtime');
  } catch {
    return undefined;
  }
};

/** Throws when the config and `@elastic/isomer-runtime` would load different copies of React. */
export const assertSingleReact = (configPath: string): void => {
  const configReact = reactDirectory(configPath);
  if (configReact === undefined) {
    throw new Error(
      `React is not installed where the Studio config is: ${configPath}.`
    );
  }
  const entry = runtimeEntry(configPath);
  const runtimeReact = entry === undefined ? undefined : reactDirectory(entry);
  if (runtimeReact !== undefined && runtimeReact !== configReact) {
    throw new Error(
      [
        'The Studio config and @elastic/isomer-runtime resolve different copies of React:',
        `  config:  ${configReact}`,
        `  runtime: ${runtimeReact}`,
        'Install one React for both, for example by deduplicating your lockfile.',
      ].join('\n')
    );
  }
};

/** The `tsconfig.json` nearest the config, which `tsx` applies to the files it includes. */
export const nearestTsconfig = (configPath: string): string | undefined => {
  for (let dir = dirname(configPath); ; dir = dirname(dir)) {
    const candidate = join(dir, 'tsconfig.json');
    if (existsSync(candidate)) {
      return candidate;
    }
    if (dirname(dir) === dir) {
      return undefined;
    }
  }
};

/** `tsImport` passes `tsconfig` to its ESM hook only; its CommonJS hook reads `TSX_TSCONFIG_PATH` as it registers. */
const importWithTsx = (
  url: string,
  tsconfig: string | undefined
): Promise<unknown> => {
  const previous = process.env.TSX_TSCONFIG_PATH;
  if (tsconfig !== undefined) {
    process.env.TSX_TSCONFIG_PATH = tsconfig;
  }
  try {
    return tsImport(url, {
      parentURL: import.meta.url,
      ...(tsconfig === undefined ? {} : { tsconfig }),
    });
  } finally {
    if (previous === undefined) {
      delete process.env.TSX_TSCONFIG_PATH;
    } else {
      process.env.TSX_TSCONFIG_PATH = previous;
    }
  }
};

/** Imports the config's default export in Node; `tsx` compiles TypeScript and leaves resolution to Node. */
export const loadStudioConfig = async (
  configPath: string,
  { loader = 'tsx' }: { loader?: ConfigLoader | undefined } = {}
): Promise<StudioConfig> => {
  assertSingleReact(configPath);
  const url = pathToFileURL(configPath).href;
  const namespace: unknown =
    loader === 'none'
      ? await import(url)
      : await importWithTsx(url, nearestTsconfig(configPath));
  const config = defaultExport(namespace);
  if (!isStudioConfig(config)) {
    throw new Error(
      `${configPath} must default-export defineStudioConfig({ runtime, ... }).`
    );
  }
  return config;
};

const isRenderToString = (
  value: unknown
): value is (node: ReactNode) => string => typeof value === 'function';

/** `react-dom/server`'s `renderToString`, from the config's own React. */
export const loadRenderToString = (
  configPath: string
): ((node: ReactNode) => string) => {
  const server: unknown = createRequire(configPath)('react-dom/server');
  const renderToString = isRecord(server) ? server.renderToString : undefined;
  if (!isRenderToString(renderToString)) {
    throw new Error('react-dom/server has no renderToString.');
  }
  return renderToString;
};
