/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { formatDisplayValue } from './format_display_value';

describe('formatDisplayValue', () => {
  it('passes prose strings through untouched', () => {
    expect(formatDisplayValue('healthy')).toBe('healthy');
    expect(formatDisplayValue('3 of 5 nodes')).toBe('3 of 5 nodes');
  });

  it('formats numbers with grouping and precision', () => {
    expect(formatDisplayValue({ raw: 12847 })).toBe('12,847');
    expect(formatDisplayValue({ raw: 3.14159 })).toBe('3.14');
    expect(formatDisplayValue({ raw: 3.1, precision: 3 })).toBe('3.100');
    expect(formatDisplayValue({ raw: 0 })).toBe('0');
  });

  it('formats compact values with k/m scaling', () => {
    expect(formatDisplayValue({ raw: 18200, format: 'compact' })).toBe('18.2k');
    expect(formatDisplayValue({ raw: 2_500_000, format: 'compact' })).toBe(
      '2.5m'
    );
    expect(formatDisplayValue({ raw: 640, format: 'compact' })).toBe('640');
  });

  it('formats percents from fractions', () => {
    expect(
      formatDisplayValue({ raw: 0.992, format: 'percent', precision: 1 })
    ).toBe('99.2%');
    expect(
      formatDisplayValue({ raw: 0.0012, format: 'percent', precision: 2 })
    ).toBe('0.12%');
    expect(formatDisplayValue({ raw: 0.004, format: 'percent' })).toBe('0.4%');
  });

  it('formats currency', () => {
    expect(formatDisplayValue({ raw: 1240.5, format: 'currency' })).toBe(
      '$1,240.50'
    );
    expect(
      formatDisplayValue({
        raw: 900,
        format: 'currency',
        currency: 'EUR',
        precision: 0,
      })
    ).toBe('€900');
  });

  it('formats bytes with base 1024', () => {
    expect(formatDisplayValue({ raw: 512, format: 'bytes' })).toBe('512 B');
    expect(formatDisplayValue({ raw: 1536, format: 'bytes' })).toBe('1.5 KB');
    expect(formatDisplayValue({ raw: 42886758, format: 'bytes' })).toBe(
      '40.9 MB'
    );
  });

  it('formats durations from seconds', () => {
    expect(formatDisplayValue({ raw: 0.186, format: 'duration' })).toBe(
      '186ms'
    );
    expect(formatDisplayValue({ raw: 0.0034, format: 'duration' })).toBe(
      '3.4ms'
    );
    expect(formatDisplayValue({ raw: 2.5, format: 'duration' })).toBe('2.5s');
    expect(formatDisplayValue({ raw: 200, format: 'duration' })).toBe('3m 20s');
    expect(formatDisplayValue({ raw: 7500, format: 'duration' })).toBe('2h 5m');
    expect(formatDisplayValue({ raw: 101_000, format: 'duration' })).toBe(
      '1d 4h'
    );
  });

  it('formats dates in UTC', () => {
    expect(
      formatDisplayValue({ raw: '2026-07-30T10:00:00Z', format: 'date' })
    ).toBe('Jul 30, 2026, 10:00 AM');
  });

  it('formats relative time against a supplied now', () => {
    const now = new Date('2026-07-30T10:00:00Z');
    expect(
      formatDisplayValue(
        { raw: '2026-07-30T09:48:00Z', format: 'relativeTime' },
        { now }
      )
    ).toBe('12m ago');
    expect(
      formatDisplayValue(
        { raw: '2026-07-30T12:00:00Z', format: 'relativeTime' },
        { now }
      )
    ).toBe('in 2h');
    expect(
      formatDisplayValue(
        { raw: '2026-07-30T09:59:50Z', format: 'relativeTime' },
        { now }
      )
    ).toBe('just now');
  });

  it('falls back to the raw string when a numeric format receives one', () => {
    expect(formatDisplayValue({ raw: 'n/a', format: 'percent' })).toBe('n/a');
    expect(formatDisplayValue({ raw: 'not a date', format: 'date' })).toBe(
      'not a date'
    );
  });
});
