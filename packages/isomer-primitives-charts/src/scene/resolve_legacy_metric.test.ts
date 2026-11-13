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

import { CHARTS_THEME } from '../render/theme';
import type { Cell, ChartColumn } from '../schema/data';
import type { LegacyMetricNode } from '../schema/legacy_metric';

import { wrappedHeight } from './common';
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

  // Kibana's `.legacyMtrVis__container--light` writes text in
  // `euiTheme.colors.emptyShade`: #FFFFFF in Borealis light, #111C2C in dark.
  it('fills the chart with a lone tile’s band color, its text emptyShade on a dark color', () => {
    const scene = resolveChart(legacy([[null, 70, 0]], { colors: bands }), {
      scheme: 'dark',
    });
    const ink = '#111C2C';
    expect(scene.background).toBe(RED.dark);
    expect(scene.tiles[0]!.background).toBeUndefined();
    expect(scene.tiles[0]!.value.color).toBe(ink);
    expect(scene.tiles[0]!.labelColor).toBe(ink);
  });

  // Gate A: Kibana draws a light band's text in the panel's `euiTextColor`,
  // #384861 in light and #B4C1D5 in dark, not EUI's `textInk` (#07101F).
  it.each([
    ['light', '#384861', '#FFFFFF'],
    ['dark', '#B4C1D5', '#111C2C'],
  ] as const)(
    'writes %s text in euiTextColor on a light band and emptyShade on a dark one',
    (scheme, text, emptyShade) => {
      const tile = (color: string) =>
        resolveChart(
          legacy([[null, 120, 0]], {
            colors: { bands: [{ color: { light: color, dark: color } }] },
          }),
          { scheme }
        ).tiles[0]!;
      expect(tile('#54B399')).toMatchObject({
        value: { color: text },
        labelColor: text,
      });
      expect(tile('#1750BA')).toMatchObject({
        value: { color: emptyShade },
        labelColor: emptyShade,
      });
    }
  );

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
    // Text keeps the panel's `euiTextColor` on a light color: Kibana's
    // `needsLightText` is false, so no class or style changes it.
    const pale = resolveChart(
      legacy([[null, 10, 0]], {
        colors: { bands: [{ color: { light: '#F1D86F', dark: '#F1D86F' } }] },
      }),
      { scheme: 'light' }
    );
    expect(pale.tiles[0]!.labelColor).toBe(light.text);
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

  it.each([
    [[[null, 1e308, 0]], 'red', 0],
    [[[null, -1e308, 0]], 'red', 0],
    [
      [
        ['a', -1e308, 0],
        ['b', 0, 0],
        ['c', 1e308, 0],
      ],
      'red',
      1,
    ],
  ] as const)(
    'places percentage bands without overflow at the ends of a number (%#)',
    (rows, expected, tile) => {
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
      expect(scene.tiles[tile]!.value.color).toBe(
        expected === 'red' ? RED.light : GREEN.light
      );
    }
  );

  it('places percentage bands across a large table', () => {
    const count = 200_000;
    const scene = resolveChart(
      legacy(
        Array.from({ length: count }, (_, index) => [`h${index}`, index, 0]),
        {
          colors: {
            bands: [
              { to: 50, color: GREEN },
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
    expect(scene.tiles[0]!.value.color).toBe(GREEN.light);
    expect(scene.tiles[count - 1]!.value.color).toBe(RED.light);
  });

  it('shrinks wrapped tiles together until they fit the chart’s height', () => {
    const rows = Array.from({ length: 12 }, (_, index) => [
      `host-${index}`,
      1000 + index,
      0,
    ]);
    const node = legacy(rows, { breakdown: { column: 'host' } });
    const size = { width: 480, height: 300 };
    const unfitted = resolveChart(node, { scheme: 'light' });
    expect(
      wrappedHeight(
        unfitted.tiles.map(({ box }) => box),
        size.width
      )
    ).toBeGreaterThan(size.height);

    const scene = resolveChart(node, { scheme: 'light', size });
    const boxes = scene.tiles.map(({ box }) => box);
    expect(wrappedHeight(boxes, size.width)).toBeLessThanOrEqual(size.height);
    expect(new Set(scene.tiles.map(({ type }) => type.value)).size).toBe(1);
    // The fit is the largest: tiles a little larger would overrun.
    const larger = boxes.map(({ width, height }) => ({
      width: width * 1.05,
      height: height * 1.05,
    }));
    expect(wrappedHeight(larger, size.width)).toBeGreaterThan(size.height);
  });

  it('shrinks wrapped tiles no further than three tenths', () => {
    const rows = Array.from({ length: 200 }, (_, index) => [
      `host-${index}`,
      index,
      0,
    ]);
    const scene = resolveChart(
      legacy(rows, { breakdown: { column: 'host' } }),
      {
        scheme: 'light',
        size: { width: 480, height: 100 },
      }
    );
    expect(scene.tiles[0]!.type.value).toBeCloseTo(
      resolveChart(legacy([[null, 1, 0]]), { scheme: 'light' }).tiles[0]!.type
        .value * 0.3,
      1
    );
  });

  it('marks emphasized tiles, and fits their notes under the tiles', () => {
    const rows = Array.from({ length: 6 }, (_, index) => [
      `host-${index}`,
      index,
      0,
    ]);
    const node = legacy(rows, {
      breakdown: { column: 'host' },
      emphasis: [{ rows: [1], note: 'Busiest' }, { rows: [3] }],
    });
    const scene = resolveChart(node, { scheme: 'dark' });
    const shade = TABLE_CHROME.dark.emphasis;
    expect(scene.tiles.map(({ background }) => background)).toEqual([
      undefined,
      shade,
      undefined,
      shade,
      undefined,
      undefined,
    ]);
    expect(scene.tiles.map(({ emphasis }) => emphasis)).toEqual([
      undefined,
      'Busiest',
      undefined,
      '',
      undefined,
      undefined,
    ]);

    const { noteHeight } = CHARTS_THEME.chart.legacyMetric;
    const tight = wrappedHeight(
      resolveChart(legacy(rows, { breakdown: { column: 'host' } }), {
        scheme: 'dark',
      }).tiles.map(({ box }) => box),
      480
    );
    const fitted = resolveChart(node, {
      scheme: 'dark',
      size: { width: 480, height: tight },
    });
    expect(
      wrappedHeight(
        fitted.tiles.map(({ box }) => box),
        480
      ) + noteHeight
    ).toBeLessThanOrEqual(tight);
  });

  it('leaves a lone emphasized tile on the band that fills the chart', () => {
    const scene = resolveChart(
      legacy([[null, 90, 0]], {
        colors: {
          bands: [{ color: { light: '#1750BA', dark: '#1750BA' } }],
        },
        emphasis: [{ rows: [0], note: 'Over budget' }],
      }),
      { scheme: 'light' }
    );
    expect(scene.background).toBe('#1750BA');
    expect(scene.tiles[0]!.background).toBeUndefined();
    expect(scene.tiles[0]!.emphasis).toBe('Over budget');
    expect(scene.tiles[0]!.labelColor).toBe(light.background);
  });

  it('shades an emphasized tile no band colors', () => {
    const scene = resolveChart(
      legacy([[null, 90, 0]], { emphasis: [{ rows: [0] }] }),
      { scheme: 'light' }
    );
    expect(scene.background).toBe(light.background);
    expect(scene.tiles[0]!.background).toBe(TABLE_CHROME.light.emphasis);
    expect(scene.tiles[0]!.labelColor).toBe(light.text);
  });

  it('measures full-width characters at an em each', () => {
    expect(estimateTextWidth('東京', 10)).toBe(20);
    expect(estimateTextWidth('서울', 10)).toBe(20);
    expect(estimateTextWidth('ＡＢ', 10)).toBe(20);
  });
});
