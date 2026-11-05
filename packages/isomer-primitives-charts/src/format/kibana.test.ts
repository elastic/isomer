/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Expected strings from Kibana's field format tests, unchanged:
// src/platform/plugins/shared/field_formats/common/converters/{number,bytes,percent,duration}.test.ts
// and src/platform/plugins/shared/field_formats/server/lib/converters/date_server.test.ts.

import { describe, expect, it } from 'vitest';

import type { DurationUnit, PortableFormat } from '../schema/format';

import { formatValue } from './format';
import { kibanaDurationCases } from './kibana_duration.fixtures';

describe('number (number.test.ts)', () => {
  const number = (
    extra: Partial<Extract<PortableFormat, { kind: 'number' }>> = {}
  ): PortableFormat => ({ kind: 'number', pattern: '0,0.[000]', ...extra });

  it('formats with the default pattern', () => {
    expect(formatValue(12.345678, number())).toBe('12.346');
  });

  it('adds a sign only when the value does not round to zero', () => {
    const format = number({ pattern: '0,0', alwaysShowSign: true });
    expect(formatValue(10, format)).toBe('+10');
    expect(formatValue(-10, format)).toBe('-10');
    expect(formatValue(0, format)).toBe('0');
    expect(formatValue(0.0001, format)).toBe('0');
    expect(formatValue(-0.0001, format)).toBe('0');
  });

  it('parses numeric strings', () => {
    expect(formatValue('12.345678', number({ pattern: '0,0' }))).toBe('12');
  });

  it('formats null as the null label', () => {
    expect(formatValue(null, number())).toBe('(null)');
  });

  it('wraps multiple values as a JSON array, even one', () => {
    expect(formatValue([1000, 2000], number({ pattern: '0,0' }))).toBe(
      '["1,000","2,000"]'
    );
    expect(formatValue([1000], number({ pattern: '0,0' }))).toBe('["1,000"]');
  });
});

describe('bytes (bytes.test.ts)', () => {
  it('formats with a pattern', () => {
    expect(formatValue(5150000, { kind: 'bytes', pattern: '0,0.[000]b' })).toBe(
      '4.911MB'
    );
    expect(formatValue('5150000', { kind: 'bytes', pattern: '0,0b' })).toBe(
      '5MB'
    );
  });

  it('formats missing and multiple values', () => {
    const format: PortableFormat = { kind: 'bytes', pattern: '0,0.[000]b' };
    expect(formatValue(null, format)).toBe('(null)');
    expect(formatValue(undefined, format)).toBe('(null)');
    expect(formatValue([1024, 2048], format)).toBe('["1KB","2KB"]');
    expect(formatValue([1024], format)).toBe('["1KB"]');
  });
});

describe('percent (percent.test.ts)', () => {
  it('formats fractions', () => {
    expect(
      formatValue(0.99999, { kind: 'percent', pattern: '0,0.[000]%' })
    ).toBe('99.999%');
    expect(formatValue('0.99999', { kind: 'percent', pattern: '0,0%' })).toBe(
      '100%'
    );
  });

  it('treats values as percent units when not fractional', () => {
    const format: PortableFormat = {
      kind: 'percent',
      pattern: '0,0.[000]%',
      fractional: false,
    };
    expect(formatValue(35, format)).toBe('35%');
    expect(formatValue(3500, format)).toBe('3,500%');
    expect(formatValue('35', format)).toBe('35%');
    expect(formatValue(null, format)).toBe('(null)');
  });

  it('formats multiple values', () => {
    const format: PortableFormat = { kind: 'percent', pattern: '0,0.[000]%' };
    expect(formatValue([0.5, 0.75], format)).toBe('["50%","75%"]');
    expect(formatValue([0.5], format)).toBe('["50%"]');
  });
});

describe('duration (duration.test.ts)', () => {
  const output = (kibana: string) =>
    kibana.startsWith('as')
      ? (kibana.slice(2).toLowerCase() as DurationUnit)
      : (kibana as 'humanize' | 'humanizePrecise');

  const rows = kibanaDurationCases.flatMap((testCase) =>
    testCase.fixtures.map(({ input, output: expected }) => ({
      name: `${input} ${testCase.inputFormat} through ${testCase.outputFormat}${
        testCase.outputPrecision === undefined
          ? ''
          : `, ${testCase.outputPrecision} decimals`
      }`,
      input,
      expected,
      format: {
        kind: 'duration',
        input: testCase.inputFormat as DurationUnit,
        output: output(testCase.outputFormat),
        ...(testCase.outputPrecision === undefined
          ? {}
          : { decimals: testCase.outputPrecision }),
        ...(testCase.showSuffix === undefined
          ? {}
          : { showSuffix: testCase.showSuffix }),
        ...(testCase.useShortSuffix === undefined
          ? {}
          : { useShortSuffix: testCase.useShortSuffix }),
        ...(testCase.includeSpaceWithSuffix === undefined
          ? {}
          : { includeSpaceWithSuffix: testCase.includeSpaceWithSuffix }),
      } as PortableFormat,
    }))
  );

  it('ports every fixture', () => {
    expect(rows.length).toBe(91);
  });

  it.each(rows)('$name', ({ input, expected, format }) => {
    expect(formatValue(input, format)).toBe(expected);
  });

  it('formats multiple values', () => {
    const format: PortableFormat = {
      kind: 'duration',
      input: 'seconds',
      output: 'humanize',
    };
    expect(formatValue([60, 3600], format)).toBe('["a minute","an hour"]');
    expect(formatValue([60], format)).toBe('["a minute"]');
  });
});

describe('date (date_server.test.ts)', () => {
  const dateTime = '2019-05-05T14:04:56.201Z';
  const date = (pattern: string, timeZone: string): PortableFormat => ({
    kind: 'date',
    pattern,
    timeZone,
  });

  it('formats in the given time zone', () => {
    expect(
      formatValue(
        dateTime,
        date('MMMM Do YYYY, HH:mm:ss.SSS', 'America/Phoenix')
      )
    ).toBe('May 5th 2019, 07:04:56.201');
  });

  it('formats in UTC', () => {
    expect(
      formatValue(dateTime, date('MMMM Do YYYY, HH:mm:ss.SSS', 'UTC'))
    ).toBe('May 5th 2019, 14:04:56.201');
    expect(formatValue(dateTime, date('YYYY-MM-DD', 'UTC'))).toBe('2019-05-05');
  });

  it('formats missing values as the null label', () => {
    expect(formatValue(null, date('YYYY', 'UTC'))).toBe('(null)');
    expect(formatValue(undefined, date('YYYY', 'UTC'))).toBe('(null)');
  });
});

describe('Lens suffix (suffix_formatter.test.ts)', () => {
  it('appends the suffix to the formatted value', () => {
    expect(
      formatValue(12345, { kind: 'number', pattern: '0', suffix: '/h' })
    ).toBe('12345/h');
  });
});
