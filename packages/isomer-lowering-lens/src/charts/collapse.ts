/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonValue } from '../json';

export type CollapseFn = 'sum' | 'avg' | 'min' | 'max';

type Row = readonly JsonValue[];

const numbers = (value: JsonValue): number[] =>
  Array.isArray(value) ? value.map(Number) : [Number(value)];

/**
 * Lens's `lens_collapse`: one row per distinct `by` value, each metric reduced
 * with its function. Null cells are skipped; a group with none reads `null`.
 * Other cells coerce with `Number`, as Lens does.
 */
export const collapseRows = (
  rows: readonly Row[],
  by: readonly number[],
  metrics: readonly { index: number; fn: CollapseFn }[]
): Row[] => {
  const groups = new Map<
    string,
    { first: Row; sums: (number | undefined)[]; counts: number[] }
  >();
  for (const row of rows) {
    const key = JSON.stringify(by.map((index) => row[index] ?? null));
    let group = groups.get(key);
    if (!group) {
      group = {
        first: row,
        sums: metrics.map(() => undefined),
        counts: metrics.map(() => 0),
      };
      groups.set(key, group);
    }
    metrics.forEach(({ index, fn }, position) => {
      const cell = row[index];
      if (cell === null || cell === undefined) {
        return;
      }
      const values = numbers(cell);
      const current = group.sums[position];
      switch (fn) {
        case 'avg':
          group.counts[position]! += values.length;
          group.sums[position] = values.reduce((a, b) => a + b, current || 0);
          break;
        case 'sum':
          group.sums[position] = values.reduce((a, b) => a + b, current || 0);
          break;
        case 'min':
          group.sums[position] =
            current === undefined
              ? Math.min(...values)
              : Math.min(current, ...values);
          break;
        case 'max':
          group.sums[position] =
            current === undefined
              ? Math.max(...values)
              : Math.max(current, ...values);
          break;
      }
    });
  }
  return [...groups.values()].map(({ first, sums, counts }) => {
    const row = [...first];
    metrics.forEach(({ index, fn }, position) => {
      const sum = sums[position];
      row[index] =
        sum === undefined ? null : fn === 'avg' ? sum / counts[position]! : sum;
    });
    return row;
  });
};
