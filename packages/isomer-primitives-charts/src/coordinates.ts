/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MAX_EPOCH = 8.64e15;

export const coordinateOf = (
  cell: unknown,
  scale: 'linear' | 'temporal'
): number | undefined => {
  const value: unknown = Array.isArray(cell)
    ? cell.find((entry: unknown) => entry !== null)
    : cell;
  const number: unknown =
    scale === 'temporal' && typeof value === 'string'
      ? Date.parse(value)
      : value;
  return typeof number === 'number' &&
    Number.isFinite(number) &&
    (scale === 'linear' || Math.abs(number) <= MAX_EPOCH)
    ? number
    : undefined;
};

export const coordinateScale = (
  types: readonly string[]
): 'linear' | 'temporal' | undefined => {
  if (new Set(types).size !== 1) {
    return undefined;
  }
  return types[0] === 'number'
    ? 'linear'
    : types[0] === 'date'
      ? 'temporal'
      : undefined;
};
