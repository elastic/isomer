/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { BAND_RULE } from './colors';
import { DATA_RULES } from './data';
import { DATA_TABLE_RULES } from './data_table';
import { INTERACTION_RULES } from './events';
import { FORMAT_RULES } from './format';
import { GAUGE_RULES } from './gauge';
import { GRID_RULES } from './grid';
import { HEATMAP_RULES } from './heatmap';
import { METRIC_RULES } from './metric';
import { PARTITION_RULES } from './partition_chart';
import { COLUMN_REF_RULE } from './references';
import { nodeSchemaOf } from './schema.fixtures';
import { XY_RULES } from './xy_chart';

const containing = (text: string): string =>
  expect.stringContaining(text) as string;

const issuesOf = (type: string, node: unknown) => {
  const result = nodeSchemaOf(type).safeParse(node);
  return result.success
    ? []
    : result.error.issues.map(({ path, message }) => ({
        path: path.join('.'),
        message,
      }));
};

const expectRule = (
  type: string,
  node: unknown,
  rule: string,
  path: string
) => {
  expect(issuesOf(type, node)).toContainEqual({
    path,
    message: containing(rule),
  });
};

const number = (id: string) => ({
  id,
  label: id,
  type: 'number',
  role: 'metric',
});
const string = (id: string) => ({
  id,
  label: id,
  type: 'string',
  role: 'dimension',
});
const date = (id: string) => ({
  id,
  label: id,
  type: 'date',
  role: 'dimension',
});

const metric = (overrides: Record<string, unknown> = {}) => ({
  type: 'metric',
  data: { columns: [number('v')], rows: [[1]] },
  value: { column: 'v' },
  ...overrides,
});

describe('chart data', () => {
  it('accepts every legal cell', () => {
    expect(
      issuesOf(
        'metric',
        metric({
          data: {
            columns: [
              number('v'),
              date('d'),
              date('iso'),
              { ...string('s'), multivalue: true },
              { id: 'b', label: 'b', type: 'boolean', role: 'dimension' },
            ],
            rows: [[null, 0, '2026-11-03T00:00:00Z', ['a', null], false]],
          },
        })
      )
    ).toEqual([]);
  });

  it('accepts a date format with styles or with fields', () => {
    for (const format of [
      { kind: 'date', dateStyle: 'short', hour12: false },
      { kind: 'date', month: 'short', day: 'numeric' },
    ]) {
      expect(
        issuesOf(
          'metric',
          metric({
            data: { columns: [{ ...date('d'), format }], rows: [[0]] },
            value: { column: 'd' },
          })
        )
      ).not.toContainEqual(
        expect.objectContaining({ message: containing(FORMAT_RULES.dateStyle) })
      );
    }
  });

  it('rejects a date format with both a style and a field', () => {
    expectRule(
      'metric',
      metric({
        data: {
          columns: [
            number('v'),
            {
              ...date('d'),
              format: { kind: 'date', timeStyle: 'short', day: 'numeric' },
            },
          ],
          rows: [[1, 0]],
        },
      }),
      FORMAT_RULES.dateStyle,
      'data.columns.1.format.timeStyle'
    );
  });

  it('rejects a date format time zone that Intl does not know', () => {
    for (const timeZone of ['Mars/Olympus_Mons', '']) {
      expectRule(
        'metric',
        metric({
          data: {
            columns: [
              number('v'),
              { ...date('d'), format: { kind: 'date', timeZone } },
            ],
            rows: [[1, 0]],
          },
        }),
        FORMAT_RULES.timeZone,
        'data.columns.1.format.timeZone'
      );
    }
  });

  it('rejects a repeated column id', () => {
    expectRule(
      'metric',
      metric({
        data: { columns: [number('v'), number('v')], rows: [[1, 2]] },
      }),
      DATA_RULES.uniqueIds,
      'data.columns.1.id'
    );
  });

  it('rejects a row with the wrong number of cells', () => {
    expectRule(
      'metric',
      metric({ data: { columns: [number('v')], rows: [[1, 2]] } }),
      DATA_RULES.rowWidth,
      'data.rows.0'
    );
  });

  it.each([
    ['a string in a number column', number('v'), 'one'],
    ['a number in a string column', string('v'), 1],
    ['a non-ISO string in a date column', date('v'), 'yesterday'],
    ['an impossible date in a date column', date('v'), '2026-13-45'],
    ['a boolean in a date column', date('v'), true],
    ['an array in a column that is not multivalue', string('v'), ['a']],
    [
      'a mistyped value inside a multivalue cell',
      { ...string('v'), multivalue: true },
      ['a', 1],
    ],
  ])('rejects %s', (_, column, cell) => {
    expectRule(
      'metric',
      metric({ data: { columns: [column], rows: [[cell]] } }),
      DATA_RULES.cellType,
      'data.rows.0.0'
    );
  });

  it('rejects display strings for an unknown column or of the wrong length', () => {
    const issues = issuesOf(
      'metric',
      metric({
        data: {
          columns: [number('v')],
          rows: [[1]],
          display: { v: ['1', '2'], w: ['x'] },
        },
      })
    );
    expect(issues).toEqual([
      {
        path: 'data.display.v',
        message: containing(DATA_RULES.display),
      },
      {
        path: 'data.display.w',
        message: containing(DATA_RULES.display),
      },
    ]);
  });

  it('rejects an unsafe color string', () => {
    expect(
      issuesOf(
        'metric',
        metric({
          value: { column: 'v', color: { light: 'red', dark: '#000' } },
        })
      ).length
    ).toBeGreaterThan(0);
  });
});

