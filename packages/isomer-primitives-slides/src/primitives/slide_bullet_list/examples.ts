/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideBulletListNode } from './schema';

/** Canonical {@link SlideBulletListNode} example. */
export const example: SlideBulletListNode = {
  type: 'slideBulletList',
  items: [
    'Refunds post to the original card within **two days**.',
    'Store credit is instant and never expires.',
    'Returns by mail need no receipt.',
  ],
};

/** `check` marker with a label. */
export const checkExample: SlideBulletListNode = {
  type: 'slideBulletList',
  label: 'In the spring release',
  marker: 'check',
  items: ['Saved carts across devices.', 'Apple Pay at checkout.'],
};

/** `x` marker with a label. */
export const xExample: SlideBulletListNode = {
  type: 'slideBulletList',
  label: 'Not this quarter',
  marker: 'x',
  items: ['Same-day delivery outside the metro area.', 'Gift wrapping.'],
};

/** Six points, the most a list holds, under a label. */
export const fullExample: SlideBulletListNode = {
  type: 'slideBulletList',
  label: 'Checkout, this quarter',
  marker: 'check',
  items: [
    'Saved carts across devices.',
    'Apple Pay at checkout.',
    'Refunds post within **two days**.',
    'One courier for the whole basket.',
    'Receipts by email and in the app.',
    'Store credit that never expires.',
  ],
};

/** Conformance examples for {@link SlideBulletListNode}. */
export const examples: SlideBulletListNode[] = [
  example,
  checkExample,
  xExample,
  fullExample,
];
