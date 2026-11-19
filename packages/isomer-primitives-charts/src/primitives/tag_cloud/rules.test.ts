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
  expectRule,
  issuesOf,
  number,
  string,
} from '../../schema/rules.fixtures';

import { TAG_CLOUD_RULES } from './schema';

describe('tagCloud', () => {
  const cloud = (overrides: Record<string, unknown> = {}) => ({
    type: 'tagCloud',
    data: { columns: [string('t'), number('n')], rows: [['a', 1]] },
    tags: { column: 't' },
    metric: { column: 'n' },
    ...overrides,
  });

  it('accepts the minimal cloud', () => {
    expect(issuesOf('tagCloud', cloud())).toEqual([]);
  });

  it('rejects a reference to a missing column', () => {
    expectRule(
      'tagCloud',
      cloud({ tags: { column: 'nope' } }),
      COLUMN_REF_RULE,
      'tags.column'
    );
  });

  it('rejects a metric that is not a number', () => {
    expectRule(
      'tagCloud',
      cloud({ metric: { column: 't' }, tags: { column: 'n' } }),
      TAG_CLOUD_RULES.metricType,
      'metric.column'
    );
  });

  it('rejects multivalue tags', () => {
    expectRule(
      'tagCloud',
      cloud({
        data: {
          columns: [{ ...string('t'), multivalue: true }, number('n')],
          rows: [[['a', 'b'], 1]],
        },
      }),
      TAG_CLOUD_RULES.singleValued,
      'tags.column'
    );
  });

  it('rejects one column as both tags and metric', () => {
    expectRule(
      'tagCloud',
      cloud({ tags: { column: 'n' } }),
      TAG_CLOUD_RULES.distinct,
      'metric.column'
    );
  });

  it('rejects a smallest font larger than the largest, stated or by default', () => {
    expectRule(
      'tagCloud',
      cloud({ fontSize: { min: 40, max: 20 } }),
      TAG_CLOUD_RULES.fontSizes,
      'fontSize'
    );
    expectRule(
      'tagCloud',
      cloud({ fontSize: { min: 80 } }),
      TAG_CLOUD_RULES.fontSizes,
      'fontSize'
    );
    expect(issuesOf('tagCloud', cloud({ fontSize: { min: 72 } }))).toEqual([]);
  });

  it('offers only the tag target', () => {
    expect(
      issuesOf('tagCloud', cloud({ interactions: { select: ['tag'] } }))
    ).toEqual([]);
    expect(
      issuesOf('tagCloud', cloud({ interactions: { select: ['cell'] } })).map(
        ({ path }) => path
      )
    ).toEqual(['interactions.select.0']);
  });

  it('rejects emphasis outside the rows', () => {
    expectRule(
      'tagCloud',
      cloud({ emphasis: [{ rows: [2] }] }),
      INTERACTION_RULES.emphasisRows,
      'emphasis.0.rows.0'
    );
  });
});
