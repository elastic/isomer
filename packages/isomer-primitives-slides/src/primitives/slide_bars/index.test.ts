/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { example, scaledExample } from './examples';
import { markdown, text } from './index';
import { schema } from './schema';

describe('slideBars', () => {
  it('rejects more than one highlighted item', () => {
    const [first, second, ...rest] = example.items;
    const result = schema.safeParse({
      ...example,
      items: [
        { ...first, highlight: true },
        { ...second, highlight: true },
        ...rest,
      ],
    });
    expect(result.error?.issues[0]).toMatchObject({
      path: ['items'],
      message: 'at most one item can be highlighted',
    });
  });

  it('rejects a max below a value', () => {
    const result = schema.safeParse({ ...scaledExample, max: 50 });
    expect(result.error?.issues[0]).toMatchObject({
      path: ['max'],
      message: 'max must be at least every value',
    });
  });

  it('adds a Detail column only when an item has a detail', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "Label    Value  Detail
      -------  -----  ----------------------
      Leeds    412    orders packed per hour
      Bristol  356    orders packed per hour
      Glasgow  298    orders packed per hour
      Cardiff  214    orders packed per hour
      Belfast  130    opened in March"
    `);
    expect(markdown(scaledExample)).toMatchInlineSnapshot(`
      "| Label | Value |
      | --- | --- |
      | Search | 92 |
      | Checkout | 88 |
      | Basket | 81 |
      | Account | 74 |
      | Reviews | 63 |
      | Wishlist | 51 |"
    `);
  });
});
