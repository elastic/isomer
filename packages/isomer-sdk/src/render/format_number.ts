/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Compact numeric formatting, shared by anything that has to fit a number into
// a small space — chart axis labels, a `compact` structured display value, a
// text-surface trend line.

const TIERS = [
  { size: 1_000_000_000_000, suffix: 't' },
  { size: 1_000_000_000, suffix: 'b' },
  { size: 1_000_000, suffix: 'm' },
  { size: 1_000, suffix: 'k' },
  { size: 1, suffix: '' },
] as const;

// Rounded to `precision` decimals, trailing zeros dropped.
const trimDecimal = (value: number, precision: number): string =>
  Number.isInteger(value)
    ? String(value)
    : String(Number(value.toFixed(precision)));

/**
 * `1_284` to `1.3k`, `18_200_000` to `18.2m`, through `b` and `t`, with an
 * optional unit appended. `precision` is the decimals kept, `1` by default.
 *
 * `%` joins without a space because "99.2 %" reads wrong; every other unit gets
 * one.
 */
export const formatCompactNumber = (
  value: number,
  unit = '',
  precision = 1
): string => {
  const abs = Math.abs(value);
  let index = TIERS.findIndex(({ size }) => abs >= size);
  if (index === -1) index = TIERS.length - 1;
  // A value that rounds up to the tier's next power, `999.96k`, reads as `1m`.
  if (
    index > 0 &&
    Math.abs(Number((value / TIERS[index]!.size).toFixed(precision))) >= 1_000
  ) {
    index -= 1;
  }
  const { size, suffix } = TIERS[index]!;
  const scaled = `${trimDecimal(value / size, precision)}${suffix}`;

  return unit === '' ? scaled : `${scaled}${unit === '%' ? '' : ' '}${unit}`;
};