describe('color bands', () => {
  const color = { light: '#000000', dark: '#ffffff' };

  it.each([
    ['reversed bounds', [{ from: 5, to: 1, color }]],
    [
      'overlapping bands',
      [
        { to: 10, color },
        { from: 5, to: 20, color },
      ],
    ],
    [
      'an open lower bound after the first band',
      [
        { to: 10, color },
        { to: 20, color },
      ],
    ],
  ])('rejects %s', (_, bands) => {
    expect(issuesOf('metric', metric({ colors: { bands } }))).toContainEqual({
      path: expect.stringMatching(/^colors\.bands\.\d$/) as string,
      message: BAND_RULE,
    });
  });

  it('accepts contiguous bands with open ends', () => {
    expect(
      issuesOf(
        'metric',
        metric({
          colors: {
            bands: [
              { to: 10, color },
              { from: 10, to: 20, color },
              { from: 20, color },
            ],
          },
        })
      )
    ).toEqual([]);
  });
});

describe('metric', () => {
  it('rejects a reference to a missing column', () => {
    expectRule(
      'metric',
      metric({ value: { column: 'nope' } }),
      COLUMN_REF_RULE,
      'value.column'
    );
  });

  it('requires arithmetic operands to be single-valued numbers', () => {
    const data = { columns: [number('v'), string('s')], rows: [[1, 'x']] };
    expectRule(
      'metric',
      metric({
        data,
        secondary: { column: 's', compare: { to: 'primary' } },
      }),
      METRIC_RULES.operands,
      'secondary.column'
    );
    expectRule(
      'metric',
      metric({
        data: { columns: [string('s')], rows: [['x']] },
        value: { column: 's' },
        background: { kind: 'bar', max: 'v' },
      }),
      METRIC_RULES.operands,
      'value.column'
    );
    expectRule(
      'metric',
      metric({
        data: {
          columns: [{ ...number('v'), multivalue: true }],
          rows: [[[1, 2]]],
        },
        value: { column: 'v', color: 'bands' },
      }),
      METRIC_RULES.operands,
      'value.column'
    );
    expect(
      issuesOf(
        'metric',
        metric({
          data: { columns: [string('s')], rows: [['x']] },
          value: { column: 's' },
        })
      )
    ).toEqual([]);
  });

  it('requires a date cell to be a real instant with a UTC offset', () => {
    const withDate = (cell: string) =>
      metric({
        data: { columns: [date('d')], rows: [[cell]] },
        value: { column: 'd' },
      });
    for (const bad of [
      '2026-11-03T00:00:00',
      '2026-02-30T00:00:00Z',
      '2026-11-03T00:00:00Z\n',
      '1900-02-29T00:00:00Z',
    ]) {
      expect(issuesOf('metric', withDate(bad)).length).toBeGreaterThan(0);
    }
    for (const good of [
      '2026-11-03T00:00:00Z',
      '2026-11-03T01:00:00+01:00',
      '0000-02-29T00:00:00Z',
      '2000-02-29T00:00:00Z',
    ]) {
      expect(issuesOf('metric', withDate(good))).toEqual([]);
    }
  });

  it('rejects a non-number bar maximum', () => {
    expectRule(
      'metric',
      metric({
        data: { columns: [number('v'), string('m')], rows: [[1, 'x']] },
        background: { kind: 'bar', max: 'm' },
      }),
      METRIC_RULES.columnType,
      'background.max'
    );
  });

  it('checks trend references against the trend table', () => {
    const issues = issuesOf(
      'metric',
      metric({
        background: {
          kind: 'trend',
          data: { columns: [string('t'), number('y')], rows: [] },
          x: 't',
          y: 'v',
        },
      })
    );
    expect(issues).toEqual([
      {
        path: 'background.x',
        message: containing(METRIC_RULES.columnType),
      },
      {
        path: 'background.y',
        message: containing(METRIC_RULES.trendColumns),
      },
    ]);
  });

  it('rejects a trend breakdown without a metric breakdown', () => {
    expectRule(
      'metric',
      metric({
        background: {
          kind: 'trend',
          data: { columns: [date('t'), number('y'), string('b')], rows: [] },
          x: 't',
          y: 'y',
          breakdown: 'b',
        },
      }),
      METRIC_RULES.trendBreakdown,
      'background.breakdown'
    );
  });

  it('rejects several rows without a breakdown', () => {
    expectRule(
      'metric',
      metric({ data: { columns: [number('v')], rows: [[1], [2]] } }),
      METRIC_RULES.oneRow,
      'data.rows'
    );
  });

  it('rejects a bands color with no bands', () => {
    expectRule(
      'metric',
      metric({ value: { column: 'v', color: 'bands' } }),
      METRIC_RULES.bands,
      'value.color'
    );
  });

  it('accepts percentage bands on a lone metric', () => {
    expect(
      issuesOf(
        'metric',
        metric({ value: { column: 'v', bandsRange: 'percentage' } })
      )
    ).toEqual([]);
  });
});

