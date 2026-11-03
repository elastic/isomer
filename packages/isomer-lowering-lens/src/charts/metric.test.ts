/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { plan } from '../plan';
import { readResponse } from '../read_response';

import { bind, type BindOptions } from './index';

// Expected nodes follow what Lens's `metricVis` draws: `metric_vis.tsx`,
// `secondary_metric_info.ts` (and its tests' compare-to-primary cases) and the
// runtime converters. Each case runs the public plan → readResponse → bind path.

interface Layer {
  esql?: string;
  columns: Record<string, unknown>[];
  response: { columns: { name: string; type: string }[]; values: unknown[][] };
}

const run = (
  visualization: Record<string, unknown>,
  layers: Record<string, Layer>,
  options?: BindOptions
) => {
  const textLayers = Object.fromEntries(
    Object.entries(layers).map(
      ([id, { esql = 'FROM logs | STATS x = COUNT(*)', columns }]) => [
        id,
        { query: { esql }, columns },
      ]
    )
  );
  const planned = plan({
    savedObject: {
      id: 'metric',
      type: 'lens',
      references: [],
      attributes: {
        title: 'Metric',
        visualizationType: 'lnsMetric',
        state: {
          datasourceStates: { textBased: { layers: textLayers } },
          visualization,
        },
      },
    },
  });
  if (planned.status !== 'planned') {
    throw new Error(JSON.stringify(planned.diagnostics));
  }
  const tables = planned.plan.layers.map((layer) => {
    const read = readResponse(layer, layers[layer.layerId]!.response);
    if (read.status !== 'ready') {
      throw new Error(JSON.stringify(read.diagnostics));
    }
    return read.table;
  });
  return bind(planned.plan, tables, options);
};

const num = (columnId: string, extra: Record<string, unknown> = {}) => ({
  columnId,
  fieldName: columnId,
  meta: { type: 'number' },
  ...extra,
});
const str = (columnId: string) => ({
  columnId,
  fieldName: columnId,
  meta: { type: 'string' },
});

const single = (value: unknown, extra: Record<string, unknown> = {}) => ({
  layer: {
    columns: [num('visits', extra)],
    response: {
      columns: [{ name: 'visits', type: 'long' }],
      values: [[value]],
    },
  },
});

const vis = (state: Record<string, unknown> = {}) => ({
  layerId: 'layer',
  layerType: 'data',
  metricAccessor: 'visits',
  ...state,
});

const node = (result: ReturnType<typeof bind>) => {
  if (result.status !== 'bound') {
    throw new Error(JSON.stringify(result.diagnostics));
  }
  return result.node;
};

const codes = (result: ReturnType<typeof bind>) =>
  result.status === 'bound' ? [] : result.diagnostics.map(({ code }) => code);

