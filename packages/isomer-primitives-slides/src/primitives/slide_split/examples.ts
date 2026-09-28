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
  left: {
    label: 'Payments team',
    tone: 'primary',
    items: ['Card capture', 'Fraud scoring', 'Settlement', 'Refunds'],
  },
  right: {
    label: 'Merchant',
    tone: 'accent',
    items: ['Prices', 'Stock', 'Shipping', 'Customer support'],
  },
  footnote:
    'Because the line is fixed, a merchant can change prices **without a payments release**.',
};

/** `wideLeft` with an arrow: code on the left becomes the statements on the right. */
export const arrowExample: SlideSplitNode = {
  type: 'slideSplit',
  ratio: 'wideLeft',
  divider: 'arrow',
  left: { items: [codeExample] },
  right: {
    label: 'After the change',
    tone: 'primary',
    items: ['The ledger is written first', 'Refunds settle in two days'],
  },
};

/** Statements and a node in one column. */
export const mixedExample: SlideSplitNode = {
  type: 'slideSplit',
  left: {
    label: 'Before',
    items: ['Five batch windows', 'Manual retries'],
  },
  right: {
    label: 'After',
    tone: 'primary',
    items: ['One nightly run', codeExample],
  },
};

/** `aside` with a hairline: code beside a labeled column of notes. */
export const asideExample: SlideSplitNode = {
  type: 'slideSplit',
  ratio: 'aside',
  divider: 'hairline',
  left: { items: [codeExample] },
  right: {
    label: 'Why this order',
    items: [
      {
        type: 'slideDefinitions',
        items: [
          {
            term: 'ledger first',
            body: 'Recorded before anything can fail.',
          },
          {
            term: 'fraud second',
            body: 'The check can reverse a refund, never lose one.',
          },
          {
            term: 'notify last',
            body: 'Customers hear only about moved money.',
          },
        ],
      },
    ],
  },
};

/** Conformance examples for {@link SlideSplitNode}. */
export const examples: SlideSplitNode[] = [
  example,
  arrowExample,
  mixedExample,
  asideExample,
];
