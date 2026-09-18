/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const src = resolve(import.meta.dirname, '..');
const entries = [
  ...readdirSync(import.meta.dirname)
    .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
    .map((name) => resolve(import.meta.dirname, name)),
  resolve(src, 'author/index.ts'),
  resolve(src, 'testing/index.ts'),
];

const exportedNames = (file: string): string[] =>
  [...readFileSync(file, 'utf8').matchAll(/export\s*\{([^}]*)\}\s*from/g)]
    .flatMap((match) => match[1]!.split(','))
    .map((name) => name.replace(/^\s*type\s+/, '').trim())
    .filter(Boolean);

const apiReference = readFileSync(resolve(src, '..', 'docs', 'api.md'), 'utf8');

describe('docs/api.md', () => {
  it.each(entries)('names every export of %s', (file) => {
    const names = exportedNames(file);
    expect(names.length).toBeGreaterThan(0);
    const missing = names.filter(
      (name) => !apiReference.includes(`\`${name}\``)
    );
    expect(missing).toEqual([]);
  });
});
