/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Expected values come from the legacyMetric contract (docs/legacy-metric.md)
// and Kibana's legacy metric: tiles metric by metric, "bucket - metric"
// labels, bounds from `getLegacyMetricDataBounds`, `colorFullBackground` for
// a lone tile, Lens's font sizes and `withAutoScale`'s 0.3 to 1 scale.

import { describe, expect, it } from 'vitest';

import type { Cell, ChartColumn } from '../schema/data';
import type { LegacyMetricNode } from '../schema/legacy_metric';

import { resolveChart } from './resolve';
import { estimateTextWidth } from './resolve_legacy_metric';
import { CHART_CHROME, TABLE_CHROME } from './theme';

const RED = { light: '#CC5642', dark: '#AA3322' };
const GREEN = { light: '#209280', dark: '#107060' };

const columns: ChartColumn[] = [
  { id: 'host', label: 'Host', type: 'string', role: 'dimension' },
  { id: 'n', label: 'Count', type: 'number', role: 'metric' },
  { id: 'm', label: 'Errors', type: 'number', role: 'metric' },
];

const legacy = (
  rows: Cell[][],
  overrides: Partial<LegacyMetricNode> = {}
): LegacyMetricNode => ({
  type: 'legacyMetric',
  data: { columns, rows },
  metrics: [{ column: 'n' }],
  ...overrides,
});

const bands = {
  bands: [
    { to: 50, color: GREEN },
    { from: 50, color: RED },
  ],
};

const light = CHART_CHROME.light;

