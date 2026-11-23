/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { DATA_RULES } from '../../schema/data';
import { COLUMN_REF_RULE } from '../../schema/references';
import {
  containing,
  date,
  expectRule,
  issuesOf,
  number,
  string,
} from '../../schema/rules.fixtures';

import { XY_RULES } from './schema';

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
    ['a non-ISO string in a date x column', date('t'), 'yesterday'],
    ['a string in a number x column', number('t'), 'one'],
  ])('reports %s once', (_, column, cell) => {
    const errors = issuesOf(
      'xyChart',
      xy({ data: { columns: [column, number('y')], rows: [[cell, 1]] } })
    );
    expect(errors).toEqual([
      { path: 'data.rows.0.0', message: containing(DATA_RULES.cellType) },
    ]);
  });

  it('reports a column reference of the wrong shape once, as its type', () => {
    const errors = issuesOf(
      'xyChart',
      xy({
        layers: [{ kind: 'data', mark: 'line', x: { column: 't' }, y: ['y'] }],
      })
    );
    expect(errors).toEqual([
      {
        path: 'layers.0.x',
        message: 'Invalid input: expected string, received object',
      },
      {
        path: 'layers.0.y.0',
        message: 'Invalid input: expected object, received string',
      },
    ]);
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

  it('orders an annotation range by the instants its strings name', () => {
    const range = (from: string, to: string) =>
      xy({
        layers: [
          ...xy().layers,
          { kind: 'annotations', events: [{ kind: 'range', from, to }] },
        ],
      });
    expectRule(
      'xyChart',
      range('2026-11-03T12:00:00+0530', '2026-11-03T06:00:00.123456789Z'),
      XY_RULES.rangeOrder,
      'layers.1.events.0'
    );
    expect(
      issuesOf(
        'xyChart',
        range('2026-11-03T06:00:00.123456789Z', '2026-11-03T12:00:00+0530')
      )
    ).toEqual([]);
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
    ['y', { domain: { kind: 'custom' } }],
    ['y2', { scale: 'log', domain: { kind: 'custom', min: 0 } }],
    ['y2', { scale: 'log', domain: { kind: 'custom', max: 0 } }],
    ['y', { scale: 'log', domain: { kind: 'custom', max: -5 } }],
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

  it.each([{ min: 0 }, { max: 100 }, { min: -5 }])(
    'accepts a one-sided custom y domain %j',
    (bound) => {
      expect(
        issuesOf(
          'xyChart',
          xy({ axes: { y: { domain: { kind: 'custom', ...bound } } } })
        )
      ).toEqual([]);
    }
  );

  it.each([
    '2026-11-03T00:30Z',
    '2026-11-03T00:30:00+0530',
    '2026-11-03T00:30:00.123456789Z',
  ])('takes %s as an annotation time, as a date cell does', (at) => {
    expect(
      issuesOf(
        'xyChart',
        xy({
          layers: [
            ...xy().layers,
            { kind: 'annotations', events: [{ kind: 'point', at }] },
          ],
          style: { currentTime: at },
        })
      )
    ).toEqual([]);
  });

  it.each([
    '2026-11-03',
    '2026-11-03T00:30:00',
    '2026-11-03T00:30:00.1234567890Z',
  ])('rejects %s as an annotation time', (at) => {
    expect(
      issuesOf(
        'xyChart',
        xy({
          layers: [
            ...xy().layers,
            { kind: 'annotations', events: [{ kind: 'point', at }] },
          ],
        })
      ).map(({ path }) => path)
    ).toContain('layers.1.events.0.at');
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