describe('bind: native ES|QL metric', () => {
  it('binds the "[Logs] Web Traffic" sample Visits panel, which renders compact', () => {
    // The panel's saved visualization and layer, from the sample dashboard's export.
    const layerId = '64a4cc71-0a4e-4540-84e2-0d36c8f15b46';
    expect(
      node(
        run(
          { layerId, layerType: 'data', metricAccessor: 'Visits' },
          {
            [layerId]: {
              esql: 'FROM kibana_sample_data_logs | STATS COUNT(*) | RENAME `COUNT(*)` as `Visits`',
              columns: [
                {
                  columnId: 'Visits',
                  fieldName: 'Visits',
                  meta: { type: 'number', esType: 'long' },
                  inMetricDimension: true,
                },
              ],
              response: {
                columns: [{ name: 'Visits', type: 'long' }],
                values: [[14_074]],
              },
            },
          }
        )
      )
    ).toEqual({
      type: 'metric',
      tiles: [{ key: 'metric', title: 'Visits', value: 14_074 }],
      layout: { density: 'compact' },
    });
  });

  it('names a tile with its custom label', () => {
    const { tiles } = node(
      run(vis(), single(1, { label: 'Visits', customLabel: true }))
    );
    expect(tiles[0]!.title).toBe('Visits');
  });

  it('keeps a missing reading null, which reads N/A', () => {
    expect(node(run(vis(), single(null))).tiles[0]!.value).toBeNull();
  });

  it('reads one null tile from an empty response', () => {
    const { tiles } = node(
      run(vis(), {
        layer: {
          columns: [num('visits')],
          response: { columns: [{ name: 'visits', type: 'long' }], values: [] },
        },
      })
    );
    expect(tiles).toEqual([{ key: 'metric', title: 'visits', value: null }]);
  });

  it('takes the first row without a breakdown, as metricVis does', () => {
    const { tiles } = node(
      run(vis(), {
        layer: {
          columns: [num('visits')],
          response: {
            columns: [{ name: 'visits', type: 'long' }],
            values: [[3], [4]],
          },
        },
      })
    );
    expect(tiles.map(({ value }) => value)).toEqual([3]);
  });

  it("maps the column's Lens format", () => {
    const format = { format: { id: 'percent', params: { decimals: 2 } } };
    expect(
      node(run(vis(), single(0.0123, { params: format }))).tiles[0]!.format
    ).toEqual({
      kind: 'percent',
      decimals: 2,
    });
  });

  it.each([
    [
      'duration',
      {
        id: 'duration',
        params: { fromUnit: 'milliseconds', toUnit: 'asSeconds', decimals: 1 },
      },
      {
        kind: 'duration',
        from: 'milliseconds',
        to: 'asSeconds',
        decimals: 1,
        short: false,
        showSuffix: true,
        spaceBeforeSuffix: true,
      },
    ],
    [
      'humanized duration',
      { id: 'duration', params: {} },
      {
        kind: 'duration',
        from: 'seconds',
        to: 'humanize',
        decimals: 2,
        short: false,
        showSuffix: true,
        spaceBeforeSuffix: true,
      },
    ],
    [
      'custom',
      { id: 'custom', params: { pattern: '0.0a' } },
      { kind: 'pattern', pattern: '0.0a' },
    ],
  ])("maps Lens's %s format", (_, format, expected) => {
    expect(
      node(run(vis(), single(1500, { params: { format } }))).tiles[0]!.format
    ).toEqual(expected);
  });

  it('draws the icon on every tile, aligned left on legacy state', () => {
    const result = node(run(vis({ icon: 'bell' }), single(1)));
    expect(result.tiles[0]!.icon).toBe('bell');
    expect(result.layout).toMatchObject({ iconAlign: 'left' });
    expect(
      node(run(vis({ icon: 'bell', iconAlign: 'right' }), single(1))).layout
    ).toMatchObject({
      iconAlign: 'right',
    });
    expect(
      node(run(vis({ icon: 'empty' }), single(1))).tiles[0]!.icon
    ).toBeUndefined();
  });

  it('lists a multivalue reading, formatting each value', () => {
    const params = { format: { id: 'number', params: { decimals: 0 } } };
    expect(node(run(vis(), single([3, 4], { params }))).tiles[0]).toMatchObject(
      {
        value: [3, 4],
        format: { kind: 'number', decimals: 0 },
      }
    );
  });

  it('carries the subtitle and layout', () => {
    expect(
      node(
        run(
          vis({
            subtitle: 'Past 24 hours',
            density: 'default',
            primaryPosition: 'top',
            titlesTextAlign: 'center',
            primaryAlign: 'left',
            secondaryAlign: 'center',
            valueFontMode: 'fit',
            maxCols: 2,
          }),
          single(1)
        )
      )
    ).toMatchObject({
      tiles: [{ subtitle: 'Past 24 hours' }],
      columns: 2,
      layout: {
        density: 'default',
        valuePosition: 'top',
        titleAlign: 'center',
        valueAlign: 'left',
        secondaryAlign: 'center',
        valueSize: 'fit',
      },
    });
  });

  it('applies the v1 `valuesTextAlign` alias', () => {
    expect(
      node(run(vis({ valuesTextAlign: 'center' }), single(1))).layout
    ).toMatchObject({
      valueAlign: 'center',
      secondaryAlign: 'center',
    });
  });

  it('colors by the "[Logs] Web Traffic" sample custom palette', () => {
    const palette = {
      type: 'palette',
      name: 'custom',
      params: {
        steps: 3,
        name: 'custom',
        reverse: false,
        rangeType: 'number',
        rangeMin: 0,
        rangeMax: null,
        progression: 'fixed',
        stops: [
          { color: '#D23115', stop: 500 },
          { color: '#FCC400', stop: 1000 },
          { color: '#68BC00', stop: 1640 },
        ],
        colorStops: [
          { color: '#D23115', stop: 0 },
          { color: '#FCC400', stop: 500 },
          { color: '#68BC00', stop: 1000 },
        ],
        continuity: 'above',
        maxSteps: 5,
      },
    };
    expect(node(run(vis({ palette }), single(1200))).tiles[0]).toMatchObject({
      color: '#68BC00',
    });
    expect(node(run(vis({ palette }), single(100))).tiles[0]!.color).toBe(
      '#D23115'
    );
  });

  it('paints a static color on the value', () => {
    expect(
      node(run(vis({ color: '#E7664C', applyColorTo: 'value' }), single(5)))
        .tiles[0]
    ).toMatchObject({ color: '#E7664C', colorTarget: 'value' });
  });

  it('paints a text tile’s background even when the color targets the value', () => {
    const tile = node(
      run(vis({ color: '#E7664C', applyColorTo: 'value' }), {
        layer: {
          columns: [str('visits')],
          response: {
            columns: [{ name: 'visits', type: 'keyword' }],
            values: [['up']],
          },
        },
      })
    ).tiles[0]!;
    expect(tile).toMatchObject({ value: 'up', color: '#E7664C' });
    expect(tile.colorTarget).toBeUndefined();
  });
});

