/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The two-row time axis as Lens draws it: minor labels beside the plot, major
// labels below, at the round times of the axis's zone. Elastic Charts' own
// rasters are compared case by case in `isomer-charts-elastic`
// (`src/time_axis.test.ts`); these state the labels Lens shows.

import { describe, expect, it, vi } from 'vitest';

import { xyChartExamples } from '../schema/examples/xy_chart';
import type { XyChartNode } from '../schema/xy_chart';

import { resolveChart } from './resolve';
import type { TimeTicksInput } from './time_axis';
import { resolveTimeTicks, timeTicksAt } from './time_axis';
import type { SceneTimeTicks } from './types';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const ticksFor = (input: TimeTicksInput): SceneTimeTicks => {
  const ticks = resolveTimeTicks(input);
  if (!ticks) {
    throw new Error('no raster fits');
  }
  return ticks;
};

/** Each labeled row's labels at `width`: row 0, then row 1. */
const rows = (ticks: SceneTimeTicks, width: number) => {
  const { layers } = timeTicksAt(ticks, width);
  return [0, 1].map((row) =>
    layers
      .filter((layer) => layer.labeled && layer.row === row)
      .flatMap(({ ticks: layer }) => layer.map(({ label }) => label))
  );
};

/** Every tick time of a row at `width`, ISO. */
const times = (ticks: SceneTimeTicks, width: number, row: number) =>
  timeTicksAt(ticks, width)
    .layers.filter((layer) => layer.labeled && layer.row === row)
    .flatMap(({ ticks: layer }) =>
      layer.map(({ at }) => new Date(at).toISOString())
    );

