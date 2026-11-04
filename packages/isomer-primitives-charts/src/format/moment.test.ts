/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Kibana formats dates with Moment Timezone and durations with Moment. Both are
// test-only oracles here, at the versions Kibana pins.

import moment from 'moment-timezone';
import { describe, expect, it } from 'vitest';

import { formatDate } from './date';
import { formatDuration } from './duration';

const PATTERNS = [
  'MMM D, YYYY @ HH:mm:ss.SSS',
  'MMMM Do YYYY, HH:mm:ss.SSS',
  'YYYY-MM-DD',
  'YYYY-MM-DDTHH:mm:ss.SSSZ',
  'HH:mm',
  'HH:mm:ss.SSS',
  'MMM D',
  'YYYY-MM',
  'YYYY',
  'dddd, MMMM Do YYYY, h:mm:ss a',
  'ddd dd d do e E',
  'Q Qo M Mo MM MMM',
  'D Do DD DDD DDDo DDDD',
  'w wo ww W Wo WW gg gggg GG GGGG',
  'H HH h hh k kk A a m mm s ss',
  'S SS SSS SSSS SSSSSS SSSSSSSSS',
  'Z ZZ X x',
  'YY Y YYYYY',
  'Hmm Hmmss hmm hmmss',
  'L LL LLL LLLL LT LTS l ll lll llll',
  '[Week] W [of] GGGG, [at] HH:mm',
  'YYYY \\Y MM',
];

const ZONES = [
  'UTC',
  'America/Phoenix',
  'America/New_York',
  'Europe/Paris',
  'Asia/Kolkata',
  'Asia/Kathmandu',
  'Australia/Lord_Howe',
  'Pacific/Chatham',
  'America/St_Johns',
];

const INSTANTS = [
  Date.UTC(2019, 4, 5, 14, 4, 56, 201),
  Date.UTC(2026, 10, 3, 0, 0, 0, 0),
  Date.UTC(2026, 0, 1, 0, 30, 0, 7),
  Date.UTC(2020, 11, 31, 23, 59, 59, 999),
  Date.UTC(2021, 0, 3, 12, 0, 0, 0),
  // Around daylight-saving changes in New York and Paris.
  Date.UTC(2024, 2, 10, 6, 59, 59, 0),
  Date.UTC(2024, 2, 10, 7, 0, 0, 0),
  Date.UTC(2024, 9, 27, 0, 59, 0, 0),
  Date.UTC(2024, 9, 27, 1, 0, 0, 0),
  Date.UTC(2000, 1, 29, 12, 0, 0, 450),
  Date.UTC(1970, 0, 1, 0, 0, 0, 0),
  Date.UTC(1969, 11, 31, 23, 59, 59, 500),
];

describe('formatDate against Moment Timezone', () => {
  const rows = PATTERNS.flatMap((pattern) =>
    ZONES.map((zone) => ({ pattern, zone }))
  );

  it.each(rows)('$pattern in $zone', ({ pattern, zone }) => {
    for (const instant of INSTANTS) {
      expect(formatDate(instant, pattern, zone)).toBe(
        moment.utc(instant).tz(zone).format(pattern)
      );
    }
  });

  it('formats fixed offsets as Moment does with utcOffset', () => {
    for (const instant of INSTANTS) {
      expect(formatDate(instant, 'YYYY-MM-DD HH:mm Z', '+05:30')).toBe(
        moment.utc(instant).utcOffset('+05:30').format('YYYY-MM-DD HH:mm Z')
      );
      expect(formatDate(instant, 'YYYY-MM-DD HH:mm Z', '-03:00')).toBe(
        moment.utc(instant).utcOffset('-03:00').format('YYYY-MM-DD HH:mm Z')
      );
    }
  });

  it('rejects a zone that does not exist', () => {
    expect(() => formatDate(0, 'YYYY', 'Mars/Olympus_Mons')).toThrow(
      RangeError
    );
  });
});

describe('formatDuration against Moment', () => {
  const UNITS = [
    'milliseconds',
    'seconds',
    'minutes',
    'hours',
    'days',
    'weeks',
    'months',
    'years',
  ] as const;
  const VALUES = [
    1, 2, 30, 44, 45, 59, 61, 89, 90, 120, 1_000, 3_599, 3_600, 86_399, 86_400,
    1e6, 2.6e6, 3.1e7, 1e9, 0.5, 1.5, 7, 13, 400,
  ];

  it.each(UNITS)('humanizes %s as Moment does', (unit) => {
    for (const value of VALUES) {
      expect(formatDuration(value, { input: unit, output: 'humanize' })).toBe(
        moment.duration(value, unit).humanize()
      );
    }
  });

  it.each(UNITS)('converts %s to every unit as Moment does', (unit) => {
    for (const value of VALUES) {
      for (const output of UNITS) {
        expect(
          formatDuration(value, { input: unit, output, decimals: 4 })
        ).toBe(moment.duration(value, unit).as(output).toFixed(4));
      }
    }
  });
});