describe('bind: named palettes', () => {
  // Lens's default color-by-value palette (`defaultNumberPaletteParams`), as saved.
  const status = (rangeType: 'number' | 'percent') => ({
    type: 'palette',
    name: 'status',
    params: {
      name: 'status',
      rangeType,
      rangeMin: null,
      rangeMax: null,
      steps: 3,
      continuity: 'all',
      stops: [],
    },
  });

  it.each(['number', 'percent'] as const)(
    'puts a lone %s-range tile in the middle band, as its doubled data bounds do',
    (rangeType) => {
      expect(
        node(run(vis({ palette: status(rangeType) }), single(40))).tiles[0]!
          .color
      ).toEqual({
        palette: 'status',
        step: 1,
        of: 3,
      });
    }
  );

  it('spreads a breakdown across the bands by its own range', () => {
    const { tiles } = node(
      run(vis({ breakdownByAccessor: 'host', palette: status('number') }), {
        layer: {
          columns: [num('visits'), str('host')],
          response: {
            columns: [
              { name: 'visits', type: 'long' },
              { name: 'host', type: 'keyword' },
            ],
            values: [
              [10, 'a'],
              [20, 'b'],
              [30, 'c'],
            ],
          },
        },
      })
    );
    expect(tiles.map(({ color }) => color)).toEqual(
      [0, 1, 2].map((step) => ({ palette: 'status', step, of: 3 }))
    );
  });

  it("takes colors by the palette's name and stop positions by `params.name`, as Lens does", () => {
    const stops = [
      { color: '#AAAAAA', stop: 10 },
      { color: '#BBBBBB', stop: 12 },
      { color: '#CCCCCC', stop: 30 },
    ];
    // Custom colors without positions spread evenly over [0, 80].
    expect(
      node(
        run(
          vis({
            palette: {
              type: 'palette',
              name: 'custom',
              params: {
                name: 'status',
                rangeType: 'number',
                continuity: 'none',
                stops,
              },
            },
          }),
          single(40)
        )
      ).tiles[0]!.color
    ).toBe('#BBBBBB');
    // Named bands with custom positions: 20 falls below the third stop.
    expect(
      node(
        run(
          vis({
            palette: {
              type: 'palette',
              name: 'status',
              params: {
                name: 'custom',
                rangeType: 'number',
                continuity: 'above',
                steps: 3,
                stops,
              },
            },
          }),
          single(20)
        )
      ).tiles[0]!.color
    ).toEqual({ palette: 'status', step: 2, of: 3 });
  });

  it('refuses a palette that is not a value palette', () => {
    expect(
      codes(
        run(
          vis({
            palette: {
              type: 'palette',
              name: 'kibana_palette',
              params: { steps: 3 },
            },
          }),
          single(5)
        )
      )
    ).toEqual(['lens.metric.unsupported-palette']);
  });
});

