/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment node

import { describe, expect, it } from 'vitest';

import { withImporters } from './dev_bundle';

interface FakeModule {
  file: string;
  importers: Set<FakeModule>;
}

const fakeModule = (file: string, ...importers: FakeModule[]): FakeModule => ({
  file,
  importers: new Set(importers),
});

describe('withImporters', () => {
  it('walks every importer up to the roots, through shared and circular imports', () => {
    const config = fakeModule('config.ts');
    const pack = fakeModule('pack.ts', config);
    const theme = fakeModule('theme.ts', pack, config);
    const primitive = fakeModule('primitive.ts', pack);
    theme.importers.add(primitive);
    const unrelated = fakeModule('unrelated.ts');

    const files = [...withImporters([theme])].map(({ file }) => file);

    expect(files.sort()).toEqual(
      ['config.ts', 'pack.ts', 'primitive.ts', 'theme.ts'].sort()
    );
    expect(files).not.toContain(unrelated.file);
  });
});
