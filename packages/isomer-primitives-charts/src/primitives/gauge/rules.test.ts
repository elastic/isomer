/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { COLUMN_REF_RULE } from '../../schema/references';
import {
  BANDS_RANGE_SENTENCE,
  expectRule,
  issuesOf,
  number,
  string,
} from '../../schema/rules.fixtures';

import { GAUGE_RULES } from './schema';

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
      BANDS_RANGE_SENTENCE,
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