describe('bind: default colors', () => {
  it('paints the value with euiColorVisText0 when no color applies', () => {
    expect(
      node(run(vis({ applyColorTo: 'value' }), single(5))).tiles[0]
    ).toMatchObject({
      color: { token: 'valueText' },
      colorTarget: 'value',
    });
  });

  it('fills a trend tile with euiColorVis2 when the bar is on and no color applies', () => {
    const { tiles } = node(
      run(
        vis({
          maxAccessor: 'max',
          showBar: true,
          trendlineLayerId: 'trend',
          trendlineLayerType: 'metricTrendline',
          trendlineTimeAccessor: 'time',
          trendlineMetricAccessor: 'trendValue',
        }),
        {
          layer: {
            columns: [num('visits'), num('max')],
            response: {
              columns: [
                { name: 'visits', type: 'long' },
                { name: 'max', type: 'long' },
              ],
              values: [[5, 10]],
            },
          },
          trend: {
            columns: [
              { columnId: 'time', fieldName: 'bucket', meta: { type: 'date' } },
              num('trendValue'),
            ],
            response: {
              columns: [
                { name: 'bucket', type: 'date' },
                { name: 'trendValue', type: 'long' },
              ],
              values: [['2026-11-02T00:00:00.000Z', 3]],
            },
          },
        }
      )
    );
    expect(tiles[0]).toMatchObject({
      color: { token: 'progress' },
      visual: { kind: 'trend' },
    });
  });

  it('leaves a progress bar to its own default', () => {
    const { tiles } = node(
      run(vis({ maxAccessor: 'max', showBar: true }), {
        layer: {
          columns: [num('visits'), num('max')],
          response: {
            columns: [
              { name: 'visits', type: 'long' },
              { name: 'max', type: 'long' },
            ],
            values: [[5, 10]],
          },
        },
      })
    );
    expect(tiles[0]!.color).toBeUndefined();
  });
});

describe('bind: dates', () => {
  const lastSeen = (type = 'date') => ({
    layer: {
      columns: [
        { columnId: 'visits', fieldName: 'visits', meta: { type: 'date' } },
      ],
      response: {
        columns: [{ name: 'visits', type }],
        values: [['2026-11-02T13:45:00.000Z']],
      },
    },
  });
  const format = 'MMM D, YYYY @ HH:mm:ss.SSS';

  it.each([
    ['Europe/Lisbon', 'Nov 2, 2026 @ 13:45:00.000'],
    ['America/New_York', 'Nov 2, 2026 @ 08:45:00.000'],
  ])(
    "reads a date in the host's format and time zone, %s",
    (timeZone, expected) => {
      const planned = run(vis(), lastSeen(), { dates: { format, timeZone } });
      expect(node(planned).tiles[0]!.value).toBe(expected);
    }
  );

  it('refuses a date without the host’s date context, and nanosecond dates', () => {
    expect(codes(run(vis(), lastSeen()))).toEqual([
      'lens.metric.unsupported-date',
    ]);
    expect(
      codes(
        run(vis(), lastSeen('date_nanos'), {
          dates: { format, timeZone: 'UTC' },
        })
      )
    ).toEqual(['lens.metric.unsupported-date']);
  });
});