describe('xyChart', () => {
  const xy = (overrides: Record<string, unknown> = {}) => ({
    type: 'xyChart',
    data: {
      columns: [date('t'), number('y'), string('s')],
      rows: [[0, 1, 'a']],
    },
    layers: [{ kind: 'data', mark: 'line', x: 't', y: [{ column: 'y' }] }],
    ...overrides,
  });

  it('accepts the minimal chart', () => {
    expect(issuesOf('xyChart', xy())).toEqual([]);
  });

  it('validates coordinates on an inferred date axis', () => {
    const errors = issuesOf(
      'xyChart',
      xy({
        data: { columns: [date('t'), number('y')], rows: [[8.64e15 + 1, 1]] },
      })
    );
    expect(errors).toContainEqual({
      path: 'data.rows.0.0',
      message: XY_RULES.xCoordinate,
    });
  });

  it.each([
    ['string', 'not numeric', 'linear'],
    ['boolean', true, 'linear'],
    ['date', '2026-11-06T00:00:00Z', 'linear'],
    ['string', 'not a date', 'temporal'],
    ['number', 8.64e15 + 1, 'temporal'],
  ])(
    'diagnoses incompatible %s x cells on a %s scale',
    (type, value, scale) => {
      const errors = issuesOf(
        'xyChart',
        xy({
          data: {
            columns: [
              { id: 'x', label: 'X', type, role: 'dimension' },
              number('y'),
            ],
            rows: [[value, 1]],
          },
          layers: [
            { kind: 'data', mark: 'line', x: 'x', y: [{ column: 'y' }] },
          ],
          axes: { x: { scale } },
        })
      );
      expect(errors.map(({ path }) => path)).toContain('data.rows.0.0');
    }
  );
  it('accepts area opacity from 0 to 1 and rejects more', () => {
    expect(issuesOf('xyChart', xy({ style: { areaOpacity: 1 } }))).toEqual([]);
    expect(
      issuesOf('xyChart', xy({ style: { areaOpacity: 1.5 } })).map(
        ({ path }) => path
      )
    ).toEqual(['style.areaOpacity']);
  });

  it('takes a glyph name as an annotation icon', () => {
    const annotate = (icon: string) =>
      xy({
        layers: [
          { kind: 'data', mark: 'line', x: 't', y: [{ column: 'y' }] },
          { kind: 'annotations', events: [{ kind: 'point', at: 0, icon }] },
        ],
      });
    expect(issuesOf('xyChart', annotate('marker'))).toEqual([]);
    expect(
      issuesOf('xyChart', annotate('map_marker')).map(({ path }) => path)
    ).toEqual(['layers.1.events.0.icon']);
  });

  it.each([
    ['x', 't', 'layers.0.x'],
    ['splitBy', 's', 'layers.0.splitBy'],
    ['y', 'y', 'layers.0.y.0.column'],
  ])('rejects a multivalue %s column', (_, id, path) => {
    const node = xy({
      layers: [
        {
          kind: 'data',
          mark: 'line',
          x: 't',
          splitBy: 's',
          y: [{ column: 'y' }],
        },
      ],
    });
    const column = node.data.columns.find((entry) => entry.id === id)!;
    Object.assign(column, { multivalue: true });
    expectRule('xyChart', node, XY_RULES.singleValued, path);
  });

  it('rejects a date column that mixes epochs and ISO date-times', () => {
    const rows = [
      [null, 1, 'a'],
      ['2026-11-06T00:00:00Z', 2, 'b'],
      [0, 3, 'c'],
    ];
    expectRule(
      'xyChart',
      xy({ data: { columns: [date('t'), number('y'), string('s')], rows } }),
      XY_RULES.dateEncoding,
      'data.rows.2.0'
    );
    expect(
      issuesOf(
        'xyChart',
        xy({
          data: {
            columns: [date('t'), number('y'), string('s')],
            rows: rows.slice(0, 2),
          },
        })
      )
    ).toEqual([]);
  });

  it('rejects a bucket interval that is not positive', () => {
    expect(
      issuesOf('xyChart', xy({ axes: { x: { interval: 0 } } })).map(
        ({ path }) => path
      )
    ).toContain('axes.x.interval');
  });

  it('rejects a y column that is not a number', () => {
    expectRule(
      'xyChart',
      xy({ layers: [{ kind: 'data', mark: 'bar', y: [{ column: 's' }] }] }),
      XY_RULES.yType,
      'layers.0.y.0.column'
    );
  });

  it.each([
    ['another x column', { x: 's' }],
    ['no x column', {}],
  ])('rejects a data layer with %s', (_, x) => {
    expectRule(
      'xyChart',
      xy({
        layers: [
          { kind: 'data', mark: 'line', x: 't', y: [{ column: 'y' }] },
          { kind: 'data', mark: 'bar', y: [{ column: 'y' }], ...x },
        ],
      }),
      XY_RULES.sharedX,
      'layers.1.x'
    );
  });

  it('rejects a missing split column', () => {
    expectRule(
      'xyChart',
      xy({
        layers: [
          { kind: 'data', mark: 'bar', y: [{ column: 'y' }], splitBy: 'z' },
        ],
      }),
      COLUMN_REF_RULE,
      'layers.0.splitBy'
    );
  });

  it('rejects a stacked line', () => {
    expectRule(
      'xyChart',
      xy({
        layers: [
          {
            kind: 'data',
            mark: 'line',
            stack: 'stacked',
            y: [{ column: 'y' }],
          },
        ],
      }),
      XY_RULES.stack,
      'layers.0.stack'
    );
  });

  it.each([
    ['past the end', [0, 2]],
    ['reversed', [1, 0]],
  ])('rejects a row range %s', (_, rows) => {
    expectRule(
      'xyChart',
      xy({
        layers: [{ kind: 'data', mark: 'bar', y: [{ column: 'y' }], rows }],
      }),
      XY_RULES.rows,
      'layers.0.rows'
    );
  });

  it('rejects a chart with no data layer', () => {
    expectRule(
      'xyChart',
      xy({ layers: [{ kind: 'referenceLines', lines: [{ value: 1 }] }] }),
      XY_RULES.dataLayer,
      'layers'
    );
  });

  it('rejects an annotation range that ends before it starts', () => {
    expectRule(
      'xyChart',
      xy({
        layers: [
          { kind: 'data', mark: 'line', y: [{ column: 'y' }] },
          {
            kind: 'annotations',
            events: [
              {
                kind: 'range',
                from: '2026-11-03T02:00:00Z',
                to: Date.UTC(2026, 10, 3, 1),
              },
            ],
          },
        ],
      }),
      XY_RULES.rangeOrder,
      'layers.1.events.0'
    );
  });

  it.each([
    ['x', { domain: { kind: 'custom', min: 5, max: 5 } }],
    ['y', { domain: { kind: 'custom', min: 10, max: 0 } }],
    ['y2', { scale: 'log', domain: { kind: 'custom', min: 0, max: 100 } }],
  ])('rejects a degenerate custom %s domain', (id, axis) => {
    expectRule(
      'xyChart',
      xy({ axes: { [id]: axis } }),
      XY_RULES.customDomain,
      `axes.${id}.domain`
    );
  });

  it('accepts a custom log domain above zero', () => {
    expect(
      issuesOf(
        'xyChart',
        xy({
          axes: {
            y: { scale: 'log', domain: { kind: 'custom', min: 1, max: 100 } },
          },
        })
      )
    ).toEqual([]);
  });

  it.each([
    [
      'an annotation',
      {
        layers: [
          ...xy().layers,
          { kind: 'annotations', events: [{ kind: 'point', at: 1e16 }] },
        ],
      },
      'layers.1.events.0.at',
    ],
    [
      'the current time',
      { style: { currentTime: -1e16 } },
      'style.currentTime',
    ],
    [
      'a partial bucket edge',
      { style: { partialBuckets: { from: 0, to: 1e16 } } },
      'style.partialBuckets.to',
    ],
  ])('rejects %s outside the Date range', (_, overrides, path) => {
    expect(
      issuesOf('xyChart', xy(overrides)).map((issue) => issue.path)
    ).toContain(path);
  });
});

