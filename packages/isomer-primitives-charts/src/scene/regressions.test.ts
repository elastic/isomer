/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { formatValue } from '../format/format';
import type { Cell } from '../schema/data';
import type { MetricNode } from '../schema/metric';
import { type XyChartNode, xyChartSchema } from '../schema/xy_chart';

import { resolveChart } from './resolve';
import { linearTicks, niceTimeDomain, timeTicks } from './ticks';
import type { XyScene } from './types';

const seriesIn = (scene: XyScene) =>
  scene.layers.flatMap((layer) =>
    layer.kind === 'series' ? [layer.series] : []
  );
const xy = (rows: Cell[][]): XyChartNode => ({
  type: 'xyChart',
  data: {
    columns: [
      { id: 'x', label: 'X', type: 'string', role: 'dimension' },
      { id: 's', label: 'Split', type: 'string', role: 'dimension' },
      { id: 'y', label: 'Y', type: 'number', role: 'metric' },
    ],
    rows,
  },
  layers: [
    {
      kind: 'data',
      mark: 'bar',
      x: 'x',
      splitBy: 's',
      y: [{ column: 'y' }],
      stack: 'stacked',
    },
  ],
  interactions: { select: ['category'] },
});
const metric = (): MetricNode => ({
  type: 'metric',
  data: {
    columns: [
      { id: 'b', label: 'Bucket', type: 'string', role: 'dimension' },
      { id: 'v', label: 'Value', type: 'number', role: 'metric' },
    ],
    rows: [
      ['a:b', 10],
      [null, 20],
    ],
  },
  breakdown: { column: 'b' },
  value: { column: 'v' },
});
const blue = { light: '#0000FF', dark: '#0000FF' };

