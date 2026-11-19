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

import { PARTITION_RULES } from './schema';

describe('partitionChart', () => {
  const partition = (overrides: Record<string, unknown> = {}) => ({
    type: 'partitionChart',
    shape: 'pie',
    data: {
      columns: [string('a'), string('b'), number('v'), number('w')],
      rows: [['x', 'y', 1, 2]],
    },
    metrics: [{ column: 'v' }],
    groups: [{ column: 'a' }],
    ...overrides,
  });

  it('accepts the minimal chart, and one with no groups', () => {
    expect(issuesOf('partitionChart', partition())).toEqual([]);
    expect(
      issuesOf('partitionChart', partition({ groups: undefined }))
    ).toEqual([]);
  });

  it('rejects a reference to a missing column', () => {
    expectRule(
      'partitionChart',
      partition({ groups: [{ column: 'nope' }] }),
      COLUMN_REF_RULE,
      'groups.0.column'
    );
  });

  it('rejects a metric that is not a number', () => {
    expectRule(
      'partitionChart',
      partition({ metrics: [{ column: 'a' }] }),
      PARTITION_RULES.metricType,
      'metrics.0.column'
    );
  });

  it('rejects a multivalue group', () => {
    expectRule(
      'partitionChart',
      partition({
        data: {
          columns: [{ ...string('a'), multivalue: true }, number('v')],
          rows: [[['x', 'y'], 1]],
        },
      }),
      PARTITION_RULES.singleValued,
      'groups.0.column'
    );
  });

  it('rejects a column used twice', () => {
    expectRule(
      'partitionChart',
      partition({ groups: [{ column: 'a' }, { column: 'a' }] }),
      PARTITION_RULES.distinct,
      'groups.1.column'
    );
  });

  it.each([
    ['pie', 3],
    ['donut', 3],
    ['treemap', 2],
    ['mosaic', 2],
    ['waffle', 1],
  ])('takes at most %s groups on a %s', (shape, most) => {
    const columns = ['a', 'b', 'c', 'd'];
    const data = {
      columns: [...columns.map(string), number('v')],
      rows: [['p', 'q', 'r', 's', 1]],
    };
    const groups = (count: number) =>
      columns.slice(0, count).map((column) => ({ column }));
    expect(
      issuesOf(
        'partitionChart',
        partition({ shape, data, groups: groups(most) })
      )
    ).toEqual([]);
    expectRule(
      'partitionChart',
      partition({ shape, data, groups: groups(most + 1) }),
      PARTITION_RULES.groupCount,
      'groups'
    );
  });

  it('rejects several metrics on a mosaic, and accepts them elsewhere', () => {
    const metrics = [{ column: 'v' }, { column: 'w' }];
    expectRule(
      'partitionChart',
      partition({ shape: 'mosaic', metrics }),
      PARTITION_RULES.mosaicMetric,
      'metrics'
    );
    expect(issuesOf('partitionChart', partition({ metrics }))).toEqual([]);
  });

  it('takes a donut hole only on a donut, strictly between 0 and 1', () => {
    expect(
      issuesOf('partitionChart', partition({ shape: 'donut', donutHole: 0.7 }))
    ).toEqual([]);
    expectRule(
      'partitionChart',
      partition({ donutHole: 0.7 }),
      PARTITION_RULES.donutHole,
      'donutHole'
    );
    expect(
      issuesOf(
        'partitionChart',
        partition({ shape: 'donut', donutHole: 1 })
      ).map(({ path }) => path)
    ).toEqual(['donutHole']);
  });

  it('offers only the slice target', () => {
    expect(
      issuesOf(
        'partitionChart',
        partition({ interactions: { select: ['slice'] } })
      )
    ).toEqual([]);
    expect(
      issuesOf(
        'partitionChart',
        partition({ interactions: { select: ['datum'] } })
      ).map(({ path }) => path)
    ).toEqual(['interactions.select.0']);
  });

  it('rejects emphasis outside the rows', () => {
    expectRule(
      'partitionChart',
      partition({ emphasis: [{ rows: [3] }] }),
      INTERACTION_RULES.emphasisRows,
      'emphasis.0.rows.0'
    );
  });
});
