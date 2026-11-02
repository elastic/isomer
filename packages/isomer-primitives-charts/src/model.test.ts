/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { metricExamples } from './examples';
import {
  alignMetricTrends,
  compareMetric,
  formatMetricValue,
  metricText,
  type MetricTile,
  metricTileColor,
  metricTiles,
  metricTimeLabel,
  type MetricTrendModel,
  metricTrendSchema,
} from './model';
import { METRIC_LIMITS } from './model/declarations';

const base = (): MetricTrendModel => ({
  type: 'metricTrend',
  title: 'Requests',
  tiles: [{ key: 'a', primary: { label: 'Count', value: 110 } }],
});
const comparisonTile = (
  current: number | null,
  previous: number | null,
  display: 'both' | 'absolute' | 'relative' | 'value' = 'both'
): MetricTile => ({
  key: 'a',
  primary: { label: 'Count', value: current },
  secondary: {
    label: 'Previous day',
    value: previous,
    comparison: { baseline: 'primary', display },
  },
});

describe('portable formatting', () => {
  it('reports an empty tile inventory without throwing during cross-field validation', () => {
    expect(metricTrendSchema.safeParse({ ...base(), tiles: [] }).success).toBe(
      false
    );
    expect(
      metricTrendSchema.safeParse({
        ...base(),
        tiles: [],
        collapse: { operation: 'sum', label: 'Total' },
      }).success
    ).toBe(false);
  });
  it('keeps the secondary reading distinct from its comparison in nonvisual output', () => {
    const text = metricText({
      ...base(),
      tiles: [comparisonTile(120, 100, 'absolute')],
    });
    expect(text).toContain('Previous day: 100');
    expect(text).toContain('Comparison: +20');
  });
  it('inherits the node locale for actual trend samples rather than headline formatted text', () => {
    const text = metricText(
      metricTrendSchema.parse({
        type: 'metricTrend',
        title: 'Localized',
        locale: 'de-DE',
        tiles: [
          {
            key: 'localized',
            primary: { label: 'Value', value: 5, formatted: 'Headline only' },
            progress: { min: -2000, max: 3000 },
            trend: {
              timeZone: 'UTC',
              primary: [
                { time: 0, value: 1234.5 },
                { time: 1, value: 2000 },
              ],
            },
          },
        ],
      })
    );
    expect(text).toContain('1.234,5');
    expect(text).toContain('in [-2.000, 3.000]');
  });
  it.each([
    [1200.5, {}, '1,200.5'],
    [-0, {}, '0'],
    [null, {}, 'N/A'],
    ['healthy', {}, 'healthy'],
    [0.125, { style: 'percent', precision: 1 }, '12.5%'],
    [1200, { style: 'compact', precision: 1 }, '1.2K'],
    [42.5, { style: 'currency', currency: 'USD', precision: 2 }, '$42.50'],
    [-2048, { style: 'bytes' }, '-2 KiB'],
    [150, { style: 'duration', unit: 'ms' }, '150 ms'],
    [
      1234.5,
      { locale: 'de-DE', precision: 1, prefix: '~', suffix: ' req' },
      '~1.234,5 req',
    ],
  ] as const)('formats %j with %j', (value, format, expected) => {
    expect(formatMetricValue(value, format)).toBe(expected);
  });
  it('preserves host-formatted strings without interpreting markup', () => {
    expect(formatMetricValue([1, 'two'])).toBe('1, two');
    const node = base();
    node.tiles[0]!.primary.formatted = '<em>1.2k custom</em>';
    expect(metricText(node)).toContain('<em>1.2k custom</em>');
  });
});