describe('bind: breakdown', () => {
  const layer = (values: unknown[][]) => ({
    layer: {
      columns: [
        num('visits', { label: 'Visits', customLabel: true }),
        str('host'),
      ],
      response: {
        columns: [
          { name: 'visits', type: 'long' },
          { name: 'host', type: 'keyword' },
        ],
        values,
      },
    },
  });

  it('draws a tile per row titled by its value, subtitled by the metric', () => {
    const { tiles } = node(
      run(
        vis({ breakdownByAccessor: 'host', subtitle: 'ignored' }),
        layer([
          [3, 'a'],
          [4, null],
          [5, ''],
          [6, 'a'],
        ]),
        { filterAction: 'filter' }
      )
    );
    expect(tiles).toEqual([
      {
        key: '"a"',
        title: 'a',
        subtitle: 'Visits',
        value: 3,
        action: { name: 'filter', filters: [{ field: 'host', value: 'a' }] },
      },
      {
        key: 'null',
        title: '(null)',
        subtitle: 'Visits',
        value: 4,
        action: { name: 'filter', filters: [{ field: 'host', exists: false }] },
      },
      {
        key: '""',
        title: '(blank)',
        subtitle: 'Visits',
        value: 5,
        action: { name: 'filter', filters: [{ field: 'host', value: '' }] },
      },
      {
        key: '"a"#2',
        title: 'a',
        subtitle: 'Visits',
        value: 6,
        action: { name: 'filter', filters: [{ field: 'host', value: 'a' }] },
      },
    ]);
  });

  it('collapses the breakdown into one tile', () => {
    const { tiles } = node(
      run(
        vis({ breakdownByAccessor: 'host', collapseFn: 'avg' }),
        layer([
          [3, 'a'],
          [null, 'b'],
          [6, 'c'],
        ])
      )
    );
    expect(tiles).toEqual([{ key: 'metric', title: 'Visits', value: 4.5 }]);
  });

  it('draws an empty grid when the breakdown returns no rows', () => {
    expect(
      node(run(vis({ breakdownByAccessor: 'host' }), layer([]))).tiles
    ).toEqual([]);
  });
});

