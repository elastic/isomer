/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Expected values come from the heatmap contract (docs/heatmap.md) and Lens's
// heat map: default bands are the temperature palette in five equal steps,
// the last open above; band labels read "from - to", "≥ from" or "< to".

import { describe, expect, it } from 'vitest';

import type { Cell, ChartColumn } from '../schema/data';
import type { HeatmapNode } from '../schema/heatmap';

import { brushEvent } from './events';
import { resolveChart } from './resolve';
import { nextUp } from './resolve_heatmap';
import type { HeatmapScene } from './types';

const HOUR = 3_600_000;
const T0 = Date.UTC(2026, 10, 3);

const string = (id: string): ChartColumn => ({
  id,
  label: id,
  type: 'string',
  role: 'dimension',
});
const value: ChartColumn = {
  id: 'v',
  label: 'Value',
  type: 'number',
  role: 'metric',
};

const node = (
  rows: Cell[][],
  overrides: Partial<HeatmapNode> = {}
): HeatmapNode => ({
  type: 'heatmap',
  data: { columns: [string('x'), string('y'), value], rows },
  x: { column: 'x' },
  y: { column: 'y' },
  value: { column: 'v' },
  ...overrides,
});

const resolve = (heatmap: HeatmapNode, scheme: 'light' | 'dark' = 'light') =>
  resolveChart(heatmap, { scheme });

const TEMPERATURE = ['#61A2FF', '#CFE1FF', '#F6F9FC', '#FFD4CF', '#F6726A'];

const colorAt = (scene: HeatmapScene, x: string, y: string) => {
  const xi = scene.x.categories.findIndex(({ label }) => label === x);
  const yi = scene.y.categories.findIndex(({ label }) => label === y);
  return scene.cells.find((cell) => cell.x === xi && cell.y === yi)?.color;
};

describe('resolveHeatmap: bands', () => {
  it('splits the value range into Lens’s five temperature bands, the last open above', () => {
    const scene = resolve(
      node([
        ['a', 'p', 0],
        ['b', 'p', 19],
        ['c', 'p', 20],
        ['d', 'p', 79],
        ['e', 'p', 100],
      ])
    );
    expect(scene.bands).toEqual([
      { start: 0, end: 20, color: TEMPERATURE[0], label: '0 - 20' },
      { start: 20, end: 40, color: TEMPERATURE[1], label: '20 - 40' },
      { start: 40, end: 60, color: TEMPERATURE[2], label: '40 - 60' },
      { start: 60, end: 80, color: TEMPERATURE[3], label: '60 - 80' },
      { start: 80, color: TEMPERATURE[4], label: '≥ 80' },
    ]);
    expect(scene.cells.map(({ color }) => color)).toEqual([
      TEMPERATURE[0],
      TEMPERATURE[0],
      TEMPERATURE[1],
      TEMPERATURE[3],
      TEMPERATURE[4],
    ]);
  });

  it('includes the last band’s stated top, and leaves a value in no band transparent', () => {
    const red = { light: '#FF0000', dark: '#880000' };
    const blue = { light: '#0000FF', dark: '#000088' };
    const scene = resolve(
      node(
        [
          ['a', 'p', 5],
          ['b', 'p', 10],
          ['c', 'p', 11],
          ['d', 'p', -1],
        ],
        {
          colors: {
            bands: [
              { from: 0, to: 5, color: blue },
              { from: 5, to: 10, color: red },
            ],
          },
        }
      ),
      'dark'
    );
    expect(scene.bands).toEqual([
      { start: 0, end: 5, color: '#000088', label: '0 - 5' },
      { start: 5, end: nextUp(10), color: '#880000', label: '5 - 10' },
    ]);
    expect(scene.cells.map(({ color }) => color)).toEqual([
      '#880000',
      '#880000',
      '#FFFFFF00',
      '#FFFFFF00',
    ]);
  });

  it('places percentage bounds in the value range', () => {
    const gray = { light: '#888888', dark: '#888888' };
    const scene = resolve(
      node(
        [
          ['a', 'p', 10],
          ['b', 'p', 60],
          ['c', 'p', 110],
        ],
        {
          bandsRange: 'percentage',
          colors: {
            bands: [
              { from: 0, to: 50, color: gray },
              { to: 100, from: 50, color: gray },
            ],
          },
        }
      )
    );
    expect(
      scene.bands.map(({ start, end, label }) => [start, end, label])
    ).toEqual([
      [10, 60, '10 - 60'],
      [60, nextUp(110), '60 - 110'],
    ]);
    expect(scene.cells.every(({ color }) => color === '#888888')).toBe(true);
  });

  it('gives every cell the last band where every value is the same', () => {
    const scene = resolve(
      node([
        ['a', 'p', 3],
        ['b', 'p', 3],
      ])
    );
    expect(scene.bands).toEqual([
      { start: 3, color: TEMPERATURE[4], label: '≥ 3' },
    ]);
    expect(scene.cells.map(({ color }) => color)).toEqual([
      TEMPERATURE[4],
      TEMPERATURE[4],
    ]);
  });

  it('labels a band open below by its top', () => {
    const scene = resolve(
      node([['a', 'p', 1]], {
        colors: { bands: [{ to: 2, color: { light: '#000', dark: '#fff' } }] },
      })
    );
    expect(scene.bands).toEqual([
      { end: nextUp(2), color: '#000000', label: '< 2' },
    ]);
  });
});