describe('independent readings and explicit comparison semantics', () => {
  it.each([
    [110, 100, 10, 0.1, 'up', '+10 (+10.00%)'],
    [75, 100, -25, -0.25, 'down', '-25 (-25.00%)'],
    [3, 0, 3, null, 'up', '+3'],
    [0, 0, 0, null, 'unchanged', '0'],
    [-5, -10, 5, 0.5, 'up', '+5 (+50.00%)'],
    [-20, -10, -10, -1, 'down', '-10 (-100.00%)'],
    [1001, 1, 1000, null, 'up', '+1,000'],
    [1, 1e-200, 1, null, 'up', '+1'],
  ])(
    'compares %s against %s',
    (current, previous, absolute, relative, direction, formatted) => {
      expect(compareMetric(comparisonTile(current, previous))).toMatchObject({
        absolute,
        relative,
        direction,
        formatted,
        tone: 'neutral',
      });
    }
  );
  it('does not equate upward direction with good', () => {
    const tile = comparisonTile(110, 100);
    tile.secondary!.comparison!.increase = 'bad';
    expect(compareMetric(tile)).toMatchObject({ direction: 'up', tone: 'bad' });
    tile.primary.value = 90;
    expect(compareMetric(tile)).toMatchObject({
      direction: 'down',
      tone: 'good',
    });
  });
  it('compares a secondary reading against a numeric baseline without subtracting it from primary', () => {
    const tile = comparisonTile(900, -3, 'value');
    tile.secondary!.comparison!.baseline = -5;
    expect(compareMetric(tile)).toMatchObject({
      absolute: 2,
      direction: 'up',
      formatted: '-3',
    });
  });
  it('distinguishes absolute percentage points from relative percent', () => {
    const tile = comparisonTile(0.05, 0.04);
    tile.secondary!.format = { style: 'percent', precision: 1 };
    expect(compareMetric(tile)).toMatchObject({
      formatted: '+1.0 percentage points (+25.0%)',
    });
  });
  it('retains the exact Lens direction even when a display rounds to zero', () => {
    const tile = comparisonTile(100.001, 100, 'absolute');
    tile.secondary!.format = { precision: 0 };
    expect(compareMetric(tile)).toMatchObject({
      direction: 'up',
      formatted: '+0',
    });
    expect(compareMetric(tile)?.absolute).toBeCloseTo(0.001);
  });
  it.each([
    [null, 100],
    [100, null],
    [null, null],
  ])('reports missing comparison %s %s', (value, previous) => {
    expect(compareMetric(comparisonTile(value, previous))).toMatchObject({
      absolute: null,
      direction: 'unavailable',
      formatted: 'N/A',
      tone: 'neutral',
    });
  });
  it('does not synthesize a comparison for an independent secondary value', () => {
    const tile = comparisonTile(100, 42);
    delete tile.secondary!.comparison;
    expect(compareMetric(tile)).toBeUndefined();
  });
});

describe('timestamp alignment and gaps', () => {
  const trend: NonNullable<MetricTile['trend']> = {
    primary: [
      { time: 2000, value: 8 },
      { time: 0, value: 2 },
      { time: 1000, value: null },
    ],
    secondary: [
      { time: 0, value: null },
      { time: 1500, value: 4 },
    ],
  };
  it('uses the sorted union of actual timestamps, not array index or interpolated readings', () => {
    expect(alignMetricTrends(trend)).toEqual([
      { time: 0, primary: 2, secondary: null },
      { time: 1000, primary: null, secondary: null },
      { time: 1500, primary: null, secondary: 4 },
      { time: 2000, primary: 8, secondary: null },
    ]);
    expect(trend.primary[0]!.time).toBe(2000);
  });
  it.each(['gap', 'zero', 'connect'] as const)(
    'preserves measured gaps in the table under %s drawing',
    (gap) => {
      const node = base();
      node.tiles[0]!.trend = { ...trend, gap, timeZone: 'UTC' };
      node.tiles[0]!.secondary = { label: 'Reference', value: 4 };
      expect(metricText(node)).toContain('gap; 4');
    }
  );
  it('disambiguates repeated wall times across DST using the offset', () => {
    expect(
      metricTimeLabel(Date.UTC(2026, 10, 1, 5, 30), 'America/New_York')
    ).toContain('GMT-4');
    expect(
      metricTimeLabel(Date.UTC(2026, 10, 1, 6, 30), 'America/New_York')
    ).toContain('GMT-5');
  });
});

