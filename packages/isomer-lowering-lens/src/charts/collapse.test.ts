/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { collapseRows } from './collapse';

// Cases and expected values port Kibana's
// `lens/common/expressions/impl/collapse/collapse_fn.test.ts`. Rows are
// `[val, split]` or `[val, val2, val3, split]`.

const ab = [1, 2, 3, 4, 5, 6, 7, 8].map((val, i) => [val, 'ABBAAABB'[i]!]);

describe('collapseRows matches lens_collapse', () => {
  it('collapses all rows', () => {
    expect(collapseRows(ab, [], [{ index: 0, fn: 'sum' }])).toEqual([
      [36, 'A'],
    ]);
  });

  it('applies one function per metric', () => {
    const rows = [1, 2, 3, 4, 5, 6, 7, 8].map((val) => [val, val, val, 'A']);
    expect(
      collapseRows(
        rows,
        [],
        [
          { index: 0, fn: 'sum' },
          { index: 1, fn: 'min' },
          { index: 2, fn: 'avg' },
        ]
      )[0]!.slice(0, 3)
    ).toEqual([36, 1, 4.5]);
  });

  const twoSplit = [
    [1, 'A'],
    [2, 'B'],
    [3, null],
    [4, 'A'],
    [5, null],
    [6, 'A'],
    [7, 'B'],
    [8, 'B'],
  ];

  it.each([
    ['sum', [11, 17, 8]],
    ['avg', [11 / 3, 17 / 3, 4]],
    ['min', [1, 2, 3]],
    ['max', [6, 8, 5]],
  ] as const)('splits by a column with %s', (fn, expected) => {
    expect(
      collapseRows(twoSplit, [1], [{ index: 0, fn }]).map(([val, split]) => [
        val,
        split,
      ])
    ).toEqual([
      [expected[0], 'A'],
      [expected[1], 'B'],
      [expected[2], null],
    ]);
  });

  it('reads a group with no values as null and skips null cells', () => {
    expect(
      collapseRows(
        [
          [null, 'A'],
          [2, 'B'],
          [null, 'B'],
        ],
        [1],
        [{ index: 0, fn: 'avg' }]
      )
    ).toEqual([
      [null, 'A'],
      [2, 'B'],
    ]);
  });

  it('returns no rows for no rows', () => {
    expect(collapseRows([], [], [{ index: 0, fn: 'sum' }])).toEqual([]);
  });
});
