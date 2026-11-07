/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import type { Cell } from '../schema/data';
import { type XyChartNode, xyChartSchema } from '../schema/xy_chart';

import { formatAxisValue } from './format_axis';
import { resolveChart } from './resolve';
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
    expect(seriesIn(scene)[0]?.marks.map(({ y }) => y)).toEqual([1, 2, 3, 4]);
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

  it('indexes grouping for a large ordinal series', () => {
    const node = splitBars(
      Array.from({ length: 10000 }, (_, index) => [`x${index}`, 'A', index])
    );
    const scene = resolveChart(node, { scheme: 'light' });
    const marks = seriesIn(scene)[0]!.marks;
    expect(marks).toHaveLength(10000);
    expect(marks[9999]?.label).toBe('9,999');
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
    'marks a %s series hidden and leaves its stacking to the engine',
    (stack) => {
      const node = splitBars([
        ['x', 'A', 1000],
        ['x', 'B', 20],
        ['only A', 'A', 5],
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
      expect(
        seriesIn(scene).map(({ marks }) => marks.map(({ y }) => y))
      ).toEqual([[1000, 5], [20]]);
      expect(scene.legend.items.map(({ hidden }) => hidden)).toEqual([
        true,
        false,
      ]);
      expect(scene.categories.map(({ label }) => label)).toEqual([
        'x',
        'only A',
      ]);
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
    expect(scene.axes.y2?.position).toBe('right');
  });

  it('keeps an axis that only a reference line is on', () => {
    const node = xy();
    node.layers = [
      ...node.layers,
      { kind: 'referenceLines', lines: [{ value: 50, axis: 'y2' }] },
    ];
    const scene = resolveChart(node, { scheme: 'light' });
    expect(scene.axes.y2?.position).toBe('right');
  });

  it('keeps the y axis, label and split of a split layer with no rows', () => {
    const node = splitBars([]);
    const scene = resolveChart(node, { scheme: 'light' });
    expect(scene.axes.y?.position).toBe('left');
    expect(scene.summary).toBe('Y by X and Split, with no data.');
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
    const scene = resolveChart(node, { scheme: 'light' });
    expect(formatAxisValue(scene, scene.axes.y!, 1)).toBe('100%');
  });
});

describe('xy rows without an x', () => {
  it('leaves them out without disturbing x order or the legend statistics', () => {
    const node = xy({
      data: {
        columns: [
          { id: 'x', label: 'X', type: 'number', role: 'metric' },
          { id: 'y', label: 'Y', type: 'number', role: 'metric' },
        ],
        rows: [
          [10, 100],
          [null, 1],
          [1, 10],
          [null, 2],
          [5, 50],
          [0, 0],
        ],
      },
      legend: { statistics: ['first_value', 'last_value'] },
    });
    const scene = resolve(node);
    expect(seriesIn(scene)[0]!.marks.map(({ x }) => x)).toEqual([0, 1, 5, 10]);
    expect(scene.legend.items[0]!.statistics).toEqual([
      expect.objectContaining({ value: '0' }),
      expect.objectContaining({ value: '100' }),
    ]);
  });
});

describe('xy partial buckets', () => {
  it('measures each layer by its own spacing', () => {
    const HOUR = 3_600_000;
    const DAY = 24 * HOUR;
    const scene = resolve(
      xy({
        data: {
          columns: [
            { id: 'x', label: 'X', type: 'date', role: 'dimension' },
            { id: 'y', label: 'Y', type: 'number', role: 'metric' },
          ],
          rows: [
            [DAY, 1],
            [DAY + HOUR, 2],
            [0, 3],
            [DAY, 4],
          ],
        },
        layers: [
          {
            kind: 'data',
            mark: 'line',
            x: 'x',
            y: [{ column: 'y' }],
            rows: [0, 2],
          },
          {
            kind: 'data',
            mark: 'bar',
            x: 'x',
            y: [{ column: 'y' }],
            rows: [2, 4],
          },
        ],
        style: { partialBuckets: { from: 0, to: DAY + 12 * HOUR } },
      })
    );
    const [hourly, daily] = seriesIn(scene);
    expect(hourly!.marks.map(({ partial }) => partial ?? false)).toEqual([
      false,
      false,
    ]);
    expect(daily!.marks.map(({ partial }) => partial ?? false)).toEqual([
      false,
      true,
    ]);
  });
});

describe('xy time axis over a non-date column', () => {
  it('prints dates on the axis and in category labels', () => {
    const scene = resolve(
      xy({
        data: {
          columns: [
            { id: 'x', label: 'X', type: 'number', role: 'dimension' },
            { id: 'y', label: 'Y', type: 'number', role: 'metric' },
          ],
          rows: [[Date.UTC(2026, 10, 6), 1]],
        },
        axes: { x: { scale: 'temporal' } },
      })
    );
    const at = Date.UTC(2026, 10, 6, 12);
    expect(formatAxisValue(scene, scene.axes.x, at)).toMatch(/^Nov 6, 2026/);
    expect(scene.categories[0]!.label).toMatch(/^Nov 6, 2026/);
  });

  it('keeps a format the x column states', () => {
    const scene = resolve(
      xy({
        data: {
          columns: [
            {
              id: 'x',
              label: 'X',
              type: 'date',
              role: 'dimension',
              format: { kind: 'text' },
            },
            { id: 'y', label: 'Y', type: 'number', role: 'metric' },
          ],
          rows: [['2026-11-06T00:00:00Z', 1]],
        },
      })
    );
    expect(scene.categories[0]!.label).toBe('2026-11-06T00:00:00Z');
  });
});

describe('xy summary', () => {
  it('states a range only when every value is on one axis in one format', () => {
    const columns = [
      { id: 'x', label: 'X', type: 'number', role: 'metric' },
      { id: 'a', label: 'A', type: 'number', role: 'metric' },
      { id: 'b', label: 'B', type: 'number', role: 'metric' },
    ] as const;
    const rows = [
      [0, 1, 1000],
      [1, 2, 2000],
    ];
    const both = (axis: 'y' | 'y2') =>
      resolve(
        xy({
          data: { columns: [...columns], rows },
          layers: [
            {
              kind: 'data',
              mark: 'line',
              x: 'x',
              y: [{ column: 'a' }, { column: 'b', axis }],
            },
          ],
        })
      ).summary;
    expect(both('y')).toBe('A and B by X, from 1 to 2,000.');
    expect(both('y2')).toBe('A and B by X.');
  });

  it('names only the y columns a reader can see', () => {
    const node = xy({
      data: {
        columns: [
          { id: 'x', label: 'X', type: 'number', role: 'metric' },
          { id: 'a', label: 'A', type: 'number', role: 'metric' },
          { id: 'b', label: 'B', type: 'number', role: 'metric' },
        ],
        rows: [
          [0, 1, 1000],
          [1, 2, 2000],
        ],
      },
      layers: [
        {
          kind: 'data',
          mark: 'line',
          x: 'x',
          y: [{ column: 'a' }, { column: 'b' }],
        },
      ],
      interactions: { initial: { hiddenSeries: ['b'] } },
    });
    expect(resolve(node).summary).toBe('A by X, from 1 to 2.');
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
      expect(scene.axes.y?.domain).toEqual({
        kind: 'data',
        includeZero: mark !== 'line',
        rounding: false,
      });
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
    expect(resolveChart(node, { scheme: 'light' }).axes.x.domain).toEqual({
      kind: 'data',
      includeZero: false,
      rounding: true,
    });
    node.axes = { x: { rounding: false } };
    expect(resolveChart(node, { scheme: 'light' }).axes.x.domain).toEqual({
      kind: 'data',
      includeZero: false,
      rounding: false,
    });
    node.axes.x!.domain = { kind: 'custom', min: 1.3, max: 8.7 };
    node.axes.x!.rounding = true;
    expect(resolveChart(node, { scheme: 'light' }).axes.x.domain).toEqual({
      kind: 'custom',
      min: 1.3,
      max: 8.7,
    });
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
        expect(seriesIn(scene)[0]?.marks[0]?.x).toBe(epoch);
        expect(scene.axes.x.timeZone).toBe(timeZone);
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

  it('passes automatic points to the engine', () => {
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
    expect(seriesIn(scene)[0]?.points).toBe('auto');
  });
});

describe('visibility, cell identity and bounds', () => {
  const dates = (rows: Cell[][], changes: Partial<XyChartNode> = {}) =>
    xy({
      data: {
        columns: [
          { id: 'x', label: 'Time', type: 'date', role: 'dimension' },
          { id: 'y', label: 'Y', type: 'number', role: 'metric' },
        ],
        rows,
      },
      ...changes,
    });

  it('orders ordinal categories by row, whatever the split', () => {
    const scene = resolve(
      splitBars([
        ['q1', 'a', 1],
        ['q2', 'b', 2],
        ['q3', 'a', 3],
      ])
    );
    expect(scene.categories.map(({ label }) => label)).toEqual([
      'q1',
      'q2',
      'q3',
    ]);
  });

  it('keeps hidden series in x positions and leaves them out of the summary', () => {
    const node = splitBars([
      [0, 'a', 1],
      [1, 'a', 2],
      [1000, 'b', 999],
    ]);
    node.data.columns[0] = {
      id: 'x',
      label: 'X',
      type: 'number',
      role: 'metric',
    };
    node.interactions = {
      select: ['category'],
      initial: { hiddenSeries: ['b'] },
    };
    const scene = resolve(node);
    expect(scene.categories.map(({ x }) => x)).toEqual([0, 1, 1000]);
    expect(scene.summary).toContain('from 1 to 2');
  });

  it('selects only the rows a series drew', () => {
    const node = splitBars([
      [0, 'a', 1],
      [null, 'a', 2],
      [null, 'b', 3],
    ]);
    node.data.columns[0] = {
      id: 'x',
      label: 'X',
      type: 'number',
      role: 'metric',
    };
    node.interactions = { select: ['series', 'legend'] };
    const scene = resolve(node);
    expect(seriesIn(scene).map(({ selection }) => selection?.rows)).toEqual([
      [0],
      undefined,
    ]);
    expect(scene.legend.items.map(({ selection }) => selection?.rows)).toEqual([
      [0],
      undefined,
    ]);
    expect(scene.summary).toContain('from 1 to 1');
  });

  it('treats an epoch and an ISO string for one instant as one value', () => {
    const node = splitBars([
      ['q1', 0, 1],
      ['q2', '1970-01-01T00:00:00Z', 2],
    ]);
    node.data.columns[1] = {
      id: 's',
      label: 'When',
      type: 'date',
      role: 'dimension',
    };
    expect(seriesIn(resolve(node)).map(({ key }) => key)).toEqual(['0']);
    node.data.rows.reverse();
    expect(seriesIn(resolve(node)).map(({ key }) => key)).toEqual([
      '1970-01-01T00\\:00\\:00Z',
    ]);
    const scene = resolve(
      dates(
        [
          [0, 1],
          ['1970-01-01T00:00:00Z', 2],
          [86_400_000, 3],
        ],
        { interactions: { select: ['category'] } }
      )
    );
    expect(scene.categories[0]?.selection?.rows).toEqual([0, 1]);
  });

  it('keeps a custom log domain', () => {
    expect(
      resolve(
        xy({
          axes: {
            y: { scale: 'log', domain: { kind: 'custom', min: 1, max: 100 } },
          },
        })
      ).axes.y?.domain
    ).toEqual({ kind: 'custom', min: 1, max: 100 });
  });

  it('labels the axis and annotations in the x format and its time zone', () => {
    const at = Date.parse('2026-01-01T06:00:00Z');
    const node = dates(
      [
        [at, 1],
        [at + 6 * 3_600_000, 2],
      ],
      {
        layers: [
          { kind: 'data', mark: 'line', x: 'x', y: [{ column: 'y' }] },
          { kind: 'annotations', events: [{ kind: 'point', at }] },
        ],
      }
    );
    node.data.columns[0]!.format = {
      kind: 'date',
      timeZone: 'Asia/Kolkata',
      timeStyle: 'short',
    };
    const scene = resolve(node);
    expect(scene.axes.x.timeZone).toBe('Asia/Kolkata');
    expect(formatAxisValue(scene, scene.axes.x, at)).toMatch(/^11:30\s?AM$/);
    const annotation = scene.layers.find(
      (layer) => layer.kind === 'annotation'
    );
    expect(
      annotation?.kind === 'annotation' && annotation.annotation.tooltip.header
    ).toMatch(/^11:30\s?AM$/);
  });

  it('keeps legend averages, medians and deviations finite near the largest double', () => {
    const scene = resolve(
      xy({
        data: {
          columns: [
            { id: 'x', label: 'X', type: 'number', role: 'metric' },
            { id: 'y', label: 'Y', type: 'number', role: 'metric' },
          ],
          rows: [
            [0, Number.MAX_VALUE],
            [1, Number.MAX_VALUE],
          ],
        },
        legend: { statistics: ['avg', 'median', 'standard_deviation'] },
      })
    );
    expect(
      scene.legend.items[0]?.statistics.map(({ value }) => value.includes('∞'))
    ).toEqual([false, false, false]);
  });

  it('keeps the median of two subnormal values', () => {
    const scene = resolve(
      xy({
        data: {
          columns: [
            { id: 'x', label: 'X', type: 'number', role: 'metric' },
            {
              id: 'y',
              label: 'Y',
              type: 'number',
              role: 'metric',
              format: { kind: 'number', notation: 'compact' },
            },
          ],
          rows: [
            [0, Number.MIN_VALUE],
            [1, Number.MIN_VALUE],
          ],
        },
        legend: { statistics: ['median'] },
      })
    );
    expect(scene.legend.items[0]?.statistics[0]?.value).toMatch(/^0\.0+5$/);
  });

  it('draws a -0 x cell at 0', () => {
    const scene = resolve(
      xy({
        data: {
          columns: [
            { id: 'x', label: 'X', type: 'number', role: 'metric' },
            { id: 'y', label: 'Y', type: 'number', role: 'metric' },
          ],
          rows: [
            [-0, 1],
            [1, 2],
          ],
        },
      })
    );
    expect(Object.is(seriesIn(scene)[0]?.marks[0]?.x, 0)).toBe(true);
  });
});
