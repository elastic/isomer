/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import type { PortableFormat } from '../schema/format';

import { toEpoch } from './date';
import { defaultFormatFor, formatValue } from './format';
import { dateFormat, numberFormat } from './intl';

const MAY_5_2019 = Date.UTC(2019, 4, 5, 14, 4, 56, 201);

describe('number', () => {
  const number: PortableFormat = { kind: 'number', maximumFractionDigits: 3 };

  it('groups thousands and rounds to the maximum fraction digits', () => {
    expect(formatValue(1234567.891234, number)).toBe('1,234,567.891');
    expect(formatValue(12, number)).toBe('12');
  });

  it('follows the locale', () => {
    expect(formatValue(1234.5, number, { locale: 'de' })).toBe('1.234,5');
    expect(formatValue(1234.5, number, { locale: 'fr' })).toBe('1\u202f234,5');
  });

  it('falls back to English for a locale that is not a valid tag', () => {
    expect(formatValue(1234.5, number, { locale: 'not a locale!' })).toBe(
      '1,234.5'
    );
  });

  it('falls back to English, not the host default, for a well-formed locale the environment lacks', () => {
    expect(numberFormat('zz-ZZ', {}).resolvedOptions().locale).toBe('en');
    expect(dateFormat('zz-ZZ', {}).resolvedOptions().locale).toBe('en');
  });

  it('signs values that do not round to zero with exceptZero', () => {
    const format: PortableFormat = {
      kind: 'number',
      maximumFractionDigits: 0,
      signDisplay: 'exceptZero',
    };
    expect(formatValue(10, format)).toBe('+10');
    expect(formatValue(-10, format)).toBe('-10');
    expect(formatValue(0.0001, format)).toBe('0');
  });

  it('keeps a maximum below the minimum from throwing', () => {
    expect(
      formatValue(1.5, {
        kind: 'number',
        minimumFractionDigits: 2,
        maximumFractionDigits: 1,
      })
    ).toBe('1.50');
  });

  it('never prints zero as -0 unless the format states a sign', () => {
    expect(formatValue(-0, number)).toBe('0');
    expect(formatValue(-0.0001, number)).toBe('0');
    expect(formatValue(-0.00001, { kind: 'percent' })).toBe('0%');
    expect(formatValue(-3, number)).toBe('-3');
  });

  it('compacts large numbers', () => {
    expect(
      formatValue(1_234_000, { kind: 'number', notation: 'compact' })
    ).toBe('1.2M');
  });

  it('parses numeric strings and appends a suffix', () => {
    expect(formatValue('12.5', { ...number, suffix: '/h' })).toBe('12.5/h');
  });

  it('wraps multiple values as a JSON array', () => {
    expect(formatValue([1000, 2000], number)).toBe('["1,000","2,000"]');
  });
});

describe('percent', () => {
  it('formats fractions', () => {
    expect(
      formatValue(0.35, { kind: 'percent', maximumFractionDigits: 1 })
    ).toBe('35%');
    expect(
      formatValue(0.12345, { kind: 'percent', maximumFractionDigits: 1 })
    ).toBe('12.3%');
  });

  it('treats values as percentages when not fractional', () => {
    expect(formatValue(35, { kind: 'percent', fractional: false })).toBe('35%');
  });
});

describe('bytes and bits', () => {
  it.each(['bytes', 'bits'] as const)(
    'keeps %s below a unit boundary in the smaller unit',
    (kind) => {
      expect(
        formatValue(1024 ** 4 - 0.001, {
          kind,
          base: 1024,
          unitDisplay: 'long',
        })
      ).toBe(kind === 'bytes' ? '1,024 gigabytes' : '1,024 gigabits');
      expect(
        formatValue(1024 ** 4, { kind, base: 1024, unitDisplay: 'long' })
      ).toBe(kind === 'bytes' ? '1 terabyte' : '1 terabit');
    }
  );

  it('scales bytes by 1024 by default', () => {
    expect(
      formatValue(5_150_000, { kind: 'bytes', maximumFractionDigits: 1 })
    ).toBe('4.9 MB');
    expect(formatValue(512, { kind: 'bytes' })).toBe('512 byte');
  });

  it('scales by 1000 when asked', () => {
    expect(
      formatValue(5_150_000, {
        kind: 'bytes',
        base: 1000,
        maximumFractionDigits: 2,
      })
    ).toBe('5.15 MB');
  });

  it('scales bits by 1000 and stops at the largest unit', () => {
    expect(formatValue(2500, { kind: 'bits' })).toBe('2.5 kb');
    expect(formatValue(3e15, { kind: 'bits', unitDisplay: 'long' })).toBe(
      '3,000 terabits'
    );
  });
});

