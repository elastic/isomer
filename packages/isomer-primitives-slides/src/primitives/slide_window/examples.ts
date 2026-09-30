/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { checkExample } from '../slide_bullet_list/examples';
import {
  bareExample as bareCodeExample,
  example as codeExample,
} from '../slide_code/examples';

import type { SlideWindowNode } from './types';

/** Canonical {@link SlideWindowNode} example. */
export const example: SlideWindowNode = {
  type: 'slideWindow',
  chrome: 'slack',
  title: 'checkout-oncall',
  body: [checkExample],
};

export const terminalExample: SlideWindowNode = {
  type: 'slideWindow',
  chrome: 'terminal',
  title: '~/shop — release',
  body: [bareCodeExample],
};

export const chatExample: SlideWindowNode = {
  type: 'slideWindow',
  chrome: 'chat',
  title: 'Build assistant',
  body: [
    {
      type: 'slideBulletList',
      items: [
        'The refund writes the ledger first.',
        'Fraud checks run after the write.',
      ],
    },
  ],
};

/** Two nodes in one window. */
export const browserExample: SlideWindowNode = {
  type: 'slideWindow',
  chrome: 'browser',
  title: 'github.com/shop/checkout/pull/412',
  body: [
    codeExample,
    {
      type: 'slideBulletList',
      marker: 'check',
      items: ['Ledger written before the fraud check.'],
    },
  ],
};

/** Conformance examples for {@link SlideWindowNode}. */
export const examples: SlideWindowNode[] = [
  example,
  terminalExample,
  chatExample,
  browserExample,
];
