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

/** Facts with no terms, which drop the rules and read as a compact stack. */
export const plainExample: SlideListNode = {
  type: 'slideList',
  items: [
    { body: 'Written once by the pricing team' },
    { body: 'Read by checkout, invoices, and the storefront' },
    { body: 'Versioned, so an old order keeps its old price' },
  ],
};

/** Terms on some rows only: a row with no term spans the full width. */
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

/** Conformance examples for {@link SlideListNode}. */
export const examples: SlideListNode[] = [example, plainExample, mixedExample];
