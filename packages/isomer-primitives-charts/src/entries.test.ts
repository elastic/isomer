/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'node:fs';
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
      .map((name) =>
        name
          .trim()
          .replace(/^type\s+/, '')
          .split(/\s+as\s+/)
          .pop()!
      )
      .filter(Boolean)
  );

describe('the root entry', () => {
  const root = new Set(namesOf('entries/index.ts'));

  it.each(['entries/schema.ts', 'entries/scene.ts', 'entries/resolve.ts'])(
    'exports every name %s does',
    (entry) => {
      expect(namesOf(entry).filter((name) => !root.has(name))).toEqual([]);
    }
  );
});
