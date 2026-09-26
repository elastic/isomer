/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { example, pairExample } from './examples';
import { markdown, text } from './index';
import { schema } from './schema';

describe('slideMatrix', () => {
  it('rejects a row whose marks do not match the columns', () => {
    const [first, ...rest] = example.rows;
    const result = schema.safeParse({
      ...example,
      rows: [{ ...first, marks: ['full', 'none'] }, ...rest],
    });
    expect(result.error?.issues[0]).toMatchObject({
      path: ['rows', 0, 'marks'],
      message: 'every row needs one mark per column (4)',
    });
  });

  it('highlights only a column it has', () => {
    expect(schema.safeParse(pairExample).success).toBe(true);
    expect(
      schema.safeParse({ ...pairExample, highlight: 2 }).error?.issues[0]
    ).toMatchObject({
      path: ['highlight'],
      message: 'must be a column index below 2',
    });
  });

  it('holds two to six columns', () => {
    const row = { label: 'Row', marks: ['full'] };
    expect(
      schema.safeParse({ ...example, columns: ['One'], rows: [row] }).success
    ).toBe(false);
  });

  it('renders marks as words in text and markdown', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "                 Card  Wallet   Bank     Invoice
      ---------------  ----  -------  -------  -------
      Instant capture  Yes   Yes      No       No
      Partial refunds  Yes   Partial  Yes      No
      Recurring        Yes   Partial  Yes      Yes
      Disputes         Yes   Yes      Partial  No"
    `);
    expect(markdown(pairExample)).toMatchInlineSnapshot(`
      "|  | Basic | Plus |
      | --- | --- | --- |
      | Free delivery | No | Yes |
      | Order tracking | Yes | Yes |
      | Priority slots | No | Yes |"
    `);
  });
});
