/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideStatNode } from './schema';

/** Canonical {@link SlideStatNode} example. */
export const example: SlideStatNode = {
  type: 'slideStat',
  value: '2.1',
  unit: 'days',
  body: 'Median time from refund request to money back in the customer account, down from **five**.',
};

/** A value that carries its own unit. */
export const bareExample: SlideStatNode = {
  type: 'slideStat',
  value: '99.97%',
  body: 'Checkout availability over the last quarter, across all three regions.',
};

/** Not measured yet: renders the placeholder. */
export const pendingExample: SlideStatNode = {
  type: 'slideStat',
  body: 'Orders delivered inside the booked slot. The first full month of data lands in May.',
};

/** Conformance examples for {@link SlideStatNode}. */
export const examples: SlideStatNode[] = [example, bareExample, pendingExample];