describe('resolveHeatmap: positions', () => {
  const rows: Cell[][] = [
    ['b', 'q', 1],
    ['a', 'p', 2],
    [null, 'q', 3],
    ['c', 'p', 4],
  ];

  it('keeps the order rows first show positions in', () => {
    const scene = resolve(node(rows));
    expect(scene.x.categories.map(({ label }) => label)).toEqual([
      'b',
      'a',
      'c',
    ]);
    expect(scene.y.categories.map(({ label }) => label)).toEqual(['q', 'p']);
    expect(scene.x.scale).toBe('ordinal');
  });

  // Elastic Charts' `getHeatmapTableSelector` skips a datum whose x or y is
  // not a non-null primitive, so Lens's heat map has no `(null)` row or column.
  it('draws no row whose x or y cell is missing, nor its position', () => {
    const scene = resolve(
      node([
        ['a', 'p', 1],
        ['a', null, 9],
        [null, 'q', 5],
        ['b', 'q', 2],
      ])
    );
    expect(scene.x.categories.map(({ label }) => label)).toEqual(['a', 'b']);
    expect(scene.y.categories.map(({ label }) => label)).toEqual(['p', 'q']);
    expect(
      scene.cells.map(({ value, source }) => [value, source.rows])
    ).toEqual([
      [1, [0]],
      [2, [3]],
    ]);
    expect(scene.summary).toBe('Value by x and y, from 1 to 2.');
    // Lens's bands span the whole value column (`findMinMaxByColumnId`).
    expect(scene.bands[0]?.start).toBe(1);
    expect(scene.bands.at(-2)?.end).toBeCloseTo(1 + (8 * 4) / 5);
  });

  it('sorts by text and numbers by value', () => {
    expect(
      resolve(
        node(rows, { x: { column: 'x', sort: 'desc' } })
      ).x.categories.map(({ label }) => label)
    ).toEqual(['c', 'b', 'a']);
    const numbers = resolve({
      ...node([
        [9, 'p', 1],
        [10, 'p', 2],
        [1, 'p', 3],
      ]),
      data: {
        columns: [
          { id: 'x', label: 'x', type: 'number', role: 'dimension' },
          string('y'),
          value,
        ],
        rows: [
          [9, 'p', 1],
          [10, 'p', 2],
          [1, 'p', 3],
        ],
      },
      x: { column: 'x', sort: 'asc' },
    });
    expect(numbers.x.categories.map(({ label }) => label)).toEqual([
      '1',
      '9',
      '10',
    ]);
    expect(numbers.cells.map(({ x }) => x)).toEqual([1, 2, 0]);
  });

  it('draws a date axis in time order, each position the smallest spacing wide', () => {
    const scene = resolve({
      ...node([]),
      data: {
        columns: [
          { id: 'x', label: 'time', type: 'date', role: 'dimension' },
          string('y'),
          value,
        ],
        rows: [
          [T0 + 3 * HOUR, 'p', 1],
          [T0, 'p', 2],
          [new Date(T0 + HOUR).toISOString(), 'p', 3],
        ],
      },
      x: { column: 'x', sort: 'desc' },
    });
    expect(scene.x.scale).toBe('time');
    expect(scene.x.interval).toBe(HOUR);
    expect(scene.x.timeZone).toBe('UTC');
    expect(scene.x.categories.map(({ x }) => x)).toEqual([
      T0,
      T0 + HOUR,
      T0 + 3 * HOUR,
    ]);
    expect(scene.cells.map(({ x }) => x)).toEqual([2, 0, 1]);
  });

  describe('time zone', () => {
    const DAY = 24 * HOUR;
    // Midnight in Toronto, EST (UTC-5) through November 2026.
    const TORONTO = Array.from(
      { length: 3 },
      (_, day) => T0 + 5 * HOUR + day * DAY
    );
    const daily = (
      instants: readonly number[],
      formatZone: string | undefined,
      overrides: Partial<HeatmapNode> = {}
    ): HeatmapNode => ({
      ...node([]),
      data: {
        columns: [
          {
            id: 'x',
            label: 'day',
            type: 'date',
            role: 'dimension',
            format: {
              kind: 'date',
              day: 'numeric',
              ...(formatZone ? { timeZone: formatZone } : {}),
            },
          },
          string('y'),
          value,
        ],
        rows: instants.map((instant, index) => [instant, 'p', index + 1]),
      },
      x: { column: 'x', interval: DAY },
      ...overrides,
    });

    it('is the x format’s zone when the buckets start on its round times', () => {
      const scene = resolveChart(daily(TORONTO, 'America/Toronto'), {
        scheme: 'light',
      });
      expect(scene).toMatchObject({
        x: { scale: 'time', timeZone: 'America/Toronto', interval: DAY },
      });
    });

    // Kibana formats dates in UTC for `dateFormat:tz: Browser` while ES|QL
    // buckets in the request's zone: the grid is the zone the buckets fit.
    it('is the chart’s zone when the buckets fit it and not the format’s', () => {
      const scene = resolveChart(daily(TORONTO, 'UTC'), {
        scheme: 'light',
        timeZone: 'America/Toronto',
      });
      expect(scene).toMatchObject({
        x: { scale: 'time', timeZone: 'America/Toronto' },
      });
    });

    it('is UTC when only UTC fits', () => {
      const scene = resolveChart(
        daily([T0, T0 + DAY, T0 + 2 * DAY], 'America/Toronto'),
        { scheme: 'light', timeZone: 'Europe/Berlin' }
      );
      expect(scene).toMatchObject({ x: { scale: 'time', timeZone: 'UTC' } });
    });

    it('fits a zone across a daylight saving change', () => {
      // New York midnights from Oct 31 to Nov 2, 2026: EDT, then EST.
      const instants = [
        Date.UTC(2026, 9, 31, 4),
        Date.UTC(2026, 10, 1, 4),
        Date.UTC(2026, 10, 2, 5),
      ];
      const scene = resolveChart(
        daily(instants, 'America/New_York', {
          x: { column: 'x', interval: DAY },
        }),
        { scheme: 'light' }
      );
      expect(scene).toMatchObject({
        x: { scale: 'time', timeZone: 'America/New_York' },
      });
    });

    it('is an ordinal axis when no zone’s grid holds every bucket', () => {
      const scene = resolveChart(
        daily([T0 + HOUR, T0 + 4 * HOUR], 'UTC', {
          x: { column: 'x', interval: 3 * HOUR },
        }),
        { scheme: 'light' }
      );
      expect(scene.kind === 'heatmap' && scene.x).toMatchObject({
        scale: 'ordinal',
      });
      expect(scene.kind === 'heatmap' && scene.x.timeZone).toBeUndefined();
      expect(scene.kind === 'heatmap' && scene.cells).toHaveLength(2);
    });

    it('states a custom domain on a time axis, as Lens’s `xDomain`', () => {
      const domain = { min: T0 - 2 * DAY, max: T0 + 5 * DAY };
      const scene = resolveChart(
        daily([T0, T0 + DAY], 'UTC', {
          axes: { x: { domain: { kind: 'custom', ...domain } } },
        }),
        { scheme: 'light' }
      );
      expect(scene.kind === 'heatmap' && scene.x.domain).toEqual(domain);
      const fit = resolveChart(
        daily([T0, T0 + DAY], 'UTC', {
          axes: { x: { domain: { kind: 'fit' } } },
        }),
        { scheme: 'light' }
      );
      expect(fit.kind === 'heatmap' && fit.x.domain).toBeUndefined();
    });
  });

  it('draws one instant with no interval as one ordinal position', () => {
    const scene = resolve({
      ...node([]),
      data: {
        columns: [
          { id: 'x', label: 'time', type: 'date', role: 'dimension' },
          string('y'),
          value,
        ],
        rows: [
          [T0, 'p', 1],
          [T0, 'q', 2],
        ],
      },
    });
    expect(scene.x.scale).toBe('ordinal');
    expect(scene.x.categories).toHaveLength(1);
  });

  it('draws one unlabelled row with no y', () => {
    const scene = resolve({
      ...node([]),
      data: {
        columns: [string('x'), value],
        rows: [
          ['a', 1],
          ['b', 2],
        ],
      },
      y: undefined,
    });
    expect(scene.y).toMatchObject({
      label: '',
      showLabels: false,
      categories: [{ label: '' }],
    });
    expect(scene.cells.map(({ y }) => y)).toEqual([0, 0]);
    expect(scene.summary).toBe('Value by x, from 1 to 2.');
  });

  it('keeps a position whose only value is missing, with no cell', () => {
    const scene = resolve(
      node([
        ['a', 'p', 1],
        ['b', 'q', null],
      ])
    );
    expect(scene.x.categories.map(({ label }) => label)).toEqual(['a', 'b']);
    expect(scene.y.categories.map(({ label }) => label)).toEqual(['p', 'q']);
    expect(scene.cells).toHaveLength(1);
  });
});

