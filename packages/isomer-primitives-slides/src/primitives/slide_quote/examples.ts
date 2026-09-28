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

/** A short quote with no context. */
export const shortExample: SlideQuoteNode = {
  type: 'slideQuote',
  text: 'Ship the boring version first.',
  source: 'Payments team charter',
};

/** Conformance examples for {@link SlideQuoteNode}. */
export const examples: SlideQuoteNode[] = [example, shortExample];