describe('bind: secondary metric', () => {
  const pair = (primary: unknown, secondary: unknown) => ({
    layer: {
      columns: [
        num('visits'),
        num('previous', { label: 'Last week', customLabel: true }),
      ],
      response: {
        columns: [
          { name: 'visits', type: 'long' },
          { name: 'previous', type: 'long' },
        ],
        values: [[primary, secondary]],
      },
    },
  });
  const compare = (reversed = false, visuals = 'both') => ({
    secondaryMetricAccessor: 'previous',
    secondaryTrend: {
      type: 'dynamic',
      visuals,
      paletteId: 'compare_to',
      reversed,
      baselineValue: 'primary',
    },
  });
  const secondary = (
    state: Record<string, unknown>,
    primary: unknown,
    value: unknown
  ) => node(run(vis(state), pair(primary, value))).tiles[0]!.secondary;

  it('labels it by default on legacy state', () => {
    expect(secondary({ secondaryMetricAccessor: 'previous' }, 1, 2)).toEqual({
      kind: 'value',
      label: 'Last week',
      value: '2',
    });
  });

  it('prefers the legacy secondary label, and an empty one hides it', () => {
    expect(
      secondary(
        { secondaryMetricAccessor: 'previous', secondaryPrefix: 'Before' },
        1,
        2
      )
    ).toMatchObject({ label: 'Before' });
    expect(
      secondary(
        { secondaryMetricAccessor: 'previous', secondaryLabel: '' },
        1,
        2
      )
    ).toEqual({ kind: 'value', value: '2' });
  });

  it('shows a missing reading as (null)', () => {
    expect(
      secondary({ secondaryMetricAccessor: 'previous' }, 1, null)
    ).toMatchObject({ value: '(null)' });
  });

  it('draws a static badge', () => {
    expect(
      secondary(
        {
          secondaryMetricAccessor: 'previous',
          secondaryNameVisibility: 'after',
          secondaryTrend: { type: 'static', color: '#E4E8F1' },
        },
        1,
        2
      )
    ).toEqual({
      kind: 'value',
      label: 'Last week',
      labelPosition: 'after',
      value: '2',
      badge: { color: '#E4E8F1' },
    });
  });

  it.each([
    ['decrease', 10, 12, '-2', 'down', 'danger'],
    ['increase', 30, 28, '+2', 'up', 'success'],
    ['no change', 10, 10, '0', 'flat', 'default'],
  ] as const)(
    'compares to the primary: %s',
    (_, primary, previous, value, direction, color) => {
      expect(
        secondary(
          { ...compare(), secondaryNameVisibility: 'hidden' },
          primary,
          previous
        )
      ).toEqual({
        kind: 'value',
        value,
        badge: { color, direction },
      });
    }
  );

  it('reverses the palette', () => {
    expect(
      secondary({ ...compare(true), secondaryNameVisibility: 'hidden' }, 30, 28)
    ).toMatchObject({
      badge: { color: 'danger', direction: 'up' },
    });
  });

  it('reads N/A with a neutral badge when the primary is missing', () => {
    expect(
      secondary({ ...compare(), secondaryNameVisibility: 'hidden' }, null, 5)
    ).toEqual({
      kind: 'value',
      value: 'N/A',
      badge: { color: 'default' },
    });
  });

  it('shows the secondary reading against a numeric baseline', () => {
    expect(
      secondary(
        {
          secondaryMetricAccessor: 'previous',
          secondaryNameVisibility: 'hidden',
          secondaryTrend: {
            type: 'dynamic',
            visuals: 'both',
            paletteId: 'temperature',
            reversed: false,
            baselineValue: 100,
          },
        },
        1,
        40
      )
    ).toEqual({
      kind: 'value',
      value: '40',
      badge: { color: 'primary', direction: 'down' },
    });
  });

  it('keeps only the label when an icon-only badge has no direction', () => {
    expect(secondary({ ...compare(false, 'icon') }, 1, null)).toEqual({
      kind: 'value',
      label: 'Last week',
    });
  });
});

describe('bind: progress and trend', () => {
  it('draws a progress bar from the max column', () => {
    const { tiles } = node(
      run(
        vis({
          maxAccessor: 'max',
          showBar: true,
          progressDirection: 'horizontal',
        }),
        {
          layer: {
            columns: [num('visits'), num('max')],
            response: {
              columns: [
                { name: 'visits', type: 'long' },
                { name: 'max', type: 'long' },
              ],
              values: [[50, 200]],
            },
          },
        }
      )
    );
    expect(tiles[0]!.visual).toEqual({
      kind: 'progress',
      max: 200,
      direction: 'horizontal',
    });
  });

  it('keeps a progress bar whose max is null, which Lens draws half full', () => {
    const { tiles } = node(
      run(vis({ maxAccessor: 'max', showBar: true }), {
        layer: {
          columns: [num('visits'), num('max')],
          response: {
            columns: [
              { name: 'visits', type: 'long' },
              { name: 'max', type: 'long' },
            ],
            values: [[50, null]],
          },
        },
      })
    );
    expect(tiles[0]!.visual).toEqual({ kind: 'progress', max: 0 });
  });

  const trend = (values: unknown[][]) => ({
    layer: {
      columns: [num('visits')],
      response: { columns: [{ name: 'visits', type: 'long' }], values: [[9]] },
    },
    trend: {
      columns: [
        { columnId: 'time', fieldName: 'bucket', meta: { type: 'date' } },
        num('trendValue'),
      ],
      response: {
        columns: [
          { name: 'bucket', type: 'date' },
          { name: 'trendValue', type: 'long' },
        ],
        values,
      },
    },
  });
  const trendState = vis({
    trendlineLayerId: 'trend',
    trendlineLayerType: 'metricTrendline',
    trendlineTimeAccessor: 'time',
    trendlineMetricAccessor: 'trendValue',
  });

  it('sorts trend points and keeps gaps', () => {
    const { tiles } = node(
      run(
        trendState,
        trend([
          ['2026-11-02T01:00:00.000Z', null],
          ['2026-11-02T00:00:00.000Z', 3],
          ['2026-11-02T02:00:00.000Z', 5],
        ])
      )
    );
    expect(tiles[0]!.visual).toEqual({
      kind: 'trend',
      points: [
        { x: Date.UTC(2026, 10, 2, 0), y: 3 },
        { x: Date.UTC(2026, 10, 2, 1), y: null },
        { x: Date.UTC(2026, 10, 2, 2), y: 5 },
      ],
    });
  });

  it('keeps a one-point trend, which Lens draws without a line', () => {
    const { tiles } = node(
      run(trendState, trend([['2026-11-02T00:00:00.000Z', 3]]))
    );
    expect(tiles[0]!.visual).toEqual({
      kind: 'trend',
      points: [{ x: Date.UTC(2026, 10, 2), y: 3 }],
    });
  });

  it('refuses two trend points at one instant', () => {
    expect(
      codes(
        run(
          trendState,
          trend([
            ['2026-11-02T00:00:00.000Z', 3],
            ['2026-11-02T00:00:00.000Z', 4],
          ])
        )
      )
    ).toEqual(['lens.metric.duplicate-trend-time']);
  });
});