describe('dataTable', () => {
  const table = (overrides: Record<string, unknown> = {}) => ({
    type: 'dataTable',
    data: { columns: [string('s'), number('v')], rows: [['a', 1]] },
    ...overrides,
  });

  it('accepts a table with no column settings', () => {
    expect(issuesOf('dataTable', table())).toEqual([]);
  });

  it('rejects a column that names no data column', () => {
    expectRule(
      'dataTable',
      table({ columns: [{ column: 'nope' }] }),
      COLUMN_REF_RULE,
      'columns.0.column'
    );
  });

  it('rejects a column listed twice', () => {
    expectRule(
      'dataTable',
      table({ columns: [{ column: 's' }, { column: 's' }] }),
      DATA_TABLE_RULES.uniqueColumns,
      'columns.1.column'
    );
  });

  it('rejects a bar on a column that is not a number', () => {
    expectRule(
      'dataTable',
      table({ columns: [{ column: 's', decoration: { kind: 'bar' } }] }),
      DATA_TABLE_RULES.numberOnly,
      'columns.0.decoration'
    );
  });

  it('rejects a summary on a column that is not a number', () => {
    expectRule(
      'dataTable',
      table({ columns: [{ column: 's', summary: { kind: 'sum' } }] }),
      DATA_TABLE_RULES.numberOnly,
      'columns.0.summary'
    );
  });

  it('accepts a bar and a summary on a number column, even centered', () => {
    expect(
      issuesOf(
        'dataTable',
        table({
          columns: [
            {
              column: 'v',
              alignment: 'center',
              decoration: { kind: 'bar', min: 5, max: 5 },
              summary: { kind: 'avg' },
            },
          ],
        })
      )
    ).toEqual([]);
  });

  it('checks decoration bands', () => {
    expectRule(
      'dataTable',
      table({
        columns: [
          {
            column: 'v',
            decoration: {
              kind: 'text',
              colors: {
                bands: [{ from: 5, to: 1, color: { token: 'text' } }],
              },
            },
          },
        ],
      }),
      BAND_RULE,
      'columns.0.decoration.colors.bands.0'
    );
  });

  it('rejects an initial sort by a column that is not there', () => {
    expectRule(
      'dataTable',
      table({
        interactions: { initial: { sort: { column: 'x', direction: 'asc' } } },
      }),
      COLUMN_REF_RULE,
      'interactions.initial.sort.column'
    );
  });

  it('offers only cell selection', () => {
    expect(
      issuesOf('dataTable', table({ interactions: { select: ['datum'] } }))
        .length
    ).toBeGreaterThan(0);
  });

  it('rejects emphasis past the last row', () => {
    expectRule(
      'dataTable',
      table({ emphasis: [{ rows: [3] }] }),
      INTERACTION_RULES.emphasisRows,
      'emphasis.0.rows.0'
    );
  });
});

