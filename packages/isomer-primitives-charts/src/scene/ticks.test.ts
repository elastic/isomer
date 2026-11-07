/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { scaleLinear, scaleLog, scaleUtc } from 'd3-scale';
import { describe, expect, it } from 'vitest';

import { formatValue } from '../format/format';

import {
  linearTicks,
  logTicks,
  niceDomain,
  niceLogDomain,
  niceTimeDomain,
  timeTicks,
} from './ticks';

describe('d3 parity', () => {
  it.each([
    [0, 97],
    [-3.2, 7.9],
    [0.001, 1000],
    [1e-21, 2e-21],
  ])('follows d3 for linear ticks and domains over [%d, %d]', (min, max) => {
    const scale = scaleLinear().domain([min, max]);
    expect(linearTicks(min, max, 5)).toEqual(scale.ticks(5));
    expect(niceDomain(min, max, 5)).toEqual(scale.nice(5).domain());
  });

  it.each([
    [1, 1000],
    [3, 70_000],
  ])('follows d3 for log ticks and domains over [%d, %d]', (min, max) => {
    const scale = scaleLog().domain([min, max]);
    expect(logTicks(min, max, 5)).toEqual(scale.ticks(5));
    expect(niceLogDomain(min, max)).toEqual(scale.nice().domain());
  });

  it.each([
    [100, 900],
    [Date.UTC(2026, 0, 1), Date.UTC(2026, 0, 2)],
    [Date.UTC(2026, 0, 1), Date.UTC(2026, 1, 10)],
    [Date.UTC(2026, 0, 1), Date.UTC(2027, 0, 1)],
    [Date.UTC(2000, 0, 1), Date.UTC(2050, 0, 1)],
  ])('follows d3 for UTC time ticks from %d to %d', (min, max) => {
    const scale = scaleUtc().domain([min, max]);
    expect(timeTicks(min, max, 5, 'UTC')).toEqual(scale.ticks(5).map(Number));
    expect(niceTimeDomain(min, max, 5, 'UTC')).toEqual(
      scale.nice(5).domain().map(Number)
    );
  });

  it('widens a single value by 2%, or to [0, 1] at zero', () => {
    expect(niceDomain(100, 100, 5)).toEqual([98, 102]);
    expect(niceDomain(0, 0, 5)).toEqual([0, 1]);
    expect(linearTicks(1e20, 1e20, 5)).toEqual([1e20]);
  });

  it.each([
    [Number.MAX_VALUE, Number.MAX_VALUE],
    [-Number.MAX_VALUE, -Number.MAX_VALUE],
    [0, Number.MAX_VALUE],
    [-Number.MAX_VALUE, Number.MAX_VALUE],
  ])('keeps domains over [%d, %d] finite', (min, max) => {
    const [low, high] = niceDomain(min, max, 5);
    expect([Number.isFinite(low), Number.isFinite(high)]).toEqual([true, true]);
    expect(low).toBeLessThanOrEqual(min);
    expect(high).toBeGreaterThanOrEqual(max);
    expect(linearTicks(low, high, 5).every(Number.isFinite)).toBe(true);
  });

  it('keeps log domains up to the largest double finite', () => {
    expect(niceLogDomain(1, Number.MAX_VALUE)).toEqual([1, Number.MAX_VALUE]);
  });
});

describe('calendar ticks', () => {
  it('rounds temporal domains out to calendar boundaries', () => {
    expect(
      niceTimeDomain(Date.UTC(2026, 0, 12), Date.UTC(2026, 10, 20), 5, 'UTC')
    ).toEqual([Date.UTC(2026, 0, 1), Date.UTC(2027, 0, 1)]);
  });

  it('places weekly ticks on Sundays', () => {
    const ticks = timeTicks(
      Date.UTC(2026, 0, 1),
      Date.UTC(2026, 0, 31),
      5,
      'UTC'
    );
    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks.every((tick) => new Date(tick).getUTCDay() === 0)).toBe(true);
  });
});