describe('breakdown, collapse, color and progress', () => {
  it.each([
    ['sum', 30],
    ['avg', 15],
    ['min', 10],
    ['max', 20],
  ] as const)(
    'collapses %s over homogeneous numeric sources',
    (operation, expected) => {
      const node = metricExamples[3]!;
      const result = metricTiles({
        ...node,
        collapse: { operation, label: 'All services', max: 'static' },
      });
      expect(result).toHaveLength(1);
      expect(result[0]!.primary.value).toBe(expected);
      expect(result[0]!.progress!.max).toBe(100);
      expect(node.tiles).toHaveLength(2);
    }
  );
  it('aggregates null-only sources as missing, not zero', () => {
    const node = base();
    node.collapse = { operation: 'sum', label: 'All' };
    node.tiles[0]!.primary.value = null;
    expect(metricTiles(node)[0]!.primary.value).toBeNull();
  });
  it('collapses each series at matching instants and retains gap-only buckets', () => {
    const node = base();
    node.collapse = { operation: 'sum', label: 'All' };
    node.tiles = [
      {
        key: 'a',
        primary: { label: 'Count', value: 3 },
        trend: {
          primary: [
            { time: 0, value: null },
            { time: 10, value: 3 },
          ],
        },
      },
      {
        key: 'b',
        primary: { label: 'Count', value: 4 },
        trend: {
          primary: [
            { time: 0, value: null },
            { time: 20, value: 4 },
          ],
        },
      },
    ];
    expect(metricTiles(node)[0]!.trend!.primary).toEqual([
      { time: 0, value: null },
      { time: 10, value: 3 },
      { time: 20, value: 4 },
    ]);
  });
  it('uses authored percent palette bounds and inclusive lower stops; tile paint overrides palette paint', () => {
    const node = base();
    node.palette = {
      scale: 'percent',
      domain: { min: 100, max: 200 },
      bands: [
        { color: '#ff0000', tone: 'bad' },
        { from: 50, color: '#00ff00', tone: 'good', label: 'Healthy' },
      ],
    };
    node.tiles[0]!.primary.value = 150;
    expect(metricTileColor(node, node.tiles[0]!)).toEqual({
      color: '#00ff00',
      tone: 'good',
      label: 'Healthy',
    });
    node.tiles[0]!.color = '#0000ff';
    expect(metricTileColor(node, node.tiles[0]!).color).toBe('#0000ff');
    node.tiles[0]!.primary.value = null;
    expect(metricTileColor(node, node.tiles[0]!).tone).toBeUndefined();
  });
  it('does not clamp the reading to its progress range in nonvisual output', () => {
    const node = base();
    node.tiles[0]!.primary.value = -15;
    node.tiles[0]!.progress = { min: -10, max: 10 };
    expect(metricText(node)).toContain('-15 in [-10, 10]');
  });
});