describe('grid', () => {
  const metricNode = metric();

  it('rejects a panel past the last column', () => {
    expectRule(
      'grid',
      {
        type: 'grid',
        panels: [{ x: 40, y: 0, w: 12, h: 4, node: metricNode }],
      },
      GRID_RULES.width,
      'panels.0.w'
    );
  });

  it('rejects a repeated id across panels and sections', () => {
    expectRule(
      'grid',
      {
        type: 'grid',
        panels: [{ id: 'a', x: 0, y: 0, w: 12, h: 4, node: metricNode }],
        sections: [{ id: 'a', title: 'A', y: 4, panels: [] }],
      },
      GRID_RULES.ids,
      'sections.0.id'
    );
  });
});

describe('unsupported', () => {
  const failure = (source: unknown) => ({
    type: 'unsupported',
    title: 'x',
    reason: 'y',
    source,
  });

  it('takes provenance from any host, with opaque meta', () => {
    expect(
      issuesOf(
        'unsupported',
        failure({
          host: 'an-agent',
          capturedAt: '2026-11-03T09:15:00.000Z',
          meta: { conversation: 'c1', turn: 4 },
        })
      )
    ).toEqual([]);
  });

  it.each([
    { host: 'kibana', capturedAt: 'invalid' },
    { capturedAt: '2026-11-03T09:15:00.000Z' },
    {
      host: 'kibana',
      capturedAt: '2026-11-03T09:15:00.000Z',
      savedObjectId: 'dashboard-1',
    },
    {
      host: 'kibana',
      capturedAt: '2026-11-03T09:15:00.000Z',
      materializer: 'lens',
    },
  ])('rejects invalid or former top-level provenance: %j', (source) => {
    expect(issuesOf('unsupported', failure(source)).length).toBeGreaterThan(0);
  });

  it('rejects a script link', () => {
    expect(
      issuesOf('unsupported', {
        type: 'unsupported',
        title: 'x',
        reason: 'y',
        link: { href: 'javascript:alert(1)', label: 'Open' },
      }).map(({ path }) => path)
    ).toEqual(['link.href']);
  });
});

