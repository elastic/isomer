/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { AnyPrimitiveDefinition } from '../define/primitive_module';

import { assertPackRegistrationComplete } from './registration';

const definition = (type: string): AnyPrimitiveDefinition =>
  ({
    type,
    catalog: { type, purpose: 'p', useWhen: [], avoidWhen: [], example: {} },
    examples: [],
    schema: {},
    renderers: { react: () => null, text: () => '', markdown: () => '' },
  }) as unknown as AnyPrimitiveDefinition;

let root: string;

// A primitive directory is only ever read through `import`, so the fixture has
// to be a real module on disk rather than a mock.
const writePrimitive = (folder: string, type: string, exportName: string) => {
  const dir = join(root, folder);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'index.ts'),
    `export const ${exportName} = {
      type: ${JSON.stringify(type)},
      catalog: { type: ${JSON.stringify(type)}, purpose: 'p', useWhen: [], avoidWhen: [], example: {} },
      examples: [],
      schema: {},
      renderers: { react: () => null, text: () => '', markdown: () => '' },
    };\n`
  );
};

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'isomer-registration-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('assertPackRegistrationComplete', () => {
  it('passes when every directory is registered', async () => {
    writePrimitive('demo_title', 'demoTitle', 'demoTitlePrimitive');
    writePrimitive('demo_stack', 'demoStack', 'demoStackPrimitive');

    await expect(
      assertPackRegistrationComplete({
        primitivesDir: root,
        registered: [definition('demoTitle'), definition('demoStack')],
      })
    ).resolves.toBeUndefined();
  });

  // The failure this whole helper exists for: a complete, compiling primitive
  // that no list mentions, which leaves the registry and the union agreeing.
  it('fails on a directory that nothing registers', async () => {
    writePrimitive('demo_title', 'demoTitle', 'demoTitlePrimitive');
    writePrimitive('demo_probe', 'demoProbe', 'demoProbePrimitive');

    await expect(
      assertPackRegistrationComplete({
        primitivesDir: root,
        registered: [definition('demoTitle')],
      })
    ).rejects.toThrow(/demo_probe\/ defines "demoProbe" but nothing registers/);
  });

  it('names the export and the directory so the fix is copyable', async () => {
    writePrimitive('demo_probe', 'demoProbe', 'demoProbePrimitive');

    await expect(
      assertPackRegistrationComplete({
        primitivesDir: root,
        registered: [],
      })
    ).rejects.toThrow(/`demoProbePrimitive` from '\.\/demo_probe'/);
  });

  it('fails on a registered type with no directory', async () => {
    writePrimitive('demo_title', 'demoTitle', 'demoTitlePrimitive');

    await expect(
      assertPackRegistrationComplete({
        primitivesDir: root,
        registered: [definition('demoTitle'), definition('demoGhost')],
      })
    ).rejects.toThrow(/"demoGhost" is registered but no directory/);
  });

  it('fails on a directory with no entry file', async () => {
    mkdirSync(join(root, 'demo_empty'), { recursive: true });

    await expect(
      assertPackRegistrationComplete({ primitivesDir: root, registered: [] })
    ).rejects.toThrow(/demo_empty\/ has no index\.tsx or index\.ts/);
  });

  it('skips directories named in ignore', async () => {
    writePrimitive('demo_title', 'demoTitle', 'demoTitlePrimitive');
    mkdirSync(join(root, 'helpers'), { recursive: true });

    await expect(
      assertPackRegistrationComplete({
        primitivesDir: root,
        registered: [definition('demoTitle')],
        ignore: ['helpers'],
      })
    ).resolves.toBeUndefined();
  });
});
