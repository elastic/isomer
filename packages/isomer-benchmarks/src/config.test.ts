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
        nodeOnly: ['./src/index.ts'],
      })
    ).toBe(undefined);
    expect(
      benchConfigProblem({
        name: 'engine',
        entries: ['a'],
        charts: { engine: './bench/engine.cjs' },
        bounds: { charts: { 'engine:one': { peakRssMb: 320, modules: 0 } } },
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
    [
      { name: 'a', entries: ['a'], charts: { engine: '' } },
      '`charts` is an object whose `engine`, if any, is a path',
    ],
    [
      { name: 'a', entries: ['a'], charts: true },
      '`charts` is an object whose `engine`, if any, is a path',
    ],
    [
      { name: 'a', entries: ['a'], bounds: { charts: { one: { peak: '1' } } } },
      '`bounds` maps each suite to scenarios, then at least one measure, then a number of at least 0',
    ],
    [
      { name: 'a', entries: ['a'], bounds: { charts: { one: { peak: -1 } } } },
      '`bounds` maps each suite to scenarios, then at least one measure, then a number of at least 0',
    ],
    [
      { name: 'a', entries: ['a'], bounds: { charts: { one: {} } } },
      '`bounds` maps each suite to scenarios, then at least one measure, then a number of at least 0',
    ],
    [
      { name: 'a', entries: ['a'], nodeOnly: ['a/node'] },
      '`nodeOnly` lists some of `entries`',
    ],
    [
      { name: 'a', entries: ['a'], nodeOnly: 'a' },
      '`nodeOnly` lists some of `entries`',
    ],
  ])('refuses %j', (config, problem) => {
    expect(benchConfigProblem(config)).toBe(problem);
  });
});
