/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Expected values come from Kibana: `@kbn/field-formats-common` (missing and
// blank text), `@kbn/sort-predicates` and its tests (orderings), Lens's
// datatable `summary.ts` and its tests, `utils.ts` (`getColumnAlignment`,
// `getProgressBarDomain`), `cell_value_helpers.tsx` (empty cells are never
// colored) and `getContrastColor` with EUI's `isColorDark`.

import { describe, expect, it } from 'vitest';

import type { ChartColumn } from '../schema/data';
import type { DataTableNode } from '../schema/data_table';

import { resolveChart } from './resolve';

const column = (
  id: string,
  type: ChartColumn['type'],
  role: ChartColumn['role'] = type === 'number' ? 'metric' : 'dimension'
): ChartColumn => ({ id, label: id, type, role });

const table = (
  columns: ChartColumn[],
  rows: DataTableNode['data']['rows'],
  extra: Partial<DataTableNode> = {}
): DataTableNode => ({
  type: 'dataTable',
  data: { columns, rows },
  ...extra,
});

const resolve = (node: DataTableNode, scheme: 'light' | 'dark' = 'light') =>
  resolveChart(node, { scheme });

const ordered = (
  scene: ReturnType<typeof resolve>,
  positions: readonly number[],
  index = 0
) => positions.map((position) => scene.rows[position]!.cells[index]!.text);

describe('dataTable cells', () => {
  it('shows a missing value as a dash titled (null), and an empty string as (blank)', () => {
    const scene = resolve(
      table([column('s', 'string')], [[null], [''], ['x']])
    );
    const [missing, blank, value] = scene.rows.map(({ cells }) => cells[0]!);
    expect(missing).toMatchObject({
      text: '-',
      empty: 'missing',
      title: '(null)',
      color: '#5A6D8C',
    });
    expect(blank).toMatchObject({
      text: '(blank)',
      empty: 'blank',
      color: '#5A6D8C',
    });
    expect(value).toMatchObject({ text: 'x', color: '#384861' });
    expect(value?.empty).toBeUndefined();
  });

  it('flags a column whose every cell is empty', () => {
    const scene = resolve(
      table(
        [column('a', 'string'), column('b', 'number')],
        [
          ['x', null],
          ['y', null],
        ]
      )
    );
    expect(scene.columns.map(({ empty }) => empty)).toEqual([false, true]);
  });

  it('aligns numbers right and everything else left, and never centers a bar', () => {
    const scene = resolve(
      table(
        [
          column('s', 'string'),
          column('n', 'number'),
          column('d', 'date'),
          column('b', 'number'),
        ],
        [['a', 1, 0, 2]],
        {
          columns: [
            { column: 's' },
            { column: 'n' },
            { column: 'd' },
            { column: 'b', alignment: 'center', decoration: { kind: 'bar' } },
          ],
        }
      )
    );
    expect(scene.columns.map(({ alignment }) => alignment)).toEqual([
      'left',
      'right',
      'left',
      'right',
    ]);
  });

  it('heads rows with the first dimension shown', () => {
    const scene = resolve(
      table(
        [column('n', 'number'), column('a', 'string'), column('b', 'string')],
        [[1, 'x', 'y']],
        {
          columns: [{ column: 'n' }, { column: 'b' }, { column: 'a' }],
        }
      )
    );
    expect(scene.rowHeader).toBe('b');
  });

  it('never decorates an empty cell', () => {
    const scene = resolve(
      table([column('s', 'string')], [[null], ['']], {
        columns: [
          {
            column: 's',
            decoration: {
              kind: 'background',
              colors: {
                byKey: { null: { light: '#000000', dark: '#000000' } },
              },
            },
          },
        ],
      })
    );
    for (const { cells } of scene.rows) {
      expect(cells[0]?.background).toBeUndefined();
    }
  });

  it('looks a byKey color up by the escaped key part', () => {
    const scene = resolve(
      table([column('s', 'string')], [['a:b'], ['a']], {
        columns: [
          {
            column: 's',
            decoration: {
              kind: 'background',
              colors: {
                byKey: { 'a\\:b': { light: '#112233', dark: '#112233' } },
              },
            },
          },
        ],
      })
    );
    expect(scene.rows[0]?.cells[0]?.background).toBeDefined();
    expect(scene.rows[1]?.cells[0]?.background).toBeUndefined();
  });

  it('puts textGhost on a dark cell and textInk on a light one', () => {
    const scene = resolve(
      table([column('s', 'string')], [['dark'], ['light']], {
        columns: [
          {
            column: 's',
            decoration: {
              kind: 'background',
              colors: {
                byKey: {
                  dark: { light: '#1750BA', dark: '#1750BA' },
                  light: { light: '#FCD883', dark: '#FCD883' },
                },
              },
            },
          },
        ],
      })
    );
    expect(
      scene.rows.map(({ cells }) => [cells[0]!.background, cells[0]!.color])
    ).toEqual([
      ['#1750BA', '#FFFFFF'],
      ['#FCD883', '#07101F'],
    ]);
  });
});

describe('dataTable bars', () => {
  const bars = (rows: number[], decoration: Record<string, number> = {}) =>
    resolve(
      table(
        [column('n', 'number')],
        rows.map((value) => [value]),
        {
          columns: [
            { column: 'n', decoration: { kind: 'bar', ...decoration } },
          ],
        }
      )
    ).rows.map(({ cells }) => cells[0]!.bar);

  it('spans the column’s lowest to highest value, growing from 0', () => {
    expect(bars([0, 50, 100]).map((bar) => [bar?.from, bar?.to])).toEqual([
      [0, 0],
      [0, 0.5],
      [0, 1],
    ]);
  });

  it('anchors a constant positive column at zero', () => {
    expect(bars([5, 5]).map((bar) => bar?.to)).toEqual([1, 1]);
  });

  it('swaps an inverted custom range', () => {
    expect(bars([5], { min: 10, max: 0 })[0]).toMatchObject({
      from: 0,
      to: 0.5,
    });
  });

  it('uses euiColorVis2 when the column sets no color', () => {
    expect(bars([1])[0]?.color).toBe('#61A2FF');
  });
});

describe('dataTable sorting', () => {
  it('orders strings and puts missing values last in both directions', () => {
    const scene = resolve(
      table(
        [column('a', 'string')],
        [['d'], [null], ['12'], ['a'], ['c'], ['b']]
      )
    );
    expect(ordered(scene, scene.orders.a!.asc)).toEqual([
      '12',
      'a',
      'b',
      'c',
      'd',
      '-',
    ]);
    expect(ordered(scene, scene.orders.a!.desc)).toEqual([
      'd',
      'c',
      'b',
      'a',
      '12',
      '-',
    ]);
  });

  it('orders dates, including ISO strings and arrays', () => {
    const now = Date.UTC(2026, 0, 1);
    const scene = resolve(
      table(
        [{ ...column('d', 'date'), multivalue: true }],
        [[now], [[0, now]], [[0]], [now - 150000]]
      )
    );
    expect(scene.orders.d!.asc).toEqual([2, 1, 3, 0]);
    expect(scene.orders.d!.desc).toEqual([0, 3, 1, 2]);
  });

  it('starts in the persisted sort', () => {
    const scene = resolve(
      table([column('n', 'number')], [[2], [3], [1]], {
        interactions: { initial: { sort: { column: 'n', direction: 'desc' } } },
      })
    );
    expect(scene.order).toEqual([1, 0, 2]);
  });
});

describe('dataTable summary row', () => {
  const footer = (
    summary: NonNullable<DataTableNode['columns']>[number]['summary'],
    rows: DataTableNode['data']['rows']
  ) =>
    resolve(
      table(
        [
          {
            ...column('n', 'number'),
            format: {
              kind: 'number',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            },
            multivalue: true,
          },
        ],
        rows,
        {
          columns: [{ column: 'n', summary }],
        }
      )
    ).columns[0]?.footer;

  it.each(['avg', 'sum', 'min', 'max'] as const)(
    'formats %s with the column’s format',
    (kind) => {
      expect(footer({ kind, label: '' }, [[45]])).toBe('45.00');
    }
  );

  it('counts non-null values, arrays flattened, without the column’s format', () => {
    expect(footer({ kind: 'count', label: '' }, [[45], [null]])).toBe('1');
    expect(footer({ kind: 'count', label: '' }, [[[45, 90]]])).toBe('2');
  });

  it('prefixes the default label', () => {
    expect(footer({ kind: 'count' }, [[1]])).toBe('Value count: 1');
  });
});

describe('dataTable selection', () => {
  it('offers dimension cells only, with their raw value', () => {
    const scene = resolve(
      table(
        [column('host', 'string'), column('n', 'number')],
        [['web-01', 3]],
        {
          interactions: { select: ['cell'] },
        }
      )
    );
    const [host, n] = scene.rows[0]!.cells;
    expect(host?.selection).toEqual({
      target: 'cell',
      rows: [0],
      columns: ['host'],
      values: { host: 'web-01' },
      description: 'host: web-01',
    });
    expect(n?.selection).toBeUndefined();
  });

  it('pages with EUI’s pager text', () => {
    const scene = resolve(
      table(
        [column('n', 'number')],
        Array.from({ length: 21 }, (_, i) => [i]),
        { pageSize: 10 }
      )
    );
    expect(scene.paging).toEqual({
      pageSize: 10,
      pageCount: 3,
      rowsPerPage: 'Rows per page: 10',
      pageLabels: ['1', '2', '3'],
    });
  });
});
