/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { example as codeExample } from '../slide_code/examples';

import type { SlideSplitNode } from './types';

/** Canonical {@link SlideSplitNode} example: two owners, split by a rule. */
export const example: SlideSplitNode = {
  type: 'slideSplit',
  divider: 'rule',
  panes: [
    {
      label: 'Payments team',
      tone: 'primary',
      items: [
        {
          type: 'slideBulletList',
          items: ['Card capture', 'Fraud scoring', 'Settlement', 'Refunds'],
        },
      ],
    },
    {
      label: 'Merchant',
      tone: 'accent',
      items: [
        {
          type: 'slideBulletList',
          items: ['Prices', 'Stock', 'Shipping', 'Customer support'],
        },
      ],
    },
  ],
  footnote:
    'Because the line is fixed, a merchant can change prices **without a payments release**.',
};

/** `wideLeft` with an arrow: the code on the left becomes the points on the right. */
export const arrowExample: SlideSplitNode = {
  type: 'slideSplit',
  ratio: 'wideLeft',
  divider: 'arrow',
  panes: [
    { items: [codeExample] },
    {
      label: 'After the change',
      tone: 'primary',
      items: [
        {
          type: 'slideBulletList',
          marker: 'check',
          items: [
            'The ledger is written first.',
            'Refunds settle in two days.',
          ],
        },
      ],
    },
  ],
};

/** Two nodes in one column. */
export const stackedExample: SlideSplitNode = {
  type: 'slideSplit',
  ratio: 'narrowLeft',
  panes: [
    {
      label: 'Before',
      items: [
        {
          type: 'slideBulletList',
          marker: 'x',
          items: ['Five batch windows.', 'Manual retries.'],
        },
      ],
    },
    {
      label: 'After',
      tone: 'primary',
      items: [
        { type: 'slideBulletList', items: ['One nightly run.'] },
        {
          type: 'slideCode',
          panels: [{ lines: ['npm run settle -- --nightly'] }],
        },
      ],
    },
  ],
};

/** `aside` with a hairline: code beside a labeled column of notes. */
export const asideExample: SlideSplitNode = {
  type: 'slideSplit',
  ratio: 'aside',
  divider: 'hairline',
  panes: [
    { items: [codeExample] },
    {
      label: 'Why this order',
      items: [
        {
          type: 'slideBulletList',
          items: [
            'The ledger records it before anything can fail.',
            'Fraud can reverse a refund, never lose one.',
            'Customers hear only about moved money.',
          ],
        },
      ],
    },
  ],
};

/** Conformance examples for {@link SlideSplitNode}. */
export const examples: SlideSplitNode[] = [
  example,
  arrowExample,
  stackedExample,
  asideExample,
];
