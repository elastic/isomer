/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideTableNode } from './schema';

/** Canonical {@link SlideTableNode} example. */
export const example: SlideTableNode = {
  type: 'slideTable',
  label: 'Checkout, last 24 hours',
  columns: ['Region', 'Orders', 'p99 latency', 'Errors'],
  rowHeaders: true,
  rows: [
    ['Europe', '48,210', '410 ms', '0.2%'],
    ['North America', '61,905', '380 ms', '0.1%'],
    ['Asia Pacific', '22,764', '1.9 s', '2.4%'],
  ],
};

export const plainExample: SlideTableNode = {
  type: 'slideTable',
  columns: ['Step', 'Owner', 'When'],
  rows: [
    ['Cut the release branch', 'Release captain', 'Monday'],
    ['Run the smoke suite', 'QA', 'Tuesday'],
    ['Tag and publish', 'Release captain', 'Wednesday'],
  ],
};

export const groupsExample: SlideTableNode = {
  type: 'slideTable',
  columns: ['Service', 'Role', 'On call'],
  rowHeaders: true,
  groups: [
    {
      label: 'Every order',
      rows: [
        ['cart-api', 'Holds the basket', 'Payments'],
        ['ledger', 'Records the charge', 'Finance platform'],
      ],
    },
    {
      label: 'Only on refunds',
      rows: [
        ['refund-worker', 'Reverses the charge', 'Payments'],
        ['notifier', 'Emails the customer', 'Growth'],
      ],
    },
  ],
};

/** Conformance examples for {@link SlideTableNode}. */
export const examples: SlideTableNode[] = [
  example,
  plainExample,
  groupsExample,
];