describe('resolveHeatmap: cells, text and selections', () => {
  it('writes values as displayed, describes each cell, and selects it only when offered', () => {
    const heatmap = node(
      [
        ['a', 'p', 1],
        ['b', 'q', 2],
      ],
      { interactions: { select: ['cell'] } }
    );
    heatmap.data.display = { v: ['one', 'two'] };
    const scene = resolve(heatmap);
    const [first] = scene.cells;
    expect(first).toMatchObject({
      valueText: 'one',
      description: 'x: a · y: p · Value: one',
      source: { rows: [0], columns: ['x', 'y', 'v'] },
      selection: {
        target: 'cell',
        rows: [0],
        columns: ['x', 'y'],
        values: { x: 'a', y: 'p' },
        description: 'x: a · y: p · Value: one',
      },
      tooltip: {
        entries: [
          { label: 'x', value: 'a' },
          { label: 'y', value: 'p' },
          { label: 'Value', value: 'one', color: first!.color },
        ],
      },
    });
    expect(
      resolve({ ...heatmap, interactions: undefined }).cells.some(
        ({ selection }) => selection
      )
    ).toBe(false);
  });

  it('reads the colors of stated bands in each scheme', () => {
    const heatmap = node([['a', 'p', 1]], {
      colors: {
        bands: [{ from: 0, color: { light: '#111111', dark: '#EEEEEE' } }],
      },
    });
    expect(colorAt(resolve(heatmap), 'a', 'p')).toBe('#111111');
    expect(colorAt(resolve(heatmap, 'dark'), 'a', 'p')).toBe('#EEEEEE');
  });

  it('says there is nothing to draw with no value, and hides the legend', () => {
    const scene = resolve(node([['a', 'p', null]], { title: 'Errors' }));
    expect(scene.empty).toEqual({
      reason: 'noResults',
      text: 'No results found',
    });
    expect(scene.legend.visible).toBe(false);
    expect(scene.summary).toBe('Errors: Value by x and y has no data.');
  });

  it('states the grid lines, legend and labels the node sets, and their defaults', () => {
    const scene = resolve(node([['a', 'p', 1]]));
    expect(scene.gridLines).toEqual({ width: 1, color: scene.chrome.gridLine });
    expect(scene.legend).toEqual({
      visible: true,
      position: 'right',
      maxLines: 1,
      size: 'auto',
    });
    expect(scene.cellLabels).toBe(false);
    expect(scene.x).toMatchObject({ showLabels: true, labelRotation: 0 });
    const set = resolve(
      node([['a', 'p', 1]], {
        cellLabels: true,
        gridLines: { width: 2, color: { token: 'border' } },
        axes: {
          x: { title: 'X', labels: false, labelOrientation: 'vertical' },
          y: { title: 'Y' },
        },
        legend: { visibility: 'hidden', position: 'bottom', size: 'l' },
      })
    );
    expect(set.gridLines).toEqual({ width: 2, color: set.chrome.border });
    expect(set.x).toMatchObject({
      title: 'X',
      showLabels: false,
      labelRotation: -90,
    });
    expect(set.y.title).toBe('Y');
    expect(set.legend).toMatchObject({
      visible: false,
      position: 'bottom',
      size: 'l',
    });
  });

  it('names a brushed range by the time positions nearest its ends', () => {
    const scene = resolve({
      ...node([]),
      data: {
        columns: [
          {
            id: 'x',
            label: 'time',
            type: 'date',
            role: 'dimension',
            format: { kind: 'date', hour: '2-digit', hour12: false },
          },
          string('y'),
          value,
        ],
        rows: [
          [T0, 'p', 1],
          [T0 + HOUR, 'p', 2],
        ],
      },
      interactions: { brush: { column: 'x' } },
    });
    expect(brushEvent(scene, 'n', [T0 + HOUR * 2, T0 - 1])).toEqual({
      kind: 'brush',
      node: 'n',
      column: 'x',
      range: [T0 - 1, T0 + 2 * HOUR],
      values: {},
      description: 'time: 00 to 01',
    });
  });
});

describe('nextUp', () => {
  it('is the least double above a number', () => {
    expect(nextUp(1)).toBe(1 + Number.EPSILON);
    expect(nextUp(0)).toBe(Number.MIN_VALUE);
    expect(nextUp(-1)).toBeGreaterThan(-1);
    expect(nextUp(-1)).toBe(-1 + Number.EPSILON / 2);
  });
});
