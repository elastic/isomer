/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideQuoteNode } from './schema';

/** Canonical {@link SlideQuoteNode} example. */
export const example: SlideQuoteNode = {
  type: 'slideQuote',
  text: 'I stopped checking my bank app once the refund email said **which day** it would land.',
  source: 'Priya N.',
  context: 'Customer interview, March',
};

export const shortExample: SlideQuoteNode = {
  type: 'slideQuote',
  text: 'Ship the boring version first.',
  source: 'Payments team charter',
};

/** Near the most a quote holds, at the smallest step. */
export const longExample: SlideQuoteNode = {
  type: 'slideQuote',
  text: 'We used to open a ticket for every refund that took longer than a week, and most weeks that was a third of them. Now the app tells the customer the day the money lands, and the only tickets left are the ones where the bank itself is late, which we can **finally** chase by name.',
  source: 'Dana K.',
  context: 'Support lead, quarterly review',
};

/** Conformance examples for {@link SlideQuoteNode}. */
export const examples: SlideQuoteNode[] = [example, shortExample, longExample];
