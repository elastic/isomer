/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { INTERACTION_RULES } from '../../schema/events';
import { COLUMN_REF_RULE } from '../../schema/references';
import {
  BANDS_RANGE_SENTENCE,
  expectRule,
  issuesOf,
  number,
  string,
} from '../../schema/rules.fixtures';

import { LEGACY_METRIC_RULES } from './schema';

describe('legacyMetric', () => {
  const legacy = (overrides: Record<string, unknown> = {}) => ({
    type: 'legacyMetric',
    data: { columns: [string('t'), number('n')], rows: [['a', 1]] },
    metrics: [{ column: 'n' }],
    ...overrides,
  });

  it('accepts the minimal metric, and a string or several columns', () => {
    expect(issuesOf('legacyMetric', legacy())).toEqual([]);
    expect(
      issuesOf(
        'legacyMetric',
        legacy({ metrics: [{ column: 't' }, { column: 'n' }] })
      )
    ).toEqual([]);
  });

  it('takes a bandsRange only with bands', () => {
    expectRule(
      'legacyMetric',
      legacy({ bandsRange: 'percentage' }),
      BANDS_RANGE_SENTENCE,
      'bandsRange'
    );
    expect(
      issuesOf(
        'legacyMetric',
        legacy({
          bandsRange: 'percentage',
          colors: {
            bands: [{ from: 0, color: { light: '#000', dark: '#fff' } }],
          },
        })
      )
    ).toEqual([]);
  });

  it('rejects no metrics', () => {
    expect(
      issuesOf('legacyMetric', legacy({ metrics: [] })).map(({ path }) => path)
    ).toEqual(['metrics']);
  });

  it('rejects a reference to a missing column', () => {
    expectRule(
      'legacyMetric',
      legacy({ metrics: [{ column: 'nope' }] }),
      COLUMN_REF_RULE,
      'metrics.0.column'
    );
    expectRule(
      'legacyMetric',
      legacy({ breakdown: { column: 'nope' } }),
      COLUMN_REF_RULE,
      'breakdown.column'
    );
  });

  it('rejects a column named twice, or a breakdown that is a metric', () => {
    expectRule(
      'legacyMetric',
      legacy({ metrics: [{ column: 'n' }, { column: 'n' }] }),
      LEGACY_METRIC_RULES.distinct,
      'metrics.1.column'
    );
    expectRule(
      'legacyMetric',
      legacy({ breakdown: { column: 'n' } }),
      LEGACY_METRIC_RULES.distinct,
      'breakdown.column'
    );
  });

  it('rejects several rows without a breakdown, and accepts them with one', () => {
    const data = {
      columns: [string('t'), number('n')],
      rows: [
        ['a', 1],
        ['b', 2],
      ],
    };
    expectRule(
      'legacyMetric',
      legacy({ data }),
      LEGACY_METRIC_RULES.oneRow,
      'data.rows'
    );
    expect(
      issuesOf('legacyMetric', legacy({ data, breakdown: { column: 't' } }))
    ).toEqual([]);
  });

  it('offers only the tile target', () => {
    expect(
      issuesOf('legacyMetric', legacy({ interactions: { select: ['tile'] } }))
    ).toEqual([]);
    expect(
      issuesOf(
        'legacyMetric',
        legacy({ interactions: { select: ['cell'] } })
      ).map(({ path }) => path)
    ).toEqual(['interactions.select.0']);
  });

  it('rejects emphasis outside the rows', () => {
    expectRule(
      'legacyMetric',
      legacy({ emphasis: [{ rows: [1] }] }),
      INTERACTION_RULES.emphasisRows,
      'emphasis.0.rows.0'
    );
  });
});