describe('bind: refusals', () => {
  it.each([
    [
      'an icon the metric does not offer',
      vis({ icon: 'circle' }),
      'lens.metric.unsupported-icon',
    ],
    [
      'unknown state',
      vis({ futureOption: true }),
      'lens.metric.unsupported-state',
    ],
  ])('reports %s as unsupported', (_, state, code) => {
    const result = run(state, single(5));
    expect(result.status).toBe('unsupported');
    expect(codes(result)).toContain(code);
  });

  it('reports a format Lens does not build', () => {
    const params = { format: { id: 'currency', params: {} } };
    expect(codes(run(vis(), single(5, { params })))).toEqual([
      'lens.metric.unsupported-format',
    ]);
  });

  it('reports a visualization it cannot bind', () => {
    const planned = plan({
      savedObject: {
        id: 'xy',
        type: 'lens',
        references: [],
        attributes: {
          title: 'XY',
          visualizationType: 'lnsXY',
          state: {
            datasourceStates: {
              textBased: {
                layers: {
                  layer: {
                    query: { esql: 'FROM logs' },
                    columns: [num('visits')],
                  },
                },
              },
            },
            visualization: {},
          },
        },
      },
    });
    expect(planned.status).toBe('planned');
    if (planned.status === 'planned') {
      expect(codes(bind(planned.plan, []))).toEqual([
        'lens.bind.unsupported-visualization',
      ]);
    }
  });

  it('refuses a missing table and a table for an unplanned layer', () => {
    const planned = plan({
      savedObject: {
        id: 'metric',
        type: 'lens',
        references: [],
        attributes: {
          title: 'Metric',
          visualizationType: 'lnsMetric',
          state: {
            datasourceStates: {
              textBased: {
                layers: {
                  layer: {
                    query: { esql: 'FROM logs' },
                    columns: [num('visits')],
                  },
                },
              },
            },
            visualization: vis(),
          },
        },
      },
    });
    if (planned.status !== 'planned') {
      throw new Error('not planned');
    }
    expect(codes(bind(planned.plan, []))).toEqual([
      'lens.metric.missing-table',
    ]);
    expect(
      codes(
        bind(planned.plan, [
          {
            layerId: 'other',
            columns: [{ lens: num('visits'), type: 'long' }],
            rows: [],
          },
        ])
      )
    ).toEqual(['lens.bind.unexpected-table']);
  });
});