describe('resolveTimeTicks', () => {
  it('labels minutes by the hour and minute, under the day', () => {
    const min = Date.UTC(2026, 10, 3, 23, 10);
    const ticks = ticksFor({
      min,
      max: min + 119 * MINUTE,
      interval: MINUTE,
      extend: false,
      locale: 'en',
      timeZone: 'UTC',
    });
    expect(rows(ticks, 800)).toEqual([
      ['23:15', '23:30', '23:45', '00:00', '00:15', '00:30', '00:45', '01:00'],
      ['November 3, 2026', 'November 4, 2026'],
    ]);
    // Narrower, the minor row coarsens to hours.
    expect(rows(ticks, 300)).toEqual([
      ['00:00', '01:00'],
      ['November 3, 2026', 'November 4, 2026'],
    ]);
  });

  it('draws a major label that starts before the domain at the domain, but drops such a minor one', () => {
    const min = Date.UTC(2026, 10, 3, 23, 10);
    const ticks = ticksFor({
      min,
      max: min + 119 * MINUTE,
      interval: MINUTE,
      extend: false,
      locale: 'en',
      timeZone: 'UTC',
    });
    expect(times(ticks, 800, 1)[0]).toBe('2026-11-03T00:00:00.000Z');
    expect(times(ticks, 800, 0)[0]).toBe('2026-11-03T23:15:00.000Z');
  });

  it('labels hours in the zone’s wall-clock time, repeating the hour daylight saving repeats', () => {
    // 2026-11-01 in New York: 01:00 happens twice, and the day lasts 25 hours.
    const min = Date.UTC(2026, 10, 1, 4);
    const ticks = ticksFor({
      min,
      max: min + 24 * HOUR,
      interval: HOUR,
      extend: false,
      locale: 'en',
      timeZone: 'America/New_York',
    });
    const [minor, major] = rows(ticks, 2000);
    expect(minor!.slice(0, 5)).toEqual([
      '00:00',
      '01:00',
      '01:00',
      '02:00',
      '03:00',
    ]);
    expect(minor).toHaveLength(25);
    expect(major).toEqual(['November 1, 2026']);
    // Narrower, six-hour ticks stay on round local times.
    expect(rows(ticks, 700)).toEqual([
      ['00:00', '06:00', '12:00', '18:00'],
      ['November 1, 2026'],
    ]);
    expect(times(ticks, 700, 0)).toEqual([
      '2026-11-01T04:00:00.000Z',
      '2026-11-01T11:00:00.000Z',
      '2026-11-01T17:00:00.000Z',
      '2026-11-01T23:00:00.000Z',
    ]);
  });

  it('skips the hour daylight saving skips, and starts each day at local midnight', () => {
    // 2026-03-08 in New York: 02:00 never happens.
    const min = Date.UTC(2026, 2, 8, 4);
    const ticks = ticksFor({
      min,
      max: min + 12 * HOUR,
      interval: HOUR,
      extend: false,
      locale: 'en',
      timeZone: 'America/New_York',
    });
    const [minor, major] = rows(ticks, 900);
    expect(minor!.slice(0, 4)).toEqual(['23:00', '00:00', '01:00', '03:00']);
    expect(major).toEqual(['March 7, 2026', 'March 8, 2026']);
    expect(times(ticks, 900, 1)).toEqual([
      '2026-03-07T05:00:00.000Z',
      '2026-03-08T05:00:00.000Z',
    ]);
  });

  it('labels days by their ordinal in English and their number elsewhere, under the month', () => {
    const input = {
      min: Date.UTC(2026, 9, 1),
      max: Date.UTC(2026, 9, 1) + 60 * DAY,
      interval: DAY,
      extend: true,
      timeZone: 'UTC',
    };
    expect(rows(ticksFor({ ...input, locale: 'en' }), 1500)).toEqual([
      ['5th', '12th', '19th', '26th', '2nd', '9th', '16th', '23rd', '30th'],
      ['October 2026', 'November 2026', 'December 2026'],
    ]);
    expect(rows(ticksFor({ ...input, locale: 'de' }), 1500)).toEqual([
      ['5', '12', '19', '26', '2', '9', '16', '23', '30'],
      ['Oktober 2026', 'November 2026', 'Dezember 2026'],
    ]);
  });

  it('labels months by their short name, under the year, and years alone when narrow', () => {
    const ticks = ticksFor({
      min: Date.UTC(2024, 0, 1),
      max: Date.UTC(2026, 11, 1),
      interval: 30 * DAY,
      extend: true,
      locale: 'en',
      timeZone: 'UTC',
    });
    expect(rows(ticks, 1200)).toEqual([
      [
        ...['Jan', 'Apr', 'Jul', 'Oct'],
        ...['Jan', 'Apr', 'Jul', 'Oct'],
        ...['Jan', 'Apr', 'Jul', 'Oct'],
      ],
      ['2024', '2025', '2026'],
    ]);
    expect(rows(ticks, 400)).toEqual([['2024', '2025', '2026'], []]);
  });

  it('starts weeks on Monday in the axis’s zone', () => {
    const min = Date.UTC(2026, 9, 31, 4);
    const ticks = ticksFor({
      min,
      max: min + 71 * HOUR,
      interval: HOUR,
      extend: true,
      locale: 'en',
      timeZone: 'America/New_York',
    });
    const weeks = timeTicksAt(ticks, 600).layers.find(
      (layer) => !layer.labeled && layer.row === 1
    );
    // Monday, November 2, 2026, 00:00 EST.
    expect(weeks?.ticks.map(({ at }) => new Date(at).toISOString())).toEqual([
      '2026-11-02T05:00:00.000Z',
    ]);
  });

  it('lists bands by width, the first from zero, with more ticks as the plot widens', () => {
    const min = Date.UTC(2026, 10, 3);
    const ticks = ticksFor({
      min,
      max: min + 2 * DAY,
      interval: HOUR,
      extend: true,
      locale: 'en',
      timeZone: 'UTC',
    });
    expect(ticks.domain).toEqual({ min, max: min + 2 * DAY + HOUR });
    expect(ticks.bands[0]!.from).toBe(0);
    const froms = ticks.bands.map(({ from }) => from);
    expect(froms).toEqual([...froms].sort((a, b) => a - b));
    const count = (width: number) =>
      timeTicksAt(ticks, width).layers.reduce(
        (sum, { ticks: layer }) => sum + layer.length,
        0
      );
    expect(count(2000)).toBeGreaterThan(count(200));
    expect(timeTicksAt(ticks, 1e6)).toBe(ticks.bands.at(-1));
  });

  it('leaves out bands wider than the widest plot', () => {
    const min = Date.UTC(2026, 10, 3);
    const input = {
      min,
      max: min + 2 * DAY,
      interval: HOUR,
      extend: true,
      locale: 'en',
      timeZone: 'UTC',
    };
    const all = ticksFor(input);
    const narrow = ticksFor({ ...input, maxWidth: 300 });
    expect(narrow.bands.every(({ from }) => from <= 300)).toBe(true);
    expect(narrow.bands.length).toBeLessThan(all.bands.length);
    expect(timeTicksAt(narrow, 300)).toEqual(timeTicksAt(all, 300));
  });

  it('states no axis for a bucket wider than the coarsest raster', () => {
    const min = Date.UTC(2026, 0, 1);
    expect(
      resolveTimeTicks({
        min,
        max: min + 40 * 365 * DAY,
        interval: 20 * 365 * DAY,
        extend: false,
        locale: 'en',
        timeZone: 'UTC',
      })
    ).toBeUndefined();
  });
});

