/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { assertPackIconsValid } from '@elastic/isomer-sdk/testing';
import { describe, expect, it } from 'vitest';

import { createChartsPack } from '../pack';
import { sparkShade } from '../shared/color';

import {
  breakdownExample,
  example,
  examples,
  progressExample,
  textExample,
} from './examples';
import { resolveMetric } from './resolve';
import { type MetricNode, metricSchema } from './schema';

const runtime = createIsomerRuntime({
  packs: [createChartsPack({ metric: () => null })],
});

const compose = (node: object): Composition => ({
  type: 'view',
  body: [node as PrimitiveNode],
});

const issues = (node: object) =>
  metricSchema
    .safeParse(node)
    .error?.issues.map(({ path, message }) => [path.join('.'), message]) ?? [];

const tile = (overrides: object) => ({
  type: 'metric',
  tiles: [{ key: 'a', value: 1, ...overrides }],
});

describe('metric schema', () => {
  it('accepts every example through the runtime', () => {
    for (const node of examples) {
      expect(runtime.validate(compose(node)).errors).toEqual([]);
    }
  });

  it('rejects duplicate keys', () => {
    expect(
      issues({
        type: 'metric',
        tiles: [
          { key: 'a', value: 1 },
          { key: 'a', value: 2 },
        ],
      })
    ).toEqual([['tiles.1.key', 'duplicate tile key `a`']]);
  });

  it('rejects a change on a text value', () => {
    expect(
      issues(tile({ value: 'up', secondary: { kind: 'change', previous: 1 } }))
    ).toEqual([['tiles.0.secondary', 'a `change` needs a numeric `value`']]);
  });

  it('rejects unordered trend points and a trend with a progress bar', () => {
    expect(
      issues(
        tile({
          visual: {
            kind: 'trend',
            points: [
              { x: 2, y: 1 },
              { x: 2, y: 3 },
            ],
          },
        })
      )
    ).toEqual([
      [
        'tiles.0.visual.points.1.x',
        'points must be in strictly increasing `x`',
      ],
    ]);
    expect(
      issues(tile({ visual: { kind: 'progress', max: 2, points: [] } })).map(
        ([path]) => path
      )
    ).toEqual(['tiles.0.visual']);
  });

  it('rejects a progress bar on a text value, and keeps one on a missing value', () => {
    const progress = { kind: 'progress', max: 10 };
    expect(issues(tile({ value: 'up', visual: progress }))).toEqual([
      ['tiles.0.visual', 'a progress bar needs a numeric or missing `value`'],
    ]);
    expect(issues(tile({ value: null, visual: progress }))).toEqual([]);
  });

  it('rejects an unknown color and a non-finite value', () => {
    const paths = (node: object) => issues(node).map(([path]) => path);
    expect(paths(tile({ color: 'teal' }))).toEqual(['tiles.0.color']);
    expect(paths(tile({ value: Infinity }))).toEqual(['tiles.0.value']);
  });
});