describe('wall-clock ticks in a zone', () => {
  it('keeps daily ticks at midnight across both DST transitions', () => {
    for (const [start, end] of [
      ['2026-03-06T05:00:00Z', '2026-03-11T04:00:00Z'],
      ['2026-10-30T04:00:00Z', '2026-11-04T05:00:00Z'],
    ]) {
      const ticks = timeTicks(
        Date.parse(start!),
        Date.parse(end!),
        6,
        'America/New_York'
      );
      const hours = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/New_York',
        hour: '2-digit',
      });
      expect(ticks.length).toBeGreaterThan(2);
      expect(ticks.map((tick) => hours.format(tick))).toEqual(
        ticks.map(() => '00')
      );
    }
  });

  it('starts each day on its own date when DST skips midnight', () => {
    // Santiago skips 2026-09-06 00:00; that day starts at 01:00.
    const zone = 'America/Santiago';
    const ticks = timeTicks(
      Date.UTC(2026, 8, 4, 12),
      Date.UTC(2026, 8, 9, 12),
      5,
      zone
    );
    const local = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      dateStyle: 'short',
      timeStyle: 'short',
      hourCycle: 'h23',
    });
    expect(ticks.map((tick) => local.format(tick))).toEqual([
      '2026-09-05, 00:00',
      '2026-09-06, 01:00',
      '2026-09-07, 00:00',
      '2026-09-08, 00:00',
      '2026-09-09, 00:00',
    ]);
  });

  it('rounds a domain down across a repeated local hour', () => {
    // Helsinki repeats 03:00–04:00 local on 2026-10-25.
    const min = Date.parse('2026-10-25T00:30:00Z');
    const [low, high] = niceTimeDomain(
      min,
      Date.parse('2026-10-25T12:30:00Z'),
      5,
      'Europe/Helsinki'
    );
    expect(low).toBe(Date.parse('2026-10-25T00:00:00Z'));
    expect(low).toBeLessThanOrEqual(min);
    expect(high).toBeGreaterThanOrEqual(Date.parse('2026-10-25T12:30:00Z'));
  });

  it.each([
    [
      'the second occurrence',
      '2026-11-01T06:10Z',
      '2026-11-01T06:50Z',
      ['06:15', '06:30', '06:45'],
    ],
    [
      'both occurrences',
      '2026-11-01T05:00Z',
      '2026-11-01T07:00Z',
      ['05:00', '05:30', '06:00', '06:30', '07:00'],
    ],
    [
      'the end of the first occurrence and the start of the second',
      '2026-11-01T05:50Z',
      '2026-11-01T06:10Z',
      ['05:50', '05:55', '06:00', '06:05', '06:10'],
    ],
  ])(
    'ticks %s of a repeated hour as densely as UTC',
    (_, from, to, expected) => {
      // New York repeats 01:00–02:00 local on 2026-11-01.
      const [min, max] = [Date.parse(from), Date.parse(to)];
      const iso = (ticks: number[]) =>
        ticks.map((tick) => new Date(tick).toISOString().slice(11, 16));
      expect(iso(timeTicks(min, max, 4, 'America/New_York'))).toEqual(expected);
      expect(iso(timeTicks(min, max, 4, 'UTC'))).toEqual(expected);
    }
  );

  it('rounds each end of a range across a repeated hour in its own offset', () => {
    // 01:47 EDT to 01:13 EST.
    expect(
      niceTimeDomain(
        Date.parse('2026-11-01T05:47Z'),
        Date.parse('2026-11-01T06:13Z'),
        5,
        'America/New_York'
      )
    ).toEqual([
      Date.parse('2026-11-01T05:45Z'),
      Date.parse('2026-11-01T06:15Z'),
    ]);
  });

  it('keeps hourly ticks on local hours, moving a skipped hour to the change', () => {
    const ticks = timeTicks(
      Date.parse('2026-10-03T13:30:00Z'),
      Date.parse('2026-10-03T19:00:00Z'),
      6,
      'Australia/Lord_Howe'
    );
    expect(ticks.length).toBeGreaterThan(2);
    const format = new Intl.DateTimeFormat('en', {
      timeZone: 'Australia/Lord_Howe',
      minute: '2-digit',
    });
    expect(ticks.map((t) => format.format(t))).toEqual([
      '0',
      '0',
      '30',
      '0',
      '0',
      '0',
      '0',
    ]);
  });

  it.each([
    [
      '2026-03-07T05:00Z',
      '2026-03-14T04:00Z',
      [
        '2026-03-07T05:00Z',
        '2026-03-09T04:00Z',
        '2026-03-11T04:00Z',
        '2026-03-13T04:00Z',
      ],
    ],
    [
      '2026-10-31T04:00Z',
      '2026-11-06T05:00Z',
      [
        '2026-10-31T04:00Z',
        '2026-11-01T04:00Z',
        '2026-11-03T05:00Z',
        '2026-11-05T05:00Z',
      ],
    ],
  ] as const)(
    'keeps two-day ticks at local midnight across %s',
    (from, to, expected) => {
      expect(
        timeTicks(Date.parse(from), Date.parse(to), 4, 'America/New_York')
      ).toEqual(expected.map((date) => Date.parse(date)));
    }
  );

  it('rounds a domain across a half-hour DST jump out to local hours', () => {
    const zone = 'Australia/Lord_Howe';
    const min = Date.parse('2026-10-03T11:30Z');
    const max = Date.parse('2026-10-03T15:40Z');
    const [low, high] = niceTimeDomain(min, max, 5, zone);
    const minutes = new Intl.DateTimeFormat('en', {
      timeZone: zone,
      minute: '2-digit',
    });
    expect(low).toBeLessThanOrEqual(min);
    expect(high).toBeGreaterThanOrEqual(max);
    expect([minutes.format(low), minutes.format(high)]).toEqual(['0', '0']);
  });
});