describe('partitionChart', () => {
  const partition = (overrides: Record<string, unknown> = {}) => ({
    type: 'partitionChart',
    shape: 'pie',
    data: {
      columns: [string('a'), string('b'), number('v'), number('w')],
      rows: [['x', 'y', 1, 2]],
    },
    metrics: [{ column: 'v' }],
    groups: [{ column: 'a' }],
    ...overrides,
  });

  it('accepts the minimal chart, and one with no groups', () => {
    expect(issuesOf('partitionChart', partition())).toEqual([]);
    expect(
      issuesOf('partitionChart', partition({ groups: undefined }))
    ).toEqual([]);
  });

  it('rejects a reference to a missing column', () => {
    expectRule(
      'partitionChart',
      partition({ groups: [{ column: 'nope' }] }),
      COLUMN_REF_RULE,
      'groups.0.column'
    );
  });

  it('rejects a metric that is not a number', () => {
    expectRule(
      'partitionChart',
      partition({ metrics: [{ column: 'a' }] }),
      PARTITION_RULES.metricType,
      'metrics.0.column'
    );
  });

  it('rejects a multivalue group', () => {
    expectRule(
      'partitionChart',
      partition({
        data: {
          columns: [{ ...string('a'), multivalue: true }, number('v')],
          rows: [[['x', 'y'], 1]],
        },
      }),
      PARTITION_RULES.singleValued,
      'groups.0.column'
    );
  });

  it('rejects a column used twice', () => {
    expectRule(
      'partitionChart',
      partition({ groups: [{ column: 'a' }, { column: 'a' }] }),
      PARTITION_RULES.distinct,
      'groups.1.column'
    );
  });

  it.each([
    ['pie', 3],
    ['donut', 3],
    ['treemap', 2],
    ['mosaic', 2],
    ['waffle', 1],
  ])('takes at most %s groups on a %s', (shape, most) => {
    const columns = ['a', 'b', 'c', 'd'];
    const data = {
      columns: [...columns.map(string), number('v')],
      rows: [['p', 'q', 'r', 's', 1]],
    };
    const groups = (count: number) =>
      columns.slice(0, count).map((column) => ({ column }));
    expect(
      issuesOf(
        'partitionChart',
        partition({ shape, data, groups: groups(most) })
      )
    ).toEqual([]);
    expectRule(
      'partitionChart',
      partition({ shape, data, groups: groups(most + 1) }),
      PARTITION_RULES.groupCount,
      'groups'
    );
  });

  it('rejects several metrics on a mosaic, and accepts them elsewhere', () => {
    const metrics = [{ column: 'v' }, { column: 'w' }];
    expectRule(
      'partitionChart',
      partition({ shape: 'mosaic', metrics }),
      PARTITION_RULES.mosaicMetric,
      'metrics'
    );
    expect(issuesOf('partitionChart', partition({ metrics }))).toEqual([]);
  });

  it('takes a donut hole only on a donut, strictly between 0 and 1', () => {
    expect(
      issuesOf('partitionChart', partition({ shape: 'donut', donutHole: 0.7 }))
    ).toEqual([]);
    expectRule(
      'partitionChart',
      partition({ donutHole: 0.7 }),
      PARTITION_RULES.donutHole,
      'donutHole'
    );
    expect(
      issuesOf(
        'partitionChart',
        partition({ shape: 'donut', donutHole: 1 })
      ).map(({ path }) => path)
    ).toEqual(['donutHole']);
  });

  it('offers only the slice target', () => {
    expect(
      issuesOf(
        'partitionChart',
        partition({ interactions: { select: ['slice'] } })
      )
    ).toEqual([]);
    expect(
      issuesOf(
        'partitionChart',
        partition({ interactions: { select: ['datum'] } })
      ).map(({ path }) => path)
    ).toEqual(['interactions.select.0']);
  });

  it('rejects emphasis outside the rows', () => {
    expectRule(
      'partitionChart',
      partition({ emphasis: [{ rows: [3] }] }),
      INTERACTION_RULES.emphasisRows,
      'emphasis.0.rows.0'
    );
  });
});

