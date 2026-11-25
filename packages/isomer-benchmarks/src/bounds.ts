/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BenchResult } from './results';

/** The most each scenario's median may reach, per measure. */
export type Bounds = Record<string, Record<string, number>>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Why `value` can't be a suite's bounds, or `undefined` when it can: each
 * scenario has at least one measure, each a number of at least 0. The one
 * rule for a pack config's bounds and for `bounds/<suite>.json`.
 */
export const boundsProblem = (value: unknown): string | undefined => {
  if (!isRecord(value)) {
    return 'bounds map each scenario to its measures';
  }
  for (const [scenario, measures] of Object.entries(value)) {
    if (!isRecord(measures) || Object.keys(measures).length === 0) {
      return `${scenario}: a bound needs at least one measure`;
    }
    for (const [key, bound] of Object.entries(measures)) {
      if (typeof bound !== 'number' || !(bound >= 0)) {
        return `${scenario} ${key}: a bound is a number, at least 0`;
      }
    }
  }
  return undefined;
};

export interface BoundCheck {
  scenario: string;
  key: string;
  median: number;
  bound: number;
  ok: boolean;
}

/**
 * Holds each bounded measure's median to its bound. A bound whose scenario or
 * measure the result lacks throws, so it can't pass by not being measured.
 */
export const checkBounds = (
  summary: BenchResult['summary'],
  bounds: Bounds
): BoundCheck[] =>
  Object.entries(bounds).flatMap(([scenario, measures]) =>
    Object.entries(measures).map(([key, bound]) => {
      const spread = summary[scenario]?.[key];
      if (spread === undefined) {
        throw new Error(`${scenario} ${key}: bounded but not measured`);
      }
      const { median } = spread;
      return { scenario, key, median, bound, ok: median <= bound };
    })
  );

/**
 * The `required` measures of each scenario that `bounds` leaves out, as
 * `scenario key`, so a gate that must cover every row can refuse a new one.
 */
export const unbounded = (
  required: Record<string, readonly string[]>,
  bounds: Bounds
): string[] =>
  Object.entries(required).flatMap(([scenario, keys]) =>
    keys
      .filter((key) => bounds[scenario]?.[key] === undefined)
      .map((key) => `${scenario} ${key}`)
  );
