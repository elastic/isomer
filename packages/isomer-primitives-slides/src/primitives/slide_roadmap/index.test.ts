/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../../pack';

import { example, examples, twoColumnsExample } from './examples';
import { markdown, text } from './index';
import { schema } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: PrimitiveNode): Composition => ({
  type: 'view',
  body: [node],
});

describe('slideRoadmap', () => {
  it('validates every example', () => {
    for (const node of examples) {
      expect(runtime.validate(compose(node)).errors).toEqual([]);
    }
  });

  it('rejects more than one current column', () => {
    const [first, second, ...rest] = example.columns;
    const result = schema.safeParse({
      ...example,
      columns: [
        { ...first, current: true },
        { ...second, current: true },
        ...rest,
      ],
    });
    expect(result.error?.issues[0]).toMatchObject({
      path: ['columns'],
      message: 'at most one column can be current',
    });
  });

  it('holds two to four columns of one to four items', () => {
    const [column] = example.columns;
    expect(schema.safeParse({ ...example, columns: [column] }).success).toBe(
      false
    );
    expect(
      schema.safeParse({ ...example, columns: Array(5).fill(column) }).success
    ).toBe(false);
    expect(
      schema.safeParse({
        ...twoColumnsExample,
        columns: [{ ...column, items: [] }, column],
      }).success
    ).toBe(false);
  });

  it('renders text and markdown with the current column marked', () => {
    expect(text(twoColumnsExample)).toMatchInlineSnapshot(`
      "THIS HALF · Committed
      - Faster payouts: Merchants are paid the next business day
      - Dispute inbox: Every chargeback in one queue

      NEXT HALF · Exploring
      - Instant payouts: Paid within minutes, for a small fee"
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "## Now · Shipped (now)

      - **Saved baskets**: Reorder last week’s shop in one tap
      - **Card on file**: Checkout without retyping a card

      ## Next · In build

      - **Substitutions**: Approve a swap from a message
      - **Delivery slots**: Pick a one-hour window
      - **Receipts**: Itemized, in the app and by email

      ## Later · Proposed

      - **Shared lists**: One basket for the whole household
      - **Price alerts**: A nudge when a staple goes on sale
      - **Pantry**: Suggest what is running low
      - **Recipes**: Add every ingredient in one step"
    `);
  });
});
