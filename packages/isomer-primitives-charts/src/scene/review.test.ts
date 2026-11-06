/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { formatValue } from '../format/format';
import { dateFormat, numberFormat } from '../format/intl';
import type { MetricNode } from '../schema/metric';
import { type XyChartNode, xyChartSchema } from '../schema/xy_chart';

import { resolveChart } from './resolve';
import { niceDomain, niceTimeDomain, timeTicks } from './ticks';
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
const metric = (background: MetricNode['background']): MetricNode => ({
  type: 'metric',
  data: {
    columns: [
      { id: 'v', label: 'Value', type: 'number', role: 'metric' },
      { id: 'max', label: 'Max', type: 'number', role: 'metric' },
    ],
    rows: [[5, 10]],
  },
  value: { column: 'v', color: { light: '#f00', dark: '#f00' } },
  background,
});

describe('review regressions', () => {
  it('uses English fallback for unsupported well-formed locales', () => {
    expect(numberFormat('zz-ZZ', {}).resolvedOptions().locale).toMatch(/^en/);
    expect(dateFormat('zz-ZZ', {}).resolvedOptions().locale).toMatch(/^en/);
    expect(formatValue(1234.5, { kind: 'number' }, { locale: 'zz-ZZ' })).toBe(
      '1,234.5'
    );
  });

  it.each(['light', 'dark'] as const)(
    'keeps metric overlays visible in %s',
    (scheme) => {
      const progress = resolveChart(metric({ kind: 'bar', max: 'max' }), {
        scheme,
      }).tiles[0]!;
      expect(progress.background).toBe('#ff0000');
      expect(progress.progress?.fraction).toBe(0.5);
      expect(progress.progress?.color).not.toBe(progress.background);
      const trend = resolveChart(
        metric({
          kind: 'trend',
          x: 't',
          y: 'v',
          data: {
            columns: [
              { id: 't', label: 'Time', type: 'date', role: 'dimension' },
              { id: 'v', label: 'Value', type: 'number', role: 'metric' },
            ],
            rows: [
              [0, 1],
              [1, 2],
            ],
          },
        }),
        { scheme }
      ).tiles[0]!;
      expect(trend.trend?.color).not.toBe(trend.background);
    }
  );

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

  it('keeps hourly ticks on local hours across half-hour DST', () => {
    const ticks = timeTicks(
      Date.parse('2026-10-03T13:30:00Z'),
      Date.parse('2026-10-03T19:00:00Z'),
      8,
      'Australia/Lord_Howe'
    );
    expect(ticks.length).toBeGreaterThan(2);
    const format = new Intl.DateTimeFormat('en', {
      timeZone: 'Australia/Lord_Howe',
      minute: '2-digit',
    });
    expect(ticks.map((t) => format.format(t))).toEqual(ticks.map(() => '0'));
  });

  it('adapts multivalue coordinates using the first non-null value', () => {
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
    const tile = resolveChart(
      {
        ...metric({ kind: 'bar', max: 'max' }),
        data: {
          columns: [
            {
              id: 'v',
              label: 'V',
              type: 'number',
              role: 'metric',
              multivalue: true,
            },
            {
              id: 'max',
              label: 'Max',
              type: 'number',
              role: 'metric',
              multivalue: true,
            },
          ],
          rows: [
            [
              [5, 6],
              [10, 20],
            ],
          ],
        },
      },
      { scheme: 'light' }
    ).tiles[0]!;
    expect(tile.progress?.fraction).toBe(0.5);
  });

  it('preserves per-layer x columns and selection values', () => {
    const node = xy({
      data: {
        columns: [
          { id: 'x', label: 'X', type: 'date', role: 'dimension' },
          { id: 'other', label: 'Other', type: 'date', role: 'dimension' },
          { id: 'y', label: 'Y', type: 'number', role: 'metric' },
        ],
        rows: [
          [0, null, 1],
          [null, 1000, 2],
        ],
      },
      layers: [
        {
          kind: 'data',
          mark: 'line',
          x: 'x',
          rows: [0, 1],
          y: [{ column: 'y' }],
        },
        {
          kind: 'data',
          mark: 'line',
          x: 'other',
          rows: [1, 2],
          y: [{ column: 'y' }],
        },
      ],
      interactions: { select: ['datum', 'category'] },
    });
    expect(xyChartSchema.safeParse(node).success).toBe(true);
    const scene = resolve(node);
    expect(seriesIn(scene).map(({ marks }) => marks[0]?.x)).toEqual([0, 1000]);
    expect(seriesIn(scene)[1]?.marks[0]?.selection?.values).toEqual({
      other: 1000,
    });
    expect(scene.categories[1]?.selection?.values).toEqual({ other: 1000 });
  });
  it('supports layers without x alongside a continuous x layer', () => {
    const node = xy({
      data: {
        columns: [
          { id: 'x', label: 'X', type: 'date', role: 'dimension' },
          { id: 'y', label: 'Y', type: 'number', role: 'metric' },
        ],
        rows: [
          [1000, 1],
          [2000, 2],
        ],
      },
      layers: [
        {
          kind: 'data',
          mark: 'line',
          x: 'x',
          rows: [0, 1],
          y: [{ column: 'y' }],
        },
        { kind: 'data', mark: 'line', rows: [1, 2], y: [{ column: 'y' }] },
      ],
    });
    expect(xyChartSchema.safeParse(node).success).toBe(true);
    const scene = resolve(node);
    expect(seriesIn(scene)[1]?.marks[0]?.x).toBe(0);
    expect(scene.categories.find(({ x }) => x === 0)?.label).toBe('');
  });

  it('adapts multivalue metric trend coordinates', () => {
    const node = metric({
      kind: 'trend',
      x: 't',
      y: 'v',
      data: {
        columns: [
          {
            id: 't',
            label: 'Time',
            type: 'date',
            role: 'dimension',
            multivalue: true,
          },
          {
            id: 'v',
            label: 'Value',
            type: 'number',
            role: 'metric',
            multivalue: true,
          },
        ],
        rows: [
          [
            [null, 1000, 2000],
            [null, 5, 10],
          ],
        ],
      },
    });
    expect(
      resolveChart(node, { scheme: 'light' }).tiles[0]?.trend?.points
    ).toEqual([{ x: 1000, y: 5 }]);
  });

  it.each(['bar', 'trend'] as const)(
    'contrasts a %s overlay against an opaque long-form background',
    (kind) => {
      const node = metric(
        kind === 'bar'
          ? { kind, max: 'max' }
          : {
              kind,
              x: 't',
              y: 'v',
              data: {
                columns: [
                  { id: 't', label: 'Time', type: 'date', role: 'dimension' },
                  { id: 'v', label: 'Value', type: 'number', role: 'metric' },
                ],
                rows: [
                  [0, 1],
                  [1, 2],
                ],
              },
            }
      );
      node.value.color = { light: '#ff0000', dark: '#ff0000' };
      const tile = resolveChart(node, { scheme: 'light' }).tiles[0]!;
      expect(
        kind === 'bar' ? tile.progress?.color : tile.trend?.color
      ).not.toBe(tile.background);
    }
  );
});
