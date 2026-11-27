/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  compareSummaries,
  comparisonToMarkdown,
  parityProblems,
  parsePair,
} from './compare';

const spread = (median: number) => ({ median, min: median, max: median });
const measures = [
  { key: 'peakRssMb', label: 'Peak RSS (MB)', digits: 0 },
  { key: 'heapMb', label: 'Heap (MB)', digits: 1 },
];
const scenarios = [{ name: 'one', about: '' }];

describe('compareSummaries', () => {
  it('gives the change from a to b in units and as a percentage of a', () => {
    const comparison = compareSummaries(
      { one: { peakRssMb: spread(200), heapMb: spread(17.1) } },
      { one: { peakRssMb: spread(150), heapMb: spread(8.6) } },
      scenarios,
      measures
    );
    expect(comparison.one?.peakRssMb).toEqual({
      a: 200,
      b: 150,
      delta: -50,
      percent: -25,
    });
    expect(comparison.one?.heapMb?.delta).toBeCloseTo(-8.5);
  });

  it('leaves out a measure either side lacks, and a percentage of 0', () => {
    const comparison = compareSummaries(
      { one: { peakRssMb: spread(0), heapMb: spread(1) } },
      { one: { peakRssMb: spread(5) } },
      scenarios,
      measures
    );
    expect(comparison.one).toEqual({
      peakRssMb: { a: 0, b: 5, delta: 5, percent: null },
    });
  });
});

describe('comparisonToMarkdown', () => {
  it('signs the change and rounds each measure to its digits', () => {
    const table = comparisonToMarkdown({
      measures,
      scenarios,
      comparison: compareSummaries(
        { one: { peakRssMb: spread(200), heapMb: spread(17.1) } },
        { one: { peakRssMb: spread(210), heapMb: spread(17.1) } },
        scenarios,
        measures
      ),
      labels: { a: 'A', b: 'B' },
    });
    expect(table.split('\n')).toEqual([
      '| Scenario | Measure | A | B | Change | Change (%) |',
      '| --- | --- | ---: | ---: | ---: | ---: |',
      '| `one` | Peak RSS (MB) | 200 | 210 | +10 | +5% |',
      '| `one` | Heap (MB) | 17.1 | 17.1 | 0.0 | 0% |',
    ]);
  });
});

describe('parityProblems', () => {
  const labels = { a: 'A', b: 'B' };
  const same = { markup: 'm', png: 'p' };

  it('passes identical drawings', () => {
    expect(parityProblems({ x: same }, { x: { ...same } }, labels)).toEqual([]);
  });

  it('names each example that differs, and what differs', () => {
    expect(
      parityProblems(
        { 'xy#0 dark': same, 'xy#1 dark': same, 'xy#2 dark': same },
        {
          'xy#0 dark': { markup: 'm', png: 'q' },
          'xy#1 dark': { markup: 'n', png: 'q' },
          'xy#2 dark': same,
        },
        labels
      )
    ).toEqual(['xy#0 dark: PNG differ', 'xy#1 dark: markup and PNG differ']);
  });

  it('names an example only one side drew', () => {
    expect(parityProblems({ a: same }, { b: same }, labels)).toEqual([
      'a: drawn only with A',
      'b: drawn only with B',
    ]);
  });
});

describe('parsePair', () => {
  it('splits at the first =', () => {
    expect(parsePair('@elastic/charts=a=b.tgz', '--swap')).toEqual({
      name: '@elastic/charts',
      value: 'a=b.tgz',
    });
  });

  it.each([undefined, 'x', '=x', 'x='])('refuses %s', (raw) => {
    expect(() => parsePair(raw, '--swap')).toThrow(/<package>=<value>/);
  });
});