const hourly = (overrides: Partial<XyChartNode> = {}): XyChartNode => ({
  type: 'xyChart',
  data: {
    columns: [
      { id: 'time', label: 'time', type: 'date', role: 'dimension' },
      { id: 'count', label: 'count', type: 'number', role: 'metric' },
    ],
    rows: [0, 1, 2, 3].map((index) => [
      Date.UTC(2026, 10, 3) + index * HOUR,
      index,
    ]),
  },
  layers: [{ kind: 'data', mark: 'bar', x: 'time', y: [{ column: 'count' }] }],
  axes: { x: { scale: 'temporal', interval: HOUR } },
  ...overrides,
});

describe('resolveChart: an xy Scene’s time ticks', () => {
  const xOf = (node: XyChartNode, timeZone?: string) =>
    resolveChart(node, {
      scheme: 'light',
      ...(timeZone ? { timeZone } : {}),
    }).axes.x;

  it('spans the marks, one bucket past the last where bars fill buckets', () => {
    const { timeTicks } = xOf(hourly());
    expect(timeTicks?.domain).toEqual({
      min: Date.UTC(2026, 10, 3),
      max: Date.UTC(2026, 10, 3, 4),
    });
    expect(timeTicks?.interval).toBe(HOUR);
  });

  it('spans the marks alone for lines, and takes their spacing when no interval is stated', () => {
    const { timeTicks } = xOf(
      hourly({
        layers: [
          { kind: 'data', mark: 'line', x: 'time', y: [{ column: 'count' }] },
        ],
        axes: { x: { scale: 'temporal' } },
      })
    );
    expect(timeTicks?.domain.max).toBe(Date.UTC(2026, 10, 3, 3));
    expect(timeTicks?.interval).toBe(HOUR);
  });

  it('keeps a stated interval narrower than the marks’ spacing, and takes the spacing for a wider one', () => {
    const withInterval = (interval: number) =>
      xOf(hourly({ axes: { x: { scale: 'temporal', interval } } })).timeTicks;
    expect(withInterval(30 * MINUTE)?.interval).toBe(30 * MINUTE);
    expect(withInterval(30 * MINUTE)?.domain.max).toBe(
      Date.UTC(2026, 10, 3, 3, 30)
    );
    expect(withInterval(DAY)?.interval).toBe(HOUR);
    expect(withInterval(DAY)?.domain.max).toBe(Date.UTC(2026, 10, 3, 4));
  });

  it('spans a custom domain', () => {
    const min = Date.UTC(2026, 10, 2);
    const max = Date.UTC(2026, 10, 4);
    const { timeTicks } = xOf(
      hourly({
        axes: {
          x: {
            scale: 'temporal',
            interval: HOUR,
            domain: { kind: 'custom', min, max },
          },
        },
      })
    );
    expect(timeTicks?.domain).toEqual({ min, max: max + HOUR });
  });

  it('falls on round times in the x format’s zone, else the Scene’s', () => {
    const labelsIn = (axis: ReturnType<typeof xOf>) =>
      rows(axis.timeTicks!, 2000)[0]!.slice(0, 2);
    expect(labelsIn(xOf(hourly(), 'Asia/Kolkata'))).toEqual(['05:30', '06:30']);
    const node = hourly();
    expect(
      labelsIn(
        xOf(
          {
            ...node,
            data: {
              ...node.data,
              columns: [
                {
                  ...node.data.columns[0]!,
                  format: { kind: 'date', timeZone: 'America/New_York' },
                },
                node.data.columns[1]!,
              ],
            },
          },
          'Asia/Kolkata'
        )
      )
    ).toEqual(['19:00', '20:00']);
  });

  it('draws its labels level whatever `labelOrientation` states, as Lens does', () => {
    const angled = (orientation: 'vertical' | 'horizontal') =>
      xOf(
        hourly({
          orientation,
          axes: {
            x: {
              scale: 'temporal',
              interval: HOUR,
              labelOrientation: 'angled',
            },
          },
        })
      ).labelRotation;
    expect(angled('vertical')).toBe(0);
    expect(angled('horizontal')).toBe(-45);
  });

  const single = (
    mark: 'line' | 'bar',
    interval?: number
  ): ReturnType<typeof xOf> => {
    const node = hourly();
    return xOf(
      hourly({
        data: { ...node.data, rows: [[Date.UTC(2026, 10, 3), 1]] },
        layers: [{ kind: 'data', mark, x: 'time', y: [{ column: 'count' }] }],
        axes: {
          x: {
            scale: 'temporal',
            labelOrientation: 'angled',
            ...(interval === undefined ? {} : { interval }),
          },
        },
      })
    );
  };

  it.each(['line', 'bar'] as const)(
    'is absent for a single x on a %s with no stated interval, and the labels keep their rotation',
    (mark) => {
      const { timeTicks, labelRotation } = single(mark);
      expect(timeTicks).toBeUndefined();
      expect(labelRotation).toBe(-45);
    }
  );

  it('takes a single x’s bucket from the stated interval', () => {
    const at = Date.UTC(2026, 10, 3);
    const line = single('line', HOUR);
    expect(line.timeTicks?.domain).toEqual({ min: at, max: at });
    expect(line.timeTicks?.interval).toBe(HOUR);
    expect(rows(line.timeTicks!, 600)).toEqual([
      ['00:00'],
      ['November 3, 2026'],
    ]);
    expect(line.labelRotation).toBe(0);
    const bar = single('bar', HOUR);
    expect(bar.timeTicks?.domain).toEqual({ min: at, max: at + HOUR });
    expect(bar.timeTicks?.interval).toBe(HOUR);
    expect(bar.labelRotation).toBe(0);
  });

  it('is absent when the span fits no raster, and the labels keep their rotation', () => {
    const spanning = (lastYear: number) => {
      const node = hourly();
      return xOf(
        hourly({
          data: {
            ...node.data,
            rows: [1500, 1800, lastYear].map((year, index) => [
              Date.UTC(year, 0, 1),
              index,
            ]),
          },
          layers: [
            { kind: 'data', mark: 'line', x: 'time', y: [{ column: 'count' }] },
          ],
          axes: {
            x: {
              scale: 'temporal',
              interval: 365 * DAY,
              labelOrientation: 'angled',
            },
          },
        })
      );
    };
    const fits = spanning(1900);
    expect(fits.timeTicks?.bands.some(({ layers }) => layers.length > 0)).toBe(
      true
    );
    expect(fits.labelRotation).toBe(0);
    const tooLong = spanning(2100);
    expect(tooLong.timeTicks).toBeUndefined();
    expect(tooLong.labelRotation).toBe(-45);
  });

  it('is absent on a horizontal chart, an ordinal axis and a linear one', () => {
    expect(
      xOf(hourly({ orientation: 'horizontal' })).timeTicks
    ).toBeUndefined();
    expect(
      xOf(hourly({ axes: { x: { scale: 'ordinal' } } })).timeTicks
    ).toBeUndefined();
    expect(
      xOf(hourly({ axes: { x: { scale: 'linear' } } })).timeTicks
    ).toBeUndefined();
  });
});