describe('heatmap', () => {
  const heatmap = (overrides: Record<string, unknown> = {}) => ({
    type: 'heatmap',
    data: {
      columns: [date('t'), string('h'), number('v'), string('s')],
      rows: [
        ['2026-11-03T00:00:00Z', 'a', 1, 'p'],
        ['2026-11-03T01:00:00Z', 'a', 2, 'q'],
      ],
    },
    x: { column: 't' },
    y: { column: 'h' },
    value: { column: 'v' },
    ...overrides,
  });

  it('accepts the minimal chart, and one with no y', () => {
    expect(issuesOf('heatmap', heatmap())).toEqual([]);
    expect(issuesOf('heatmap', heatmap({ y: undefined }))).toEqual([]);
  });

  it('rejects a reference to a missing column', () => {
    expectRule(
      'heatmap',
      heatmap({ y: { column: 'nope' } }),
      COLUMN_REF_RULE,
      'y.column'
    );
  });

  it('rejects a value that is not a number', () => {
    expectRule(
      'heatmap',
      heatmap({ value: { column: 'h' }, y: { column: 's' } }),
      HEATMAP_RULES.valueType,
      'value.column'
    );
  });

  it('rejects a multivalue axis', () => {
    expectRule(
      'heatmap',
      heatmap({
        data: {
          columns: [{ ...string('h'), multivalue: true }, number('v')],
          rows: [[['a', 'b'], 1]],
        },
        x: { column: 'h' },
        y: undefined,
      }),
      HEATMAP_RULES.singleValued,
      'x.column'
    );
  });

  it('rejects one column on two axes', () => {
    expectRule(
      'heatmap',
      heatmap({ y: { column: 't' } }),
      HEATMAP_RULES.distinct,
      'y.column'
    );
  });

  it('rejects two rows at one cell, and accepts them on different rows', () => {
    expectRule(
      'heatmap',
      heatmap({ x: { column: 'h' }, y: undefined }),
      HEATMAP_RULES.uniqueCells,
      'data.rows.1'
    );
    expect(
      issuesOf('heatmap', heatmap({ x: { column: 'h' }, y: { column: 's' } }))
        .length
    ).toBe(0);
  });

  it('takes an interval only on a date x', () => {
    expect(
      issuesOf('heatmap', heatmap({ x: { column: 't', interval: 3_600_000 } }))
    ).toEqual([]);
    expectRule(
      'heatmap',
      heatmap({ x: { column: 's', interval: 1 }, y: undefined }),
      HEATMAP_RULES.interval,
      'x.interval'
    );
  });

  it('takes an x domain only on a date x, a custom one ascending', () => {
    expect(
      issuesOf(
        'heatmap',
        heatmap({
          axes: { x: { domain: { kind: 'custom', min: 0, max: 1 } } },
        })
      )
    ).toEqual([]);
    expectRule(
      'heatmap',
      heatmap({
        x: { column: 's' },
        y: undefined,
        axes: { x: { domain: { kind: 'fit' } } },
      }),
      HEATMAP_RULES.domain,
      'axes.x.domain'
    );
    expectRule(
      'heatmap',
      heatmap({ axes: { x: { domain: { kind: 'custom', min: 1, max: 1 } } } }),
      HEATMAP_RULES.domain,
      'axes.x.domain'
    );
  });

  it('brushes only along a date x', () => {
    expect(
      issuesOf(
        'heatmap',
        heatmap({ interactions: { select: ['cell'], brush: { column: 't' } } })
      )
    ).toEqual([]);
    expectRule(
      'heatmap',
      heatmap({ interactions: { brush: { column: 'v' } } }),
      HEATMAP_RULES.brushColumn,
      'interactions.brush.column'
    );
    expectRule(
      'heatmap',
      heatmap({
        x: { column: 's' },
        y: undefined,
        data: {
          columns: [date('t'), number('v'), string('s')],
          rows: [['2026-11-03T00:00:00Z', 1, 'p']],
        },
        interactions: { brush: { column: 't' } },
      }),
      HEATMAP_RULES.brushColumn,
      'interactions.brush.column'
    );
  });

  it('takes a bandsRange only with bands', () => {
    expectRule(
      'heatmap',
      heatmap({ bandsRange: 'percentage' }),
      HEATMAP_RULES.bandsRange,
      'bandsRange'
    );
    expect(
      issuesOf(
        'heatmap',
        heatmap({
          bandsRange: 'percentage',
          colors: {
            bands: [
              { from: 0, to: 100, color: { light: '#000', dark: '#fff' } },
            ],
          },
        })
      )
    ).toEqual([]);
  });

  it('offers only the cell target', () => {
    expect(
      issuesOf('heatmap', heatmap({ interactions: { select: ['slice'] } })).map(
        ({ path }) => path
      )
    ).toEqual(['interactions.select.0']);
  });

  it('rejects emphasis outside the rows', () => {
    expectRule(
      'heatmap',
      heatmap({ emphasis: [{ rows: [3] }] }),
      INTERACTION_RULES.emphasisRows,
      'emphasis.0.rows.0'
    );
  });
});

