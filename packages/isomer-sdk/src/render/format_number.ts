/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Compact numeric formatting, shared by anything that has to fit a number into
// a small space — chart axis labels, a `compact` structured display value, a
// text-surface trend line.

/** Integers whole, everything else to one decimal with a trailing `.0` dropped. */
const trimDecimal = (value: number): string =>
  Number.isInteger(value)
    ? String(value)
    : value.toFixed(1).replace(/\.0$/, '');

/**
 * `1_284` to `1.3k`, `18_200_000` to `18.2m`, with an optional unit appended.
 *
 * `%` joins without a space because "99.2 %" reads wrong; every other unit gets
 * one.
 */
export const formatCompactNumber = (value: number, unit = ''): string => {
  const abs = Math.abs(value);
  const scaled =
    abs >= 1_000_000
      ? `${trimDecimal(value / 1_000_000)}m`
      : abs >= 1_000
        ? `${trimDecimal(value / 1_000)}k`
        : trimDecimal(value);

  return unit === '' ? scaled : `${scaled}${unit === '%' ? '' : ' '}${unit}`;
};