describe('the time-axis examples', () => {
  it('start each day bucket at midnight in its zone', () => {
    const { node } = xyChartExamples.find(
      ({ name }) => name === 'Time axis by the day'
    )!;
    const clock = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Berlin',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    const times = new Set(
      node.data.rows.map(([at]) => clock.format(at as number))
    );
    expect(times).toEqual(new Set(['00:00']));
  });
});

describe('the scene entry without `Intl.PluralRules`', () => {
  it('imports and picks a band, and resolves days outside English', async () => {
    const days = {
      min: Date.UTC(2026, 9, 1),
      max: Date.UTC(2026, 9, 10),
      interval: DAY,
      extend: false,
      timeZone: 'UTC',
    };
    const english = ticksFor({ ...days, locale: 'en' });
    vi.resetModules();
    vi.stubGlobal(
      'Intl',
      Object.create(Intl, { PluralRules: { value: undefined } })
    );
    try {
      const scene = await import('./index');
      const timeAxis = await import('./time_axis');
      expect(scene.timeTicksAt(english, 800)).toBe(timeTicksAt(english, 800));
      const german = timeAxis.resolveTimeTicks({ ...days, locale: 'de' })!;
      expect(rows(german, 800)[0]?.slice(0, 2)).toEqual(['1', '2']);
    } finally {
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });
});
