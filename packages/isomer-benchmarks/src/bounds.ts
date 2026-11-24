/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BenchResult } from './results';

/** The most each scenario's median may reach, per measure. */
export type Bounds = Record<string, Record<string, number>>;

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
