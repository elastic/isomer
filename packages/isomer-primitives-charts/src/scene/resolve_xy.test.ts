/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import type { Cell } from '../schema/data';
import { type XyChartNode, xyChartSchema } from '../schema/xy_chart';

import { resolveChart } from './resolve';
import { niceDomain, niceTimeDomain } from './ticks';
import type { XyScene } from './types';

const seriesIn = (scene: XyScene) =>
  scene.layers.flatMap((layer) =>
    layer.kind === 'series' ? [layer.series] : []
  );
const xy = (changes: Partial<XyChartNode> = {}): XyChartNode => ({
  type: 'xyChart',
  data: {
    columns: [
      { id: 'x', label: 'X', type: 'number', role: 'metric' },
      { id: 'y', label: 'Y', type: 'number', role: 'metric' },
    ],
    rows: [
      [0, 2],
      [1, 4],
      [2, 6],
    ],
  },
  layers: [{ kind: 'data', mark: 'line', x: 'x', y: [{ column: 'y' }] }],
  ...changes,
});
const resolve = (node: XyChartNode) =>
  resolveChart(node, { scheme: 'light', size: { width: 480, height: 240 } });
const splitBars = (rows: Cell[][]): XyChartNode => ({
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
const blue = { light: '#0000FF', dark: '#0000FF' };

describe('xy series and categories', () => {
  it('uses the exact y entry color on each axis', () => {
    const scene = resolve(
      xy({
        layers: [
          {
            kind: 'data',
            mark: 'line',
            x: 'x',
            y: [
              { column: 'y', color: { light: '#ff0000', dark: '#ff0000' } },
              {
                column: 'y',
                axis: 'y2',
                color: { light: '#00ff00', dark: '#00ff00' },
              },
            ],
          },
        ],
      })
    );
    expect(seriesIn(scene).map(({ color }) => color)).toEqual([
      '#ff0000',
      '#00ff00',
    ]);
  });

  it('separates raw categories with identical labels and preserves selections', () => {
    const node = splitBars([
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
    const node = splitBars([
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
    expect(series.map(({ key }) => key)).toEqual(['\\["a"]', '["a"]']);

    node.interactions = { initial: { hiddenSeries: ['\\["a"]'] } };
    node.colors = { byKey: { '["a"]': blue } };
    const scene = resolveChart(node, { scheme: 'light' });
    expect(scene.legend.items.map(({ hidden }) => hidden)).toEqual([
      true,
      false,
    ]);
    expect(seriesIn(scene).map(({ color }) => color)).toEqual([
      expect.not.stringMatching(/^#0000FF$/),
      '#0000FF',
    ]);
  });

  it('ignores inherited entries in color maps', () => {
    const node = splitBars([
      ['x', 'constructor', 1],
      ['x', '__proto__', 2],
    ]);
    node.colors = { byKey: {} };
    expect(
      seriesIn(resolveChart(node, { scheme: 'light' })).map(
        ({ color }) => color
      )
    ).toEqual(['#16C5C0', '#A6EDEA']);
  });

  it('indexes tooltips and grouping for a large ordinal series', () => {
    const node = splitBars(
      Array.from({ length: 10000 }, (_, index) => [`x${index}`, 'A', index])
    );
    const scene = resolveChart(node, { scheme: 'light' });
    const marks = seriesIn(scene)[0]!.marks;
    expect(marks).toHaveLength(10000);
    expect(marks[9999]?.tooltip.entries).toEqual([
      expect.objectContaining({ label: 'A', value: '9,999' }),
    ]);
  });

  it('places multivalue cells at their first non-null value', () => {
    const scene = resolve(
      xy({
        data: {
          columns: [
            {
              id: 'x',
              label: 'X',
              type: 'number',
              role: 'metric',
              multivalue: true,
            },
            {
              id: 'y',
              label: 'Y',
              type: 'number',
              role: 'metric',
              multivalue: true,
            },
          ],
          rows: [
            [
              [1, 2],
              [null, 4, 5],
            ],
          ],
        },
      })
    );
    expect(seriesIn(scene)[0]?.marks[0]).toMatchObject({ x: 1, y: 4 });
    expect(scene.table.rows[0]?.values).toEqual([
      [1, 2],
      [null, 4, 5],
    ]);
  });
});

describe('hidden series', () => {
  it.each(['stacked', 'percentage'] as const)(
    'excludes hidden series from %s geometry and domains',
    (stack) => {
      const node = splitBars([
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

  it('keeps an axis for reference lines when its series are hidden', () => {
    const node = splitBars([
      ['x', 'A', 10],
      ['x', 'B', 20],
    ]);
    node.layers = [
      {
        kind: 'data',
        mark: 'bar',
        x: 'x',
        splitBy: 's',
        y: [{ column: 'y', axis: 'y2' }],
      },
      { kind: 'referenceLines', lines: [{ value: 50, axis: 'y2' }] },
    ];
    node.interactions = { initial: { hiddenSeries: ['A', 'B'] } };
    const scene = resolveChart(node, { scheme: 'light' });
    expect(scene.axes.y2?.domain).toEqual([49, 51]);
    expect(scene.axes.y2?.ticks.length).toBeGreaterThan(0);
  });

  it('keeps a percentage axis when every stacked series is hidden', () => {
    const node = splitBars([
      ['x', 'A', 10],
      ['x', 'B', 20],
    ]);
    node.layers = [
      {
        kind: 'data',
        mark: 'bar',
        stack: 'percentage',
        x: 'x',
        splitBy: 's',
        y: [{ column: 'y' }],
      },
      { kind: 'referenceLines', lines: [{ value: 0.8 }] },
    ];
    node.interactions = { initial: { hiddenSeries: ['A', 'B'] } };
    const axis = resolveChart(node, { scheme: 'light' }).axes.y;
    expect(axis?.domain).toEqual([0, 1]);
    expect(axis?.ticks.at(-1)?.label).toBe('100%');
  });
});

describe('xy axes', () => {
  it('inherits reference-line formats from the relevant axes', () => {
    const scene = resolve(
      xy({
        data: {
          columns: [
            {
              id: 'x',
              label: 'Date',
              type: 'date',
              role: 'dimension',
              format: { kind: 'date', year: 'numeric' },
            },
            {
              id: 'y',
              label: 'Percent',
              type: 'number',
              role: 'metric',
              format: { kind: 'percent' },
            },
          ],
          rows: [[0, 0.8]],
        },
        layers: [
          { kind: 'data', mark: 'line', x: 'x', y: [{ column: 'y' }] },
          {
            kind: 'referenceLines',
            lines: [
              { axis: 'x', value: 0, showText: true },
              { value: 0.8, showText: true },
              { value: 0.8, showText: true, format: { kind: 'number' } },
            ],
          },
        ],
      })
    );
    expect(
      scene.layers.flatMap((layer) =>
        layer.kind === 'referenceLine' ? [layer.line.label] : []
      )
    ).toEqual(['1970', '80%', '0.8']);
  });

  it('widens singleton domains without dragging fitted data to zero', () => {
    expect(niceDomain(100, 100, 5)).toEqual([98, 102]);
    const t = Date.UTC(2026, 0, 1);
    const [low, high] = niceTimeDomain(t, t, 5, 'UTC');
    expect(low).toBeLessThanOrEqual(t);
    expect(high).toBeGreaterThan(t);
    const scene = resolve(
      xy({
        data: {
          columns: [
            { id: 'x', label: 'X', type: 'date', role: 'dimension' },
            { id: 'y', label: 'Y', type: 'number', role: 'metric' },
          ],
          rows: [[t, 100]],
        },
        axes: {
          x: { rounding: false },
          y: { domain: { kind: 'fit' }, rounding: false },
        },
      })
    );
    expect(scene.axes.x.domain[0]).toBeLessThan(Number(scene.axes.x.domain[1]));
    expect(scene.axes.y?.domain).toEqual([98, 102]);
  });

  it('includes zero for bars and areas, and fits line-only full axes', () => {
    for (const mark of ['line', 'bar', 'area'] as const) {
      const scene = resolve(
        xy({
          data: {
            columns: [{ id: 'y', label: 'Y', type: 'number', role: 'metric' }],
            rows: [[40], [90]],
          },
          layers: [{ kind: 'data', mark, y: [{ column: 'y' }] }],
          axes: { y: { rounding: false } },
        })
      );
      expect(scene.axes.y?.domain).toEqual(
        mark === 'line' ? [40, 90] : [0, 90]
      );
    }
  });

  it('rounds continuous x domains unless disabled or custom', () => {
    const node = splitBars([
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

  it.each(['linear', 'temporal'] as const)(
    'diagnoses a string x column incompatible with an explicit %s scale',
    (scale) => {
      const node = xy({
        data: {
          columns: [
            { id: 'x', label: 'X', type: 'string', role: 'dimension' },
            { id: 'y', label: 'Y', type: 'number', role: 'metric' },
          ],
          rows: [['not a coordinate', 1]],
        },
        axes: { x: { scale } },
      });
      expect(() => resolve(node)).toThrow(/x column "x".*axis/);
    }
  );

  it.each([
    [
      'stacked values past the largest double',
      splitBars([
        ['a', 's', Number.MAX_VALUE],
        ['a', 't', Number.MAX_VALUE],
      ]),
    ],
    [
      'bars spanning the whole double range',
      xy({
        data: {
          columns: [
            { id: 'x', label: 'X', type: 'number', role: 'metric' },
            { id: 'y', label: 'Y', type: 'number', role: 'metric' },
          ],
          rows: [
            [-Number.MAX_VALUE, 1],
            [Number.MAX_VALUE, 2],
          ],
        },
        layers: [{ kind: 'data', mark: 'bar', x: 'x', y: [{ column: 'y' }] }],
      }),
    ],
  ])('keeps %s finite', (_, node) => {
    const scene = resolve(xyChartSchema.parse(node));
    expect(JSON.parse(JSON.stringify(scene))).toEqual(scene);
  });

  it('accepts representable strings and missing cells on an explicit temporal axis', () => {
    const scene = resolve(
      xy({
        data: {
          columns: [
            { id: 'x', label: 'X', type: 'string', role: 'dimension' },
            { id: 'y', label: 'Y', type: 'number', role: 'metric' },
          ],
          rows: [
            ['2026-11-06T00:00:00Z', 1],
            [null, 2],
          ],
        },
        axes: { x: { scale: 'temporal' } },
      })
    );
    expect(seriesIn(scene)[0]?.marks.map(({ x }) => x)).toEqual([
      Date.parse('2026-11-06T00:00:00Z'),
    ]);
  });

  it.each([-8.64e15, 8.64e15])(
    'resolves a singleton at the valid Date boundary %s',
    (epoch) => {
      for (const timeZone of ['UTC', 'Pacific/Kiritimati', 'Etc/GMT+12']) {
        const node = xy({
          data: {
            columns: [
              { id: 'x', label: 'Time', type: 'date', role: 'dimension' },
              { id: 'y', label: 'Y', type: 'number', role: 'metric' },
            ],
            rows: [[epoch, 1]],
          },
        });
        expect(xyChartSchema.safeParse(node).success).toBe(true);
        const scene = resolveChart(node, { scheme: 'light', timeZone });
        const [low, high] = scene.axes.x.domain as [number, number];
        expect(low).toBeLessThan(high);
        expect(low).toBeGreaterThanOrEqual(-8.64e15);
        expect(high).toBeLessThanOrEqual(8.64e15);
        expect(low).toBeLessThanOrEqual(epoch);
        expect(high).toBeGreaterThanOrEqual(epoch);
        expect(scene.axes.x.ticks.length).toBeGreaterThan(0);
      }
    }
  );
});

describe('legend, points and selections', () => {
  it('omits selections without rows', () => {
    const scene = resolve(
      xy({
        data: {
          columns: [{ id: 'y', label: 'Y', type: 'number', role: 'metric' }],
          rows: [],
        },
        layers: [{ kind: 'data', mark: 'line', y: [{ column: 'y' }] }],
        interactions: { select: ['series', 'legend'] },
      })
    );
    expect(seriesIn(scene)[0]?.selection).toBeUndefined();
    expect(scene.legend.items[0]?.selection).toBeUndefined();
  });

  it('preserves display text for cell statistics and summary extrema', () => {
    const scene = resolve(
      xy({
        data: {
          columns: [
            { id: 'x', label: 'X', type: 'number', role: 'metric' },
            { id: 'y', label: 'Y', type: 'number', role: 'metric' },
          ],
          rows: [
            [0, null],
            [1, 4],
            [2, 2],
            [3, 6],
            [4, null],
          ],
          display: {
            y: [
              'missing start',
              'four widgets',
              'two widgets',
              'six widgets',
              'missing end',
            ],
          },
        },
        legend: {
          statistics: [
            'min',
            'max',
            'first_value',
            'last_value',
            'first_non_null_value',
            'last_non_null_value',
            'current_and_last_value',
          ],
        },
      })
    );
    expect(scene.legend.items[0]?.statistics.map(({ value }) => value)).toEqual(
      [
        'two widgets',
        'six widgets',
        'missing start',
        'missing end',
        'four widgets',
        'six widgets',
        'missing end',
      ]
    );
    expect(scene.summary).toContain('from two widgets to six widgets');
  });

  it('calculates every legend statistic independently', () => {
    const scene = resolve(
      xy({
        legend: {
          statistics: [
            'min',
            'max',
            'avg',
            'median',
            'range',
            'last_value',
            'last_non_null_value',
            'first_value',
            'first_non_null_value',
            'difference',
            'difference_percentage',
            'count',
            'total',
            'standard_deviation',
            'variance',
            'distinct_count',
            'current_and_last_value',
          ],
        },
      })
    );
    expect(scene.legend.items[0]?.statistics.map(({ value }) => value)).toEqual(
      [
        '2',
        '6',
        '4',
        '4',
        '4',
        '6',
        '6',
        '2',
        '2',
        '4',
        '200%',
        '3',
        '12',
        '1.633',
        '2.667',
        '3',
        '6',
      ]
    );
  });

  it.each([[[]], [[null, null]], [[0, 0]]])(
    'handles empty, null and zero statistics: %j',
    (ys) => {
      const scene = resolve(
        xy({
          data: {
            columns: [{ id: 'y', label: 'Y', type: 'number', role: 'metric' }],
            rows: ys.map((y) => [y]),
          },
          layers: [{ kind: 'data', mark: 'line', y: [{ column: 'y' }] }],
          legend: {
            statistics: [
              'median',
              'difference',
              'difference_percentage',
              'variance',
              'standard_deviation',
              'count',
              'distinct_count',
              'total',
            ],
          },
        })
      );
      const zero = ys.length > 0 && ys.every((y) => y === 0);
      expect(
        scene.legend.items[0]?.statistics.map(({ value }) => value)
      ).toEqual([
        zero ? '0' : '(null)',
        zero ? '0' : '(null)',
        '(null)',
        zero ? '0' : '(null)',
        zero ? '0' : '(null)',
        String(ys.length),
        zero ? '1' : '0',
        zero ? '0' : '(null)',
      ]);
    }
  );

  it('uses projected distances to hide automatic points in clusters', () => {
    const scene = resolve(
      xy({
        data: {
          columns: [
            { id: 'x', label: 'X', type: 'number', role: 'metric' },
            { id: 'y', label: 'Y', type: 'number', role: 'metric' },
          ],
          rows: [
            [0, 1],
            [1, 2],
            [1000000, 3],
          ],
        },
      })
    );
    expect(seriesIn(scene)[0]?.showPoints).toBe(false);
  });
});
