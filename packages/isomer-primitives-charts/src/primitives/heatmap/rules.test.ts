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
  date,
  expectRule,
  issuesOf,
  number,
  string,
} from '../../schema/rules.fixtures';

import { HEATMAP_RULES } from './schema';

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
      BANDS_RANGE_SENTENCE,
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
