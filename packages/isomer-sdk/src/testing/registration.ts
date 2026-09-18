/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Node-only, and reached only through the `./testing` entry: this reads the
// filesystem, which no rendering path may do.

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { AnyPrimitiveDefinition } from '../define/primitive_module';

/** What {@link assertPackRegistrationComplete} needs to compare a pack against its directory. */
export interface PackRegistrationOptions {
  /** Directory whose subdirectories are one primitive each. A `URL` is resolved with `fileURLToPath`. */
  primitivesDir: URL | string;
  /** The pack's registry array, as passed to `definePrimitivePack`. */
  registered: readonly AnyPrimitiveDefinition[];
  /** Subdirectory names that hold no primitive. */
  ignore?: readonly string[];
}

const ENTRY_FILES = ['index.tsx', 'index.ts'] as const;

/** Duck-typed so a definition from a different copy of the sdk still matches. */
const isPrimitiveDefinition = (
  value: unknown
): value is AnyPrimitiveDefinition => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { type, catalog, schema, renderers } = value as Record<string, unknown>;
  return (
    typeof type === 'string' &&
    typeof catalog === 'object' &&
    catalog !== null &&
    typeof schema === 'object' &&
    schema !== null &&
    typeof renderers === 'object' &&
    renderers !== null
  );
};

const entryFileIn = (dir: string): string | undefined => {
  for (const name of ENTRY_FILES) {
    const candidate = join(dir, name);
    try {
      if (statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {
      // Not this name; try the next.
    }
  }
  return undefined;
};

const subdirectoriesOf = (root: string, ignore: readonly string[]): string[] =>
  readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !ignore.includes(entry.name))
    .map((entry) => entry.name)
    .sort();

/**
 * Fails when a primitive directory is missing from the pack's registry.
 *
 * A pack keeps two hand-written lists — the registry array and the body-node
 * union — and nothing in the type system relates either to the directory they
 * describe. A primitive absent from *both* lists leaves them agreeing with each
 * other, so it compiles and every other test passes while the primitive is
 * silently unreachable. This is the check that notices.
 *
 * Deliberately a check rather than a generator: the registry stays hand-written
 * and readable, and the failure message carries the fix.
 *
 * @example
 * ```ts
 * await assertPackRegistrationComplete({
 *   primitivesDir: new URL('./primitives/', import.meta.url),
 *   registered: slideDeckPrimitives,
 * });
 * ```
 */
export const assertPackRegistrationComplete = async ({
  primitivesDir,
  registered,
  ignore = [],
}: PackRegistrationOptions): Promise<void> => {
  const root =
    typeof primitivesDir === 'string'
      ? primitivesDir
      : fileURLToPath(primitivesDir);
  const registeredTypes = new Set(registered.map(({ type }) => type));
  const problems: string[] = [];
  const foundTypes = new Set<string>();

  for (const folder of subdirectoriesOf(root, ignore)) {
    const entry = entryFileIn(join(root, folder));
    if (!entry) {
      problems.push(
        `${folder}/ has no ${ENTRY_FILES.join(' or ')}; add one or pass it in \`ignore\`.`
      );
      continue;
    }

    const module = (await import(pathToFileURL(entry).href)) as Record<
      string,
      unknown
    >;
    const exported = Object.entries(module).filter(([, value]) =>
      isPrimitiveDefinition(value)
    ) as Array<[string, AnyPrimitiveDefinition]>;

    if (exported.length === 0) {
      problems.push(
        `${folder}/ exports no primitive definition; add one or pass it in \`ignore\`.`
      );
      continue;
    }

    for (const [exportName, definition] of exported) {
      foundTypes.add(definition.type);
      if (registeredTypes.has(definition.type)) {
        continue;
      }
      problems.push(
        `${folder}/ defines "${definition.type}" but nothing registers it.\n` +
          `  Import \`${exportName}\` from './${folder}' and add it to the registry array,\n` +
          `  then add its node type to the pack's body-node union.`
      );
    }
  }

  for (const { type } of registered) {
    if (!foundTypes.has(type)) {
      problems.push(
        `"${type}" is registered but no directory under ${root} defines it.`
      );
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `Pack registration is incomplete:\n${problems.map((line) => `- ${line}`).join('\n')}`
    );
  }
};