describe('resolveLegacyMetric', () => {
  it('lays tiles out metric by metric, labelled "bucket - metric"', () => {
    const scene = resolveChart(
      legacy(
        [
          ['a', 1, 10],
          ['b', 2, 20],
        ],
        {
          metrics: [{ column: 'n' }, { column: 'm' }],
          breakdown: { column: 'host' },
        }
      ),
      { scheme: 'light' }
    );
    expect(scene.tiles.map(({ label, value }) => [label, value.text])).toEqual([
      ['a - Count', '1'],
      ['b - Count', '2'],
      ['a - Errors', '10'],
      ['b - Errors', '20'],
    ]);
    expect(scene.tiles.map(({ source }) => source)).toEqual([
      { rows: [0], columns: ['host', 'n'] },
      { rows: [1], columns: ['host', 'n'] },
      { rows: [0], columns: ['host', 'm'] },
      { rows: [1], columns: ['host', 'm'] },
    ]);
    expect(scene.summary).toBe(
      'A - Count 1, b - Count 2, a - Errors 10, b - Errors 20.'
    );
  });

  it('labels a tile without a breakdown by its column, and states the defaults', () => {
    const scene = resolveChart(legacy([[null, 14_074, 0]]), {
      scheme: 'light',
    });
    expect(scene.tiles).toHaveLength(1);
    expect(scene.tiles[0]).toMatchObject({
      label: 'Count',
      value: { text: '14,074', raw: 14_074, color: light.text },
      labelColor: light.text,
      type: { value: 50, label: 16, padding: 16 },
    });
    expect(scene.tiles[0]!.background).toBeUndefined();
    expect(scene).toMatchObject({
      labelPosition: 'top',
      textAlign: 'left',
      showLabels: true,
      lineHeight: 1.5,
      valueWeight: 600,
      background: light.background,
      summary: 'Count is 14,074.',
    });
  });

  it.each([
    ['xs', 24, 12],
    ['s', 40, 14],
    ['m', 50, 16],
    ['l', 60, 20],
    ['xl', 80, 24],
    ['xxl', 96, 32],
  ] as const)(
    'sizes %s as Lens does: value %i, label %i',
    (size, value, label) => {
      const scene = resolveChart(legacy([[null, 1, 0]], { size }), {
        scheme: 'light',
      });
      expect(scene.tiles[0]!.type).toEqual({ value, label, padding: 16 });
    }
  );

  it('fills the chart with a lone tile’s band color, its text light on a dark color', () => {
    const scene = resolveChart(legacy([[null, 70, 0]], { colors: bands }), {
      scheme: 'dark',
    });
    const ink = TABLE_CHROME.dark.ghostText;
    expect(scene.background).toBe(RED.dark);
    expect(scene.tiles[0]!.background).toBeUndefined();
    expect(scene.tiles[0]!.value.color).toBe(ink);
    expect(scene.tiles[0]!.labelColor).toBe(ink);
  });

  it('colors each of several tiles’ own background, or their values', () => {
    const rows = [
      ['a', 10, 0],
      ['b', 90, 0],
    ];
    const background = resolveChart(
      legacy(rows, { colors: bands, breakdown: { column: 'host' } }),
      { scheme: 'light' }
    );
    expect(background.background).toBe(light.background);
    expect(background.tiles.map((tile) => tile.background)).toEqual([
      GREEN.light,
      RED.light,
    ]);
    // Text is dark on a light color, as Kibana's `needsLightText` decides.
    const pale = resolveChart(
      legacy([[null, 10, 0]], {
        colors: { bands: [{ color: { light: '#F1D86F', dark: '#F1D86F' } }] },
      }),
      { scheme: 'light' }
    );
    expect(pale.tiles[0]!.labelColor).toBe(TABLE_CHROME.light.inkText);
    const value = resolveChart(
      legacy(rows, {
        colors: bands,
        breakdown: { column: 'host' },
        applyColorTo: 'value',
      }),
      { scheme: 'light' }
    );
    expect(value.tiles.map((tile) => tile.background)).toEqual([
      undefined,
      undefined,
    ]);
    expect(value.tiles.map((tile) => tile.value.color)).toEqual([
      GREEN.light,
      RED.light,
    ]);
    expect(value.tiles.map((tile) => tile.labelColor)).toEqual([
      light.text,
      light.text,
    ]);
  });

  it('colors no tile of a column that is not a number, nor one with no value', () => {
    const scene = resolveChart(
      legacy([['a', null, 0]], {
        metrics: [{ column: 'host' }, { column: 'n' }],
        colors: bands,
      }),
      { scheme: 'light' }
    );
    expect(scene.tiles.map((tile) => tile.background)).toEqual([
      undefined,
      undefined,
    ]);
    expect(scene.tiles.map((tile) => tile.value.color)).toEqual([
      light.text,
      light.text,
    ]);
  });

  it.each([
    // A lone value spans 0 to twice itself: 30 is at 50%.
    [[[null, 30, 0]], 'red'],
    // Across rows, the least to the greatest: 20 of 10 to 30 is at 50%,
    // 10 at 0%.
    [
      [
        ['a', 20, 0],
        ['b', 10, 0],
        ['c', 30, 0],
      ],
      'red',
    ],
    // A lone negative value spans twice itself to 0: -30 of -60 to 0 is at 50%.
    [[[null, -30, 0]], 'red'],
    // A lone 0 spans -50 to 100: at a third.
    [[[null, 0, 0]], 'red'],
  ] as const)(
    'places percentage bands in the range of the column’s values (%#)',
    (rows, expected) => {
      const scene = resolveChart(
        legacy(rows as unknown as Cell[][], {
          colors: {
            bands: [
              { to: 30, color: GREEN },
              { from: 30, color: RED },
            ],
          },
          bandsRange: 'percentage',
          applyColorTo: 'value',
          ...(rows.length > 1 ? { breakdown: { column: 'host' } } : {}),
        }),
        { scheme: 'light' }
      );
      expect(scene.tiles[0]!.value.color).toBe(
        expected === 'red' ? RED.light : GREEN.light
      );
    }
  );

  it('puts every tile in the first band when the values are all the same', () => {
    const scene = resolveChart(
      legacy(
        [
          ['a', 5, 0],
          ['b', 5, 0],
        ],
        {
          colors: {
            bands: [
              { from: 0, to: 50, color: GREEN },
              { from: 50, color: RED },
            ],
          },
          bandsRange: 'percentage',
          applyColorTo: 'value',
          breakdown: { column: 'host' },
        }
      ),
      { scheme: 'light' }
    );
    expect(scene.tiles.map(({ value }) => value.color)).toEqual([
      GREEN.light,
      GREEN.light,
    ]);
  });

  it('shrinks a tile to fit the Scene’s size, no further than three tenths', () => {
    const node = legacy([[null, 123_456_789, 0]], { size: 'xxl' });
    const unsized = resolveChart(node, { scheme: 'light' });
    const natural = unsized.tiles[0]!.box;
    expect(natural.width).toBeCloseTo(
      estimateTextWidth('123,456,789', 96, 600) + 32,
      1
    );
    expect(natural.height).toBe((96 + 32) * 1.5 + 32);
    expect(unsized.tiles[0]!.type.value).toBe(96);

    const fits = resolveChart(node, {
      scheme: 'light',
      size: { width: 2000, height: 2000 },
    });
    expect(fits.tiles[0]!.type.value).toBe(96);

    const half = resolveChart(node, {
      scheme: 'light',
      size: { width: natural.width / 2, height: 2000 },
    });
    expect(half.tiles[0]!.type).toEqual({ value: 48, label: 16, padding: 8 });

    const tiny = resolveChart(node, {
      scheme: 'light',
      size: { width: 10, height: 10 },
    });
    expect(tiny.tiles[0]!.type.value).toBeCloseTo(96 * 0.3, 2);
  });

  it('leaves labels out of the box when they are hidden', () => {
    const scene = resolveChart(legacy([[null, 1, 0]], { showLabels: false }), {
      scheme: 'light',
    });
    expect(scene.showLabels).toBe(false);
    expect(scene.tiles[0]!.box.height).toBe(50 * 1.5 + 32);
  });

  it('says there are no results when there are no rows', () => {
    const scene = resolveChart(
      legacy([], {
        metrics: [{ column: 'n' }, { column: 'm' }],
        breakdown: { column: 'host' },
        title: 'Hosts',
      }),
      { scheme: 'light' }
    );
    expect(scene.tiles).toEqual([]);
    expect(scene.empty).toEqual({
      reason: 'noResults',
      text: 'No results found',
    });
    expect(scene.summary).toBe('Hosts: Count and Errors have no data.');
  });

  it('offers a tile selection by its breakdown cell, only when asked', () => {
    const rows = [
      ['a', 1, 0],
      ['b', 2, 0],
    ];
    const plain = resolveChart(
      legacy(rows, { breakdown: { column: 'host' } }),
      {
        scheme: 'light',
      }
    );
    expect(plain.tiles.map(({ selection }) => selection)).toEqual([
      undefined,
      undefined,
    ]);
    const selectable = resolveChart(
      legacy(rows, {
        breakdown: { column: 'host' },
        interactions: { select: ['tile'] },
      }),
      { scheme: 'light' }
    );
    expect(selectable.tiles[1]!.selection).toEqual({
      target: 'tile',
      rows: [1],
      columns: ['host'],
      values: { host: 'b' },
      description: 'Host: b · Count: 2',
    });
  });
});
