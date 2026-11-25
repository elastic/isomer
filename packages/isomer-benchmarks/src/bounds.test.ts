/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { checkBounds, unbounded } from './bounds';

const spread = (median: number) => ({ median, min: median, max: median });

const summary = {
  sdk: { nodeKb: spread(180), browserKb: spread(150) },
  takumi: { nodeKb: spread(46) },
};

describe('checkBounds', () => {
  it('passes a median at its bound and fails one past it', () => {
    expect(
      checkBounds(summary, { sdk: { nodeKb: 180, browserKb: 149.9 } })
    ).toEqual([
      { scenario: 'sdk', key: 'nodeKb', median: 180, bound: 180, ok: true },
      {
        scenario: 'sdk',
        key: 'browserKb',
        median: 150,
        bound: 149.9,
        ok: false,
      },
    ]);
  });

  it('checks only what is bounded', () => {
    expect(checkBounds(summary, {})).toEqual([]);
  });

  it('refuses a bound on a scenario or measure that was not measured', () => {
    expect(() => checkBounds(summary, { slides: { nodeKb: 1 } })).toThrow(
      'slides nodeKb: bounded but not measured'
    );
    expect(() => checkBounds(summary, { takumi: { browserKb: 1 } })).toThrow(
      'takumi browserKb: bounded but not measured'
    );
  });
});

describe('unbounded', () => {
  it('names each required measure with no bound', () => {
    expect(
      unbounded(
        { sdk: ['nodeKb', 'browserKb'], takumi: ['nodeKb'], pack: ['nodeKb'] },
        { sdk: { nodeKb: 180 }, takumi: { nodeKb: 0 } }
      )
    ).toEqual(['sdk browserKb', 'pack nodeKb']);
  });
});
