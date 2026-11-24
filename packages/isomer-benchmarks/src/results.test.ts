/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { median, summarize, toMarkdown } from './results';

const measures = [
  { key: 'peakRssMb', label: 'Peak RSS (MB)', digits: 0 },
  { key: 'ms', label: 'Time (ms)', digits: 1 },
];
const scenarios = [
  { name: 'a', about: 'first' },
  { name: 'b', about: 'second' },
];

describe('median', () => {
  it('takes the middle of an odd count and the upper middle of an even one', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(3);
  });

  it('refuses no values', () => {
    expect(() => median([])).toThrow('median of no values');
  });
});

describe('summarize', () => {
  it("spreads each measure over its own scenario's runs", () => {
    const summary = summarize(
      [
        { scenario: 'a', peakRssMb: 100, ms: 1 },
        { scenario: 'a', peakRssMb: 120, ms: 3 },
        { scenario: 'a', peakRssMb: 110, ms: 2 },
        { scenario: 'b', peakRssMb: 50, ms: 'n/a' },
      ],
      scenarios,
      measures
    );
    expect(summary).toEqual({
      a: {
        peakRssMb: { median: 110, min: 100, max: 120 },
        ms: { median: 2, min: 1, max: 3 },
      },
      b: { peakRssMb: { median: 50, min: 50, max: 50 } },
    });
  });
});

describe('toMarkdown', () => {
  it('writes a row per scenario, a column per measure, and leaves missing cells empty', () => {
    expect(
      toMarkdown({
        measures,
        scenarios,
        summary: {
          a: {
            peakRssMb: { median: 110.4, min: 100, max: 120 },
            ms: { median: 2.25, min: 1, max: 3 },
          },
          b: { peakRssMb: { median: 50, min: 50, max: 50 } },
        },
      })
    ).toBe(
      [
        '| Scenario | Peak RSS (MB) | Time (ms) |',
        '| --- | ---: | ---: |',
        '| `a` | 110 | 2.3 |',
        '| `b` | 50 |  |',
      ].join('\n')
    );
  });
});