describe('resolveMetric', () => {
  it('formats the value and picks text that reads on the fill', () => {
    const [requests] = resolveMetric(example).tiles;
    expect(requests).toMatchObject({
      value: '182,340',
      number: 182_340,
      fill: '#0B64DD',
    });
    expect(requests!.text.title).toBe('#E3E8F2');
  });

  it('derives a change from the previous reading', () => {
    expect(resolveMetric(example).tiles[0]!.secondary).toMatchObject({
      value: '+11.10%',
      badge: { background: '#C9F3E3', text: '#09724D', glyph: '↑' },
      description: 'vs previous day up +11.10%',
    });
  });

  it('colors a change by whether a rise is good', () => {
    const fall = (increase: 'good' | 'bad' | 'neutral', show?: 'absolute') =>
      resolveMetric({
        type: 'metric',
        tiles: [
          {
            key: 'a',
            value: 90,
            secondary: {
              kind: 'change',
              previous: 100,
              increase,
              ...(show && { show }),
            },
          },
        ],
      }).tiles[0]!.secondary;
    expect(fall('good')).toMatchObject({
      value: '-10.00%',
      badge: { background: '#FDDDD8', glyph: '↓' },
    });
    expect(fall('bad')).toMatchObject({ badge: { background: '#C9F3E3' } });
    expect(fall('neutral', 'absolute')).toMatchObject({
      value: '-10',
      badge: { background: '#E3E8F2' },
    });
  });

  it('shows the absolute difference when the previous reading is zero', () => {
    const node: MetricNode = {
      type: 'metric',
      tiles: [
        { key: 'a', value: 4, secondary: { kind: 'change', previous: 0 } },
      ],
    };
    expect(resolveMetric(node).tiles[0]!.secondary).toMatchObject({
      value: '+4',
      badge: { glyph: '↑' },
    });
  });

  it('signs a rise once when the pattern already signs it', () => {
    const [only] = resolveMetric({
      type: 'metric',
      tiles: [
        {
          key: 'a',
          value: 20,
          format: { kind: 'pattern', pattern: '+0' },
          secondary: { kind: 'change', previous: 10, show: 'absolute' },
        },
      ],
    }).tiles;
    expect(only!.secondary?.value).toBe('+10');
  });

  it('keeps a progress tile on the background and fills the bar', () => {
    const [disk] = resolveMetric(progressExample, 'dark').tiles;
    expect(disk).toMatchObject({
      value: '384.0GB',
      fill: '#111C2C',
      secondary: {
        value: '512GB',
        badge: { background: '#2B394F', text: '#B4C1D5' },
      },
      visual: {
        kind: 'progress',
        min: 0,
        ratio: 0.75,
        direction: 'horizontal',
        color: '#61A2FF',
      },
    });
  });

  // Expected ratios are d3 `scaleLinear` output, clamped, as Elastic Charts' progress bar computes them.
  it.each([
    [5, 5, 5, 0.5],
    [3, 0, 0, 0.5],
    [-5, 0, -10, 0.5],
    [5, 0, -10, 0],
    [150, 0, 100, 1],
  ])('accepts and fills %d on [%d, %d] to %d', (value, min, max, ratio) => {
    const node = {
      type: 'metric' as const,
      tiles: [
        { key: 'a', value, visual: { kind: 'progress' as const, min, max } },
      ],
    };
    expect(runtime.validate(compose(node)).errors).toEqual([]);
    const [only] = resolveMetric(node).tiles;
    expect(only!.visual).toMatchObject({ kind: 'progress', ratio });
  });

  it.each([0, 1])('accepts a trend of %d points', (count) => {
    const points = Array.from({ length: count }, (_, x) => ({ x, y: 1 }));
    expect(
      runtime.validate(compose(tile({ visual: { kind: 'trend', points } })))
        .errors
    ).toEqual([]);
  });

  it('reads how full a progress bar is, and labels its ends in the tile format', () => {
    const [disk] = resolveMetric(progressExample).tiles;
    expect(disk!.visual).toMatchObject({
      minReading: '0.0B',
      maxReading: '512.0GB',
      description: '75% of 512.0GB',
    });
    expect(disk!.reading).toBe(
      'Disk used, 384.0GB, Quota 512GB, 75% of 512.0GB'
    );
    expect(
      runtime.surfaces.markdown.renderNode(progressExample as PrimitiveNode)
    ).toBe('**Disk used**: 384.0GB, Quota 512GB, 75% of 512.0GB');
  });

  it('paints the value instead of the tile, and reads a missing value as N/A', () => {
    const [country, latency] = resolveMetric(textExample).tiles;
    expect(country).toMatchObject({
      value: 'Portugal',
      fill: '#A6EDEA',
      number: undefined,
    });
    expect(latency).toMatchObject({
      value: 'N/A',
      fill: '#FFFFFF',
      valueColor: '#EE4C48',
    });
  });

  // Expected shades are Elastic Charts 73.3.2 `getSparkLineColor` output.
  it.each([
    ['#0B64DD', '#277EF4'],
    ['#FFFFFF', '#E6E6E6'],
    ['#24C292', '#3EDBAB'],
    ['#111C2C', '#1F3351'],
  ])('shades a trend on %s as Elastic Charts does', (fill, shade) => {
    expect(sparkShade(fill)).toBe(shade);
  });

  it('draws the trend in the tile fill’s shade', () => {
    expect(resolveMetric(example).tiles[0]!.visual).toMatchObject({
      color: '#277EF4',
    });
  });

  it('raises the action with the tile key and filters', () => {
    expect(
      resolveMetric(breakdownExample).tiles.map(({ action }) => action)
    ).toContainEqual({
      name: 'dashboard/filter',
      context: {
        key: 'web-02',
        filters: [{ field: 'host.name', value: 'web-02' }],
      },
    });
  });

  it('fills layout defaults and limits columns to the tiles', () => {
    expect(resolveMetric(textExample)).toMatchObject({
      columns: 2,
      layout: {
        titleAlign: 'left',
        valueAlign: 'right',
        valuePosition: 'bottom',
      },
    });
  });
});

