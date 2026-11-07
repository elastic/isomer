/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Cell } from './schema/data';

/** The largest absolute epoch, in milliseconds, a JavaScript `Date` represents. */
export const MAX_EPOCH = 8.64e15;

/** A cell's scalar value: a multivalue cell's first non-null entry. */
export const scalarOf = (cell: Cell | undefined): Cell | undefined =>
  Array.isArray(cell) ? cell.find((value) => value !== null) : cell;

/** The continuous scale a column type implies, if any. */
export const continuousScaleOf = (
  type: string
): 'linear' | 'temporal' | undefined =>
  type === 'number' ? 'linear' : type === 'date' ? 'temporal' : undefined;

/** A cell's position on a continuous scale, or `undefined` when it has none. */
export const coordinateOf = (
  cell: Cell | undefined,
  scale: 'linear' | 'temporal'
): number | undefined => {
  const value = scalarOf(cell);
  const number =
    scale === 'temporal' && typeof value === 'string'
      ? Date.parse(value)
      : value;
  return typeof number === 'number' &&
    Number.isFinite(number) &&
    (scale === 'linear' || Math.abs(number) <= MAX_EPOCH)
    ? number
    : undefined;
};
