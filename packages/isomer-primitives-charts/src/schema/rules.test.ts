/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { BAND_RULE, COLUMN_REF_RULE, DATA_RULES } from './core';
import { GRID_RULES } from './grid';
import { METRIC_RULES } from './metric';
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

  it('rejects percentage bands with nothing to supply a maximum', () => {
    expectRule(
      'metric',
      metric({ value: { column: 'v', bandsRange: 'percentage' } }),
      METRIC_RULES.percentage,
      'value.bandsRange'
    );
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

  it('rejects a y column that is not a number', () => {
    expectRule(
      'xyChart',
      xy({ layers: [{ kind: 'data', mark: 'bar', y: [{ column: 's' }] }] }),
      XY_RULES.yType,
      'layers.0.y.0.column'
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
