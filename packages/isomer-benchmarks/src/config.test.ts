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
        entries: ['a', 'a/b'],
        build: 'source',
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
    [{ name: 'a', entries: [] }, '`entries` lists at least one specifier'],
    [{ name: 'a', entries: [''] }, '`entries` lists at least one specifier'],
    [{ name: 'a', entries: 'a' }, '`entries` lists at least one specifier'],
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
  ])('refuses %j', (config, problem) => {
    expect(benchConfigProblem(config)).toBe(problem);
  });
});
