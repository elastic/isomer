/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideListNode } from './schema';

/** Canonical {@link SlideListNode} example. */
export const example: SlideListNode = {
  type: 'slideList',
  label: 'Shipped in 4.2',
  items: [
    { term: 'Search', body: 'Tolerates typos, even in brand names' },
    { term: 'Cart', body: 'Survives a lost connection and syncs later' },
    { term: 'Checkout', body: 'Saves a card with one tap' },
    { term: 'Receipts', body: 'Arrive by email and in the app' },
  ],
  footnote:
    'Each change shipped behind a flag and reached every customer within a week.',
};

/** No terms: rules drop and rows sit closer. */
export const plainExample: SlideListNode = {
  type: 'slideList',
  items: [
    { body: 'Written once by the pricing team' },
    { body: 'Read by checkout, invoices, and the storefront' },
    { body: 'Versioned, so an old order keeps its old price' },
  ],
};

export const marksExample: SlideListNode = {
  type: 'slideList',
  items: [
    { body: 'Run `migrate` before the first deploy' },
    { body: 'Prices are **read-only** after checkout starts' },
  ],
};

/** Terms on some rows only. */
export const mixedExample: SlideListNode = {
  type: 'slideList',
  label: 'Incident timeline',
  items: [
    { term: '09:12', body: 'Error rate on payments passes two percent' },
    { term: '09:15', body: 'On-call engineer paged and acknowledges' },
    { body: 'Twenty minutes spent ruling out the card network' },
    { term: '09:47', body: 'Bad config rolled back; errors clear' },
  ],
};

/** Six rows and a footnote, the most a list holds. */
export const fullExample: SlideListNode = {
  type: 'slideList',
  label: 'What the ledger guarantees',
  items: [
    { term: 'Order', body: 'Entries apply in the order they were written' },
    { term: 'Balance', body: 'No account goes below zero, even for a moment' },
    { term: 'History', body: 'Nothing is edited; a correction is a new entry' },
    { term: 'Replay', body: 'Any day can be rebuilt from its entries alone' },
    { term: 'Audit', body: 'Every entry names who wrote it and why' },
    { term: 'Currency', body: 'Amounts carry their currency; none convert' },
  ],
  footnote:
    'These hold for every service that writes to the ledger, including the batch jobs that settle overnight.',
};

/** Conformance examples for {@link SlideListNode}. */
export const examples: SlideListNode[] = [
  example,
  plainExample,
  mixedExample,
  marksExample,
  fullExample,
];
