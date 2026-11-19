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
  containing,
  date,
  expectRule,
  issuesOf,
  metric,
  number,
  string,
} from '../../schema/rules.fixtures';

import { METRIC_RULES } from './schema';

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

  it('takes a bandsRange only with bands', () => {
    expectRule(
      'metric',
      metric({ value: { column: 'v', bandsRange: 'percentage' } }),
      BANDS_RANGE_SENTENCE,
      'value.bandsRange'
    );
    expectRule(
      'metric',
      metric({
        value: { column: 'v', color: 'bands', bandsRange: 'absolute' },
        colors: { bands: [] },
      }),
      BANDS_RANGE_SENTENCE,
      'value.bandsRange'
    );
    expect(
      issuesOf(
        'metric',
        metric({
          value: { column: 'v', color: 'bands', bandsRange: 'percentage' },
          colors: {
            bands: [{ from: 0, color: { light: '#000', dark: '#fff' } }],
          },
        })
      )
    ).toEqual([]);
  });
});