describe('bounded, closed serializable declaration', () => {
  it.each(metricExamples)(
    'accepts $title including JSON round trips',
    (node) => {
      expect(
        metricTrendSchema.safeParse(JSON.parse(JSON.stringify(node))).success
      ).toBe(true);
    }
  );
  it.each([
    (n: MetricTrendModel) => {
      n.tiles[0]!.primary.value = NaN;
    },
    (n: MetricTrendModel) => {
      n.tiles[0]!.primary.value = Infinity;
    },
    (n: MetricTrendModel) => {
      n.tiles.push(n.tiles[0]!);
    },
    (n: MetricTrendModel) => {
      n.tiles[0]!.progress = { max: 0 };
    },
    (n: MetricTrendModel) => {
      n.tiles[0]!.progress = { min: 2, max: 1 };
    },
    (n: MetricTrendModel) => {
      n.tiles[0]!.primary.format = { style: 'currency' };
    },
    (n: MetricTrendModel) => {
      n.locale = 'not_a_locale';
    },
    (n: MetricTrendModel) => {
      n.tiles[0]!.trend = {
        timeZone: 'Invalid/Zone',
        primary: [
          { time: 0, value: 1 },
          { time: 1, value: 2 },
        ],
      };
    },
    (n: MetricTrendModel) => {
      n.tiles[0]!.trend = {
        primary: [
          { time: 0, value: 1 },
          { time: 0, value: 2 },
        ],
      };
    },
    (n: MetricTrendModel) => {
      n.tiles[0]!.secondary = {
        label: 'S',
        value: 'word',
        comparison: { baseline: 0, display: 'absolute' },
      };
    },
    (n: MetricTrendModel) => {
      n.tiles[0]!.primary.value = Number.MAX_VALUE;
      n.tiles[0]!.secondary = {
        label: 'S',
        value: -Number.MAX_VALUE,
        comparison: { baseline: 'primary', display: 'both' },
      };
    },
    (n: MetricTrendModel) => {
      n.palette = { scale: 'percent', bands: [{ color: '#ff0000' }] };
    },
    (n: MetricTrendModel) => {
      n.palette = {
        scale: 'absolute',
        bands: [
          { from: 10, color: '#ff0000' },
          { from: 9, color: '#000000' },
        ],
      };
    },
    (n: MetricTrendModel) => {
      n.tiles = Array.from({ length: METRIC_LIMITS.tiles + 1 }, (_, i) => ({
        ...n.tiles[0]!,
        key: String(i),
      }));
    },
    (n: MetricTrendModel) => {
      n.tiles[0]!.trend = {
        primary: Array.from(
          { length: METRIC_LIMITS.pointsPerSeries + 1 },
          (_, time) => ({ time, value: 1 })
        ),
      };
    },
  ])('refuses invalid semantic declarations #%#', (mutate) => {
    const node = base();
    mutate(node);
    expect(metricTrendSchema.safeParse(node).success).toBe(false);
  });
  it('refuses unknown fields instead of silently losing semantics', () => {
    expect(
      metricTrendSchema.safeParse({ ...base(), gauge: true }).success
    ).toBe(false);
    expect(
      metricTrendSchema.safeParse({
        ...base(),
        tiles: [{ ...base().tiles[0], savedObject: {} }],
      }).success
    ).toBe(false);
  });
  it('enforces the aggregate point cap across individually valid series', () => {
    const node = base();
    node.tiles = Array.from({ length: 6 }, (_, index) => ({
      key: String(index),
      primary: { label: 'Count', value: 1 },
      trend: {
        primary: Array.from({ length: 2000 }, (_, time) => ({
          time,
          value: 1,
        })),
      },
    }));
    expect(metricTrendSchema.safeParse(node).success).toBe(false);
  });
  it('refuses incompatible collapsed sources, static maxima, actions and overflow', () => {
    const valid = metricExamples[3]!;
    const node = structuredClone(valid);
    node.tiles[1]!.primary.format = { style: 'percent' };
    expect(metricTrendSchema.safeParse(node).success).toBe(false);
    node.tiles[1]!.primary.format = undefined;
    node.tiles[1]!.progress!.max = 200;
    expect(metricTrendSchema.safeParse(node).success).toBe(false);
    node.tiles[1]!.progress!.max = 100;
    node.tiles[0]!.primary.value = Number.MAX_VALUE;
    node.tiles[1]!.primary.value = Number.MAX_VALUE;
    expect(metricTrendSchema.safeParse(node).success).toBe(false);
    expect(() => metricTiles(node)).toThrow('non-finite');
  });
});
