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

/** Conditions `init` follows in a manifest's `exports`, nested ones included; `types` names no runnable file. */
const CONDITIONS = ['import', 'module', 'require', 'node', 'default'] as const;

/** The file an `exports` value names for the package root. */
const exportTarget = (target: unknown): string | undefined => {
  if (typeof target === 'string') {
    return target;
  }
  const candidates = Array.isArray(target)
    ? target
    : isRecord(target)
      ? '.' in target
        ? [target['.']]
        : CONDITIONS.map((condition) => target[condition])
      : [];
  return candidates
    .map(exportTarget)
    .find((path): path is string => path !== undefined);
};

/** The module whose exports name the project's packs: its source index, else its manifest's root entry. */
export const packEntry = (projectDir: string): string => {
  const { exports, module, main } = readManifest(projectDir);
  const found = [...SOURCE_ENTRIES, exportTarget(exports), module, main]
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

/** A pack a module exports, and where a config reaches it. */
export type PackImport =
  | { from: 'named'; name: string }
  | { from: 'default' }
  /** A property of a default-exported object, as a CommonJS module exposes its packs. */
  | { from: 'defaultObject'; name: string };

/** Each distinct pack `namespace` exports, once, so an alias or a CommonJS mirror of a named export is not registered twice. */
export const packImports = (namespace: unknown): PackImport[] => {
  const exports = isRecord(namespace) ? namespace : {};
  const { default: fallback } = exports;
  const seen = new Set<unknown>();
  const found: PackImport[] = [];
  const take = (value: unknown, pack: PackImport) => {
    if (isPrimitivePack(value) && !seen.has(value)) {
      seen.add(value);
      found.push(pack);
    }
  };
  Object.entries(exports).forEach(([name, value]) => {
    if (name !== 'default') {
      take(value, { from: 'named', name });
    }
  });
  if (isPrimitivePack(fallback)) {
    take(fallback, { from: 'default' });
  } else if (isRecord(fallback)) {
    Object.entries(fallback).forEach(([name, value]) =>
      take(value, { from: 'defaultObject', name })
    );
  }
  return found;
};

/** The names the config's own imports take. */
const HELPERS = ['createIsomerRuntime', 'defineStudioConfig'];

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/** The config `init` writes: the packs `entry` exports, each under a local name no other import takes. */
export const initConfigSource = ({
  entry,
  imports,
  title,
}: {
  entry: string;
  imports: readonly PackImport[];
  title?: string | undefined;
}): string => {
  const taken = new Set(HELPERS);
  const local = (wanted: string): string => {
    let name = wanted;
    for (let suffix = 2; taken.has(name); suffix += 1) {
      name = `${wanted}${suffix}`;
    }
    taken.add(name);
    return name;
  };
  // Named packs keep their own names where they can, so they are claimed first.
  const named = new Map(
    imports.flatMap((pack) =>
      pack.from === 'named' ? [[pack.name, local(pack.name)] as const] : []
    )
  );
  const defaultName = local(
    imports.some(({ from }) => from === 'default') ? 'pack' : 'entry'
  );
  const packs = imports.map((pack) => {
    switch (pack.from) {
      case 'named':
        return named.get(pack.name);
      case 'default':
        return defaultName;
      case 'defaultObject':
        return IDENTIFIER.test(pack.name)
          ? `${defaultName}.${pack.name}`
          : `${defaultName}[${quote(pack.name)}]`;
    }
  });
  const specifiers = [...named].map(([name, as]) =>
    name === as ? name : `${name} as ${as}`
  );
  const bindings = [
    ...(imports.some(({ from }) => from !== 'named') ? [defaultName] : []),
    ...(specifiers.length ? [`{ ${specifiers.join(', ')} }`] : []),
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
  if (!imports.length) {
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
