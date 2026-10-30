/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, readdirSync } from 'node:fs';
import { isAbsolute, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { rolldown } from 'rolldown';
import { describe, expect, it } from 'vitest';

const srcDir = fileURLToPath(new URL('./', import.meta.url));

const styleFiles = [
  join(srcDir, 'theme', 'modules.ts'),
  ...readdirSync(join(srcDir, 'primitives'))
    .map((name) => join(srcDir, 'primitives', name, 'styles.ts'))
    .filter((file) => existsSync(file)),
];

describe('slideStylesheet', () => {
  // The package declares no side effects. Rolldown, which Vite uses, drops a
  // module that only joins the registry, where esbuild and webpack keep it.
  it('keeps every style module in a rolldown bundle of the stylesheet alone', async () => {
    const bundle = await rolldown({
      input: join(srcDir, 'stylesheet.ts'),
      cwd: join(srcDir, '..'),
      external: (id) => !id.startsWith('.') && !isAbsolute(id),
      logLevel: 'silent',
    });
    const {
      output: [{ modules }],
    } = await bundle.generate({ format: 'esm' });
    await bundle.close();

    expect(
      styleFiles
        .filter((file) => !modules[file]?.renderedLength)
        .map((file) => relative(srcDir, file))
    ).toEqual([]);
  });
});
