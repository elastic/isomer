/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { benchConfigProblem } from './config';

describe('benchConfigProblem', () => {
  it('accepts a built pack and a source pack', () => {
    expect(benchConfigProblem({ name: 'slides', entries: ['a'] })).toBe(
      undefined
    );
    expect(
      benchConfigProblem({
        name: 'kbn-components',
        entries: ['@kbn/a', './src/index.ts', '../b_c/d-e'],
        build: 'source',
      })
    ).toBe(undefined);
  });

  it.each([
    [null, 'a config exports an object'],
    [
      { name: 'Slides', entries: ['a'] },
      '`name` is lowercase letters, digits and dashes',
    ],
    [
      { name: 'a:b', entries: ['a'] },
      '`name` is lowercase letters, digits and dashes',
    ],
    ...[[], [''], 'a', ['./chart|debug.cjs'], ['./has`tick.ts'], ['a\nb']].map(
      (entries): [unknown, string] => [
        { name: 'a', entries },
        '`entries` lists at least one specifier, of letters, digits and `@ . / _ -`',
      ]
    ),
    [
      { name: 'a', entries: ['a'], build: 'ts' },
      "`build` is 'built' or 'source'",
    ],
  ])('refuses %j', (config, problem) => {
    expect(benchConfigProblem(config)).toBe(problem);
  });
});
