/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const EXPORT_BLOCK = /export\s+(?:type\s+)?\{([^}]*)\}/g;

/** Every name `src/index.ts` re-exports, as the consumer sees it. */
const exportedNames = (source: string): string[] =>
  [...source.matchAll(EXPORT_BLOCK)].flatMap(([, body = '']) =>
    body
      .split(',')
      .map((entry) => entry.trim().replace(/^type\s+/, ''))
      .filter(Boolean)
      .map((entry) => entry.split(/\s+as\s+/).at(-1) ?? entry)
  );

describe('docs/api.md', () => {
  it('names every export of the package entry point', () => {
    const names = exportedNames(
      readFileSync(
        fileURLToPath(new URL('./index.ts', import.meta.url)),
        'utf8'
      )
    );
    const page = readFileSync(
      fileURLToPath(new URL('../docs/api.md', import.meta.url)),
      'utf8'
    );

    expect(names.length).toBeGreaterThan(0);
    const missing = names.filter((name) => !page.includes(`\`${name}\``));
    expect(missing).toEqual([]);
  });
});