describe('single instants and Date bounds', () => {
  it.each(['2026-01-01T00:00:00Z', '2026-01-01T12:00:00Z'])(
    'uses calendar-day bounds for a singleton time at %s',
    (iso) => {
      const t = Date.parse(iso);
      const [low, high] = niceTimeDomain(t, t, 5, 'UTC');
      expect([low, high]).toEqual([
        Date.parse('2026-01-01T00:00:00Z'),
        Date.parse('2026-01-02T00:00:00Z'),
      ]);
      const ticks = timeTicks(low, high, 5, 'UTC');
      const labels = ticks.map((value) => formatValue(value, { kind: 'date' }));
      expect(new Set(labels).size).toBe(labels.length);
    }
  );

  it.each([
    ['2026-03-08T12:00:00Z', '2026-03-08T05:00:00Z', '2026-03-09T04:00:00Z'],
    ['2026-11-01T12:00:00Z', '2026-11-01T04:00:00Z', '2026-11-02T05:00:00Z'],
  ])(
    'keeps singleton calendar-day bounds across DST at %s',
    (iso, low, high) => {
      const t = Date.parse(iso);
      expect(niceTimeDomain(t, t, 5, 'America/New_York')).toEqual([
        Date.parse(low),
        Date.parse(high),
      ]);
    }
  );

  it.each([-1, 1])(
    'keeps nearby Date-boundary ranges representable on side %s',
    (sign) => {
      const edge = sign * 8.64e15;
      const other = edge - sign * 3 * 86400000;
      for (const zone of ['UTC', 'Pacific/Kiritimati', 'Etc/GMT+12']) {
        for (const count of [2, 5, 10]) {
          const [low, high] = niceTimeDomain(
            Math.min(edge, other),
            Math.max(edge, other),
            count,
            zone
          );
          expect(low).toBeGreaterThanOrEqual(-8.64e15);
          expect(high).toBeLessThanOrEqual(8.64e15);
          expect(
            timeTicks(low, high, count, zone).every(
              (tick) => Number.isFinite(tick) && Math.abs(tick) <= 8.64e15
            )
          ).toBe(true);
        }
      }
    }
  );
});
