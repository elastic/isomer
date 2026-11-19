/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { GAUGE_RULES } from '../primitives/gauge/schema';
import { HEATMAP_RULES } from '../primitives/heatmap/schema';
import { LEGACY_METRIC_RULES } from '../primitives/legacy_metric/schema';
import { METRIC_RULES } from '../primitives/metric/schema';

import { BAND_RULE } from './colors';
import { DATA_RULES } from './data';
import { FORMAT_RULES } from './format';
import {
  BANDS_RANGE_SENTENCE,
  containing,
  date,
  expectRule,
  issuesOf,
  metric,
  number,
  string,
} from './rules.fixtures';

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

  it.each([
    [
      'a string in a number column',
      number('v'),
      'one',
      '"one"',
      'a `number` column needs a number, or null.',
    ],
    [
      'a boolean in a date column',
      date('v'),
      true,
      'true',
      'a `date` column needs epoch milliseconds or an ISO 8601 date-time string with a UTC offset, or null.',
    ],
    [
      'an array in a column that is not multivalue',
      string('v'),
      ['a'],
      '["a"]',
      'a `string` column needs a string, or null.',
    ],
    [
      'a mistyped value inside a multivalue cell',
      { ...string('v'), multivalue: true },
      ['a', 1],
      '["a",1]',
      'a multivalue `string` column needs a string, null, or an array of those.',
    ],
  ])(
    'names the column, row, value and need for %s',
    (_, column, cell, held, needs) => {
      expect(
        issuesOf(
          'metric',
          metric({ data: { columns: [column], rows: [[null], [cell]] } })
        )
      ).toContainEqual({
        path: 'data.rows.1.0',
        message: `${DATA_RULES.cellType} Row 1 of column "v" holds ${held}; ${needs}`,
      });
    }
  );

  it('shortens a long value in a cell type message', () => {
    const [{ message } = { message: '' }] = issuesOf(
      'metric',
      metric({ data: { columns: [number('v')], rows: [['x'.repeat(500)]] } })
    );
    expect(message).toContain(`holds "${'x'.repeat(39)}…;`);
    expect(message).not.toContain('x'.repeat(40));
  });

  const circular: unknown[] = [];
  circular.push(circular);

  it.each([
    ['a bigint', 10n, '10n'],
    ['a circular array', circular, 'a value with no JSON text'],
    ['an array holding a bigint', [10n], 'a value with no JSON text'],
    ['a symbol', Symbol('s'), 'Symbol(s)'],
    ['a function', () => 1, '() => 1'],
  ])('reports the problems after %s cell', (_, cell, held) => {
    const issues = issuesOf(
      'metric',
      metric({
        data: {
          columns: [number('v')],
          rows: [[cell], ['one']],
          display: { w: ['x'] },
        },
      })
    );
    expect(issues).toContainEqual({
      path: 'data.rows.0.0',
      message: containing(`Row 0 of column "v" holds ${held};`),
    });
    expect(issues).toContainEqual({
      path: 'data.rows.1.0',
      message: containing('Row 1 of column "v" holds "one";'),
    });
    expect(issues).toContainEqual({
      path: 'data.display.w',
      message: containing(DATA_RULES.display),
    });
  });

  it.each([
    ['NaN', number('v'), Number.NaN],
    ['Infinity', number('v'), Number.POSITIVE_INFINITY],
    [
      '-Infinity in a multivalue cell',
      { ...number('v'), multivalue: true },
      [Number.NEGATIVE_INFINITY],
    ],
  ])('says a %s cell must be finite', (_, column, cell) => {
    expect(
      issuesOf(
        'metric',
        metric({ data: { columns: [column], rows: [[cell]] } })
      )
    ).toEqual([
      {
        path: 'data.rows.0.0',
        message:
          'must be a finite number, a string, a boolean, null, or an array of those',
      },
    ]);
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

describe('a color of the wrong shape', () => {
  const forms =
    '`{ light, dark }` hex colors (`#rgb`, `#rrggbb` or `#rrggbbaa`), a `{ token }`, or a `{ palette: "categorical", index }`';

  it.each(['red', { token: 'series' }, { palette: 'categorical' }])(
    'names the shapes a color takes for %j',
    (color) => {
      expect(
        issuesOf('metric', metric({ colors: { byKey: { v: color } } }))
      ).toEqual([{ path: 'colors.byKey.v', message: `must be ${forms}` }]);
    }
  );

  it('names `bands` too where a metric takes it', () => {
    expect(
      issuesOf('metric', metric({ value: { column: 'v', color: 'red' } }))
    ).toEqual([
      { path: 'value.color', message: `must be \`"bands"\`, ${forms}` },
    ]);
  });

  it('keeps the hex message for one bad scheme', () => {
    expect(
      issuesOf(
        'metric',
        metric({ colors: { byKey: { v: { light: 'red', dark: '#000' } } } })
      )
    ).toEqual([
      {
        path: 'colors.byKey.v.light',
        message: 'must be a #rgb, #rrggbb or #rrggbbaa color',
      },
    ]);
  });
});

describe('color bands', () => {
  const color = { light: '#000000', dark: '#ffffff' };

  it('states one bandsRange rule on every primitive that takes one', () => {
    expect([
      GAUGE_RULES.bandsRange,
      HEATMAP_RULES.bandsRange,
      LEGACY_METRIC_RULES.bandsRange,
      METRIC_RULES.bandsRange,
    ]).toEqual(Array(4).fill(BANDS_RANGE_SENTENCE));
  });

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