describe('action filters', () => {
  const action = (filters: object[]) =>
    tile({ action: { name: 'filter', filters } });

  it('accepts every filter Lens builds for a bucket and passes it through', () => {
    const filters = [
      { field: 'host', value: 'a' },
      { field: 'host', values: ['a', 'b'], negate: true },
      { field: 'host', exists: false },
      { field: 'bytes', range: { gte: 0, lt: 1024 } },
      { query: 'response : 500', language: 'kuery' },
    ];
    expect(issues(action(filters))).toEqual([]);
    expect(
      resolveMetric(action(filters) as MetricNode).tiles[0]!.action
    ).toEqual({
      name: 'filter',
      context: { key: 'a', filters },
    });
  });

  it.each([
    [{ field: 'host', values: [] }],
    [{ field: 'host', range: { gte: 'a' } }],
    [{ query: 'x', language: 'esql' }],
    [{ field: 'host', value: 'a', exists: true }],
  ])('rejects %j', (filter) => {
    expect(issues(action([filter]))).toHaveLength(1);
  });
});

describe('metric limits', () => {
  it('draws an empty grid', () => {
    expect(issues({ type: 'metric', tiles: [] })).toEqual([]);
    expect(resolveMetric({ type: 'metric', tiles: [] })).toMatchObject({
      columns: 1,
      tiles: [],
    });
  });

  it('pads a grid with placeholders', () => {
    expect(
      resolveMetric({
        type: 'metric',
        tiles: [{ key: 'a', value: 1 }],
        placeholders: 4,
      })
    ).toMatchObject({ columns: 3, placeholders: 4 });
    expect(resolveMetric({ type: 'metric', tiles: [] })).toMatchObject({
      placeholders: 0,
    });
  });

  it('takes long text and many tiles up to one pack-wide cap', () => {
    expect(issues(tile({ title: 'x'.repeat(10_000) }))).toEqual([]);
    expect(issues(tile({ title: 'x'.repeat(10_001) }))).toHaveLength(1);
    const tiles = Array.from({ length: 10_000 }, (_, i) => ({
      key: String(i),
      value: i,
    }));
    expect(issues({ type: 'metric', tiles, columns: 500 })).toEqual([]);
  });

  it('reads an empty grid as no text', () => {
    expect(
      runtime.surfaces.text.renderNode({
        type: 'metric',
        tiles: [],
      } as PrimitiveNode)
    ).toBe('');
  });
});

describe('metric text and markdown', () => {
  it('reads every tile', () => {
    expect(runtime.surfaces.text.renderNode(textExample as PrimitiveNode))
      .toMatchInlineSnapshot(`
      "Top country, Portugal
      p99 latency, N/A"
    `);
    expect(
      runtime.surfaces.markdown.renderNode(example as PrimitiveNode)
    ).toMatchInlineSnapshot(
      `"**Requests**: Last 24 hours, 182,340, vs previous day up +11.10%"`
    );
  });
});

describe('metric breakdown text', () => {
  it('reads every breakdown tile', () => {
    expect(runtime.surfaces.text.renderNode(breakdownExample as PrimitiveNode))
      .toMatchInlineSnapshot(`
      "web-01, CPU, 42.0%
      web-02, CPU, 81.0%
      web-03, CPU, 97.0%"
    `);
  });
});

describe('charts pack', () => {
  it('has a valid icon for every primitive', () => {
    expect(() =>
      assertPackIconsValid(createChartsPack({ metric: () => null }))
    ).not.toThrow();
  });
});