describe('duration', () => {
  it('preserves finite values when conversion through milliseconds would overflow', () => {
    const format = {
      kind: 'duration',
      input: 'years',
      useGrouping: false,
    } as const;
    const value = 1e300;
    const expected = `1${'0'.repeat(300)} years`;
    expect(formatValue(value, format)).toBe(expected);
    expect(formatValue(value, { ...format, output: 'years' })).toBe(expected);
  });

  it('picks the largest unit the value is at least one of', () => {
    expect(formatValue(90, { kind: 'duration', input: 'minutes' })).toBe(
      '1.5 hours'
    );
    expect(formatValue(0.5, { kind: 'duration', input: 'seconds' })).toBe(
      '500 milliseconds'
    );
    expect(formatValue(45, { kind: 'duration', input: 'days' })).toBe(
      '1.5 months'
    );
  });

  it('goes below a millisecond, and keeps zero in its input unit', () => {
    expect(formatValue(400, { kind: 'duration', input: 'nanoseconds' })).toBe(
      '400 nanoseconds'
    );
    expect(formatValue(2500, { kind: 'duration', input: 'nanoseconds' })).toBe(
      '2.5 microseconds'
    );
    expect(formatValue(400, { kind: 'duration', input: 'picoseconds' })).toBe(
      '0.4 nanoseconds'
    );
    expect(formatValue(0, { kind: 'duration', input: 'hours' })).toBe(
      '0 hours'
    );
    expect(formatValue(1000, { kind: 'duration', input: 'nanoseconds' })).toBe(
      '1 microsecond'
    );
    expect(formatValue(1000, { kind: 'duration', input: 'microseconds' })).toBe(
      '1 millisecond'
    );
    expect(formatValue(0, { kind: 'duration', input: 'picoseconds' })).toBe(
      '0 nanoseconds'
    );
  });

  it('converts to a stated unit, in short form', () => {
    expect(
      formatValue(1_234_567, {
        kind: 'duration',
        input: 'microseconds',
        output: 'milliseconds',
        maximumFractionDigits: 1,
        unitDisplay: 'short',
      })
    ).toBe('1,234.6 ms');
  });

  it('names units in the locale', () => {
    expect(
      formatValue(2, { kind: 'duration', input: 'hours' }, { locale: 'fr' })
    ).toBe('2\u00a0heures');
  });
});

describe('date', () => {
  it('keeps the default styles when only the clock or zone is stated', () => {
    expect(formatValue(MAY_5_2019, { kind: 'date', hour12: false })).toBe(
      'May 5, 2019, 14:04:56'
    );
    expect(
      formatValue(MAY_5_2019, {
        kind: 'date',
        hour12: true,
        timeZone: '+01:00',
      })
    ).toMatch(/^May 5, 2019, 3:04:56\sPM$/);
  });

  it.each([-8.64e15 - 1, 8.64e15 + 1, Number.MAX_VALUE])(
    'prints an out-of-range epoch %s as it is',
    (epoch) => {
      expect(formatValue(epoch, { kind: 'date' })).toBe(String(epoch));
      expect(toEpoch(epoch)).toBeUndefined();
    }
  );

  it.each([-8.64e15, 8.64e15])(
    'accepts the date range boundary %s',
    (epoch) => {
      expect(toEpoch(epoch)).toBe(epoch);
      expect(() => formatValue(epoch, { kind: 'date' })).not.toThrow();
    }
  );

  it('formats in the format’s time zone', () => {
    expect(
      formatValue(MAY_5_2019, {
        kind: 'date',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'America/Phoenix',
      })
    ).toBe('07:04');
  });

  it('falls back to the context time zone, then UTC', () => {
    const format: PortableFormat = {
      kind: 'date',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    expect(formatValue(MAY_5_2019, format)).toBe('14:04');
    expect(
      formatValue(MAY_5_2019, format, { timeZone: 'Asia/Kathmandu' })
    ).toBe('19:49');
  });

  it('accepts ISO strings and fixed offsets', () => {
    expect(
      formatValue('2019-05-05T14:04:56.201Z', {
        kind: 'date',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: '+10:00',
      })
    ).toBe('05/06/2019');
  });

  it('names months in the locale', () => {
    expect(
      formatValue(MAY_5_2019, { kind: 'date', month: 'long' }, { locale: 'de' })
    ).toBe('Mai');
  });

  it('defaults to a medium date and time', () => {
    expect(formatValue(MAY_5_2019, defaultFormatFor('date'))).toMatch(
      /^May 5, 2019, 2:04:56\sPM$/
    );
  });

  it('rejects a time zone that does not exist', () => {
    expect(() =>
      formatValue(0, { kind: 'date', timeZone: 'Mars/Olympus_Mons' })
    ).toThrow(RangeError);
  });

  it('prints an unparseable date as it is', () => {
    expect(formatValue('soon', { kind: 'date' })).toBe('soon');
  });

  it('reads only ISO date-times with an offset, the same on every host', () => {
    expect(toEpoch('2019-05-05T14:04:56.201Z')).toBe(MAY_5_2019);
    expect(toEpoch('2019-05-05T14:04:56.2Z')).toBe(MAY_5_2019 - 1);
    expect(toEpoch('2019-05-05T14:04:56.201999999Z')).toBe(MAY_5_2019);
    expect(toEpoch('2019-05-05T19:49:56.201+0545')).toBe(MAY_5_2019);
    expect(toEpoch('2019-05-05T10:04:56.201-04:00')).toBe(MAY_5_2019);
    expect(toEpoch('0099-01-01T00:00Z')).toBe(-59_042_995_200_000);
    for (const text of [
      '2026-11-07T10:00',
      'Nov 7 2026 10:00',
      '1',
      '2026-02-30T00:00Z',
    ]) {
      expect(toEpoch(text)).toBeUndefined();
      expect(formatValue(text, { kind: 'date' })).toBe(text);
    }
  });
});

describe('missing values', () => {
  const number: PortableFormat = { kind: 'number' };

  it('defaults to (null), (blank) and NaN', () => {
    expect(formatValue(null, number)).toBe('(null)');
    expect(formatValue(undefined, { kind: 'text' })).toBe('(null)');
    expect(formatValue('', { kind: 'text' })).toBe('(blank)');
    expect(formatValue('abc', number)).toBe('NaN');
  });

  it('appends a suffix to values, not to a missing or empty label', () => {
    const suffixed: PortableFormat = { kind: 'number', suffix: ' ms' };
    expect(formatValue(5, suffixed)).toBe('5 ms');
    expect(formatValue(null, suffixed)).toBe('(null)');
    expect(formatValue('', suffixed)).toBe('(blank)');
    expect(formatValue([1, 2], suffixed)).toBe('["1","2"] ms');
  });
});