describe('resolver regressions', () => {
  it('keeps the default medium date and time with hour12 alone', () => {
    const epoch = Date.UTC(2019, 4, 5, 13, 2, 3);
    expect(formatValue(epoch, { kind: 'date', hour12: false })).toBe(
      new Intl.DateTimeFormat('en', {
        timeZone: 'UTC',
        dateStyle: 'medium',
        timeStyle: 'medium',
        hour12: false,
      }).format(epoch)
    );
  });

  it('excludes every finite band upper bound', () => {
    const node = metric();
    node.value.color = 'bands';
    node.colors = { bands: [{ from: 0, to: 10, color: blue }] };
    expect(resolveChart(node, { scheme: 'light' }).tiles[0]?.background).toBe(
      '#FFFFFF'
    );
  });

  it('resolves escaped and missing metric bucket colors', () => {
    const node = metric();
    node.colors = { byKey: { 'a\\:b': blue, '\\null': { token: 'axis' } } };
    const scene = resolveChart(node, { scheme: 'light' });
    expect(scene.tiles.map(({ background }) => background)).toEqual([
      '#0000FF',
      '#CAD3E2',
    ]);
  });

  it('matches separately allocated multivalue trend buckets', () => {
    const node = metric();
    node.data.columns[0]!.multivalue = true;
    node.data.rows = [[['a', 'b'], 10]];
    node.background = {
      kind: 'trend',
      breakdown: 'b',
      x: 'x',
      y: 'v',
      data: {
        columns: [
          ...node.data.columns,
          { id: 'x', label: 'Time', type: 'date', role: 'dimension' },
        ],
        rows: [
          [['a', 'b'], 1, 0],
          [['a', 'b'], 2, 1000],
          [['c'], 3, 2000],
        ],
      },
    };
    expect(
      resolveChart(node, { scheme: 'light' }).tiles[0]?.trend?.points
    ).toEqual([
      { x: 0, y: 1 },
      { x: 1000, y: 2 },
    ]);
  });

  it('separates raw categories with identical labels and preserves selections', () => {
    const node = xy([
      ['a', 's', 1],
      ['b', 's', 2],
      [null, 's', 3],
      ['(null)', 's', 4],
    ]);
    node.data.display = { x: ['same', 'same', '(null)', '(null)'] };
    expect(xyChartSchema.safeParse(node).success).toBe(true);
    const scene = resolveChart(node, { scheme: 'light' });
    expect(scene.categories.map(({ label }) => label)).toEqual([
      'same',
      'same',
      '(null)',
      '(null)',
    ]);
    expect(new Set(scene.categories.map(({ x }) => x)).size).toBe(4);
    expect(
      scene.categories.map(({ selection }) => selection?.values.x)
    ).toEqual(['a', 'b', null, '(null)']);
    expect(seriesIn(scene)[0]?.marks.map(({ y0, y }) => [y0, y])).toEqual([
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
    ]);
  });

  it('separates array split cells from scalar JSON text', () => {
    const node = xy([
      ['x', ['a'], 1],
      ['x', '["a"]', 2],
    ]);
    node.data.columns[1]!.multivalue = true;
    node.interactions = { select: ['series'] };
    expect(xyChartSchema.safeParse(node).success).toBe(true);
    const series = seriesIn(resolveChart(node, { scheme: 'light' }));
    expect(series.map(({ source }) => source.rows)).toEqual([[0], [1]]);
    expect(series.map(({ selection }) => selection?.values.s)).toEqual([
      ['a'],
      '["a"]',
    ]);
  });

  it.each(['stacked', 'percentage'] as const)(
    'excludes hidden series from %s geometry and domains',
    (stack) => {
      const node = xy([
        ['x', 'A', 1000],
        ['x', 'B', 20],
      ]);
      node.layers = [
        {
          kind: 'data',
          mark: 'bar',
          stack,
          x: 'x',
          splitBy: 's',
          y: [{ column: 'y' }],
        },
      ];
      node.interactions = { initial: { hiddenSeries: ['A'] } };
      const scene = resolveChart(node, { scheme: 'light' });
      expect(seriesIn(scene)[1]?.marks[0]).toMatchObject({
        y0: 0,
        y: stack === 'stacked' ? 20 : 1,
      });
      expect(scene.axes.y?.domain).toEqual([0, stack === 'stacked' ? 20 : 1]);
      expect(
        seriesIn(scene)[1]?.marks[0]?.tooltip.entries.map(({ label }) => label)
      ).toEqual(['B']);
    }
  );

  it('rounds continuous x domains unless disabled or custom', () => {
    const node = xy([
      [1.2, 'A', 1],
      [9.1, 'A', 2],
    ]);
    node.data.columns[0]!.type = 'number';
    node.layers = [
      { kind: 'data', mark: 'line', x: 'x', y: [{ column: 'y' }] },
    ];
    expect(resolveChart(node, { scheme: 'light' }).axes.x.domain).toEqual([
      0, 10,
    ]);
    node.axes = { x: { rounding: false } };
    expect(resolveChart(node, { scheme: 'light' }).axes.x.domain).toEqual([
      1.2, 9.1,
    ]);
    node.axes.x!.domain = { kind: 'custom', min: 1.3, max: 8.7 };
    node.axes.x!.rounding = true;
    expect(resolveChart(node, { scheme: 'light' }).axes.x.domain).toEqual([
      1.3, 8.7,
    ]);
  });

  it('chooses text against the composited metric background', () => {
    const node = metric();
    node.value.color = { light: '#00000000', dark: '#FFFFFF00' };
    expect(resolveChart(node, { scheme: 'dark' }).tiles[0]?.value.color).toBe(
      '#B4C1D5'
    );
    expect(resolveChart(node, { scheme: 'light' }).tiles[0]?.value.color).toBe(
      '#384861'
    );
  });

  it('ignores inherited entries in color maps', () => {
    const node = xy([
      ['x', 'constructor', 1],
      ['x', '__proto__', 2],
    ]);
    node.colors = { byKey: {} };
    expect(
      seriesIn(resolveChart(node, { scheme: 'light' })).map(
        ({ color }) => color
      )
    ).toEqual(['#16C5C0', '#A6EDEA']);
    const metricNode = metric();
    metricNode.data.rows = [['constructor', 1]];
    metricNode.colors = { byKey: {} };
    expect(
      resolveChart(metricNode, { scheme: 'light' }).tiles[0]?.background
    ).toBe('#FFFFFF');
  });

  it('indexes tooltips and grouping for a large ordinal series', () => {
    const node = xy(
      Array.from({ length: 10000 }, (_, index) => [`x${index}`, 'A', index])
    );
    const scene = resolveChart(node, { scheme: 'light' });
    const marks = seriesIn(scene)[0]!.marks;
    expect(marks).toHaveLength(10000);
    expect(marks[9999]?.tooltip.entries).toEqual([
      expect.objectContaining({ label: 'A', value: '9,999' }),
    ]);
  });
});

describe('tick boundaries', () => {
  it('terminates on constant and large narrow domains', () => {
    expect(linearTicks(1e20, 1e20, 5)).toEqual([1e20]);
    const ticks = linearTicks(1e20, 1e20 + 32768, 5);
    expect(ticks.length).toBeLessThanOrEqual(12);
    expect(ticks.every(Number.isFinite)).toBe(true);
    expect(linearTicks(-1e308, 1e308, 5).length).toBeGreaterThan(0);
  });

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

  it('labels subsecond ranges', () => {
    expect(timeTicks(100, 900, 5, 'UTC')).toEqual([250, 500, 750]);
  });

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

  it('uses quarter starts and bounds multi-year tick counts', () => {
    const quarters = timeTicks(
      Date.UTC(2026, 0, 1),
      Date.UTC(2027, 0, 1),
      5,
      'UTC'
    );
    expect(quarters.map((tick) => new Date(tick).toISOString())).toEqual([
      '2026-01-01T00:00:00.000Z',
      '2026-04-01T00:00:00.000Z',
      '2026-07-01T00:00:00.000Z',
      '2026-10-01T00:00:00.000Z',
      '2027-01-01T00:00:00.000Z',
    ]);
    const years = timeTicks(
      Date.UTC(2000, 0, 1),
      Date.UTC(2050, 0, 1),
      5,
      'UTC'
    );
    expect(years.length).toBeGreaterThan(0);
    expect(years.length).toBeLessThanOrEqual(5);
  });
});
