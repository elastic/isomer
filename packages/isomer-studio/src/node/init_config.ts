/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import type { ConfigLoader } from './load_config';
import { findDefaultConfig, importStudioModule } from './load_config';

/** Tried before the manifest's entries, so a pack runs from source without a build. */
const SOURCE_ENTRIES = ['src/index', 'index'].flatMap((base) =>
  ['tsx', 'ts', 'jsx', 'js'].map((extension) => `${base}.${extension}`)
);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

interface Manifest {
  name?: unknown;
  exports?: unknown;
  module?: unknown;
  main?: unknown;
}

const readManifest = (projectDir: string): Manifest => {
  const path = join(projectDir, 'package.json');
  if (!existsSync(path)) {
    throw new Error(
      `No package.json in ${projectDir}: run init in a pack's package directory.`
    );
  }
  const manifest: unknown = JSON.parse(readFileSync(path, 'utf8'));
  return isRecord(manifest) ? manifest : {};
};

const rootExport = (exports: unknown): unknown => {
  const root = isRecord(exports) && '.' in exports ? exports['.'] : exports;
  return isRecord(root) ? (root.import ?? root.default ?? root.module) : root;
};

/** The module whose exports name the project's packs: its source index, else its manifest's root entry. */
export const packEntry = (projectDir: string): string => {
  const { exports, module, main } = readManifest(projectDir);
  const found = [...SOURCE_ENTRIES, rootExport(exports), module, main]
    .filter((path): path is string => typeof path === 'string')
    .map((path) => join(projectDir, path))
    .find((path) => existsSync(path));
  if (found === undefined) {
    throw new Error(
      `No pack entry in ${projectDir}: add src/index.ts, or point package.json "main" at the module that exports the pack.`
    );
  }
  return found;
};

/** Structural, since a pack carries no brand: what `definePrimitivePack` returns. */
export const isPrimitivePack = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  Array.isArray(value.primitives) &&
  isRecord(value.types) &&
  typeof value.types.has === 'function';

/** A single-quoted string literal. */
const quote = (value: string): string =>
  `'${value.replace(/[\\']/g, (char) => `\\${char}`).replace(/\n/g, '\\n')}'`;

/** `path` from `fromDir`, as an import specifier. */
const specifierFrom = (fromDir: string, path: string): string => {
  const inside = relative(fromDir, path).split(sep).join('/');
  return inside.startsWith('.') ? inside : `./${inside}`;
};

/** How a config imports the packs a module exports. */
export interface PackImports {
  /** Named exports that are packs. */
  named: string[];
  /** Whether the default export is itself a pack. */
  isDefault: boolean;
  /** Packs on a default-exported object, as a CommonJS module exposes them. */
  onDefault: string[];
}

export const packImports = (namespace: unknown): PackImports => {
  const exports = isRecord(namespace) ? namespace : {};
  const { default: fallback } = exports;
  const packKeys = (record: Record<string, unknown>) =>
    Object.keys(record).filter(
      (key) => key !== 'default' && isPrimitivePack(record[key])
    );
  const named = packKeys(exports);
  const isDefault = isPrimitivePack(fallback);
  return {
    named,
    isDefault,
    onDefault:
      named.length || isDefault || !isRecord(fallback)
        ? []
        : packKeys(fallback),
  };
};

/** The config `init` writes: the packs `entry` exports, by name. */
export const initConfigSource = ({
  entry,
  imports: { named, isDefault, onDefault },
  title,
}: {
  entry: string;
  imports: PackImports;
  title?: string | undefined;
}): string => {
  const defaultName = isDefault ? 'pack' : onDefault.length ? 'entry' : '';
  const bindings = [
    defaultName,
    ...(named.length ? [`{ ${named.join(', ')} }`] : []),
  ].filter(Boolean);
  const packs = [
    ...(isDefault ? ['pack'] : []),
    ...named,
    ...onDefault.map((key) => `entry.${key}`),
  ];
  return [
    "import { createIsomerRuntime } from '@elastic/isomer-runtime';",
    "import { defineStudioConfig } from '@elastic/isomer-studio';",
    '',
    `import ${bindings.join(', ')} from ${quote(entry)};`,
    '',
    'export default defineStudioConfig({',
    ...(title === undefined ? [] : [`  title: ${quote(title)},`]),
    `  runtime: createIsomerRuntime({ packs: [${packs.join(', ')}] }),`,
    '});',
    '',
  ].join('\n');
};

/** Writes a config into `projectDir` naming the packs its entry exports, `.ts` beside a `tsconfig.json` and `.js` otherwise, and returns its path. */
export const writeInitConfig = async (
  projectDir: string,
  { loader }: { loader?: ConfigLoader | undefined } = {}
): Promise<string> => {
  const existing = findDefaultConfig(projectDir);
  if (existing !== undefined) {
    throw new Error(`${existing} already exists.`);
  }
  const entry = packEntry(projectDir);
  const imports = packImports(await importStudioModule(entry, { loader }));
  if (
    !imports.named.length &&
    !imports.isDefault &&
    !imports.onDefault.length
  ) {
    throw new Error(
      `${specifierFrom(projectDir, entry)} exports no primitive pack.`
    );
  }
  const typed = existsSync(join(projectDir, 'tsconfig.json'));
  const specifier = specifierFrom(projectDir, entry);
  const configPath = join(
    projectDir,
    typed ? 'isomer-studio.config.ts' : 'isomer-studio.config.js'
  );
  const { name } = readManifest(projectDir);
  writeFileSync(
    configPath,
    initConfigSource({
      entry: typed ? specifier.replace(/\.tsx?$/, '') : specifier,
      imports,
      title: typeof name === 'string' ? name : undefined,
    })
  );
  return configPath;
};
