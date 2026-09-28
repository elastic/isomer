/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideBarsNode } from './schema';

/** Canonical {@link SlideBarsNode} example. */
export const example: SlideBarsNode = {
  type: 'slideBars',
  items: [
    { label: 'Leeds', value: 412, detail: 'orders packed per hour' },
    {
      label: 'Bristol',
      value: 356,
      detail: 'orders packed per hour',
      highlight: true,
    },
    { label: 'Glasgow', value: 298, detail: 'orders packed per hour' },
    { label: 'Cardiff', value: 214, detail: 'orders packed per hour' },
    { label: 'Belfast', value: 130, detail: 'opened in March' },
  ],
};

/** Eight bars without details, against a fixed maximum. */
export const scaledExample: SlideBarsNode = {
  type: 'slideBars',
  max: 100,
  items: [
    { label: 'Search', value: 92 },
    { label: 'Checkout', value: 88 },
    { label: 'Basket', value: 81 },
    { label: 'Account', value: 74 },
    { label: 'Reviews', value: 63, highlight: true },
    { label: 'Wishlist', value: 51 },
  ],
};

/** Eight bars, each with a detail, the tallest a bar chart grows. */
export const denseExample: SlideBarsNode = {
  type: 'slideBars',
  items: [
    { label: 'Monday', value: 1840, detail: 'bank holiday backlog' },
    { label: 'Tuesday', value: 1310, detail: 'normal volume' },
    { label: 'Wednesday', value: 1275, detail: 'normal volume' },
    { label: 'Thursday', value: 1402, detail: 'promotion started' },
    { label: 'Friday', value: 1618, detail: 'promotion peak' },
    { label: 'Sunday', value: 0, detail: 'warehouse closed' },
  ],
};

/** Conformance examples for {@link SlideBarsNode}. */
export const examples: SlideBarsNode[] = [example, scaledExample, denseExample];
