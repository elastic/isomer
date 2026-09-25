/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { example as codeExample } from '../slide_code/examples';
import { example as transcriptExample } from '../slide_transcript/examples';

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
    tone: 'pink',
    items: ['Prices', 'Stock', 'Shipping', 'Customer support'],
  },
  footnote:
    'Because the line is fixed, a merchant can change prices without a payments release.',
};

/** `narrowLeft`: statements beside a transcript. */
export const narrowLeftExample: SlideSplitNode = {
  type: 'slideSplit',
  ratio: 'narrowLeft',
  left: {
    label: 'The assistant can',
    items: ['Book a slot', 'Move a slot', 'Cancel a slot'],
  },
  right: { items: [transcriptExample] },
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

/** Conformance examples for {@link SlideSplitNode}. */
export const examples: SlideSplitNode[] = [
  example,
  narrowLeftExample,
  arrowExample,
  mixedExample,
];
