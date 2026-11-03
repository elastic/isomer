/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { formatValue, type ValueFormat } from './format';

// Expected strings are `@elastic/numeral` output for the pattern Lens builds
// from each format (`supported_formats.ts` `decimalsToPattern`), captured in Kibana.
const CASES: Array<[number, ValueFormat | undefined, string, string]> = [
  [1234.5678, undefined, '0,0.[000]', '1,234.568'],
  [12, undefined, '0,0.[000]', '12'],
  [0, undefined, '0,0.[000]', '0'],
  [-0.0004, undefined, '0,0.[000]', '0'],
  [1234.5, { kind: 'number' }, '0,0.00', '1,234.50'],
  [-1234.5, { kind: 'number' }, '0,0.00', '-1,234.50'],
  [1.005, { kind: 'number' }, '0,0.00', '1.01'],
  [1234, { kind: 'number', decimals: 0 }, '0,0', '1,234'],
  [2.5, { kind: 'number', decimals: 0 }, '0,0', '3'],
  [-2.5, { kind: 'number', decimals: 0 }, '0,0', '-2'],
  [1234, { kind: 'number', compact: true }, '0,0.00a', '1.23k'],
  [123, { kind: 'number', compact: true }, '0,0.00a', '123.00'],
  [0.000001, { kind: 'number', compact: true }, '0,0.00a', '0.00'],
  [13014, { kind: 'number', decimals: 1, compact: true }, '0,0.0a', '13.0k'],
  [1500000, { kind: 'number', decimals: 1, compact: true }, '0,0.0a', '1.5m'],
  [
    999999,
    { kind: 'number', decimals: 1, compact: true },
    '0,0.0a',
    '1,000.0k',
  ],
  [1e12, { kind: 'number', decimals: 1, compact: true }, '0,0.0a', '1.0t'],
  [1e15, { kind: 'number', decimals: 1, compact: true }, '0,0.0a', '1,000.0t'],
  [-1500, { kind: 'number', decimals: 1, compact: true }, '0,0.0a', '-1.5k'],
  [0.1234, { kind: 'percent' }, '0,0.00%', '12.34%'],
  [0.5, { kind: 'percent', decimals: 0 }, '0,0%', '50%'],
  [12.345, { kind: 'percent', compact: true }, '0,0.00a%', '1.23k%'],
  [1536, { kind: 'bytes' }, '0,0.00b', '1.50KB'],
  [1023, { kind: 'bytes', decimals: 0 }, '0,0b', '1,023B'],
  [1500, { kind: 'bits' }, '0,0.00bitd', '1.50kbit'],
  [999, { kind: 'bits' }, '0,0.00bitd', '999.00bit'],
  [1500000, { kind: 'bits', decimals: 0 }, '0,0bitd', '2Mbit'],
];

describe('formatValue', () => {
  it.each(CASES)(
    'formats %s like numeral `%s`',
    (value, format, _pattern, expected) => {
      expect(formatValue(value, format)).toBe(expected);
    }
  );

  it('appends a suffix after the unit', () => {
    expect(
      formatValue(1048576, { kind: 'bytes', decimals: 0, suffix: '/s' })
    ).toBe('1MB/s');
    expect(formatValue(0.25, { kind: 'percent', suffix: ' of quota' })).toBe(
      '25.00% of quota'
    );
  });
});
