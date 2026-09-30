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

/** Twelve rows, the most a table holds, at the smallest step. */
export const fullExample: SlideTableNode = {
  type: 'slideTable',
  label: 'Checkout by market, last 24 hours',
  columns: ['Market', 'Orders', 'p99 latency', 'Errors'],
  rowHeaders: true,
  rows: [
    ['United Kingdom', '18,204', '390 ms', '0.2%'],
    ['Germany', '15,730', '410 ms', '0.1%'],
    ['France', '12,118', '405 ms', '0.2%'],
    ['Spain', '8,962', '420 ms', '0.3%'],
    ['Italy', '8,410', '430 ms', '0.2%'],
    ['Netherlands', '6,275', '380 ms', '0.1%'],
    ['United States', '41,380', '370 ms', '0.1%'],
    ['Canada', '9,904', '395 ms', '0.2%'],
    ['Mexico', '5,621', '460 ms', '0.4%'],
    ['Japan', '11,506', '1.7 s', '2.1%'],
    ['Australia', '7,344', '1.9 s', '2.6%'],
    ['Singapore', '3,914', '1.8 s', '2.2%'],
  ],
};

/** Conformance examples for {@link SlideTableNode}. */
export const examples: SlideTableNode[] = [
  example,
  plainExample,
  groupsExample,
  fullExample,
];