describe('gauge', () => {
  const gauge = (overrides: Record<string, unknown> = {}) => ({
    type: 'gauge',
    shape: 'arc',
    data: {
      columns: [number('v'), number('m'), string('s')],
      rows: [[1, 10, 'x']],
    },
    value: { column: 'v' },
    ...overrides,
  });

  it('accepts the minimal gauge, and one with bounds and a goal', () => {
    expect(issuesOf('gauge', gauge())).toEqual([]);
    expect(
      issuesOf('gauge', gauge({ max: { column: 'm' }, goal: { column: 'm' } }))
    ).toEqual([]);
  });

  it('rejects a reference to a missing column', () => {
    expectRule(
      'gauge',
      gauge({ goal: { column: 'nope' } }),
      COLUMN_REF_RULE,
      'goal.column'
    );
  });

  it.each(['value', 'min', 'max', 'goal'])(
    'rejects a %s column that is not a number',
    (field) => {
      expectRule(
        'gauge',
        gauge({ [field]: { column: 's' } }),
        GAUGE_RULES.numberColumns,
        `${field}.column`
      );
    }
  );

  it('rejects a multivalue value', () => {
    expectRule(
      'gauge',
      gauge({
        data: {
          columns: [{ ...number('v'), multivalue: true }],
          rows: [[[1]]],
        },
      }),
      GAUGE_RULES.numberColumns,
      'value.column'
    );
  });

  it('takes a bandsRange only with bands', () => {
    expectRule(
      'gauge',
      gauge({ bandsRange: 'percentage' }),
      GAUGE_RULES.bandsRange,
      'bandsRange'
    );
    expect(
      issuesOf(
        'gauge',
        gauge({
          bandsRange: 'percentage',
          colors: {
            bands: [{ from: 0, color: { light: '#000', dark: '#fff' } }],
          },
        })
      )
    ).toEqual([]);
  });

  it('offers nothing to select', () => {
    expect(
      issuesOf('gauge', gauge({ interactions: { select: ['tile'] } })).map(
        ({ path }) => path
      )
    ).toEqual(['interactions']);
  });
});
