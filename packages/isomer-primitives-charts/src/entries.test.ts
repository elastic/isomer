/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// Every name a barrel exports, types included, read from its source.
const namesOf = (entry: string): string[] =>
  [
    ...readFileSync(join(__dirname, entry), 'utf8').matchAll(
      /export\s+(type\s+)?\{([^}]*)\}/g
    ),
  ].flatMap(([, , names]) =>
    names!
      .split(',')
      .map((name) => name.trim().replace(/^type\s+/, ''))
      .filter(Boolean)
  );

describe('the root entry', () => {
  const root = new Set(namesOf('index.ts'));

  it.each(['schema/index.ts', 'scene/index.ts', 'resolve/index.ts'])(
    'exports every name %s does',
    (entry) => {
      expect(namesOf(entry).filter((name) => !root.has(name))).toEqual([]);
    }
  );
});

describe('the package docs', () => {
  const docsDir = join(__dirname, '..', 'docs');
  const docs = readdirSync(docsDir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => readFileSync(join(docsDir, file), 'utf8'))
    .join('\n');
  const UNDOCUMENTED = new Set([
    'CHECKED_KINDS',
    'ResolveSceneOptions',
    'SCHEMES',
  ]);

  it.each(['index.ts', 'testing/index.ts'])(
    'name every export of %s',
    (entry) => {
      expect(
        namesOf(entry).filter(
          (name) =>
            !UNDOCUMENTED.has(name) && !new RegExp(`\\b${name}\\b`).test(docs)
        )
      ).toEqual([]);
    }
  );
});
