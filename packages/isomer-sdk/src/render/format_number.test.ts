/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { formatCompactNumber } from './format_number';

describe('formatCompactNumber', () => {
  it.each([
    [0, '0'],
    [999, '999'],
    [12.34, '12.3'],
    [1_284, '1.3k'],
    [18_200_000, '18.2m'],
    [1_500_000_000, '1.5b'],
    [2_000_000_000_000, '2t'],
    [-1_284, '-1.3k'],
  ])('formats %d as %s', (value, expected) => {
    expect(formatCompactNumber(value)).toBe(expected);
  });

  it('promotes a value that rounds up to the next tier', () => {
    expect(formatCompactNumber(999_950)).toBe('1m');
    expect(formatCompactNumber(999.96)).toBe('1k');
  });

  it('appends a unit, joining % without a space', () => {
    expect(formatCompactNumber(1_284, 'req')).toBe('1.3k req');
    expect(formatCompactNumber(99.2, '%')).toBe('99.2%');
  });

  it('rounds to the given precision, dropping trailing zeros', () => {
    expect(formatCompactNumber(1_284, '', 2)).toBe('1.28k');
    expect(formatCompactNumber(1_200, '', 2)).toBe('1.2k');
    expect(formatCompactNumber(1_284, '', 0)).toBe('1k');
  });
});
