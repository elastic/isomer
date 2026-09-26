/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideStatsNode } from './schema';

/** Canonical {@link SlideStatsNode} example. */
export const example: SlideStatsNode = {
  type: 'slideStats',
  items: [
    {
      value: '3',
      label: 'Regions',
      body: 'Checkout now runs **active-active** in each of them.',
    },
    {
      value: '40',
      unit: 'ms',
      label: 'p99 latency',
      body: 'Measured at the edge during the spring sale peak.',
    },
    {
      value: '0',
      label: 'Failed payments',
      body: 'Across two regional failovers in the same week.',
    },
  ],
};

/** Two numbers, the fewest a row compares. */
export const pairExample: SlideStatsNode = {
  type: 'slideStats',
  items: [
    {
      value: '12',
      unit: 'min',
      label: 'Time to detect',
      body: 'From the first failed health check to the page.',
    },
    {
      value: '47',
      unit: 'min',
      label: 'Time to recover',
      body: 'Most of it spent waiting on a manual cache flush.',
    },
  ],
};

/** Four numbers not measured yet, which render placeholders. */
export const pendingExample: SlideStatsNode = {
  type: 'slideStats',
  items: [
    {
      label: 'On time',
      body: 'Orders delivered inside the booked slot.',
    },
    {
      label: 'Substitutions',
      body: 'Items swapped for an approved replacement.',
    },
    {
      label: 'Refunds',
      body: 'Orders refunded in part or in full.',
    },
    {
      value: '4.8',
      label: 'Rating',
      body: 'Average driver rating, the one number already in.',
    },
  ],
};

/** Conformance examples for {@link SlideStatsNode}. */
export const examples: SlideStatsNode[] = [
  example,
  pairExample,
  pendingExample,
];
