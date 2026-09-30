/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from 'vitest';

interface Parses {
  safeParse: (value: unknown) => { success: boolean };
}

/** `field` holds `min` to `max` of `item` and rejects one fewer or one more; `shape` is an example pinned at `max`. */
export const expectCountBounds = (
  schema: Parses,
  node: object,
  field: string,
  [min, max]: readonly [number, number],
  item: unknown,
  shape?: object
): void => {
  const parses = (count: number) =>
    schema.safeParse({ ...node, [field]: Array(count).fill(item) }).success;
  expect(parses(min), `${field} at ${min}`).toBe(true);
  expect(parses(min - 1), `${field} at ${min - 1}`).toBe(false);
  expect(parses(max), `${field} at ${max}`).toBe(true);
  expect(parses(max + 1), `${field} at ${max + 1}`).toBe(false);
  if (shape) {
    expect(
      (shape as Record<string, unknown>)[field],
      `example ${field}`
    ).toHaveLength(max);
  }
};
