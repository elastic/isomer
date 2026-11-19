/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { BAND_RULE } from '../../schema/colors';
import { INTERACTION_RULES } from '../../schema/events';
import { COLUMN_REF_RULE } from '../../schema/references';
import {
  expectRule,
  issuesOf,
  number,
  string,
} from '../../schema/rules.fixtures';

import { DATA_TABLE_RULES } from './schema';

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
