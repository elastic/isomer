/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { example as codeExample } from '../slide_code/examples';

import type { SlideSplitLayoutNode } from './types';

/** Canonical {@link SlideSplitLayoutNode} example: two owners, split by a rule. */
export const example: SlideSplitLayoutNode = {
  type: 'slideSplitLayout',
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
export const arrowExample: SlideSplitLayoutNode = {
  type: 'slideSplitLayout',
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
export const stackedExample: SlideSplitLayoutNode = {
  type: 'slideSplitLayout',
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
        { type: 'slideCode', text: 'npm run settle -- --nightly' },
      ],
    },
  ],
};

/** `aside` with a hairline: code beside a labeled column of notes. */
export const asideExample: SlideSplitLayoutNode = {
  type: 'slideSplitLayout',
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

/** Conformance examples for {@link SlideSplitLayoutNode}. */
export const examples: SlideSplitLayoutNode[] = [
  example,
  arrowExample,
  stackedExample,
  asideExample,
];
