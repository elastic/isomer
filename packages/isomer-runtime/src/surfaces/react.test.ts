/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const IMPORT_SPEC = /(?:from|import)\s+['"]([^'"]+)['"]/g;

const resolveRelative = (
  fromFile: string,
  spec: string
): string | undefined => {
  if (!spec.startsWith('.')) {
    return undefined;
  }
  const base = join(dirname(fromFile), spec);
  for (const candidate of [base, `${base}.ts`, join(base, 'index.ts')]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return undefined;
};

const walkRelativeImports = (entry: string): Set<string> => {
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.pop();
    if (file === undefined || seen.has(file)) {
      continue;
    }
    seen.add(file);
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(IMPORT_SPEC)) {
      const spec = match[1];
      if (spec === undefined) {
        continue;
      }
      const resolved = resolveRelative(file, spec);
      if (resolved !== undefined) {
        queue.push(resolved);
      }
    }
  }
  return seen;
};

const importsOf = (files: Iterable<string>): string[] => {
  const specs: string[] = [];
  for (const file of files) {
    for (const match of readFileSync(file, 'utf8').matchAll(IMPORT_SPEC)) {
      if (match[1] !== undefined) {
        specs.push(match[1]);
      }
    }
  }
  return specs;
};

describe('react surface entry', () => {
  it('does not pull react-dom/server through @elastic/isomer-sdk/react', () => {
    const surface = fileURLToPath(new URL('./react.ts', import.meta.url));
    const sdkReactEntry = join(
      fileURLToPath(
        new URL('../../../isomer-sdk/src/entries/react.ts', import.meta.url)
      )
    );
    const files = new Set([
      ...walkRelativeImports(surface),
      ...walkRelativeImports(sdkReactEntry),
    ]);
    const specs = importsOf(files);

    expect(readFileSync(surface, 'utf8')).toContain(
      "from '@elastic/isomer-sdk/react'"
    );
    expect(specs).not.toContain('react-dom/server');
    expect(specs.some((spec) => spec.includes('/html'))).toBe(false);
  });
});
